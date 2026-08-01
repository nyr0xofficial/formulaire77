// server.js
// Serveur Express qui reçoit les données du formulaire et les enregistre
// dans une base de données SQLite via @libsql/client.
//
// En local : les données sont stockées dans un fichier local.db (aucune configuration).
// En ligne : définir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN pour utiliser une base
// Turso (gratuite, persistante). Voir DEPLOIEMENT.md pour les instructions.

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

// --- Middlewares ---------------------------------------------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes API ------------------------------------------------------------

// Enregistrer une nouvelle entrée
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

// Lister toutes les entrées (les plus récentes en premier)
app.get('/api/messages', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM messages ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la lecture des messages.' });
  }
});

// Supprimer une entrée
app.delete('/api/messages/:id', async (req, res) => {
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
    });
  })
  .catch((err) => {
    console.error('Impossible de préparer la base de données :', err);
    process.exit(1);
  });
