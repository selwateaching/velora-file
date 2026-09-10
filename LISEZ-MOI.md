# File d'attente — Station thermale (version deux écrans)

Cette version permet d'avoir **deux écrans séparés qui se mettent à jour en même temps** :
un écran pour la secrétaire, un écran public dans la salle d'attente.

Les deux écrans doivent être sur le **même réseau WiFi** (celui de votre box internet,
même sans connexion internet active).

---

## 1. La première fois seulement : installer Node.js

Sur le PC qui fera tourner le serveur (celui de la secrétaire, ou un PC dédié) :

1. Allez sur **https://nodejs.org**
2. Téléchargez et installez la version recommandée ("LTS")
3. C'est tout — cette étape ne se fait qu'une seule fois

## 2. Démarrer le serveur

1. Copiez tout le dossier `station-thermale` sur ce PC
2. Ouvrez le dossier, puis ouvrez un terminal à cet endroit :
   - **Windows** : dans le dossier, tapez `cmd` dans la barre d'adresse et appuyez sur Entrée
   - **Mac** : clic droit dans le dossier → "Nouveau terminal dans le dossier" (ou ouvrez Terminal puis `cd` vers le dossier)
3. Tapez cette commande puis Entrée :
   ```
   node server.js
   ```
4. Vous devez voir un message du type :
   ```
   Serveur de file d'attente démarré.
   Sur CE PC, ouvrez :      http://localhost:3000
   ```
5. **Laissez cette fenêtre de terminal ouverte** — si vous la fermez, le serveur s'arrête et les écrans ne se mettent plus à jour.

## 3. Ouvrir l'écran de la secrétaire

Sur ce même PC, ouvrez un navigateur (Chrome, Edge, Firefox...) et allez à :
```
http://localhost:3000
```
Restez sur l'onglet **Secrétaire**.

## 4. Ouvrir l'écran public (sur un autre PC ou une TV connectée)

1. Trouvez l'adresse IP du PC qui fait tourner le serveur :
   - **Windows** : ouvrez un terminal, tapez `ipconfig`, cherchez "Adresse IPv4" (ex : 192.168.1.24)
   - **Mac/Linux** : ouvrez un terminal, tapez `ifconfig` ou `ip a`, cherchez une adresse commençant par 192.168...
2. Sur l'autre PC (ou la TV), connectez-vous au **même WiFi**
3. Ouvrez un navigateur et allez à :
   ```
   http://ADRESSE-IP-TROUVÉE:3000
   ```
   Exemple : `http://192.168.1.24:3000`
4. Cliquez sur l'onglet **Écran**

C'est prêt : tout ce que la secrétaire fait apparaît maintenant en temps réel sur l'écran public.

---

## Petit indicateur de connexion

En haut à droite de chaque écran, un point coloré indique si l'appareil est bien
connecté au serveur :
- **vert** = connecté, tout fonctionne
- **rouge** = pas encore connecté (vérifiez le WiFi, ou que le serveur tourne toujours)

## Si quelque chose ne fonctionne pas

- Vérifiez que la fenêtre du terminal avec `node server.js` est toujours ouverte
- Vérifiez que les deux appareils sont bien sur le même réseau WiFi
- Redémarrez le serveur (fermez le terminal, relancez `node server.js`) si besoin —
  attention, cela remet la file d'attente à zéro
