const axios = require('axios');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');

const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Erro ao ler settings.json:', e);
    }
    return {
        notifications: {
            enabled: false,
            provider: 'generic', // 'zoom' | 'whatsapp' | 'generic' | 'email'
            webhookUrl: '',
            apiKey: '',
            phone: '',
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPass: '',
            toEmail: '',
            notifyOnNewApp: true,
            notifyOnAutoUpdate: true
        }
    };
};

const saveSettings = (data) => {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro ao salvar settings.json:', e);
    }
};

/**
 * Envia notificação para o canal configurado (Zoom Chat, WhatsApp, Webhook ou Email)
 */
const sendNotification = async ({ type, app, customMessage }) => {
    const settings = loadSettings().notifications || {};
    if (!settings.enabled) {
        return { sent: false, reason: 'Notificações desativadas' };
    }
    if (settings.provider !== 'email' && !settings.webhookUrl) {
        return { sent: false, reason: 'URL do Webhook não configurada' };
    }
    if (settings.provider === 'email' && (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.toEmail)) {
        return { sent: false, reason: 'Configurações de e-mail incompletas' };
    }

    const appName = app ? app.name : 'AppHub';
    const appVersion = app ? (Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0')) : '';
    const appCategory = app ? app.category : '';

    let title = '';
    let bodyText = '';

    if (type === 'test') {
        title = '🔔 Teste de Notificação - AppHub';
        bodyText = customMessage || 'Conexão de notificação configurada com sucesso no AppHub!';
    } else if (type === 'new') {
        title = `🚀 Novo Aplicativo: ${appName} (v${appVersion})`;
        bodyText = `Um novo aplicativo da categoria *${appCategory}* acaba de ser disponibilizado no AppHub da Academy!\n${app?.description || ''}`;
    } else if (type === 'auto_update') {
        title = `⚡ Atualização Automática: ${appName}`;
        bodyText = `O robô do AppHub acabou de baixar a nova versão *${appVersion}* de ${appName} diretamente do site oficial.`;
    }

    try {
        if (settings.provider === 'email') {
            const transporter = nodemailer.createTransport({
                host: settings.smtpHost,
                port: Number(settings.smtpPort) || 587,
                secure: Number(settings.smtpPort) === 465,
                auth: {
                    user: settings.smtpUser,
                    pass: settings.smtpPass
                }
            });

            await transporter.sendMail({
                from: `"AppHub Notifier" <${settings.smtpUser}>`,
                to: settings.toEmail,
                subject: title,
                text: bodyText,
                html: `<h3>${title}</h3><p>${bodyText.replace(/\n/g, '<br>')}</p>`
            });
        } else if (settings.provider === 'zoom') {
            // Formato compatível com Zoom Chat Incoming Webhook
            const payload = {
                content: {
                    head: {
                        text: title,
                        sub_head: { text: 'AppHub Academy Notification' }
                    },
                    body: [
                        {
                            type: 'message',
                            text: bodyText
                        }
                    ]
                }
            };
            await axios.post(settings.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(settings.apiKey ? { 'Authorization': settings.apiKey } : {})
                },
                timeout: 10000
            });
        } else if (settings.provider === 'whatsapp') {
            // Formato flexível para WhatsApp APIs (Evolution, Z-API, Baileys, etc.)
            const payload = {
                number: settings.phone || undefined,
                phone: settings.phone || undefined,
                message: `*${title}*\n\n${bodyText}`,
                text: `*${title}*\n\n${bodyText}`
            };
            await axios.post(settings.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(settings.apiKey ? { 'apikey': settings.apiKey, 'Authorization': `Bearer ${settings.apiKey}` } : {})
                },
                timeout: 10000
            });
        } else {
            // Formato Webhook Padrão / Discord / Slack / Teams
            const payload = {
                text: `*${title}*\n${bodyText}`,
                content: `**${title}**\n${bodyText}`,
                appName,
                version: appVersion,
                timestamp: new Date().toISOString()
            };
            await axios.post(settings.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
        }

        return { sent: true };
    } catch (err) {
        console.error('[Notifier] Erro ao enviar notificação:', err.message);
        return { sent: false, error: err.message };
    }
};

module.exports = {
    loadSettings,
    saveSettings,
    sendNotification
};
