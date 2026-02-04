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

// Usuário admin padrão (senha: admin123)
const adminUser = {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10)
};

// Middleware
app.use(cors());
app.use(express.json());
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

// Banco de dados em memória (para este exemplo inicial)
let apps = [
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

// Rotas
app.get('/api/apps', (req, res) => {
    res.json(apps);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === adminUser.username && bcrypt.compareSync(password, adminUser.passwordHash)) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token });
    }
    res.status(401).json({ message: 'Credenciais inválidas' });
});

app.post('/api/apps', authenticateToken, upload.single('file'), (req, res) => {
    const { name, category, version, description } = req.body;
    const newApp = {
        id: apps.length + 1,
        name,
        category,
        version,
        description,
        icon: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png', // Icon padrão
        downloadUrl: req.file ? `/uploads/${req.file.filename}` : '#',
        fileSize: req.file ? `${(req.file.size / (1024 * 1024)).toFixed(2)}MB` : '0MB'
    };
    apps.push(newApp);
    res.status(201).json(newApp);
});

app.put('/api/apps/:id', authenticateToken, upload.single('file'), (req, res) => {
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

    if (req.file) {
        // Remover arquivo antigo se um novo for enviado
        const oldFile = apps[index].downloadUrl.split('/').pop();
        const oldPath = path.join(__dirname, 'uploads', oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

        updatedApp.downloadUrl = `/uploads/${req.file.filename}`;
        updatedApp.fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`;
    }

    apps[index] = updatedApp;
    res.json(updatedApp);
});

app.delete('/api/apps/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const index = apps.findIndex(a => a.id === parseInt(id));
    if (index === -1) return res.status(404).json({ message: 'App não encontrado' });

    // Remover arquivo físico
    const fileName = apps[index].downloadUrl.split('/').pop();
    const filePath = path.join(__dirname, 'uploads', fileName);
    if (fs.existsSync(filePath) && fileName !== '#') {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error('Erro ao deletar arquivo:', err);
        }
    }

    apps.splice(index, 1);
    res.json({ message: 'App excluído com sucesso' });
});

app.listen(PORT, () => {
    console.log(`Servidor AppHub rodando na porta ${PORT}`);
});
