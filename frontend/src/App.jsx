import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Search, LayoutGrid, Package, Info, Plus, X, Upload, Pencil, Trash2, Eye, EyeOff, Key, Terminal, Brush, Cpu, Box, Settings, Bell, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('apphub_token'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newApp, setNewApp] = useState({
    name: '',
    category: 'Utilitários',
    version: '1.0.0',
    description: '',
    icon: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('geral');
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showChangePasswords, setShowChangePasswords] = useState({ current: false, new: false, confirm: false });
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const API_BASE = '/apphub';

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/apps`);
      setApps(response.data);
    } catch (error) {
      console.error('Erro ao buscar apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/api/login`, loginForm);
      const newToken = response.data.token;
      setToken(newToken);
      localStorage.setItem('apphub_token', newToken);
      setIsLoginOpen(false);
    } catch (error) {
      alert('Usuário ou senha inválidos');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('apphub_token');
    setIsChangePasswordOpen(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      alert('As novas senhas não coincidem');
      return;
    }

    try {
      await axios.put(`${API_BASE}/api/admin/change-password`, {
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Senha alterada com sucesso!');
      setIsChangePasswordOpen(false);
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao alterar senha');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este aplicativo? O arquivo também será removido do servidor.')) return;

    try {
      await axios.delete(`${API_BASE}/api/apps/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchApps();
    } catch (error) {
      alert('Erro ao excluir app');
    }
  };

  const openEditModal = (app) => {
    setEditingApp(app);
    setNewApp({
      name: app.name,
      category: app.category,
      version: app.version,
      description: app.description,
      icon: app.icon
    });
    setIconPreview(app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon);
    setIsModalOpen(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile && !editingApp) {
      alert('Por favor, selecione um arquivo.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('name', newApp.name);
    formData.append('category', newApp.category);
    formData.append('version', newApp.version);
    formData.append('version', newApp.version);
    formData.append('description', newApp.description);
    if (selectedFile) formData.append('file', selectedFile);
    if (selectedIcon) formData.append('icon', selectedIcon);

    try {
      if (editingApp) {
        await axios.put(`${API_BASE}/api/apps/${editingApp.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post(`${API_BASE}/api/apps`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setIsModalOpen(false);
      setEditingApp(null);
      fetchApps();
      setNewApp({ name: '', category: 'Utilitários', version: '1.0.0', description: '', icon: '' });
      setSelectedFile(null);
      setSelectedIcon(null);
      setIconPreview(null);
      alert(editingApp ? 'App atualizado!' : 'App cadastrado!');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Sessão expirada. Faça login novamente.');
        handleLogout();
      } else {
        alert('Erro na operação');
      }
    } finally {
      setUploading(false);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { name: 'Todos', icon: <LayoutGrid size={20} /> },
    { name: 'Utilitários', icon: <Box size={20} /> },
    { name: 'Desenvolvimento', icon: <Terminal size={20} /> },
    { name: 'Design', icon: <Brush size={20} /> },
    { name: 'Navegador', icon: <Search size={20} /> },
    { name: 'Office', icon: <Package size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="glass-sidebar">
        <div className="logo-section">
          <Cpu className="text-primary" size={32} />
          <h1>AppHub</h1>
        </div>

        <nav className="nav-links">
          {categories.map(cat => (
            <div
              key={cat.name}
              className={`nav-item ${selectedCategory === cat.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          <div className="nav-item" onClick={() => setIsUpdatesOpen(true)}>
            <Bell size={20} />
            <span>Atualizações</span>
          </div>
          <div className={`nav-item ${isSettingsOpen ? 'active' : ''}`} onClick={() => token ? setIsSettingsOpen(true) : setIsLoginOpen(true)}>
            <Settings size={20} />
            <span>Configurações</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="glass-header">
          <div className="search-container">
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }} />
            <input
              className="search-bar"
              placeholder="Buscar em todos os apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            {token ? (
              <>
                <button className="download-btn" onClick={() => setIsModalOpen(true)}>
                  <Plus size={18} />
                  App
                </button>
                <div className="nav-item" onClick={handleLogout} title="Sair">
                  <User size={18} />
                </div>
              </>
            ) : (
              <button
                className="download-btn"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                onClick={() => setIsLoginOpen(true)}
              >
                Login Admin
              </button>
            )}
          </div>
        </header>

        <section className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '700' }}>Explorar Aplicativos</h2>
                <p style={{ color: '#86868b', marginTop: '0.4rem' }}>{filteredApps.length} aplicativos disponíveis na rede local</p>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div className="app-grid" layout>
                {filteredApps.map((app, index) => (
                  <motion.div
                    key={app.id}
                    className="app-card"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                      <img
                        src={app.icon.startsWith('/') ? `${API_BASE}${app.icon}` : app.icon}
                        alt={app.name}
                        className="app-icon"
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{app.name}</h3>
                        <span className="badge">{app.category}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#86868b', lineHeight: '1.5', height: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {app.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#86868b' }}>
                        <Info size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        v{app.version} • {app.fileSize}
                      </div>

                      <div className="flex gap-2">
                        {token && (
                          <>
                            <button
                              onClick={() => openEditModal(app)}
                              style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px', color: '#86868b' }}
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(app.id)}
                              style={{ background: 'rgba(255,0,0,0.1)', padding: '8px', borderRadius: '10px', color: '#ff453a' }}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <a href={app.downloadUrl === '#' ? '#' : `${API_BASE}${app.downloadUrl}`} className="download-btn">
                          <Download size={16} />
                          Obter
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredApps.length === 0 && !loading && (
              <div style={{ textAlign: 'center', marginTop: '6rem', color: '#86868b' }}>
                <Package size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                <h3>Nenhum aplicativo encontrado</h3>
                <p>Tente ajustar sua busca ou mudar de categoria.</p>
              </div>
            )}
          </motion.div>
        </section>
      </main>

      {/* Modal de Upload */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>{editingApp ? 'Editar' : 'Cadastrar Novo'} App</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => { setIsModalOpen(false); setEditingApp(null); }} />
              </div>

              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label>Nome do Aplicativo</label>
                  <input
                    type="text"
                    required
                    value={newApp.name}
                    onChange={e => setNewApp({ ...newApp, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      value={newApp.category}
                      onChange={e => setNewApp({ ...newApp, category: e.target.value })}
                    >
                      <option>Utilitários</option>
                      <option>Desenvolvimento</option>
                      <option>Navegador</option>
                      <option>Office</option>
                      <option>Design</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Versão</label>
                    <input
                      type="text"
                      value={newApp.version}
                      onChange={e => setNewApp({ ...newApp, version: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea
                    rows="3"
                    value={newApp.description}
                    onChange={e => setNewApp({ ...newApp, description: e.target.value })}
                  ></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Ícone do App (PNG, SVG, JPG)</label>
                    <div className="file-upload-area" style={{ padding: '1rem' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setSelectedIcon(file);
                            setIconPreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                        id="icon-input"
                      />
                      <label htmlFor="icon-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {iconPreview ? (
                          <img src={iconPreview} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', marginBottom: '8px' }} />
                        ) : (
                          <Upload size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        )}
                        <span style={{ fontSize: '0.8rem' }}>{selectedIcon ? selectedIcon.name : 'Selecionar Ícone'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Arquivo do Programa (Instalador)</label>
                    <div className="file-upload-area" style={{ padding: '1rem' }}>
                      <input
                        type="file"
                        onChange={e => setSelectedFile(e.target.files[0])}
                        style={{ display: 'none' }}
                        id="file-input"
                      />
                      <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Package size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <span style={{ fontSize: '0.8rem' }}>{selectedFile ? selectedFile.name : 'Selecionar Arquivo'}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="download-btn"
                  style={{ width: '100%', marginTop: '1rem', opacity: uploading ? 0.7 : 1 }}
                  disabled={uploading}
                >
                  {uploading ? 'Processando...' : (editingApp ? 'Salvar Alterações' : 'Finalizar Cadastro')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Login */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{ maxWidth: '420px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'var(--primary-gradient)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 10px 20px rgba(0, 113, 227, 0.3)'
                }}>
                  <User size={32} color="white" />
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>Acesso Restrito</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Identifique-se para gerenciar os aplicativos do AppHub.
                </p>
                <button
                  onClick={() => setIsLoginOpen(false)}
                  style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', color: '#86868b', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Usuário</label>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      style={{ width: '100%', paddingRight: '45px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="download-btn" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                  Entrar no Painel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Alterar Senha (Removido daqui pois agora está em Configurações) */}

      {/* Modal de Configurações */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="modal-overlay">
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{ maxWidth: '500px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Configurações</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => setIsSettingsOpen(false)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setSettingsTab('geral')}
                  style={{
                    padding: '0.8rem 1rem',
                    background: 'none',
                    border: 'none',
                    color: settingsTab === 'geral' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: settingsTab === 'geral' ? '2px solid var(--primary)' : 'none',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Geral
                </button>
                <button
                  onClick={() => setSettingsTab('seguranca')}
                  style={{
                    padding: '0.8rem 1rem',
                    background: 'none',
                    border: 'none',
                    color: settingsTab === 'seguranca' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: settingsTab === 'seguranca' ? '2px solid var(--primary)' : 'none',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Segurança
                </button>
              </div>

              {settingsTab === 'geral' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Status do Sistema</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Versão</span>
                      <span>2.0.0 (Premium)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Conexão API</span>
                      <span style={{ color: '#34c759' }}>Online</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Preferências</h4>
                    <div className="form-group">
                      <label>Idioma do Painel</label>
                      <select disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                        <option>Português (Brasil)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Senha Atual</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showChangePasswords.current ? "text" : "password"}
                        required
                        value={changePasswordForm.currentPassword}
                        onChange={e => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                        style={{ width: '100%', paddingRight: '45px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowChangePasswords({ ...showChangePasswords, current: !showChangePasswords.current })}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {showChangePasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Nova Senha</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showChangePasswords.new ? "text" : "password"}
                        required
                        value={changePasswordForm.newPassword}
                        onChange={e => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                        style={{ width: '100%', paddingRight: '45px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowChangePasswords({ ...showChangePasswords, new: !showChangePasswords.new })}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {showChangePasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Confirmar Nova Senha</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showChangePasswords.confirm ? "text" : "password"}
                        required
                        value={changePasswordForm.confirmPassword}
                        onChange={e => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                        style={{ width: '100%', paddingRight: '45px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowChangePasswords({ ...showChangePasswords, confirm: !showChangePasswords.confirm })}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {showChangePasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="download-btn" style={{ width: '100%' }}>
                    Atualizar Senha
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Atualizações */}
      <AnimatePresence>
        {isUpdatesOpen && (
          <div className="modal-overlay" onClick={() => setIsUpdatesOpen(false)}>
            <motion.div
              className="modal-content"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                right: '2rem',
                top: '5rem',
                maxWidth: '380px',
                height: 'calc(100vh - 7rem)',
                margin: 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Atualizações</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => setIsUpdatesOpen(false)} />
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { title: 'Novo Layout Premium', date: 'Hoje', desc: 'Interface totalmente reformulada com estilo Glassmorphism.', type: 'feature' },
                  { title: 'Suporte a Ícones', date: 'Ontem', desc: 'Agora você pode carregar ícones customizados para seus apps.', type: 'feature' },
                  { title: 'Segurança Melhorada', date: '12 Mar', desc: 'Troca de senha e proteção de rota administrativa.', type: 'fix' },
                  { title: 'Performance Docker', date: '10 Mar', desc: 'Otimização nas imagens para carregamento mais rápido.', type: 'info' }
                ].map((update, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{update.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{update.date}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{update.desc}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Build 2.2.0-stable</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
