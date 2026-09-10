/* -----------------------------------------------------------
   Serveur de synchronisation — File d'attente (station thermale)
   -----------------------------------------------------------
   Ce petit serveur garde en mémoire l'état de la file d'attente
   (personnes en attente, cabines, motifs) et le transmet en
   temps réel à tous les écrans connectés (secrétaire + écran
   public) via WebSocket.

   Démarrage :  node server.js
   Puis ouvrir, depuis n'importe quel appareil du même réseau :
     http://ADRESSE-IP-DE-CE-PC:3000
----------------------------------------------------------- */

const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = 3000;

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* ---------------------------------------------------------
   État partagé (unique source de vérité, côté serveur)
--------------------------------------------------------- */
const state = {
  lieu: "Station thermale",
  categories: [
    { label: "Sans rendez-vous", priority: false },
    { label: "Rendez-vous", priority: false },
    { label: "Prioritaire", priority: true },
  ],
  queue: [],           // { id, name, label, priority, time }
  guichets: [
    { id: 1, name: "Cabine 1", current: null },
    { id: 2, name: "Cabine 2", current: null },
  ],
  servedCount: 0,
  lastCalled: null,     // { name, label, guichetName }
  callSeq: 0,            // incrémenté à chaque appel, pour déclencher l'animation côté client
  planningConfig: { startHour: 8, endHour: 18, slotMinutes: 30 },
  appointments: [],     // { id, date: "2026-09-10", time: "08:00", name, label, priority }
};

let nextPersonId = 1;

function broadcastState() {
  const payload = JSON.stringify({ type: "state", state });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(payload);
  });
}

/* ---------------------------------------------------------
   Actions (les mêmes que dans la version locale, mais
   appliquées ici sur l'état partagé du serveur)
--------------------------------------------------------- */
function addPerson(name, label, priority, id) {
  const entry = { id: id || nextPersonId++, name, label, priority, time: Date.now() };
  if (priority) {
    let i = 0;
    while (i < state.queue.length && state.queue[i].priority) i++;
    state.queue.splice(i, 0, entry);
  } else {
    state.queue.push(entry);
  }
}

function finishAndCallNext(guichetId) {
  const g = state.guichets.find((g) => g.id === guichetId);
  if (!g) return;
  if (g.current) {
    g.current = null;
    state.servedCount += 1;
  }
  if (state.queue.length > 0) {
    const entry = state.queue.shift();
    g.current = entry;
    state.lastCalled = { name: entry.name, label: entry.label, guichetName: g.name };
    state.callSeq += 1;
  }
}

function callIntoCabine(guichetId) {
  const g = state.guichets.find((g) => g.id === guichetId);
  if (!g || g.current || state.queue.length === 0) return;
  const entry = state.queue.shift();
  g.current = entry;
  state.lastCalled = { name: entry.name, label: entry.label, guichetName: g.name };
  state.callSeq += 1;
}

function addGuichet(name) {
  const id = Math.max(0, ...state.guichets.map((g) => g.id)) + 1;
  state.guichets.push({ id, name: name || "Cabine " + id, current: null });
}
function removeGuichet(id) {
  state.guichets = state.guichets.filter((g) => g.id !== id);
}
function renameGuichet(id, name) {
  const g = state.guichets.find((g) => g.id === id);
  if (g && name) g.name = name;
}
function addCategory(label) {
  state.categories.push({ label, priority: false });
}
function removeCategoryAt(index) {
  state.categories.splice(index, 1);
}

function addAppointment(id, date, time, name, label, priority) {
  state.appointments.push({ id: id || "a" + nextPersonId++, date, time, name, label, priority });
}
function removeAppointment(id) {
  state.appointments = state.appointments.filter((a) => a.id !== id);
}
function checkInAppointment(id) {
  const idx = state.appointments.findIndex((a) => a.id === id);
  if (idx === -1) return;
  const appt = state.appointments[idx];
  state.appointments.splice(idx, 1);
  addPerson(appt.name, appt.label, appt.priority);
}
function updatePlanningConfig(config) {
  if (!config) return;
  const { startHour, endHour, slotMinutes } = config;
  if (Number.isFinite(startHour) && startHour >= 0 && startHour < 24) state.planningConfig.startHour = startHour;
  if (Number.isFinite(endHour) && endHour > 0 && endHour <= 24) state.planningConfig.endHour = endHour;
  if (Number.isFinite(slotMinutes) && slotMinutes >= 5) state.planningConfig.slotMinutes = slotMinutes;
}

/* ---------------------------------------------------------
   Connexions WebSocket
--------------------------------------------------------- */
wss.on("connection", (ws) => {
  // Envoie l'état actuel dès la connexion, pour que l'écran se mette à jour immédiatement
  ws.send(JSON.stringify({ type: "state", state }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "addPerson":
        addPerson(msg.name, msg.label, msg.priority, msg.id);
        break;
      case "finishAndCallNext":
        finishAndCallNext(msg.guichetId);
        break;
      case "callIntoCabine":
        callIntoCabine(msg.guichetId);
        break;
      case "addGuichet":
        addGuichet(msg.name);
        break;
      case "removeGuichet":
        removeGuichet(msg.id);
        break;
      case "renameGuichet":
        renameGuichet(msg.id, msg.name);
        break;
      case "addCategory":
        addCategory(msg.label);
        break;
      case "removeCategoryAt":
        removeCategoryAt(msg.index);
        break;
      case "addAppointment":
        addAppointment(msg.id, msg.date, msg.time, msg.name, msg.label, msg.priority);
        break;
      case "removeAppointment":
        removeAppointment(msg.id);
        break;
      case "checkInAppointment":
        checkInAppointment(msg.id);
        break;
      case "updatePlanningConfig":
        updatePlanningConfig(msg.config);
        break;
      default:
        return;
    }
    broadcastState();
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("Serveur de file d'attente démarré.");
  console.log("Sur CE PC, ouvrez :      http://localhost:" + PORT);
  console.log("Sur les AUTRES écrans du même réseau, ouvrez :");
  console.log("  http://ADRESSE-IP-DE-CE-PC:" + PORT);
  console.log("(pour trouver l'adresse IP : ipconfig sous Windows, ifconfig ou 'ip a' sous Mac/Linux)");
  console.log("");
});
