const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
    checkAndUpdateApp,
    enqueueAppUpdate,
    getAppUpdateStatus,
    getAllUpdateStatuses,
    KNOWN_CATALOG_APPS
} = require('./services/updater');

const {
    loadSettings,
    saveSettings,
    sendNotification
} = require('./services/notifier');

const app = express();
const PORT = process.env.PORT || 5002;
const JWT_SECRET = 'apphub-secret-key-2024';

const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const DATA_FILE = path.join(DATA_DIR, 'apps.json');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');

// Garantir que a pasta data existe
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Admin ────────────────────────────────────────────────────────────────────
const loadAdmin = () => {
    try {
        if (fs.existsSync(ADMIN_FILE)) return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
        const defaultAdmin = { username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10) };
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
        return defaultAdmin;
    } catch (err) {
        return { username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10) };
    }
};
let adminUser = loadAdmin();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ limit: '5000mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ─── Apps ─────────────────────────────────────────────────────────────────────
const defaultApps = [
    {
        id: 1, name: 'Google Chrome', category: 'Navegador', version: '120.0.1',
        description: 'O navegador web mais popular do mundo.',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg',
        downloadUrl: '#', fileSize: '85MB',
        type: 'hosted', platforms: ['macOS', 'Windows', 'Linux'],
        available: true, externalUrl: '',
        downloadCount: 0,
        screenshots: [],
        changelog: 'Melhorias de desempenho e segurança.',
        requirements: 'macOS 11.0 ou superior',
        appleSiliconCompatible: true,
        autoUpdate: true, updateStrategy: 'catalog', catalogId: 'google-chrome', updateUrl: '',
        lastCheckedAt: null, lastUpdateStatus: 'idle',
        updatedAt: new Date().toISOString()
    }
];

const migrateApp = (app) => ({
    type: 'hosted',
    platforms: [],
    available: true,
    externalUrl: '',
    autoUpdate: false,
    updateStrategy: 'catalog',
    updateUrl: '',
    catalogId: '',
    updatePattern: '',
    downloadCount: 0,
    screenshots: [],
    changelog: '',
    requirements: '',
    appleSiliconCompatible: true,
    lastCheckedAt: null,
    lastUpdateStatus: 'idle',
    lastUpdateError: null,
    updatedAt: new Date().toISOString(),
    ...app,
    downloadCount: typeof app.downloadCount === 'number' ? app.downloadCount : 0,
    version: Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0')
});

const loadApps = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            return data.map(migrateApp);
        }
        saveApps(defaultApps);
        return defaultApps;
    } catch (err) {
        return defaultApps;
    }
};

const saveApps = (data) => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error('Erro ao salvar apps:', err); }
};

let apps = loadApps();

// ─── Downloads Log ────────────────────────────────────────────────────────────
const loadDownloads = () => {
    try {
        if (fs.existsSync(DOWNLOADS_FILE)) return JSON.parse(fs.readFileSync(DOWNLOADS_FILE, 'utf8'));
        return [];
    } catch (e) { return []; }
};

const saveDownloads = (data) => {
    try { fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Erro ao salvar downloads:', e); }
};

const recordDownload = (appItem, req) => {
    const downloads = loadDownloads();
    downloads.unshift({
        id: Date.now(),
        appId: appItem.id,
        appName: appItem.name,
        category: appItem.category,
        platforms: appItem.platforms || [],
        fileSize: appItem.fileSize || '0MB',
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString()
    });
    saveDownloads(downloads.slice(0, 500));
};

// ─── Locations ────────────────────────────────────────────────────────────────
const defaultLocations = [];

const loadLocations = () => {
    try {
        if (fs.existsSync(LOCATIONS_FILE)) return JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
        saveLocations(defaultLocations);
        return defaultLocations;
    } catch (err) { return []; }
};

const saveLocations = (data) => {
    try { fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error('Erro ao salvar locais:', err); }
};

let locations = loadLocations();

// ─── Activity Log ─────────────────────────────────────────────────────────────
const loadActivity = () => {
    try {
        if (fs.existsSync(ACTIVITY_FILE)) return JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
        return [];
    } catch (err) { return []; }
};

const saveActivity = (data) => {
    try { fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error('Erro ao salvar atividade:', err); }
};

const logActivity = (action, appName, appType, details) => {
    const activity = loadActivity();
    activity.unshift({
        id: Date.now(),
        action, // 'added' | 'updated' | 'deleted' | 'toggled' | 'auto_updated' | 'update_error'
        appName,
        appType,
        details: details || '',
        timestamp: new Date().toISOString()
    });
    saveActivity(activity.slice(0, 100));
};

// ─── Rotas: Auth ──────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    adminUser = loadAdmin();
    if (username === adminUser.username && bcrypt.compareSync(password, adminUser.passwordHash)) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token });
    }
    res.status(401).json({ message: 'Credenciais inválidas' });
});

app.put('/api/admin/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!bcrypt.compareSync(currentPassword, adminUser.passwordHash))
        return res.status(400).json({ message: 'Senha atual incorreta' });
    adminUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    try {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminUser, null, 2));
        res.json({ message: 'Senha alterada com sucesso' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar nova senha' });
    }
});

// ─── Rotas: Apps ──────────────────────────────────────────────────────────────
app.get('/api/apps', (req, res) => {
    apps = loadApps();
    res.json(apps);
});

// Download com incremento de contador e redirecionamento / entrega
app.get('/api/apps/:id/download', (req, res) => {
    apps = loadApps();
    const appItem = apps.find(a => a.id === parseInt(req.params.id));
    if (!appItem) return res.status(404).send('Aplicativo não encontrado');

    // Incrementar contador
    appItem.downloadCount = (appItem.downloadCount || 0) + 1;
    saveApps(apps);
    recordDownload(appItem, req);

    if (appItem.type === 'linked' && appItem.externalUrl) {
        return res.redirect(appItem.externalUrl);
    }

    if (appItem.downloadUrl && appItem.downloadUrl !== '#') {
        const filename = appItem.downloadUrl.replace('/uploads/', '');
        const filePath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
            return res.download(filePath, filename);
        }
        return res.redirect(appItem.downloadUrl);
    }

    res.status(404).send('Arquivo não disponível para download');
});

app.post('/api/apps', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), (req, res) => {
    apps = loadApps();
    const {
        name, category, version, description, type, platforms, available, externalUrl,
        autoUpdate, updateStrategy, updateUrl, catalogId, updatePattern,
        changelog, requirements, appleSiliconCompatible, screenshots
    } = req.body;

    let iconUrl = 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png';
    if (req.files && req.files['icon']) iconUrl = `/uploads/${req.files['icon'][0].filename}`;

    let parsedScreenshots = [];
    if (screenshots) {
        try { parsedScreenshots = Array.isArray(screenshots) ? screenshots : JSON.parse(screenshots); }
        catch (e) { parsedScreenshots = screenshots.split(',').map(s => s.trim()).filter(Boolean); }
    }

    const newApp = {
        id: apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1,
        name, category, version: version || '1.0.0', description: description || '',
        icon: iconUrl,
        downloadUrl: (req.files && req.files['file']) ? `/uploads/${req.files['file'][0].filename}` : '#',
        fileSize: (req.files && req.files['file']) ? `${(req.files['file'][0].size / (1024 * 1024)).toFixed(2)}MB` : '0MB',
        type: type || 'hosted',
        platforms: platforms ? (Array.isArray(platforms) ? platforms : platforms.split(',').map(p => p.trim())) : [],
        available: available !== undefined ? (available === 'true' || available === true) : true,
        externalUrl: externalUrl || '',
        downloadCount: 0,
        changelog: changelog || '',
        requirements: requirements || '',
        appleSiliconCompatible: appleSiliconCompatible !== undefined ? (appleSiliconCompatible === 'true' || appleSiliconCompatible === true) : true,
        screenshots: parsedScreenshots,
        autoUpdate: autoUpdate === 'true' || autoUpdate === true,
        updateStrategy: updateStrategy || 'catalog',
        updateUrl: updateUrl || '',
        catalogId: catalogId || '',
        updatePattern: updatePattern || '',
        lastCheckedAt: null,
        lastUpdateStatus: 'idle',
        lastUpdateError: null,
        updatedAt: new Date().toISOString()
    };

    apps.push(newApp);
    saveApps(apps);
    logActivity('added', name, type || 'hosted');

    // Notificação se configurada
    try {
        const notifSettings = loadSettings().notifications || {};
        if (notifSettings.enabled && notifSettings.notifyOnNewApp) {
            sendNotification({ type: 'new', app: newApp }).catch(() => {});
        }
    } catch (e) {}

    res.status(201).json(newApp);
});

app.put('/api/apps/:id', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), (req, res) => {
    apps = loadApps();
    const { id } = req.params;
    const {
        name, category, version, description, type, platforms, available, externalUrl,
        autoUpdate, updateStrategy, updateUrl, catalogId, updatePattern,
        changelog, requirements, appleSiliconCompatible, screenshots
    } = req.body;

    const index = apps.findIndex(a => a.id === parseInt(id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });

    let parsedScreenshots = apps[index].screenshots || [];
    if (screenshots !== undefined) {
        try { parsedScreenshots = Array.isArray(screenshots) ? screenshots : JSON.parse(screenshots); }
        catch (e) { parsedScreenshots = typeof screenshots === 'string' ? screenshots.split(',').map(s => s.trim()).filter(Boolean) : []; }
    }

    const updatedApp = {
        ...apps[index],
        name: name || apps[index].name,
        category: category || apps[index].category,
        version: version || apps[index].version,
        description: description !== undefined ? description : apps[index].description,
        type: type || apps[index].type,
        platforms: platforms ? (Array.isArray(platforms) ? platforms : platforms.split(',').map(p => p.trim())) : apps[index].platforms,
        available: available !== undefined ? (available === 'true' || available === true) : apps[index].available,
        externalUrl: externalUrl !== undefined ? externalUrl : apps[index].externalUrl,
        changelog: changelog !== undefined ? changelog : apps[index].changelog,
        requirements: requirements !== undefined ? requirements : apps[index].requirements,
        appleSiliconCompatible: appleSiliconCompatible !== undefined ? (appleSiliconCompatible === 'true' || appleSiliconCompatible === true) : apps[index].appleSiliconCompatible,
        screenshots: parsedScreenshots,
        autoUpdate: autoUpdate !== undefined ? (autoUpdate === 'true' || autoUpdate === true) : apps[index].autoUpdate,
        updateStrategy: updateStrategy || apps[index].updateStrategy,
        updateUrl: updateUrl !== undefined ? updateUrl : apps[index].updateUrl,
        catalogId: catalogId !== undefined ? catalogId : apps[index].catalogId,
        updatePattern: updatePattern !== undefined ? updatePattern : apps[index].updatePattern,
        updatedAt: new Date().toISOString()
    };

    if (req.files && req.files['file']) {
        const oldFile = apps[index].downloadUrl.replace('/uploads/', '');
        if (oldFile && oldFile !== '#') {
            const oldPath = path.join(__dirname, 'uploads', oldFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updatedApp.downloadUrl = `/uploads/${req.files['file'][0].filename}`;
        updatedApp.fileSize = `${(req.files['file'][0].size / (1024 * 1024)).toFixed(2)}MB`;
    }

    if (req.files && req.files['icon']) {
        if (apps[index].icon.startsWith('/uploads/')) {
            const oldIconPath = path.join(__dirname, 'uploads', apps[index].icon.split('/').pop());
            if (fs.existsSync(oldIconPath)) fs.unlinkSync(oldIconPath);
        }
        updatedApp.icon = `/uploads/${req.files['icon'][0].filename}`;
    }

    apps[index] = updatedApp;
    saveApps(apps);
    logActivity('updated', updatedApp.name, updatedApp.type);
    res.json(updatedApp);
});

// Toggle disponibilidade
app.patch('/api/apps/:id/toggle', authenticateToken, (req, res) => {
    apps = loadApps();
    const index = apps.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });
    apps[index].available = !apps[index].available;
    apps[index].updatedAt = new Date().toISOString();
    saveApps(apps);
    logActivity('toggled', apps[index].name, apps[index].type);
    res.json(apps[index]);
});

app.delete('/api/apps/:id', authenticateToken, (req, res) => {
    apps = loadApps();
    const index = apps.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });

    const appName = apps[index].name;
    const appType = apps[index].type;

    const fileName = apps[index].downloadUrl.replace('/uploads/', '');
    if (fileName && fileName !== '#') {
        const filePath = path.join(__dirname, 'uploads', fileName);
        if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) {} }
    }
    if (apps[index].icon.startsWith('/uploads/')) {
        const iconPath = path.join(__dirname, 'uploads', apps[index].icon.split('/').pop());
        if (fs.existsSync(iconPath)) { try { fs.unlinkSync(iconPath); } catch (e) {} }
    }

    apps.splice(index, 1);
    saveApps(apps);
    logActivity('deleted', appName, appType);
    res.json({ message: 'App excluído com sucesso' });
});

// ─── Rotas: Auto-Update ───────────────────────────────────────────────────────
app.get('/api/catalog', (req, res) => {
    res.json(KNOWN_CATALOG_APPS);
});

app.post('/api/apps/:id/check-update', authenticateToken, async (req, res) => {
    apps = loadApps();
    const appItem = apps.find(a => a.id === parseInt(req.params.id));
    if (!appItem) return res.status(404).json({ message: 'App não encontrado' });

    const force = req.body && req.body.force === true;
    res.json({ message: `Verificação de atualização iniciada para ${appItem.name}`, appId: appItem.id });

    try {
        await enqueueAppUpdate(appItem, { forceDownload: force }, {
            onSaveApp: (updated) => {
                apps = loadApps();
                const idx = apps.findIndex(a => a.id === updated.id);
                if (idx !== -1) {
                    apps[idx] = updated;
                    saveApps(apps);
                }
            },
            onLogActivity: (action, name, type) => {
                logActivity(action, name, type, 'Atualização automática concluída com sucesso');
            }
        });
    } catch (err) {
        console.error(`Falha no auto-update de ${appItem.name}:`, err.message);
        apps = loadApps();
        const idx = apps.findIndex(a => a.id === appItem.id);
        if (idx !== -1) {
            apps[idx].lastCheckedAt = new Date().toISOString();
            apps[idx].lastUpdateStatus = 'error';
            apps[idx].lastUpdateError = err.message;
            saveApps(apps);
        }
        logActivity('updated', appItem.name, appItem.type, `Erro na atualização: ${err.message}`);
    }
});

app.post('/api/apps/check-all', authenticateToken, async (req, res) => {
    apps = loadApps();
    const autoApps = apps.filter(a => a.autoUpdate);
    if (autoApps.length === 0) {
        return res.json({ message: 'Nenhum aplicativo com atualização automática ativada.', total: 0 });
    }

    res.json({ message: `Iniciada verificação para ${autoApps.length} aplicativo(s).`, total: autoApps.length });

    for (const item of autoApps) {
        enqueueAppUpdate(item, { forceDownload: false }, {
            onSaveApp: (updated) => {
                apps = loadApps();
                const idx = apps.findIndex(a => a.id === updated.id);
                if (idx !== -1) {
                    apps[idx] = updated;
                    saveApps(apps);
                }
            },
            onLogActivity: (action, name, type) => {
                logActivity(action, name, type, 'Atualizado automaticamente');
            }
        }).catch(err => {
            console.error(`Falha no auto-update de ${item.name}:`, err.message);
        });
    }
});

app.get('/api/apps/:id/update-progress', (req, res) => {
    const status = getAppUpdateStatus(req.params.id);
    res.json(status);
});

app.get('/api/updates/status', (req, res) => {
    res.json(getAllUpdateStatuses());
});

// ─── Rotas: Notificações ─────────────────────────────────────────────────────
app.get('/api/settings/notifications', authenticateToken, (req, res) => {
    res.json(loadSettings().notifications || {});
});

app.post('/api/settings/notifications', authenticateToken, (req, res) => {
    const current = loadSettings();
    current.notifications = {
        ...current.notifications,
        ...req.body
    };
    saveSettings(current);
    res.json({ message: 'Configurações de notificação salvas com sucesso', notifications: current.notifications });
});

app.post('/api/settings/notifications/test', authenticateToken, async (req, res) => {
    try {
        const result = await sendNotification({
            type: 'test',
            customMessage: req.body?.customMessage || 'Teste de conexão enviado com sucesso do AppHub da Apple Developer Academy!',
            overrideSettings: req.body
        });
        if (result.sent) {
            res.json({ message: 'Notificação de teste disparada com sucesso!' });
        } else {
            res.status(400).json({ message: result.error || result.reason || 'Falha ao enviar notificação' });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Rotas: Monitor & Estatísticas ────────────────────────────────────────────
app.get('/api/monitor', authenticateToken, (req, res) => {
    apps = loadApps();
    const activity = loadActivity();
    const updateStatuses = getAllUpdateStatuses();
    const downloads = loadDownloads();

    const totalDownloads = apps.reduce((acc, a) => acc + (a.downloadCount || 0), 0);

    // Top 5 apps mais baixados
    const topDownloadedApps = [...apps]
        .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
        .slice(0, 5)
        .map(a => ({
            id: a.id,
            name: a.name,
            icon: a.icon,
            count: a.downloadCount || 0,
            category: a.category,
            version: Array.isArray(a.version) ? a.version[0] : (a.version || '1.0.0')
        }));

    // Downloads por plataforma
    const downloadsByPlatform = { macOS: 0, iOS: 0, iPadOS: 0, Windows: 0, Linux: 0 };
    apps.forEach(a => {
        (a.platforms || []).forEach(p => {
            const key = p === 'iPhone' ? 'iOS' : (p === 'iPad' ? 'iPadOS' : p);
            if (downloadsByPlatform[key] !== undefined) {
                downloadsByPlatform[key] += (a.downloadCount || 0);
            }
        });
    });

    // Tráfego aproximado servido em GB
    let totalMB = 0;
    apps.forEach(a => {
        const mb = parseFloat(a.fileSize) || 0;
        totalMB += mb * (a.downloadCount || 0);
    });
    const totalBandwidthGB = (totalMB / 1024).toFixed(2);

    const stats = {
        total: apps.length,
        available: apps.filter(a => a.available).length,
        unavailable: apps.filter(a => !a.available).length,
        autoUpdateEnabled: apps.filter(a => a.autoUpdate).length,
        totalDownloads,
        totalBandwidthGB,
        topDownloadedApps,
        downloadsByPlatform,
        hosted: apps.filter(a => a.type === 'hosted').length,
        linked: apps.filter(a => a.type === 'linked').length,
        file: apps.filter(a => a.type === 'file').length,
        byPlatform: {
            macOS: apps.filter(a => a.platforms && a.platforms.includes('macOS')).length,
            Windows: apps.filter(a => a.platforms && a.platforms.includes('Windows')).length,
            Linux: apps.filter(a => a.platforms && a.platforms.includes('Linux')).length,
            iPhone: apps.filter(a => a.platforms && a.platforms.includes('iPhone')).length,
            iPad: apps.filter(a => a.platforms && a.platforms.includes('iPad')).length,
        }
    };

    res.json({ apps, activity, stats, updateStatuses, recentDownloads: downloads.slice(0, 20) });
});

// ─── Rotas: Locations ─────────────────────────────────────────────────────────
app.get('/api/locations', (req, res) => {
    locations = loadLocations();
    res.json(locations);
});

app.post('/api/locations', authenticateToken, (req, res) => {
    locations = loadLocations();
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ message: 'Nome é obrigatório' });

    const newLocation = {
        id: locations.length > 0 ? Math.max(...locations.map(l => l.id)) + 1 : 1,
        name, description: description || '', icon: icon || '🏢',
        createdAt: new Date().toISOString()
    };
    locations.push(newLocation);
    saveLocations(locations);
    res.status(201).json(newLocation);
});

app.put('/api/locations/:id', authenticateToken, (req, res) => {
    locations = loadLocations();
    const index = locations.findIndex(l => l.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Local não encontrado' });
    const { name, description, icon } = req.body;
    locations[index] = { ...locations[index], name: name || locations[index].name, description: description !== undefined ? description : locations[index].description, icon: icon || locations[index].icon };
    saveLocations(locations);
    res.json(locations[index]);
});

app.delete('/api/locations/:id', authenticateToken, (req, res) => {
    locations = loadLocations();
    const index = locations.findIndex(l => l.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Local não encontrado' });
    locations.splice(index, 1);
    saveLocations(locations);
    res.json({ message: 'Local excluído com sucesso' });
});

// ─── Rotas: Activity ─────────────────────────────────────────────────────────
app.get('/api/activity', authenticateToken, (req, res) => {
    res.json(loadActivity());
});

// ─── Rotina Periódica de Verificação Automática (a cada 6 horas) ─────────────
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
setInterval(() => {
    try {
        const currentApps = loadApps();
        const autoApps = currentApps.filter(a => a.autoUpdate);
        if (autoApps.length > 0) {
            console.log(`[AutoUpdate] Executando rotina agendada para ${autoApps.length} app(s)...`);
            for (const item of autoApps) {
                enqueueAppUpdate(item, { forceDownload: false }, {
                    onSaveApp: (updated) => {
                        const all = loadApps();
                        const idx = all.findIndex(a => a.id === updated.id);
                        if (idx !== -1) { all[idx] = updated; saveApps(all); }
                    },
                    onLogActivity: (action, name, type) => {
                        logActivity(action, name, type, 'Atualizado pela rotina automática');
                    }
                }).catch(err => {
                    console.error(`[AutoUpdate] Erro na rotina agendada para ${item.name}:`, err.message);
                });
            }
        }
    } catch (e) {
        console.error('[AutoUpdate] Erro na execução da rotina periódica:', e.message);
    }
}, AUTO_CHECK_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Servidor AppHub rodando na porta ${PORT}`);
});
