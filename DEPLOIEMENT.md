# Déployer le formulaire en ligne

Tu as déjà un compte GitHub, donc voici le chemin le plus simple : **GitHub + Render** pour héberger le site, **Turso** pour la base de données (les deux sont gratuits, sans carte bancaire).

Pourquoi deux services ? Render "gratuit" efface les fichiers du serveur à chaque redémarrage — donc si on gardait la base SQLite dessus, tes messages disparaîtraient de temps en temps. Turso héberge la base à part, gratuitement et de façon permanente.

---

## Étape 1 — Mettre le code sur GitHub

Dans le dossier du projet, sur ton ordinateur :

```bash
cd formulaire-db
git init
git add .
git commit -m "Premier envoi"
```

Puis sur [github.com](https://github.com), clique sur **New repository**, donne-lui un nom (ex. `formulaire-db`), laisse-le vide (pas de README généré), et crée-le. GitHub t'affichera des commandes ; utilise celles-ci :

```bash
git remote add origin https://github.com/TON-PSEUDO/formulaire-db.git
git branch -M main
git push -u origin main
```

## Étape 2 — Créer la base de données sur Turso

1. Va sur [app.turso.tech](https://app.turso.tech) et crée un compte (gratuit, tu peux te connecter avec GitHub).
2. Crée une nouvelle base de données (bouton "Create Database"), donne-lui un nom, par exemple `formulaire`.
3. Une fois créée, ouvre la base et récupère deux informations :
   - l'**URL de connexion** (commence par `libsql://...`)
   - un **jeton d'authentification** (bouton "Create Token")

Garde ces deux valeurs de côté, tu en auras besoin à l'étape suivante.

## Étape 3 — Déployer sur Render

1. Va sur [render.com](https://render.com) et crée un compte (tu peux te connecter avec GitHub directement).
2. Clique sur **New +** → **Web Service**.
3. Connecte ton dépôt GitHub `formulaire-db`.
4. Render détecte Node.js automatiquement. Vérifie/renseigne :
   - **Build command** : `npm install`
   - **Start command** : `npm start`
   - **Instance type** : Free
5. Dans la section **Environment Variables**, ajoute :
   - `TURSO_DATABASE_URL` → l'URL récupérée à l'étape 2
   - `TURSO_AUTH_TOKEN` → le jeton récupéré à l'étape 2
   - `ADMIN_USER` → le nom d'utilisateur pour accéder à `/admin` (ex. `admin`)
   - `ADMIN_PASSWORD` → un mot de passe fort de ton choix (ne garde surtout pas `changeme`)
6. Clique sur **Create Web Service**.

Render installe les dépendances et démarre le serveur. Après une minute ou deux, ton site est en ligne à une adresse du type :

```
https://formulaire-db.onrender.com
```

## Étape 4 — Vérifier

Ouvre l'adresse fournie par Render et remplis le formulaire — tu dois voir un message de confirmation, sans aucune donnée affichée publiquement.

Pour consulter les messages reçus, va sur `https://ton-site.onrender.com/admin`. Le navigateur te demande un nom d'utilisateur et un mot de passe : utilise ceux définis dans `ADMIN_USER` / `ADMIN_PASSWORD` à l'étape 3.

Tu peux aussi consulter les données directement depuis le tableau de bord Turso (onglet "Data" de ta base).

---

## À savoir sur le tier gratuit

- **Render** met le service en veille après 15 minutes sans visite ; la première requête suivante prend ~1 minute à répondre (le temps que le serveur se réveille). Pour un usage personnel ou une démo, c'est très bien. Pour un site à fort trafic, il faudrait passer à un plan payant (à partir de 7 $/mois) pour éviter cette veille.
- **Turso** offre 5 Go de stockage et un grand nombre de lectures/écritures gratuites par mois — largement suffisant pour ce genre de formulaire.

## Mettre à jour le site après une modification

Après avoir modifié le code localement :

```bash
git add .
git commit -m "Description de la modification"
git push
```

Render redéploie automatiquement à chaque `push` sur la branche `main`.
