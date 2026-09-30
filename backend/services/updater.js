const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendNotification, loadSettings } = require('./notifier');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Estado em memória dos downloads em andamento
const activeDownloads = new Map(); // appId -> { progress, totalBytes, downloadedBytes, speed, status, message, startedAt }
const updateQueue = [];
let isProcessingQueue = false;

// ─── Utilitários ─────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0MB';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
};

const extractVersionFromText = (text) => {
    if (!text || typeof text !== 'string') return null;
    // Tenta encontrar padrões comuns como 1.2.3, v2.0.1, 15.1.1, etc.
    const match = text.match(/(?:v|version|-|_|\/)?(\d+(?:\.\d+)+(?:-[a-zA-Z0-9]+)?)/i);
    return match ? match[1] : null;
};

// ─── Download via Stream com Progresso ────────────────────────────────────────
const downloadFileWithProgress = async (fileUrl, suggestedFilename, appId, onProgress) => {
    const tempFilename = `temp-${Date.now()}-${suggestedFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const tempPath = path.join(UPLOADS_DIR, tempFilename);
    const writer = fs.createWriteStream(tempPath);

    let startTime = Date.now();
    let downloadedBytes = 0;

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
            timeout: 120000, // 2 minutos para iniciar conexão
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            },
            maxRedirects: 8
        });

        const totalBytes = parseInt(response.headers['content-length'] || 0, 10);

        // Notificação de início
        if (onProgress) {
            onProgress({
                appId,
                progress: 0,
                downloadedBytes: 0,
                totalBytes,
                speed: 'Iniciando...',
                status: 'downloading'
            });
        }

        let lastReport = Date.now();

        await new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const now = Date.now();
                if (now - lastReport > 400 || downloadedBytes === totalBytes) {
                    lastReport = now;
                    const elapsedSeconds = (now - startTime) / 1000 || 1;
                    const bytesPerSec = downloadedBytes / elapsedSeconds;
                    const speed = (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
                    const progress = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

                    if (onProgress) {
                        onProgress({
                            appId,
                            progress,
                            downloadedBytes,
                            totalBytes,
                            speed,
                            status: 'downloading'
                        });
                    }
                }
            });

            response.data.pipe(writer);

            writer.on('finish', resolve);
            writer.on('error', (err) => {
                writer.close();
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                reject(err);
            });
            response.data.on('error', (err) => {
                writer.close();
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                reject(err);
            });
        });

        const finalFilename = `${Date.now()}-${suggestedFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const finalPath = path.join(UPLOADS_DIR, finalFilename);
        fs.renameSync(tempPath, finalPath);

        const stats = fs.statSync(finalPath);
        return {
            filename: finalFilename,
            filePath: finalPath,
            downloadUrl: `/uploads/${finalFilename}`,
            fileSize: formatBytes(stats.size),
            sizeBytes: stats.size
        };

    } catch (error) {
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
        throw error;
    }
};

// ─── Provedores de Atualização ────────────────────────────────────────────────

// 1. Provedor: Catálogo Automatizado (Homebrew Cask / Apps Populares)
const checkCatalogUpdate = async (catalogToken) => {
    if (!catalogToken) throw new Error('Identificador do catálogo é obrigatório');
    const token = catalogToken.trim().toLowerCase();
    const url = `https://formulae.brew.sh/api/cask/${token}.json`;
    const res = await axios.get(url, { timeout: 15000 });
    const { version, url: downloadUrl } = res.data;
    if (!downloadUrl) throw new Error('URL de download não encontrada no catálogo');

    // Determinar nome sugerido do arquivo
    let suggestedName = `${token}-${version}.dmg`;
    try {
        const parsed = new URL(downloadUrl);
        const base = path.basename(parsed.pathname);
        if (base && (base.endsWith('.dmg') || base.endsWith('.pkg') || base.endsWith('.zip') || base.endsWith('.exe'))) {
            suggestedName = base;
        }
    } catch (e) {}

    return {
        remoteVersion: version,
        downloadUrl,
        suggestedName
    };
};

// 2. Provedor: Link Direto (HEAD / Headers / Redirects)
const checkDirectUrlUpdate = async (directUrl) => {
    if (!directUrl) throw new Error('URL direta é obrigatória');
    const res = await axios({
        method: 'head',
        url: directUrl,
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        },
        maxRedirects: 8
    });

    const headers = res.headers;
    const finalUrl = res.request?.res?.responseUrl || directUrl;

    let suggestedName = 'installer.dmg';
    let remoteVersion = null;

    // Tentar pegar o nome do arquivo a partir de Content-Disposition
    const disposition = headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match) suggestedName = match[1];
    } else {
        try {
            const parsed = new URL(finalUrl);
            const base = path.basename(parsed.pathname);
            if (base && base.includes('.')) suggestedName = base;
        } catch (e) {}
    }

    remoteVersion = extractVersionFromText(suggestedName) || headers['etag'] || headers['last-modified'] || null;

    return {
        remoteVersion,
        downloadUrl: finalUrl,
        suggestedName,
        etag: headers['etag'],
        lastModified: headers['last-modified']
    };
};

// 3. Provedor: Raspagem de Página Web (Web Scraping)
const checkWebScrapeUpdate = async (pageUrl, customPattern) => {
    if (!pageUrl) throw new Error('URL da página é obrigatória');
    const res = await axios.get(pageUrl, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    // Suporte especial inteligente para XcodeReleases.com (Filtra apenas versões finais / Release, descartando betas)
    if (pageUrl.includes('xcodereleases.com')) {
        try {
            const dataUrl = 'https://xcodereleases.com/data.json';
            const jsonRes = await axios.get(dataUrl, { timeout: 15000 });
            const data = jsonRes.data;
            if (Array.isArray(data)) {
                const latestRelease = data.find(x => x.name === 'Xcode' && x.version?.release?.release === true);
                if (latestRelease) {
                    const remoteVersion = latestRelease.version?.number || null;
                    const downloadUrl = latestRelease.links?.download?.url || '';
                    const suggestedName = `Xcode_${remoteVersion || 'Latest'}.xip`;
                    return {
                        remoteVersion,
                        downloadUrl,
                        suggestedName
                    };
                }
            }
        } catch (e) {
            console.error('[Updater] Erro ao consultar XcodeReleases:', e.message);
        }
    }

    const html = res.data;
    if (typeof html !== 'string') throw new Error('Conteúdo da página não é texto');

    let pattern;
    if (customPattern) {
        try {
            pattern = new RegExp(customPattern, 'i');
        } catch (e) {
            pattern = /(https?:\/\/[^\s"'<>]+\.(?:dmg|pkg|exe|zip|xip))/i;
        }
    } else {
        // Padrão inteligente que busca links de instalador (.dmg, .pkg, .xip, .exe, .zip)
        pattern = /(?:href=["'])((?:https?:\/\/[^\s"'<>]+|\/[^\s"'<>]+)\.(?:dmg|pkg|exe|zip|xip))["']/i;
    }

    const match = html.match(pattern);
    if (!match || !match[1]) {
        throw new Error('Nenhum link de download (.dmg, .pkg, .exe) encontrado na página');
    }

    let foundLink = match[1];
    // Resolver URL relativa se necessário
    if (!foundLink.startsWith('http')) {
        foundLink = new URL(foundLink, pageUrl).href;
    }

    let suggestedName = path.basename(new URL(foundLink).pathname) || 'update.dmg';
    let remoteVersion = extractVersionFromText(suggestedName) || extractVersionFromText(foundLink);

    return {
        remoteVersion,
        downloadUrl: foundLink,
        suggestedName
    };
};

// 4. Provedor: GitHub Releases
const checkGithubUpdate = async (repo) => {
    if (!repo) throw new Error('Repositório GitHub (autor/repo) é obrigatório');
    const cleanRepo = repo.replace('https://github.com/', '').replace(/\/$/, '');
    const apiUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
    const res = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
            'User-Agent': 'AppHub-Updater'
        }
    });

    const release = res.data;
    const tagName = release.tag_name || release.name || '';
    const remoteVersion = extractVersionFromText(tagName) || tagName.replace(/^v/i, '');

    // Procurar asset compatível
    const assets = release.assets || [];
    const validAsset = assets.find(a => /\.(dmg|pkg|exe|zip)$/i.test(a.name)) || assets[0];

    if (!validAsset) throw new Error('Nenhum instalador encontrado no release do GitHub');

    return {
        remoteVersion,
        downloadUrl: validAsset.browser_download_url,
        suggestedName: validAsset.name
    };
};

// ─── Executor Principal de Atualização ───────────────────────────────────────
const checkAndUpdateApp = async (app, options = {}, callbacks = {}) => {
    const { forceDownload = false } = options;
    const { onProgress, onSaveApp, onLogActivity } = callbacks;

    const strategy = app.updateStrategy || 'direct_url';
    const updateUrl = app.updateUrl || '';

    // Atualiza status inicial
    activeDownloads.set(app.id, {
        progress: 0,
        status: 'checking',
        message: 'Verificando nova versão...',
        startedAt: new Date().toISOString()
    });

    let checkResult;
    try {
        if (strategy === 'catalog') {
            checkResult = await checkCatalogUpdate(app.catalogId || app.updateUrl || app.name);
        } else if (strategy === 'web_scrape') {
            checkResult = await checkWebScrapeUpdate(updateUrl, app.updatePattern);
        } else if (strategy === 'github') {
            checkResult = await checkGithubUpdate(updateUrl);
        } else {
            // direct_url por padrão
            checkResult = await checkDirectUrlUpdate(updateUrl);
        }
    } catch (err) {
        const errorMsg = `Erro ao verificar fonte: ${err.message}`;
        activeDownloads.set(app.id, {
            progress: 0,
            status: 'error',
            error: errorMsg,
            finishedAt: new Date().toISOString()
        });
        throw new Error(errorMsg);
    }

    const { remoteVersion, downloadUrl, suggestedName } = checkResult;

    // Verificar se precisa atualizar
    const currentVersion = Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0');
    const hasNewerVersion = remoteVersion && remoteVersion !== currentVersion;
    const needsUpdate = forceDownload || hasNewerVersion || app.downloadUrl === '#';

    if (!needsUpdate) {
        activeDownloads.set(app.id, {
            progress: 100,
            status: 'already_latest',
            message: `Aplicativo já está na versão mais recente (${currentVersion})`,
            finishedAt: new Date().toISOString()
        });
        return {
            updated: false,
            message: `Versão atual (${currentVersion}) já é a mais recente.`,
            version: currentVersion
        };
    }

    // Iniciar download
    activeDownloads.set(app.id, {
        progress: 0,
        status: 'downloading',
        message: `Baixando versão ${remoteVersion || 'mais recente'}...`,
        downloadUrl,
        startedAt: new Date().toISOString()
    });

    try {
        const downloadResult = await downloadFileWithProgress(
            downloadUrl,
            suggestedName,
            app.id,
            (progressData) => {
                activeDownloads.set(app.id, {
                    ...activeDownloads.get(app.id),
                    ...progressData,
                    remoteVersion
                });
                if (onProgress) onProgress(progressData);
            }
        );

        // Remover arquivo antigo se existia
        const oldFile = app.downloadUrl ? app.downloadUrl.replace('/uploads/', '') : null;
        if (oldFile && oldFile !== '#' && oldFile !== downloadResult.filename) {
            const oldPath = path.join(UPLOADS_DIR, oldFile);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) {}
            }
        }

        // Montar dados atualizados do App
        const updatedApp = {
            ...app,
            version: remoteVersion || currentVersion,
            downloadUrl: downloadResult.downloadUrl,
            fileSize: downloadResult.fileSize,
            lastCheckedAt: new Date().toISOString(),
            lastUpdateStatus: 'success',
            lastUpdateError: null,
            updatedAt: new Date().toISOString()
        };

        if (onSaveApp) await onSaveApp(updatedApp);
        if (onLogActivity) onLogActivity('updated', app.name, app.type || 'hosted');

        try {
            const notifSettings = loadSettings().notifications || {};
            if (notifSettings.enabled && notifSettings.notifyOnAutoUpdate) {
                sendNotification({ type: 'auto_update', app: updatedApp }).catch(() => {});
            }
        } catch (e) {}

        activeDownloads.set(app.id, {
            progress: 100,
            status: 'completed',
            message: `Atualizado para versão ${remoteVersion || currentVersion} com sucesso!`,
            finishedAt: new Date().toISOString()
        });

        return {
            updated: true,
            app: updatedApp,
            downloadResult
        };

    } catch (err) {
        const errorMsg = `Erro no download do arquivo: ${err.message}`;
        activeDownloads.set(app.id, {
            progress: 0,
            status: 'error',
            error: errorMsg,
            finishedAt: new Date().toISOString()
        });
        throw new Error(errorMsg);
    }
};

// ─── Gerenciamento de Fila de Atualização ──────────────────────────────────────
const enqueueAppUpdate = (app, options, callbacks) => {
    return new Promise((resolve, reject) => {
        updateQueue.push({ app, options, callbacks, resolve, reject });
        processNextInQueue();
    });
};

const processNextInQueue = async () => {
    if (isProcessingQueue || updateQueue.length === 0) return;
    isProcessingQueue = true;

    const { app, options, callbacks, resolve, reject } = updateQueue.shift();
    try {
        const res = await checkAndUpdateApp(app, options, callbacks);
        resolve(res);
    } catch (err) {
        reject(err);
    } finally {
        isProcessingQueue = false;
        // Processar o próximo após breve pausa
        setTimeout(processNextInQueue, 1000);
    }
};

// ─── Status de Atualização de um App ──────────────────────────────────────────
const getAppUpdateStatus = (appId) => {
    return activeDownloads.get(parseInt(appId)) || { status: 'idle', progress: 0 };
};

const getAllUpdateStatuses = () => {
    const list = {};
    activeDownloads.forEach((v, k) => { list[k] = v; });
    return list;
};

// ─── Catálogo Conhecido de Apps Populares para Autopreenchimento ──────────────
const KNOWN_CATALOG_APPS = [
    { id: 'google-chrome', name: 'Google Chrome', category: 'Navegador', platforms: ['macOS', 'Windows', 'Linux'], icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg' },
    { id: 'brave-browser', name: 'Brave Browser', category: 'Navegador', platforms: ['macOS', 'Windows', 'Linux'], icon: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png' },
    { id: 'figma', name: 'Figma', category: 'Design', platforms: ['macOS', 'Windows'], icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968705.png' },
    { id: 'omnidisksweeper', name: 'OmniDiskSweeper', category: 'Utilitários', platforms: ['macOS'], icon: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png' },
    { id: 'visual-studio-code', name: 'VS Code', category: 'Desenvolvimento', platforms: ['macOS', 'Windows', 'Linux'], icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg' },
    { id: 'docker', name: 'Docker Desktop', category: 'Ferramentas', platforms: ['macOS', 'Windows'], icon: 'https://www.docker.com/wp-content/uploads/2023/08/logo-guide-logos-1.svg' },
    { id: 'firefox', name: 'Mozilla Firefox', category: 'Navegador', platforms: ['macOS', 'Windows', 'Linux'], icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968827.png' },
    { id: 'vlc', name: 'VLC Media Player', category: 'Utilitários', platforms: ['macOS', 'Windows', 'Linux'], icon: 'https://cdn-icons-png.flaticon.com/512/888/888879.png' },
    { id: 'spotify', name: 'Spotify', category: 'Utilitários', platforms: ['macOS', 'Windows'], icon: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' },
    { id: 'notion', name: 'Notion', category: 'Office', platforms: ['macOS', 'Windows'], icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968885.png' }
];

module.exports = {
    checkAndUpdateApp,
    enqueueAppUpdate,
    getAppUpdateStatus,
    getAllUpdateStatuses,
    KNOWN_CATALOG_APPS
};
