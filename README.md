<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1a424aa7-1a84-4cad-a609-76d764e72c3b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Déploiement Railway

1. Importer ce dépôt dans Railway (Dockerfile et `railway.toml` sont inclus).
2. Ajouter un volume Railway monté sur `/data`; conserver `DATA_DIR=/data`. La base JSON actuelle est stockée sur ce volume.
3. Définir `NODE_ENV=production`, `SESSION_SECRET` (secret aléatoire long), et les variables `OWNER_PHONE` et `OWNER_PASSWORD` dans Railway Variables. Elles ne sont jamais préremplies dans l’application ni enregistrées dans le dépôt.
4. Générer le domaine public Railway en HTTPS et vérifier `/health`. Le QR de téléchargement se génère dynamiquement avec le domaine actif.
5. Pour une nouvelle compilation Android, injecter `VITE_API_BASE_URL=https://<domaine-public-railway>` lors de la compilation web/mobile; les appels API du client utiliseront alors ce serveur. Une APK déjà compilée doit être reconstruite pour pointer vers ce domaine.

**Important :** le compte propriétaire est créé depuis les variables privées au démarrage si aucun propriétaire n’existe, y compris lorsque le volume Railway contient déjà une base. Il faut donc définir `OWNER_PHONE` et `OWNER_PASSWORD` avant la première connexion. Une fois un propriétaire existant, modifier ces variables ne remplace pas son mot de passe enregistré. Le fichier JSON convient à un service unique avec volume persistant; pour plusieurs instances ou croissance importante, migrer vers PostgreSQL.
