import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Download, Search, LayoutGrid, Package, Info, Plus, X, Upload, Pencil, Trash2,
  Eye, EyeOff, Terminal, Brush, Box, Settings, Bell, User, Monitor, MapPin,
  Globe, HardDrive, FileText, ToggleLeft, ToggleRight, BarChart2, Clock,
  CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronDown, Laptop, Smartphone, Tablet,
  CloudDownload, Sparkles, Check, ArrowUpRight, Zap, Copy, ExternalLink, Cpu,
  Image, MessageSquare, Send, Award, TrendingUp, Layers, Compass, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/apphub';

const PLATFORM_CONFIG = {
  macOS:   { color: '#6e6e73', bg: 'rgba(110,110,115,0.15)', icon: <Laptop size={11} /> },
  Windows: { color: '#0078D4', bg: 'rgba(0,120,212,0.15)',   icon: <Laptop size={11} /> },
  Linux:   { color: '#FCC624', bg: 'rgba(252,198,36,0.15)',  icon: <Laptop size={11} /> },
  iPhone:  { color: '#34c759', bg: 'rgba(52,199,89,0.15)',   icon: <Smartphone size={11} /> },
  iPad:    { color: '#007aff', bg: 'rgba(0,122,255,0.15)',   icon: <Tablet size={11} /> },
};

const TYPE_CONFIG = {
  hosted: { label: 'Hospedado', color: '#ff9f0a', bg: 'rgba(255,159,10,0.15)' },
  linked: { label: 'Link Externo', color: '#30d158', bg: 'rgba(48,209,88,0.15)' },
  file:   { label: 'Arquivo',    color: '#64d2ff', bg: 'rgba(100,210,255,0.15)' },
};

const STRATEGY_CONFIG = {
  catalog:    { label: 'Catálogo / Cask Oficial', color: '#af52de', icon: <Sparkles size={12} /> },
  direct_url: { label: 'Link Direto (Latest)',   color: '#007aff', icon: <Globe size={12} /> },
  web_scrape: { label: 'Página Web (Scraper)',   color: '#ff9f0a', icon: <Search size={12} /> },
  github:     { label: 'GitHub Releases',        color: '#34c759', icon: <ArrowUpRight size={12} /> },
};

const STATUS_CONFIG = {
  available:   { label: 'Disponível',    color: '#30d158', icon: <CheckCircle size={12} /> },
  unavailable: { label: 'Indisponível',  color: '#ff453a', icon: <XCircle size={12} /> },
};

const ACTION_LABELS = {
  added:        { label: 'Adicionado',         color: '#30d158' },
  updated:      { label: 'Atualizado',         color: '#ff9f0a' },
  deleted:      { label: 'Removido',           color: '#ff453a' },
  toggled:      { label: 'Status alterado',    color: '#64d2ff' },
  auto_updated: { label: 'Auto-atualizado',    color: '#af52de' }
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PlatformBadge({ platform }) {
  const cfg = PLATFORM_CONFIG[platform] || { color: '#86868b', bg: 'rgba(134,134,139,0.15)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.7rem', fontWeight: '600', padding: '2px 7px',
      borderRadius: '6px', color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`
    }}>
      {cfg.icon} {platform}
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.hosted;
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px',
      borderRadius: '6px', color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`
    }}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ available }) {
  const cfg = available ? STATUS_CONFIG.available : STATUS_CONFIG.unavailable;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: checked ? '#30d158' : 'rgba(255,255,255,0.15)',
        position: 'relative', transition: 'background 0.25s',
        border: `1px solid ${checked ? '#30d158' : 'rgba(255,255,255,0.2)'}`,
        flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: checked ? '22px' : '2px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'white', transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
      }} />
    </div>
  );
}

// ─── Platform Checkboxes ───────────────────────────────────────────────────────
function PlatformPicker({ selected, onChange }) {
  const platforms = ['macOS', 'Windows', 'Linux', 'iPhone', 'iPad'];
  const toggle = (p) => {
    if (selected.includes(p)) onChange(selected.filter(x => x !== p));
    else onChange([...selected, p]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {platforms.map(p => {
        const cfg = PLATFORM_CONFIG[p];
        const active = selected.includes(p);
        return (
          <button key={p} type="button" onClick={() => toggle(p)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
            border: `1px solid ${active ? cfg.color : 'rgba(255,255,255,0.15)'}`,
            background: active ? cfg.bg : 'transparent',
            color: active ? cfg.color : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}>
            {cfg.icon} {p}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MonitorDashboard — componente com gráficos Chart.js reais
// ═══════════════════════════════════════════════════════════════════════════════
function MonitorDashboard({ monitorData, apps, API_BASE }) {
  const barRef = useRef(null);
  const donutRef = useRef(null);
  const lineRef = useRef(null);
  const barChart = useRef(null);
  const donutChart = useRef(null);
  const lineChart = useRef(null);

  const stats = monitorData?.stats || {};
  const topApps = stats.topDownloadedApps || [];
  const byPlatform = stats.downloadsByPlatform || {};

  // Gerar dados de linha simulados (últimos 6 meses) baseado no total de downloads
  const monthLabels = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
    }
    return months;
  })();

  const totalDl = stats.totalDownloads || 0;
  const lineData = [
    Math.floor(totalDl * 0.08), Math.floor(totalDl * 0.12),
    Math.floor(totalDl * 0.16), Math.floor(totalDl * 0.18),
    Math.floor(totalDl * 0.22), Math.floor(totalDl * 0.24)
  ];

  useEffect(() => {
    if (!window.Chart) return;

    const chartDefaults = {
      plugins: { legend: { labels: { color: '#86868b', font: { family: 'Outfit', size: 12 } } } },
      scales: {}
    };

    // ── Gráfico de Barra Horizontal: Top Apps ─────────────────────────────────
    if (barRef.current && topApps.length > 0) {
      if (barChart.current) barChart.current.destroy();
      barChart.current = new window.Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: topApps.map(a => a.name),
          datasets: [{
            label: 'Downloads',
            data: topApps.map(a => a.count),
            backgroundColor: [
              'rgba(255,215,0,0.8)', 'rgba(0,122,255,0.7)', 'rgba(48,209,88,0.7)',
              'rgba(175,82,222,0.7)', 'rgba(255,159,10,0.7)'
            ],
            borderColor: [
              '#FFD700', '#007aff', '#30d158', '#af52de', '#ff9f0a'
            ],
            borderWidth: 2,
            borderRadius: 8,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(28,28,32,0.95)',
              titleColor: '#fff', bodyColor: '#86868b',
              borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
              callbacks: { label: ctx => ` ${ctx.parsed.x} downloads` }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#86868b', font: { family: 'Outfit' } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#ffffff', font: { family: 'Outfit', weight: '600', size: 13 } }
            }
          }
        }
      });
    }

    // ── Gráfico Donut: Distribuição por Plataforma ────────────────────────────
    if (donutRef.current) {
      const platLabels = Object.keys(byPlatform).filter(k => byPlatform[k] > 0);
      const platData = platLabels.map(k => byPlatform[k]);
      const platColors = {
        macOS: '#6e6e73', iOS: '#30d158', iPadOS: '#007aff',
        Windows: '#0078D4', Linux: '#FCC624'
      };

      if (donutChart.current) donutChart.current.destroy();
      if (platData.length > 0) {
        donutChart.current = new window.Chart(donutRef.current, {
          type: 'doughnut',
          data: {
            labels: platLabels,
            datasets: [{
              data: platData,
              backgroundColor: platLabels.map(l => platColors[l] || '#86868b'),
              borderColor: 'rgba(18,18,22,0.8)',
              borderWidth: 3,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            animation: { duration: 900, easing: 'easeOutQuart' },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#86868b', font: { family: 'Outfit', size: 12 },
                  padding: 16, usePointStyle: true, pointStyleWidth: 10
                }
              },
              tooltip: {
                backgroundColor: 'rgba(28,28,32,0.95)',
                titleColor: '#fff', bodyColor: '#86868b',
                borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                callbacks: {
                  label: ctx => {
                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                    return ` ${ctx.parsed} downloads (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // ── Gráfico de Linha: Tendência de Downloads ──────────────────────────────
    if (lineRef.current) {
      if (lineChart.current) lineChart.current.destroy();
      lineChart.current = new window.Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Downloads',
            data: lineData,
            fill: true,
            backgroundColor: 'rgba(0,122,255,0.1)',
            borderColor: '#007aff',
            borderWidth: 2.5,
            pointBackgroundColor: '#007aff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(28,28,32,0.95)',
              titleColor: '#fff', bodyColor: '#86868b',
              borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
              callbacks: { label: ctx => ` ${ctx.parsed.y} downloads` }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#86868b', font: { family: 'Outfit', size: 12 } }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#86868b', font: { family: 'Outfit', size: 12 } },
              beginAtZero: true
            }
          }
        }
      });
    }

    return () => {
      if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
      if (donutChart.current) { donutChart.current.destroy(); donutChart.current = null; }
      if (lineChart.current) { lineChart.current.destroy(); lineChart.current = null; }
    };
  }, [monitorData]);

  const metricCards = [
    { icon: <Download size={22} />, value: stats.totalDownloads ?? 0, label: 'Total de Downloads', color: '#30d158', gradient: 'rgba(48,209,88,0.15)' },
    { icon: <HardDrive size={22} />, value: `${stats.totalBandwidthGB ?? 0} GB`, label: 'Banda Local Servida', color: '#007aff', gradient: 'rgba(0,122,255,0.15)' },
    { icon: <Zap size={22} />, value: stats.autoUpdateEnabled ?? 0, label: 'Apps com Auto-Update', color: '#af52de', gradient: 'rgba(175,82,222,0.15)' },
    { icon: <Package size={22} />, value: stats.total ?? 0, label: 'Itens no Catálogo', color: '#ff9f0a', gradient: 'rgba(255,159,10,0.15)' },
  ];

  const card = (style) => ({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    padding: '1.5rem',
    ...style
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Cards de Métricas ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {metricCards.map((m, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            style={{ ...card({}), background: m.gradient, borderColor: `${m.color}33` }}>
            <div style={{ color: m.color, marginBottom: '0.6rem' }}>{m.icon}</div>
            <div style={{ fontSize: '2.4rem', fontWeight: '800', color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: '0.83rem', color: '#86868b', marginTop: '0.4rem' }}>{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Linha 2: Top 5 Barra + Donut Plataforma ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>

        {/* Gráfico de barra — Top 5 Apps */}
        <div style={card({})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '1.05rem', marginBottom: '1.2rem' }}>
            <Award size={18} color="#FFD700" />
            <span>Top 5 Aplicativos Mais Baixados</span>
          </div>
          {topApps.length > 0 ? (
            <div style={{ height: '220px' }}>
              <canvas ref={barRef} />
            </div>
          ) : (
            <p style={{ color: '#86868b', fontSize: '0.9rem' }}>Nenhum download registrado ainda.</p>
          )}
        </div>

        {/* Donut — Distribuição por Plataforma */}
        <div style={card({})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '1.05rem', marginBottom: '1.2rem' }}>
            <Layers size={18} color="#007aff" />
            <span>Distribuição por Plataforma</span>
          </div>
          <div style={{ height: '220px' }}>
            <canvas ref={donutRef} />
          </div>
        </div>
      </div>

      {/* ── Linha 3: Gráfico de Linha ────────────────────────────────────── */}
      <div style={card({})}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '1.05rem' }}>
            <TrendingUp size={18} color="#30d158" />
            <span>Tendência de Downloads — Últimos 6 Meses</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#86868b' }}>Total acumulado</span>
        </div>
        <div style={{ height: '200px' }}>
          <canvas ref={lineRef} />
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('apps'); // apps | files | monitor | locations
  const [contentTab, setContentTab] = useState('apps'); // apps | files
  const [monitorTab, setMonitorTab] = useState('dashboard'); // dashboard | updates | sync
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('geral'); // geral | seguranca | notificacoes

  const [token, setToken] = useState(localStorage.getItem('apphub_token'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showChangePasswords, setShowChangePasswords] = useState({ current: false, new: false, confirm: false });

  // Spotlight State (Cmd+K)
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightSelectedIndex, setSpotlightSelectedIndex] = useState(0);
  const spotlightInputRef = useRef(null);

  // App Details Modal State
  const [selectedAppForDetails, setSelectedAppForDetails] = useState(null);
  const [copiedLinkAppId, setCopiedLinkAppId] = useState(null);

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    provider: 'zoom', // 'zoom' | 'whatsapp' | 'generic'
    webhookUrl: '',
    apiKey: '',
    phone: '',
    notifyOnNewApp: true,
    notifyOnAutoUpdate: true
  });
  const [testingNotification, setTestingNotification] = useState(false);
  const [notificationTestStatus, setNotificationTestStatus] = useState(null);

  // Auto-Update States
  const [updateStatuses, setUpdateStatuses] = useState({});
  const [catalogList, setCatalogList] = useState([]);
  const [checkingAll, setCheckingAll] = useState(false);

  const [newApp, setNewApp] = useState({
    name: '', category: 'Utilitários', version: '1.0.0', description: '',
    type: 'hosted', platforms: ['macOS'], available: true, externalUrl: '',
    autoUpdate: false, updateStrategy: 'catalog', catalogId: '', updateUrl: '', updatePattern: '',
    requirements: '', changelog: '', appleSiliconCompatible: true, screenshots: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);

  // Monitor
  const [monitorData, setMonitorData] = useState(null);
  const [monitorLoading, setMonitorLoading] = useState(false);

  // Chart refs
  const chartDonutRef = useRef(null);
  const chartBarRef = useRef(null);
  const chartLineRef = useRef(null);
  const chartDonutInstance = useRef(null);
  const chartBarInstance = useRef(null);
  const chartLineInstance = useRef(null);

  // Locations
  const [locations, setLocations] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [newLocation, setNewLocation] = useState({ name: '', description: '', icon: '🏢' });

  // ── Atalho Global Cmd+K / Ctrl+K ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSpotlightOpen(false);
        setSelectedAppForDetails(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSpotlightOpen) {
      setSpotlightQuery('');
      setSpotlightSelectedIndex(0);
      setTimeout(() => spotlightInputRef.current?.focus(), 50);
    }
  }, [isSpotlightOpen]);

  useEffect(() => {
    fetchApps();
    fetchCatalog();
  }, []);

  // Polling para acompanhar downloads em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUpdateStatuses();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchApps = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/apps`);
      setApps(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCatalog = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/catalog`);
      setCatalogList(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchUpdateStatuses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/updates/status`);
      const newStatuses = res.data;
      setUpdateStatuses(newStatuses);

      const hasCompleted = Object.values(newStatuses).some(s => s.status === 'completed');
      if (hasCompleted) {
        fetchApps();
      }
    } catch (e) {}
  };

  const fetchMonitor = async () => {
    if (!token) return;
    setMonitorLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/monitor`, { headers: { Authorization: `Bearer ${token}` } });
      setMonitorData(res.data);
      if (res.data.updateStatuses) setUpdateStatuses(res.data.updateStatuses);
    } catch (e) { console.error(e); }
    finally { setMonitorLoading(false); }
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/locations`);
      setLocations(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchNotificationSettings = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/settings/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificationSettings(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeView === 'monitor') fetchMonitor();
    if (activeView === 'locations') fetchLocations();
  }, [activeView, token]);

  useEffect(() => {
    if (isSettingsOpen && token) {
      fetchNotificationSettings();
    }
  }, [isSettingsOpen, token]);

  // ── Download Handler com Contador ────────────────────────────────────────────
  const handleTriggerDownload = (app) => {
    // Incremento otimista na tela
    setApps(prev => prev.map(a => a.id === app.id ? { ...a, downloadCount: (a.downloadCount || 0) + 1 } : a));
    if (selectedAppForDetails && selectedAppForDetails.id === app.id) {
      setSelectedAppForDetails(prev => ({ ...prev, downloadCount: (prev.downloadCount || 0) + 1 }));
    }
    window.open(`${API_BASE}/api/apps/${app.id}/download`, '_blank');
  };

  const handleCopyLink = (app) => {
    const fullUrl = `${window.location.origin}${API_BASE}/api/apps/${app.id}/download`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkAppId(app.id);
    setTimeout(() => setCopiedLinkAppId(null), 2000);
  };

  // ── Auto-Update Handlers ──────────────────────────────────────────────────────
  const handleCheckSingleUpdate = async (appId, force = false) => {
    if (!token) {
      setIsLoginOpen(true);
      return;
    }
    try {
      setUpdateStatuses(prev => ({
        ...prev,
        [appId]: { status: 'checking', message: 'Iniciando verificação...' }
      }));
      await axios.post(`${API_BASE}/api/apps/${appId}/check-update`, { force }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUpdateStatuses();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao verificar atualização');
    }
  };

  const handleCheckAllUpdates = async () => {
    if (!token) {
      setIsLoginOpen(true);
      return;
    }
    setCheckingAll(true);
    try {
      const res = await axios.post(`${API_BASE}/api/apps/check-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchUpdateStatuses();
      if (activeView === 'monitor') fetchMonitor();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao verificar atualizações');
    } finally {
      setCheckingAll(false);
    }
  };

  // ── Notificações Handlers ─────────────────────────────────────────────────────
  const handleSaveNotificationSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/settings/notifications`, notificationSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Configurações de notificação salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar configurações de notificação');
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    setNotificationTestStatus(null);
    try {
      const res = await axios.post(`${API_BASE}/api/settings/notifications/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificationTestStatus({ success: true, message: res.data.message });
    } catch (e) {
      setNotificationTestStatus({ success: false, message: e.response?.data?.message || 'Falha ao enviar notificação de teste' });
    } finally {
      setTestingNotification(false);
    }
  };

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/login`, loginForm);
      const t = res.data.token;
      setToken(t);
      localStorage.setItem('apphub_token', t);
      setIsLoginOpen(false);
    } catch { alert('Usuário ou senha inválidos'); }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('apphub_token');
    setIsSettingsOpen(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword)
      return alert('As novas senhas não coincidem');
    try {
      await axios.put(`${API_BASE}/api/admin/change-password`,
        { currentPassword: changePasswordForm.currentPassword, newPassword: changePasswordForm.newPassword },
        { headers: { Authorization: `Bearer ${token}` } });
      alert('Senha alterada com sucesso!');
      setIsSettingsOpen(false);
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { alert(e.response?.data?.message || 'Erro ao alterar senha'); }
  };

  // ── CRUD Apps ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Confirma exclusão deste item?')) return;
    try {
      await axios.delete(`${API_BASE}/api/apps/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchApps();
    } catch { alert('Erro ao excluir'); }
  };

  const handleToggleAvailable = async (app) => {
    try {
      await axios.patch(`${API_BASE}/api/apps/${app.id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchApps();
    } catch { alert('Erro ao alterar status'); }
  };

  const openEditModal = (app) => {
    setEditingApp(app);
    setNewApp({
      name: app.name, category: app.category, version: Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0'),
      description: app.description || '', type: app.type || 'hosted',
      platforms: app.platforms || [], available: app.available !== false,
      externalUrl: app.externalUrl || '',
      autoUpdate: app.autoUpdate === true,
      updateStrategy: app.updateStrategy || 'catalog',
      catalogId: app.catalogId || '',
      updateUrl: app.updateUrl || '',
      updatePattern: app.updatePattern || '',
      requirements: app.requirements || '',
      changelog: app.changelog || '',
      appleSiliconCompatible: app.appleSiliconCompatible !== false,
      screenshots: Array.isArray(app.screenshots) ? app.screenshots.join(', ') : (app.screenshots || '')
    });
    setIconPreview(app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon);
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false); setEditingApp(null);
    setNewApp({
      name: '', category: 'Utilitários', version: '1.0.0', description: '',
      type: 'hosted', platforms: ['macOS'], available: true, externalUrl: '',
      autoUpdate: false, updateStrategy: 'catalog', catalogId: '', updateUrl: '', updatePattern: '',
      requirements: '', changelog: '', appleSiliconCompatible: true, screenshots: ''
    });
    setSelectedFile(null); setSelectedIcon(null); setIconPreview(null);
  };

  const applyCatalogPreset = (preset) => {
    setNewApp(prev => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      platforms: preset.platforms || prev.platforms,
      autoUpdate: true,
      updateStrategy: 'catalog',
      catalogId: preset.id
    }));
    if (preset.icon) {
      setIconPreview(preset.icon);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (newApp.type === 'hosted' && !selectedFile && !editingApp && !newApp.autoUpdate)
      return alert('Selecione um arquivo para upload ou ative a Atualização Automática.');

    setUploading(true);
    const formData = new FormData();
    formData.append('name', newApp.name);
    formData.append('category', newApp.category);
    formData.append('version', newApp.version);
    formData.append('description', newApp.description);
    formData.append('type', newApp.type);
    formData.append('platforms', newApp.platforms.join(','));
    formData.append('available', newApp.available);
    formData.append('externalUrl', newApp.externalUrl);
    formData.append('autoUpdate', newApp.autoUpdate);
    formData.append('updateStrategy', newApp.updateStrategy);
    formData.append('catalogId', newApp.catalogId);
    formData.append('updateUrl', newApp.updateUrl);
    formData.append('updatePattern', newApp.updatePattern);
    formData.append('requirements', newApp.requirements);
    formData.append('changelog', newApp.changelog);
    formData.append('appleSiliconCompatible', newApp.appleSiliconCompatible);
    formData.append('screenshots', newApp.screenshots);

    if (selectedFile) formData.append('file', selectedFile);
    if (selectedIcon) formData.append('icon', selectedIcon);

    try {
      let savedApp;
      if (editingApp) {
        const res = await axios.put(`${API_BASE}/api/apps/${editingApp.id}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        savedApp = res.data;
      } else {
        const res = await axios.post(`${API_BASE}/api/apps`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        savedApp = res.data;
      }

      if (newApp.autoUpdate && (!selectedFile || newApp.type === 'hosted')) {
        handleCheckSingleUpdate(savedApp.id, true);
      }

      resetModal();
      fetchApps();
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        alert('Sessão expirada. Faça login novamente.'); handleLogout();
      } else { alert('Erro na operação'); }
    } finally { setUploading(false); }
  };

  // ── CRUD Locations ────────────────────────────────────────────────────────────
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await axios.put(`${API_BASE}/api/locations/${editingLocation.id}`, newLocation, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE}/api/locations`, newLocation, { headers: { Authorization: `Bearer ${token}` } });
      }
      setIsLocationModalOpen(false); setEditingLocation(null);
      setNewLocation({ name: '', description: '', icon: '🏢' });
      fetchLocations();
    } catch { alert('Erro ao salvar local'); }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Confirma exclusão deste local?')) return;
    try {
      await axios.delete(`${API_BASE}/api/locations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchLocations();
    } catch { alert('Erro ao excluir local'); }
  };

  // ── Filters & Spotlight Search ────────────────────────────────────────────────
  const categories = [
    { name: 'Todos', icon: <LayoutGrid size={18} /> },
    { name: 'Utilitários', icon: <Box size={18} /> },
    { name: 'Desenvolvimento', icon: <Terminal size={18} /> },
    { name: 'Design', icon: <Brush size={18} /> },
    { name: 'Navegador', icon: <Globe size={18} /> },
    { name: 'Office', icon: <Package size={18} /> },
    { name: 'Ferramentas', icon: <HardDrive size={18} /> },
  ];

  const filteredApps = apps.filter(app => {
    const isFile = app.type === 'file';
    const matchesTab = contentTab === 'files' ? isFile : !isFile;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || app.category === selectedCategory;
    return matchesTab && matchesSearch && matchesCategory;
  });

  const spotlightResults = apps.filter(app => {
    if (!spotlightQuery) return true;
    const q = spotlightQuery.toLowerCase();
    return app.name.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      (app.description && app.description.toLowerCase().includes(q));
  }).slice(0, 7);

  const handleSpotlightKeyDown = (e) => {
    if (spotlightResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSpotlightSelectedIndex(prev => (prev + 1) % spotlightResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSpotlightSelectedIndex(prev => (prev - 1 + spotlightResults.length) % spotlightResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = spotlightResults[spotlightSelectedIndex];
      if (selected) {
        setIsSpotlightOpen(false);
        setSelectedAppForDetails(selected);
      }
    }
  };

  const appCount = apps.filter(a => a.type !== 'file').length;
  const fileCount = apps.filter(a => a.type === 'file').length;
  const autoUpdateCount = apps.filter(a => a.autoUpdate).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="glass-sidebar">
        <div className="logo-section">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L4 26H11L16 16L21 26H28L16 2Z" fill="url(#p0)" />
            <path d="M9 22L16 8L23 22H16H9Z" fill="url(#p1)" />
            <defs>
              <linearGradient id="p0" x1="16" y1="2" x2="16" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF5A5F" /><stop offset="1" stopColor="#FF0076" />
              </linearGradient>
              <linearGradient id="p1" x1="16" y1="8" x2="16" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF9058" /><stop offset="1" stopColor="#590FB7" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h1>AppHub</h1>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', opacity: 0.7 }}>Seus apps · Sua rede · Seu acesso</div>
          </div>
        </div>

        <nav className="nav-links">
          <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.3rem' }}>Conteúdo</div>

          <div className={`nav-item ${activeView === 'apps' && contentTab === 'apps' ? 'active' : ''}`}
            onClick={() => { setActiveView('apps'); setContentTab('apps'); }}>
            <Package size={18} /><span>Apps</span>
            {appCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '10px' }}>{appCount}</span>}
          </div>

          <div className={`nav-item ${activeView === 'apps' && contentTab === 'files' ? 'active' : ''}`}
            onClick={() => { setActiveView('apps'); setContentTab('files'); }}>
            <FileText size={18} /><span>Arquivos</span>
            {fileCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '10px' }}>{fileCount}</span>}
          </div>

          <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.8rem 0' }} />
          <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.3rem' }}>Gestão</div>

          <div className={`nav-item ${activeView === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveView('monitor')}>
            <Monitor size={18} /><span>Monitor & Métricas</span>
            {autoUpdateCount > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'rgba(175,82,222,0.3)', color: '#d896ff', padding: '1px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Zap size={9} /> {autoUpdateCount}
              </span>
            )}
          </div>

          <div className={`nav-item ${activeView === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveView('locations')}>
            <MapPin size={18} /><span>Locais / Salas</span>
          </div>

          {/* Categories - only when on apps view */}
          {activeView === 'apps' && contentTab === 'apps' && (
            <>
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.8rem 0' }} />
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.3rem' }}>Categorias</div>
              {categories.map(cat => (
                <div key={cat.name}
                  className={`nav-item ${selectedCategory === cat.name ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.name)}>
                  {cat.icon}<span>{cat.name}</span>
                </div>
              ))}
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          <div className={`nav-item ${isSettingsOpen ? 'active' : ''}`}
            onClick={() => token ? setIsSettingsOpen(true) : setIsLoginOpen(true)}>
            <Settings size={18} /><span>Configurações</span>
          </div>
          {token && (
            <div className="nav-item" onClick={handleLogout} title="Sair">
              <User size={18} /><span>Sair</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <header className="glass-header">
          {/* Spotlight Trigger */}
          <div
            className="search-container"
            onClick={() => setIsSpotlightOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }} />
            <input
              className="search-bar"
              placeholder="Buscar no AppHub... (ou pressione ⌘K)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', padding: '2px 7px', fontSize: '0.7rem', color: '#86868b',
              fontWeight: '700', pointerEvents: 'none'
            }}>
              ⌘K
            </div>
          </div>

          <div className="flex gap-4">
            {token && autoUpdateCount > 0 && (
              <button
                className="download-btn"
                style={{ background: 'rgba(175,82,222,0.25)', border: '1px solid rgba(175,82,222,0.4)', color: '#fff' }}
                onClick={handleCheckAllUpdates}
                disabled={checkingAll}
                title="Verificar atualização de todos os aplicativos na internet"
              >
                <RefreshCw size={16} className={checkingAll ? 'spin' : ''} />
                <span style={{ fontSize: '0.85rem' }}>Auto-Update ({autoUpdateCount})</span>
              </button>
            )}

            {token ? (
              <button className="download-btn" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Novo App
              </button>
            ) : (
              <button className="download-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setIsLoginOpen(true)}>
                Login Admin
              </button>
            )}
          </div>
        </header>

        <section className="container">
          {/* ── Apps / Files View ── */}
          {activeView === 'apps' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Hero Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,90,95,0.8), rgba(89,15,183,0.8))',
                backdropFilter: 'blur(40px)', borderRadius: '24px', padding: '2.5rem',
                marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.8rem' }}>
                    <Sparkles size={12} /> Apple Developer Academy Distribution
                  </div>
                  <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                    {contentTab === 'files' ? 'Arquivos & Documentos' : 'Central de Aplicativos'}
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', maxWidth: '600px' }}>
                    {contentTab === 'files'
                      ? 'Distribua assets, documentações, certificados e perfis de provisionamento na rede local.'
                      : 'Distribuição ultra-rápida de ferramentas, IDEs e softwares para estudantes e mentores da Academy.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => setContentTab('apps')} style={{
                    padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                    background: contentTab === 'apps' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: 'white', backdropFilter: 'blur(10px)'
                  }}><Package size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Apps</button>
                  <button onClick={() => setContentTab('files')} style={{
                    padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                    background: contentTab === 'files' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: 'white', backdropFilter: 'blur(10px)'
                  }}><FileText size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Arquivos</button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>{contentTab === 'files' ? 'Arquivos' : 'Aplicativos'}</h2>
                  <p style={{ color: '#86868b', marginTop: '0.3rem', fontSize: '0.9rem' }}>
                    {filteredApps.length} {contentTab === 'files' ? 'arquivos' : 'apps'} disponíveis para instalação imediata
                  </p>
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                <motion.div className="app-grid" layout>
                  {filteredApps.map((app) => {
                    const upStatus = updateStatuses[app.id];
                    const isDownloading = upStatus && upStatus.status === 'downloading';
                    const isChecking = upStatus && upStatus.status === 'checking';

                    return (
                      <motion.div key={app.id} className="app-card" layout
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25 }} whileHover={{ scale: 1.02 }}
                        style={{ position: 'relative' }}>

                        {/* Status indicator top bar */}
                        <div style={{
                          height: '3px', borderRadius: '3px 3px 0 0', marginBottom: '1rem',
                          background: isDownloading ? '#007aff' : (app.available !== false ? '#30d158' : '#ff453a'),
                          position: 'absolute', top: 0, left: 0, right: 0
                        }} />

                        <div
                          style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: 'pointer' }}
                          onClick={() => setSelectedAppForDetails(app)}
                        >
                          <img src={app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon}
                            alt={app.name} className="app-icon"
                            onError={e => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png'; }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</h3>
                              {app.appleSiliconCompatible && (
                                <span title="Nativo para Apple Silicon (M1/M2/M3/M4) e Universal" style={{ fontSize: '0.75rem', opacity: 0.8 }}></span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                              <span className="badge">{app.category}</span>
                              <TypeBadge type={app.type} />
                              {app.autoUpdate && (
                                <span style={{
                                  fontSize: '0.7rem', fontWeight: '600', padding: '2px 7px',
                                  borderRadius: '6px', color: '#af52de', background: 'rgba(175,82,222,0.15)',
                                  border: '1px solid rgba(175,82,222,0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px'
                                }}>
                                  <Zap size={10} /> Auto
                                </span>
                              )}
                            </div>
                          </div>
                          {token && (
                            <div onClick={e => e.stopPropagation()}>
                              <ToggleSwitch checked={app.available !== false} onChange={() => handleToggleAvailable(app)} />
                            </div>
                          )}
                        </div>

                        {/* Barra de Progresso de Download / Atualização */}
                        {(isDownloading || isChecking) && (
                          <div style={{
                            background: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.3)',
                            borderRadius: '10px', padding: '8px 12px', marginTop: '0.4rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64d2ff', fontWeight: '600', marginBottom: '4px' }}>
                              <span>{isChecking ? 'Verificando versão...' : `Baixando v${upStatus.remoteVersion || ''}`}</span>
                              <span>{upStatus.progress || 0}% {upStatus.speed ? `• ${upStatus.speed}` : ''}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${upStatus.progress || 10}%`, height: '100%', background: 'linear-gradient(90deg, #007aff, #64d2ff)', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {app.platforms && app.platforms.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                            {app.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                          </div>
                        )}

                        <p
                          style={{ fontSize: '0.85rem', color: '#86868b', lineHeight: '1.5', marginTop: '0.5rem', height: '3.2em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', cursor: 'pointer' }}
                          onClick={() => setSelectedAppForDetails(app)}
                        >
                          {app.description || 'Clique para ver detalhes, requisitos e changelog.'}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#86868b' }}>
                                <Info size={11} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                                v{Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0')}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#30d158', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Download size={10} /> {app.downloadCount || 0}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#86868b' }}>
                              {app.fileSize && app.fileSize !== '0MB' ? app.fileSize : ''}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleCopyLink(app)}
                              style={{
                                background: copiedLinkAppId === app.id ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.06)',
                                padding: '7px', borderRadius: '9px',
                                color: copiedLinkAppId === app.id ? '#30d158' : '#86868b',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'
                              }}
                              title={copiedLinkAppId === app.id ? "Link copiado!" : "Copiar link de download"}
                            >
                              {copiedLinkAppId === app.id ? <Check size={14} /> : <Share2 size={14} />}
                            </button>

                            {token && (
                              <>
                                {app.autoUpdate && (
                                  <button
                                    onClick={() => handleCheckSingleUpdate(app.id, true)}
                                    disabled={isDownloading || isChecking}
                                    style={{
                                      background: 'rgba(175,82,222,0.15)', padding: '7px', borderRadius: '9px',
                                      color: '#af52de', border: '1px solid rgba(175,82,222,0.3)', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center'
                                    }}
                                    title="Buscar e baixar nova versão agora na internet"
                                  >
                                    <CloudDownload size={14} className={isDownloading || isChecking ? 'spin' : ''} />
                                  </button>
                                )}
                                <button onClick={() => openEditModal(app)}
                                  style={{ background: 'rgba(255,255,255,0.08)', padding: '7px', borderRadius: '9px', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  title="Editar"><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(app.id)}
                                  style={{ background: 'rgba(255,0,0,0.12)', padding: '7px', borderRadius: '9px', color: '#ff453a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  title="Excluir"><Trash2 size={14} /></button>
                              </>
                            )}

                            {app.type === 'linked' && app.externalUrl ? (
                              <a href={app.externalUrl} target="_blank" rel="noopener noreferrer" className="download-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: '0.85rem', padding: '8px 14px' }}>
                                <Globe size={14} /> Acessar
                              </a>
                            ) : (
                              <button
                                onClick={() => handleTriggerDownload(app)}
                                className="download-btn"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', padding: '8px 14px',
                                  opacity: (app.available !== false && app.downloadUrl !== '#') ? 1 : 0.5,
                                  pointerEvents: (app.available !== false && app.downloadUrl !== '#') ? 'auto' : 'none'
                                }}
                              >
                                <Download size={14} /> Baixar
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {filteredApps.length === 0 && !loading && (
                <div style={{ textAlign: 'center', marginTop: '6rem', color: '#86868b' }}>
                  <Package size={56} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <h3>Nenhum item encontrado</h3>
                  <p>Ajuste sua busca ou adicione um novo item.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Monitor View ── */}
          {activeView === 'monitor' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Monitor & Métricas da Academy</h2>
                  <p style={{ color: '#86868b', fontSize: '0.9rem' }}>Estatísticas de adesão, tráfego economizado e automações</p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  {autoUpdateCount > 0 && (
                    <button className="download-btn" onClick={handleCheckAllUpdates} disabled={checkingAll}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(175,82,222,0.25)', border: '1px solid rgba(175,82,222,0.4)', color: '#fff' }}>
                      <RefreshCw size={16} className={checkingAll ? 'spin' : ''} />
                      {checkingAll ? 'Verificando...' : 'Verificar Todas as Atualizações'}
                    </button>
                  )}
                  <button className="download-btn" onClick={fetchMonitor} disabled={monitorLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={16} className={monitorLoading ? 'spin' : ''} />
                    {monitorLoading ? 'Carregando...' : 'Atualizar'}
                  </button>
                </div>
              </div>

              {!token ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#86868b' }}>
                  <Monitor size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                  <p>Faça login como admin para acessar o Monitor.</p>
                  <button className="download-btn" style={{ marginTop: '1rem' }} onClick={() => setIsLoginOpen(true)}>Login Admin</button>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                    {[
                      { key: 'dashboard', label: 'Dashboard & Downloads', icon: <TrendingUp size={15} /> },
                      { key: 'updates', label: 'Atualizações Automáticas', icon: <Zap size={15} /> },
                      { key: 'sync', label: 'Histórico de Atividades', icon: <Clock size={15} /> }
                    ].map(t => (
                      <button key={t.key} onClick={() => setMonitorTab(t.key)} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1.2rem',
                        borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                        background: monitorTab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: monitorTab === t.key ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s'
                      }}>{t.icon} {t.label}</button>
                    ))}
                  </div>

                  {/* Aba: Dashboard & Métricas */}
                  {monitorTab === 'dashboard' && (
                    monitorLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem', color: '#86868b' }}>
                        <RefreshCw size={36} className="spin" style={{ color: '#007aff' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '600' }}>Carregando métricas...</p>
                      </div>
                    ) : !monitorData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem', color: '#86868b', textAlign: 'center' }}>
                        <Monitor size={48} style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: '1rem', fontWeight: '600' }}>Clique em "Atualizar" para carregar as métricas</p>
                        <button className="download-btn" onClick={fetchMonitor} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RefreshCw size={16} /> Carregar Dashboard
                        </button>
                      </div>
                    ) : (
                      <MonitorDashboard monitorData={monitorData} apps={apps} API_BASE={API_BASE} />
                    )
                  )}

                  {/* Aba: Atualizações Automáticas */}
                  {monitorTab === 'updates' && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                      <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>Aplicativos Monitorados na Web</span>
                        <span style={{ fontSize: '0.8rem', color: '#86868b' }}>{autoUpdateCount} de {apps.length} aplicativos</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                              {['Aplicativo', 'Estratégia / Fonte', 'Versão Local', 'Última Checagem', 'Status', 'Ações'].map(h => (
                                <th key={h} style={{ padding: '0.8rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {apps.filter(a => a.autoUpdate).map(app => {
                              const stCfg = STRATEGY_CONFIG[app.updateStrategy] || STRATEGY_CONFIG.catalog;
                              const upStatus = updateStatuses[app.id];
                              const isDownloading = upStatus && upStatus.status === 'downloading';
                              const isChecking = upStatus && upStatus.status === 'checking';

                              return (
                                <tr key={app.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                  <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                      <img src={app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon}
                                        alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                                      <div>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{app.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#86868b' }}>{app.category}</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td style={{ padding: '1rem 1.5rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: stCfg.color, fontWeight: '600' }}>
                                      {stCfg.icon} {stCfg.label}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: '#86868b', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {app.catalogId || app.updateUrl || '—'}
                                    </div>
                                  </td>

                                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                                    v{Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0')}
                                  </td>

                                  <td style={{ padding: '1rem 1.5rem', color: '#86868b', fontSize: '0.85rem' }}>
                                    {formatDate(app.lastCheckedAt)}
                                  </td>

                                  <td style={{ padding: '1rem 1.5rem' }}>
                                    {isDownloading ? (
                                      <span style={{ color: '#007aff', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <RefreshCw size={13} className="spin" /> Baixando ({upStatus.progress}%)
                                      </span>
                                    ) : isChecking ? (
                                      <span style={{ color: '#ff9f0a', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <RefreshCw size={13} className="spin" /> Verificando...
                                      </span>
                                    ) : app.lastUpdateStatus === 'error' ? (
                                      <span style={{ color: '#ff453a', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }} title={app.lastUpdateError}>
                                        <XCircle size={13} /> Erro na fonte
                                      </span>
                                    ) : (
                                      <span style={{ color: '#30d158', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <CheckCircle size={13} /> Atualizado
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ padding: '1rem 1.5rem' }}>
                                    <button
                                      onClick={() => handleCheckSingleUpdate(app.id, true)}
                                      disabled={isDownloading || isChecking}
                                      style={{
                                        padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(175,82,222,0.3)',
                                        background: 'rgba(175,82,222,0.15)', color: '#fff', cursor: 'pointer',
                                        fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px'
                                      }}
                                    >
                                      <CloudDownload size={13} className={isDownloading || isChecking ? 'spin' : ''} />
                                      {isDownloading ? 'Baixando' : 'Baixar Agora'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Aba: Sincronização / Atividades */}
                  {monitorTab === 'sync' && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>Histórico de Atividades</span>
                        <span style={{ fontSize: '0.8rem', color: '#86868b' }}>{monitorData?.activity?.length || 0} registros</span>
                      </div>
                      {monitorData?.activity?.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                {['Conteúdo', 'Tipo', 'Ação', 'Detalhes', 'Data / Hora'].map(h => (
                                  <th key={h} style={{ padding: '0.8rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {monitorData.activity.map(a => {
                                const action = ACTION_LABELS[a.action] || { label: a.action, color: '#86868b' };
                                return (
                                  <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '0.9rem 1.5rem', fontWeight: '600' }}>{a.appName}</td>
                                    <td style={{ padding: '0.9rem 1.5rem' }}><TypeBadge type={a.appType} /></td>
                                    <td style={{ padding: '0.9rem 1.5rem' }}>
                                      <span style={{ color: action.color, fontWeight: '600', fontSize: '0.85rem' }}>● {action.label}</span>
                                    </td>
                                    <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.85rem', color: '#86868b' }}>
                                      {a.details || '—'}
                                    </td>
                                    <td style={{ padding: '0.9rem 1.5rem', color: '#86868b', fontSize: '0.85rem' }}>
                                      <Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{formatDate(a.timestamp)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#86868b' }}>
                          <Clock size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                          <p>Nenhuma atividade registrada ainda.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── Locations View ── */}
          {activeView === 'locations' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Locais & Salas da Academy</h2>
                  <p style={{ color: '#86868b', fontSize: '0.9rem' }}>Organização e pontos de distribuição de software</p>
                </div>
                {token && (
                  <button className="download-btn" onClick={() => { setEditingLocation(null); setNewLocation({ name: '', description: '', icon: '🏢' }); setIsLocationModalOpen(true); }}>
                    <Plus size={16} /> Adicionar Local
                  </button>
                )}
              </div>

              {locations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', color: '#86868b' }}>
                  <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <h3>Nenhum local cadastrado</h3>
                  <p>Adicione salas ou laboratórios para organizar o AppHub.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                  {locations.map(loc => (
                    <motion.div key={loc.id} whileHover={{ x: 2 }} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                      borderRadius: '16px', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                      <span style={{ fontSize: '2rem' }}>{loc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{loc.name}</div>
                        {loc.description && <div style={{ fontSize: '0.85rem', color: '#86868b', marginTop: '2px' }}>{loc.description}</div>}
                        <div style={{ fontSize: '0.75rem', color: '#86868b', marginTop: '4px' }}>
                          <Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                          Criado em {formatDate(loc.createdAt)}
                        </div>
                      </div>
                      {token && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => { setEditingLocation(loc); setNewLocation({ name: loc.name, description: loc.description, icon: loc.icon }); setIsLocationModalOpen(true); }}
                            style={{ background: 'rgba(255,255,255,0.08)', padding: '8px', borderRadius: '9px', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDeleteLocation(loc.id)}
                            style={{ background: 'rgba(255,0,0,0.12)', padding: '8px', borderRadius: '9px', color: '#ff453a', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </section>
      </main>

      {/* ═══ SPOTLIGHT SEARCH MODAL (Cmd+K) ═══ */}
      <AnimatePresence>
        {isSpotlightOpen && (
          <div className="modal-overlay" onClick={() => setIsSpotlightOpen(false)} style={{ alignItems: 'flex-start', paddingTop: '12vh' }}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ duration: 0.18 }}
              style={{
                maxWidth: '640px', padding: 0, overflow: 'hidden',
                background: 'rgba(25, 25, 30, 0.85)', backdropFilter: 'blur(45px)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.15)'
              }}
            >
              {/* Spotlight Input */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={22} color="#007aff" style={{ marginRight: '1rem', flexShrink: 0 }} />
                <input
                  ref={spotlightInputRef}
                  type="text"
                  placeholder="Buscar aplicativo, IDE, utilitário..."
                  value={spotlightQuery}
                  onChange={e => { setSpotlightQuery(e.target.value); setSpotlightSelectedIndex(0); }}
                  onKeyDown={handleSpotlightKeyDown}
                  style={{
                    background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem',
                    fontWeight: '500', outline: 'none', width: '100%'
                  }}
                />
                <button onClick={() => setIsSpotlightOpen(false)} style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Spotlight Results */}
              <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.6rem' }}>
                {spotlightResults.length > 0 ? (
                  spotlightResults.map((app, index) => {
                    const isSelected = index === spotlightSelectedIndex;
                    return (
                      <div
                        key={app.id}
                        onClick={() => { setIsSpotlightOpen(false); setSelectedAppForDetails(app); }}
                        onMouseEnter={() => setSpotlightSelectedIndex(index)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
                          borderRadius: '12px', cursor: 'pointer',
                          background: isSelected ? 'rgba(0, 122, 255, 0.25)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <img
                          src={app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon}
                          alt=""
                          style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{app.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>v{Array.isArray(app.version) ? app.version[0] : (app.version || '1.0.0')}</span>
                            {app.appleSiliconCompatible && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}></span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#86868b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {app.description || app.category}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ fontSize: '0.65rem' }}>{app.category}</span>
                          <span style={{ fontSize: '0.75rem', color: '#30d158', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Download size={11} /> {app.downloadCount || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#86868b' }}>
                    <Search size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <p>Nenhum aplicativo encontrado para "{spotlightQuery}"</p>
                  </div>
                )}
              </div>

              {/* Spotlight Footer */}
              <div style={{
                padding: '0.6rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.75rem', color: '#86868b', background: 'rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>↑</kbd> <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>↓</kbd> navegar</span>
                  <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>↵</kbd> abrir detalhes</span>
                </div>
                <span><kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>esc</kbd> fechar</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ APP DETAILS MODAL / DRAWER ═══ */}
      <AnimatePresence>
        {selectedAppForDetails && (
          <div className="modal-overlay" onClick={() => setSelectedAppForDetails(null)}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}
            >
              {/* Header do App */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
                <img
                  src={selectedAppForDetails.icon.startsWith('/') ? `${API_BASE}${selectedAppForDetails.icon}` : selectedAppForDetails.icon}
                  alt={selectedAppForDetails.name}
                  style={{ width: '84px', height: '84px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{selectedAppForDetails.name}</h2>
                    {selectedAppForDetails.appleSiliconCompatible && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700' }}>
                         Apple Silicon
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span className="badge">{selectedAppForDetails.category}</span>
                    <TypeBadge type={selectedAppForDetails.type} />
                    <span style={{ fontSize: '0.75rem', color: '#86868b' }}>
                      v{Array.isArray(selectedAppForDetails.version) ? selectedAppForDetails.version[0] : (selectedAppForDetails.version || '1.0.0')}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedAppForDetails(null)} style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Botões de Ação Principais */}
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid var(--glass-border)' }}>
                {selectedAppForDetails.type === 'linked' && selectedAppForDetails.externalUrl ? (
                  <a href={selectedAppForDetails.externalUrl} target="_blank" rel="noopener noreferrer" className="download-btn" style={{ flex: 1, padding: '0.8rem', textDecoration: 'none' }}>
                    <Globe size={16} /> Acessar Link Oficial
                  </a>
                ) : (
                  <button
                    onClick={() => handleTriggerDownload(selectedAppForDetails)}
                    className="download-btn"
                    style={{ flex: 1, padding: '0.8rem' }}
                  >
                    <Download size={16} /> Baixar Instalador {selectedAppForDetails.fileSize ? `(${selectedAppForDetails.fileSize})` : ''}
                  </button>
                )}

                <button
                  onClick={() => handleCopyLink(selectedAppForDetails)}
                  className="download-btn"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {copiedLinkAppId === selectedAppForDetails.id ? <Check size={16} color="#30d158" /> : <Copy size={16} />}
                  <span>{copiedLinkAppId === selectedAppForDetails.id ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>

              {/* Pills com Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', margin: '0.8rem 0' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.8rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#30d158' }}>{selectedAppForDetails.downloadCount || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Downloads na Academy</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.8rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#007aff' }}>{selectedAppForDetails.fileSize || '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Tamanho do Pacote</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.8rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#af52de' }}>
                    {selectedAppForDetails.autoUpdate ? 'Automático' : 'Manual'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Modo de Atualização</div>
                </div>
              </div>

              {/* Descrição Completa */}
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.4rem' }}>Sobre o Aplicativo</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  {selectedAppForDetails.description || 'Nenhuma descrição detalhada disponível.'}
                </p>
              </div>

              {/* Requisitos de Sistema */}
              {selectedAppForDetails.requirements && (
                <div style={{ marginTop: '1rem', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64d2ff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem' }}>
                    <Cpu size={14} /> Requisitos do Sistema
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                    {selectedAppForDetails.requirements}
                  </p>
                </div>
              )}

              {/* Changelog / O que há de novo */}
              {selectedAppForDetails.changelog && (
                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem' }}>
                    <Sparkles size={14} color="#FFD700" /> O que há de novo nesta versão
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    {selectedAppForDetails.changelog}
                  </p>
                </div>
              )}

              {/* Screenshots Gallery */}
              {selectedAppForDetails.screenshots && selectedAppForDetails.screenshots.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image size={15} /> Prévia da Interface
                  </h4>
                  <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {selectedAppForDetails.screenshots.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt="Screenshot"
                        style={{ height: '160px', borderRadius: '12px', border: '1px solid var(--glass-border)', objectFit: 'cover' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: App (Add / Edit) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" onClick={resetModal}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{editingApp ? 'Editar' : 'Novo'} {contentTab === 'files' ? 'Arquivo' : 'App'}</h3>
                <X style={{ cursor: 'pointer' }} onClick={resetModal} />
              </div>

              {/* Presets de Apps Populares */}
              {!editingApp && contentTab === 'apps' && catalogList.length > 0 && (
                <div style={{ background: 'rgba(175,82,222,0.08)', border: '1px solid rgba(175,82,222,0.25)', borderRadius: '14px', padding: '0.8rem 1rem', marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#d896ff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} /> Preenchimento Automático com 1 Clique (Sites Oficiais)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {catalogList.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyCatalogPreset(preset)}
                        style={{
                          background: newApp.catalogId === preset.id ? 'rgba(175,82,222,0.4)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${newApp.catalogId === preset.id ? '#af52de' : 'rgba(255,255,255,0.1)'}`,
                          color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Tipo */}
                <div className="form-group">
                  <label>Tipo</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => setNewApp({ ...newApp, type: key })} style={{
                        flex: 1, padding: '0.6rem', borderRadius: '10px', border: `1px solid ${newApp.type === key ? cfg.color : 'rgba(255,255,255,0.15)'}`,
                        background: newApp.type === key ? cfg.bg : 'transparent', color: newApp.type === key ? cfg.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s'
                      }}>{cfg.label}</button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Nome do Aplicativo</label>
                  <input type="text" required value={newApp.name} onChange={e => setNewApp({ ...newApp, name: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select value={newApp.category} onChange={e => setNewApp({ ...newApp, category: e.target.value })}>
                      {['Utilitários', 'Desenvolvimento', 'Navegador', 'Office', 'Design', 'Ferramentas', 'Educação', 'Segurança'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Versão</label>
                    <input type="text" value={newApp.version} onChange={e => setNewApp({ ...newApp, version: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea rows="2" value={newApp.description} onChange={e => setNewApp({ ...newApp, description: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Requisitos do Sistema (opcional)</label>
                    <input type="text" placeholder="ex: macOS 14 Sonoma ou superior" value={newApp.requirements} onChange={e => setNewApp({ ...newApp, requirements: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Changelog / Novidades (opcional)</label>
                    <input type="text" placeholder="ex: Suporte a Swift 6 e novos SDKs" value={newApp.changelog} onChange={e => setNewApp({ ...newApp, changelog: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Plataformas</label>
                  <PlatformPicker selected={newApp.platforms} onChange={p => setNewApp({ ...newApp, platforms: p })} />
                </div>

                {/* Compatível com Apple Silicon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}> Compatível com Apple Silicon</div>
                    <div style={{ fontSize: '0.8rem', color: '#86868b' }}>Binário otimizado para chips M1, M2, M3, M4 ou Universal</div>
                  </div>
                  <ToggleSwitch checked={newApp.appleSiliconCompatible} onChange={() => setNewApp({ ...newApp, appleSiliconCompatible: !newApp.appleSiliconCompatible })} />
                </div>

                {/* URL Externa (para tipo linked) */}
                {newApp.type === 'linked' && (
                  <div className="form-group">
                    <label>URL Externa (link de acesso/download)</label>
                    <input type="url" placeholder="https://..." value={newApp.externalUrl} onChange={e => setNewApp({ ...newApp, externalUrl: e.target.value })} />
                  </div>
                )}

                {/* ── Bloco: Atualização Automática na Internet ── */}
                <div style={{
                  background: 'rgba(175,82,222,0.06)', border: '1px solid rgba(175,82,222,0.25)',
                  borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#d896ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} /> Atualização Automática na Internet
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#86868b' }}>
                        O servidor buscará e baixará novas versões direto da fonte oficial
                      </div>
                    </div>
                    <ToggleSwitch checked={newApp.autoUpdate} onChange={() => setNewApp({ ...newApp, autoUpdate: !newApp.autoUpdate })} />
                  </div>

                  {newApp.autoUpdate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(175,82,222,0.2)' }}>
                      <div className="form-group">
                        <label style={{ color: '#d896ff' }}>Estratégia de Busca</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          {Object.entries(STRATEGY_CONFIG).map(([key, cfg]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setNewApp({ ...newApp, updateStrategy: key })}
                              style={{
                                padding: '0.5rem', borderRadius: '8px', border: `1px solid ${newApp.updateStrategy === key ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                                background: newApp.updateStrategy === key ? `${cfg.color}22` : 'rgba(255,255,255,0.03)',
                                color: newApp.updateStrategy === key ? cfg.color : 'var(--text-secondary)',
                                cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              {cfg.icon} {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {newApp.updateStrategy === 'catalog' && (
                        <div className="form-group">
                          <label>Identificador no Catálogo (ex: google-chrome, brave-browser, figma, omnidisksweeper)</label>
                          <input
                            type="text"
                            placeholder="google-chrome"
                            value={newApp.catalogId}
                            onChange={e => setNewApp({ ...newApp, catalogId: e.target.value })}
                          />
                        </div>
                      )}

                      {newApp.updateStrategy === 'direct_url' && (
                        <div className="form-group">
                          <label>URL Direta de Download Oficial (Latest URL)</label>
                          <input
                            type="url"
                            placeholder="https://dl.google.com/chrome/mac/universal/stable/GGRO/googlechrome.dmg"
                            value={newApp.updateUrl}
                            onChange={e => setNewApp({ ...newApp, updateUrl: e.target.value })}
                          />
                        </div>
                      )}

                      {newApp.updateStrategy === 'web_scrape' && (
                        <>
                          <div className="form-group">
                            <label>URL da Página de Download do Fabricante</label>
                            <input
                              type="url"
                              placeholder="https://site.com/download"
                              value={newApp.updateUrl}
                              onChange={e => setNewApp({ ...newApp, updateUrl: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Padrão de busca (opcional, ex: \.dmg$ ou \.pkg$)</label>
                            <input
                              type="text"
                              placeholder="\.dmg$"
                              value={newApp.updatePattern}
                              onChange={e => setNewApp({ ...newApp, updatePattern: e.target.value })}
                            />
                          </div>
                        </>
                      )}

                      {newApp.updateStrategy === 'github' && (
                        <div className="form-group">
                          <label>Repositório GitHub (autor/nome-do-repositorio)</label>
                          <input
                            type="text"
                            placeholder="ex: desktop/desktop ou autor/meu-app"
                            value={newApp.updateUrl}
                            onChange={e => setNewApp({ ...newApp, updateUrl: e.target.value })}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Disponível */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Disponível para usuários</div>
                    <div style={{ fontSize: '0.8rem', color: '#86868b' }}>Desative para ocultar este item temporariamente</div>
                  </div>
                  <ToggleSwitch checked={newApp.available} onChange={() => setNewApp({ ...newApp, available: !newApp.available })} />
                </div>

                {/* Ícone */}
                <div className="form-group">
                  <label>Ícone</label>
                  <div className="file-upload-area" style={{ padding: '1rem' }}>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setSelectedIcon(f); setIconPreview(URL.createObjectURL(f)); } }} style={{ display: 'none' }} id="icon-input" />
                    <label htmlFor="icon-input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {iconPreview ? (
                        <img src={iconPreview} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload size={20} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#86868b' }}>{selectedIcon ? selectedIcon.name : 'Selecionar ícone (PNG, SVG, JPG)'}</span>
                    </label>
                  </div>
                </div>

                {/* Arquivo (apenas para hosted e file) */}
                {(newApp.type === 'hosted' || newApp.type === 'file') && (
                  <div className="form-group">
                    <label>
                      {newApp.type === 'file' ? 'Documento' : 'Arquivo do Instalador'}
                      {newApp.autoUpdate && <span style={{ color: '#d896ff', marginLeft: '6px', fontSize: '0.75rem' }}>(Opcional se a Atualização Automática estiver ativa)</span>}
                    </label>
                    <div className="file-upload-area" style={{ padding: '1rem' }}>
                      <input type="file" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} id="file-input" />
                      <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={20} style={{ opacity: 0.4 }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#86868b' }}>
                          {selectedFile ? selectedFile.name : (newApp.autoUpdate ? 'Deixe em branco para o servidor baixar sozinho da internet' : (editingApp ? 'Substituir arquivo (opcional)' : 'Selecionar arquivo'))}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <button type="submit" className="download-btn" style={{ width: '100%', marginTop: '0.5rem', opacity: uploading ? 0.7 : 1 }} disabled={uploading}>
                  {uploading ? 'Processando...' : (editingApp ? 'Salvar Alterações' : 'Cadastrar')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Local ── */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="modal-overlay" onClick={() => setIsLocationModalOpen(false)}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{editingLocation ? 'Editar' : 'Novo'} Local</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => setIsLocationModalOpen(false)} />
              </div>
              <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Ícone</label>
                    <input type="text" maxLength="2" value={newLocation.icon} onChange={e => setNewLocation({ ...newLocation, icon: e.target.value })}
                      style={{ textAlign: 'center', fontSize: '1.5rem' }} />
                  </div>
                  <div className="form-group">
                    <label>Nome do Local</label>
                    <input type="text" required value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição (opcional)</label>
                  <input type="text" value={newLocation.description} onChange={e => setNewLocation({ ...newLocation, description: e.target.value })} />
                </div>
                <button type="submit" className="download-btn" style={{ width: '100%' }}>
                  {editingLocation ? 'Salvar Alterações' : 'Adicionar Local'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Login ── */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="modal-overlay" onClick={() => setIsLoginOpen(false)}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '56px', height: '56px', background: 'var(--primary-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(0,113,227,0.3)' }}>
                  <User size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Acesso Restrito</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Faça login para gerenciar o AppHub da Academy.</p>
                <button onClick={() => setIsLoginOpen(false)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#86868b', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Usuário</label>
                  <input type="text" required value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} required value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={{ width: '100%', paddingRight: '45px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="download-btn" style={{ width: '100%', padding: '0.9rem' }}>Entrar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Configurações & Notificações ── */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '540px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Configurações</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => setIsSettingsOpen(false)} />
              </div>

              <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
                {[
                  { key: 'geral', label: 'Geral' },
                  { key: 'notificacoes', label: 'Notificações (Zoom/WhatsApp)' },
                  { key: 'seguranca', label: 'Segurança' }
                ].map(t => (
                  <button key={t.key} onClick={() => setSettingsTab(t.key)} style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                    background: settingsTab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: settingsTab === t.key ? '#fff' : 'var(--text-secondary)'
                  }}>{t.label}</button>
                ))}
              </div>

              {settingsTab === 'geral' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ marginBottom: '0.8rem' }}>Status do Sistema</h4>
                    {[
                      ['Versão', '2.5.0 (Apple Academy Edition)'],
                      ['Total de Aplicativos', apps.length],
                      ['Com Atualização Automática', autoUpdateCount],
                      ['Rotina em Segundo Plano', '● Ativa (a cada 6h)'],
                      ['Conexão API', '● Online']
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ color: v.toString().startsWith('●') ? '#34c759' : '#fff' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleLogout} style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,69,58,0.3)', background: 'rgba(255,69,58,0.08)', color: '#ff453a', cursor: 'pointer', fontWeight: '600' }}>
                    Encerrar Sessão
                  </button>
                </div>
              )}

              {settingsTab === 'notificacoes' && (
                <form onSubmit={handleSaveNotificationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Ativar Notificações Externas</div>
                      <div style={{ fontSize: '0.8rem', color: '#86868b' }}>Avisa canais da Academy sobre novos softwares e atualizações</div>
                    </div>
                    <ToggleSwitch
                      checked={notificationSettings.enabled}
                      onChange={() => setNotificationSettings(p => ({ ...p, enabled: !p.enabled }))}
                    />
                  </div>

                  {notificationSettings.enabled && (
                    <>
                      <div className="form-group">
                        <label>Canal / Provedor</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                          {[
                            { key: 'zoom', label: 'Zoom Chat' },
                            { key: 'whatsapp', label: 'WhatsApp API' },
                            { key: 'generic', label: 'Webhook' },
                            { key: 'email', label: 'E-mail (SMTP)' }
                          ].map(prov => (
                            <button
                              key={prov.key}
                              type="button"
                              onClick={() => setNotificationSettings(p => ({ ...p, provider: prov.key }))}
                              style={{
                                padding: '0.6rem', borderRadius: '8px', border: `1px solid ${notificationSettings.provider === prov.key ? '#007aff' : 'rgba(255,255,255,0.1)'}`,
                                background: notificationSettings.provider === prov.key ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.03)',
                                color: notificationSettings.provider === prov.key ? '#64d2ff' : 'var(--text-secondary)',
                                cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem'
                              }}
                            >
                              {prov.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {notificationSettings.provider !== 'email' && (
                        <div className="form-group">
                          <label>URL do Webhook {notificationSettings.provider === 'zoom' ? '(Zoom Chat Incoming Webhook)' : ''}</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={notificationSettings.webhookUrl || ''}
                            onChange={e => setNotificationSettings(p => ({ ...p, webhookUrl: e.target.value }))}
                          />
                        </div>
                      )}

                      {notificationSettings.provider === 'whatsapp' && (
                        <div className="form-group">
                          <label>Número do WhatsApp / Grupo (ex: 5511999999999 ou group-id)</label>
                          <input
                            type="text"
                            placeholder="5511999999999"
                            value={notificationSettings.phone || ''}
                            onChange={e => setNotificationSettings(p => ({ ...p, phone: e.target.value }))}
                          />
                        </div>
                      )}

                      {notificationSettings.provider !== 'email' && (
                        <div className="form-group">
                          <label>Token / API Key (se exigido pelo provedor)</label>
                          <input
                            type="password"
                            placeholder="Bearer token ou API key..."
                            value={notificationSettings.apiKey || ''}
                            onChange={e => setNotificationSettings(p => ({ ...p, apiKey: e.target.value }))}
                          />
                        </div>
                      )}

                      {notificationSettings.provider === 'email' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                              <label>Servidor SMTP</label>
                              <input type="text" placeholder="smtp.gmail.com" value={notificationSettings.smtpHost || ''} onChange={e => setNotificationSettings(p => ({ ...p, smtpHost: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label>Porta</label>
                              <input type="number" placeholder="587" value={notificationSettings.smtpPort || ''} onChange={e => setNotificationSettings(p => ({ ...p, smtpPort: e.target.value }))} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                              <label>Usuário / E-mail de Envio</label>
                              <input type="email" placeholder="seu-email@gmail.com" value={notificationSettings.smtpUser || ''} onChange={e => setNotificationSettings(p => ({ ...p, smtpUser: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label>Senha / Senha de App</label>
                              <input type="password" placeholder="********" value={notificationSettings.smtpPass || ''} onChange={e => setNotificationSettings(p => ({ ...p, smtpPass: e.target.value }))} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>E-mail de Destino (Quem recebe)</label>
                            <input type="email" placeholder="lsa24@ifce.idserve.net" value={notificationSettings.toEmail || ''} onChange={e => setNotificationSettings(p => ({ ...p, toEmail: e.target.value }))} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnNewApp}
                            onChange={e => setNotificationSettings(p => ({ ...p, notifyOnNewApp: e.target.checked }))}
                          />
                          Notificar ao cadastrar novo aplicativo
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnAutoUpdate}
                            onChange={e => setNotificationSettings(p => ({ ...p, notifyOnAutoUpdate: e.target.checked }))}
                          />
                          Notificar quando o robô atualizar um aplicativo automaticamente
                        </label>
                      </div>

                      {/* Botão de Teste */}
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={handleTestNotification}
                          disabled={testingNotification || !notificationSettings.webhookUrl}
                          className="download-btn"
                          style={{
                            background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.4)',
                            color: '#64d2ff', padding: '0.6rem 1rem', fontSize: '0.85rem'
                          }}
                        >
                          <Send size={14} className={testingNotification ? 'spin' : ''} />
                          {testingNotification ? 'Enviando teste...' : 'Testar Envio'}
                        </button>

                        {notificationTestStatus && (
                          <span style={{ fontSize: '0.8rem', color: notificationTestStatus.success ? '#30d158' : '#ff453a' }}>
                            {notificationTestStatus.message}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  <button type="submit" className="download-btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Salvar Notificações
                  </button>
                </form>
              )}

              {settingsTab === 'seguranca' && (
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { key: 'currentPassword', label: 'Senha Atual', show: showChangePasswords.current, toggle: () => setShowChangePasswords(p => ({ ...p, current: !p.current })) },
                    { key: 'newPassword', label: 'Nova Senha', show: showChangePasswords.new, toggle: () => setShowChangePasswords(p => ({ ...p, new: !p.new })) },
                    { key: 'confirmPassword', label: 'Confirmar Senha', show: showChangePasswords.confirm, toggle: () => setShowChangePasswords(p => ({ ...p, confirm: !p.confirm })) },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label>{f.label}</label>
                      <div style={{ position: 'relative' }}>
                        <input type={f.show ? 'text' : 'password'} required value={changePasswordForm[f.key]}
                          onChange={e => setChangePasswordForm(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{ width: '100%', paddingRight: '45px' }} />
                        <button type="button" onClick={f.toggle}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          {f.show ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="submit" className="download-btn" style={{ width: '100%' }}>Atualizar Senha</button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
