# Carnet de messages

Formulaire simple avec envoi des données vers une base de données SQLite.

## Ce que contient le projet

- `server.js` — serveur Node.js (Express) qui reçoit les données et les enregistre.
- `public/index.html` — le formulaire public. Après envoi, seul un message de confirmation s'affiche — aucune donnée n'est visible publiquement.
- `private/admin.html` — la liste des messages reçus, accessible uniquement via `/admin` avec un nom d'utilisateur et un mot de passe.
- `local.db` — la base de données SQLite locale, créée automatiquement au premier lancement (ignorée par git).
- `DEPLOIEMENT.md` — guide pas-à-pas pour mettre ce projet en ligne gratuitement.

## Installation et lancement en local

Il faut avoir [Node.js](https://nodejs.org) installé (version 18 ou plus récente).

```bash
# 1. Se placer dans le dossier du projet
cd formulaire-db

# 2. Installer les dépendances (une seule fois)
npm install

# 3. Démarrer le serveur
npm start
```

Puis ouvrir **http://localhost:3000** dans le navigateur. En local, les données sont stockées dans un fichier `local.db` — aucune configuration nécessaire.

Pour consulter les messages reçus, ouvrir **http://localhost:3000/admin** — identifiants par défaut en local : `admin` / `changeme` (à changer en production via les variables d'environnement `ADMIN_USER` et `ADMIN_PASSWORD`).

## Comment ça fonctionne

1. Un visiteur remplit le formulaire (nom, email, message) sur la page publique `index.html`.
2. En cliquant sur "Envoyer", le navigateur envoie les données au serveur via une requête `POST /api/messages` (route publique, sans authentification).
3. Le serveur (`server.js`) vérifie les données, puis les insère dans la table `messages` de la base SQLite. La page affiche uniquement un message de confirmation — aucune donnée n'est renvoyée au visiteur.
4. Sur `/admin`, protégée par mot de passe, la liste des messages se charge via `GET /api/messages` (route protégée).
5. Chaque entrée peut être supprimée depuis `/admin` avec le bouton "supprimer" (`DELETE /api/messages/:id`, également protégée).

## Mettre le site en ligne

Voir **[DEPLOIEMENT.md](./DEPLOIEMENT.md)** pour le guide complet (GitHub + Render + Turso, gratuit).

En résumé : le serveur utilise [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts), qui fonctionne aussi bien avec un fichier local (`local.db`, par défaut) qu'avec une base [Turso](https://turso.tech) hébergée en ligne — il suffit de définir les variables d'environnement `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` en production.

## Pour aller plus loin

- Ajouter une protection anti-spam (ex. reCAPTCHA) si le formulaire est public sur internet.
- Ajouter une authentification si tu veux restreindre qui peut voir ou supprimer les messages.
- Personnaliser les couleurs et polices dans `public/index.html` (tout le style est dans la balise `<style>`).
