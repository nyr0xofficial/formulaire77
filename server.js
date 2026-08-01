// server.js
// Serveur Express : reçoit les données du formulaire public et les enregistre
// dans une base SQLite (via @libsql/client). Une page admin protégée par
// mot de passe permet de consulter et supprimer les messages.
//
// En local : les données sont stockées dans un fichier local.db (aucune configuration).
// En ligne : définir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN pour utiliser une base
// Turso (gratuite, persistante). Voir DEPLOIEMENT.md.

const express = require('express');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Base de données ---------------------------------------------------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'local.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN, // ignoré en local
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      date_creation TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// --- Authentification de la page admin ------------------------------------
// Identifiants définis par variables d'environnement (à changer en production).
// Locale par défaut : admin / changeme
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sepIndex = decoded.indexOf(':');
    const user = decoded.slice(0, sepIndex);
    const pass = decoded.slice(sepIndex + 1);
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
      return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="Administration"');
  return res.status(401).send('Authentification requise.');
}

// --- Middlewares ---------------------------------------------------------
app.use(express.json());

// Page admin (protégée) — servie depuis /private, jamais accessible en statique public
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Formulaire public
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes API ------------------------------------------------------------

// Enregistrer une nouvelle entrée (public — n'importe quel visiteur peut envoyer un message)
app.post('/api/messages', async (req, res) => {
  const { nom, email, message } = req.body || {};

  if (!nom || !email || !message) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "L'adresse email n'est pas valide." });
  }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO messages (nom, email, message) VALUES (?, ?, ?)',
      args: [nom.trim(), email.trim(), message.trim()],
    });
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement." });
  }
});

// Lister toutes les entrées — protégé, réservé à l'admin
app.get('/api/messages', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM messages ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la lecture des messages.' });
  }
});

// Supprimer une entrée — protégé, réservé à l'admin
app.delete('/api/messages/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [req.params.id] });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré : http://localhost:${PORT}`);
      console.log(`Admin : http://localhost:${PORT}/admin (identifiants : ${ADMIN_USER} / ${ADMIN_PASSWORD})`);
    });
  })
  .catch((err) => {
    console.error('Impossible de préparer la base de données :', err);
    process.exit(1);
  });
