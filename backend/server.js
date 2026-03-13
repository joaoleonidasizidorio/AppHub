const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5002;
const JWT_SECRET = 'apphub-secret-key-2024'; // Em produção, use variável de ambiente

const ADMIN_FILE = path.join(__dirname, 'data', 'admin.json');

// Usuário admin carregado de arquivo ou padrão
const loadAdmin = () => {
    try {
        if (fs.existsSync(ADMIN_FILE)) {
            return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
        }
        const defaultAdmin = {
            username: 'admin',
            passwordHash: bcrypt.hashSync('admin123', 10)
        };
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
        return defaultAdmin;
    } catch (err) {
        console.error('Erro ao carregar admin:', err);
        return { username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10) };
    }
};

let adminUser = loadAdmin();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ limit: '5000mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de Autenticação
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

// Configuração do Multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Banco de dados em arquivo JSON
const DATA_FILE = path.join(__dirname, 'data', 'apps.json');

// Garantir que a pasta data existe
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Dados iniciais padrão
const defaultApps = [
    {
        id: 1,
        name: 'Google Chrome',
        category: 'Navegador',
        version: '120.0.1',
        description: 'O navegador web mais popular do mundo.',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg',
        downloadUrl: '#',
        fileSize: '85MB'
    },
    {
        id: 2,
        name: 'VS Code',
        category: 'Desenvolvimento',
        version: '1.85.1',
        description: 'Editor de código poderoso e extensível.',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg',
        downloadUrl: '#',
        fileSize: '95MB'
    },
    {
        id: 3,
        name: 'Docker Desktop',
        category: 'Ferramentas',
        version: '4.26.0',
        description: 'Interface para gerenciar containers Docker.',
        icon: 'https://www.docker.com/wp-content/uploads/2023/08/logo-guide-logos-1.svg',
        downloadUrl: '#',
        fileSize: '540MB'
    }
];

// Funções de Persistência
const loadApps = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            console.log('Dados carregados com sucesso:', JSON.parse(data).length, 'apps');
            return JSON.parse(data);
        }
        console.log('Arquivo de dados não encontrado, criando padrão...');
        saveApps(defaultApps);
        return defaultApps;
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        return defaultApps;
    }
};

const saveApps = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Dados salvos com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar dados:', err);
    }
};

// Carregar dados na inicialização
let apps = loadApps();

// Rotas
app.get('/api/apps', (req, res) => {
    // Recarregar sempre para garantir dados frescos
    apps = loadApps();
    res.json(apps);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    adminUser = loadAdmin(); // Recarregar para garantir que temos a senha atual
    if (username === adminUser.username && bcrypt.compareSync(password, adminUser.passwordHash)) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token });
    }
    res.status(401).json({ message: 'Credenciais inválidas' });
});

app.put('/api/admin/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!bcrypt.compareSync(currentPassword, adminUser.passwordHash)) {
        return res.status(400).json({ message: 'Senha atual incorreta' });
    }

    adminUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    try {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminUser, null, 2));
        res.json({ message: 'Senha alterada com sucesso' });
    } catch (err) {
        console.error('Erro ao salvar nova senha:', err);
        res.status(500).json({ message: 'Erro ao salvar nova senha' });
    }
});

app.post('/api/apps', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), (req, res) => {
    const { name, category, version, description } = req.body;

    let iconUrl = 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png'; // Icon padrão
    if (req.files && req.files['icon']) {
        iconUrl = `/uploads/${req.files['icon'][0].filename}`;
    }

    const newApp = {
        id: apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1,
        name,
        category,
        version,
        description,
        icon: iconUrl,
        downloadUrl: (req.files && req.files['file']) ? `/uploads/${req.files['file'][0].filename}` : '#',
        fileSize: (req.files && req.files['file']) ? `${(req.files['file'][0].size / (1024 * 1024)).toFixed(2)}MB` : '0MB'
    };
    apps.push(newApp);
    saveApps(apps);
    res.status(201).json(newApp);
});

app.put('/api/apps/:id', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), (req, res) => {
    const { id } = req.params;
    const { name, category, version, description } = req.body;

    const index = apps.findIndex(a => a.id === parseInt(id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });

    const updatedApp = {
        ...apps[index],
        name: name || apps[index].name,
        category: category || apps[index].category,
        version: version || apps[index].version,
        description: description || apps[index].description
    };

    if (req.files && req.files['file']) {
        // Remover arquivo antigo se um novo for enviado
        const oldFile = apps[index].downloadUrl.split('/').pop();
        if (oldFile && oldFile !== '#') {
            const oldPath = path.join(__dirname, 'uploads', oldFile);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        updatedApp.downloadUrl = `/uploads/${req.files['file'][0].filename}`;
        updatedApp.fileSize = `${(req.files['file'][0].size / (1024 * 1024)).toFixed(2)}MB`;
    }

    if (req.files && req.files['icon']) {
        // Remover ícone antigo se um novo for enviado e não for o padrão
        const oldIcon = apps[index].icon.split('/').pop();
        if (oldIcon && apps[index].icon.startsWith('/uploads/')) {
            const oldIconPath = path.join(__dirname, 'uploads', oldIcon);
            if (fs.existsSync(oldIconPath)) fs.unlinkSync(oldIconPath);
        }

        updatedApp.icon = `/uploads/${req.files['icon'][0].filename}`;
    }

    apps[index] = updatedApp;
    saveApps(apps);
    res.json(updatedApp);
});

app.delete('/api/apps/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const index = apps.findIndex(a => a.id === parseInt(id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });

    // Remover arquivo físico
    const fileName = apps[index].downloadUrl.split('/').pop();
    if (fileName && fileName !== '#') {
        const filePath = path.join(__dirname, 'uploads', fileName);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error('Erro ao deletar arquivo:', err);
            }
        }
    }

    // Remover ícone físico se existir e não for remoto
    if (apps[index].icon.startsWith('/uploads/')) {
        const iconName = apps[index].icon.split('/').pop();
        const iconPath = path.join(__dirname, 'uploads', iconName);
        if (fs.existsSync(iconPath)) {
            try {
                fs.unlinkSync(iconPath);
            } catch (err) {
                console.error('Erro ao deletar ícone:', err);
            }
        }
    }

    apps.splice(index, 1);
    saveApps(apps);
    res.json({ message: 'App excluído com sucesso' });
});

app.listen(PORT, () => {
    console.log(`Servidor AppHub rodando na porta ${PORT}`);
});
