import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Search, LayoutGrid, Package, Info, Plus, X, Upload, Pencil, Trash2 } from 'lucide-react';
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
  const API_BASE = `http://${window.location.hostname}:5002`;

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
    formData.append('description', newApp.description);
    if (selectedFile) formData.append('file', selectedFile);

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

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="glass-header">
        <div className="flex items-center gap-2">
          <LayoutGrid size={24} className="text-primary" />
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>AppHub</h1>
        </div>
        <div className="flex gap-4">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }} />
            <input
              className="search-bar"
              placeholder="Buscar aplicativos..."
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {token ? (
              <>
                <button
                  className="download-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  Adicionar App
                </button>
                <button
                  className="download-btn"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  onClick={handleLogout}
                >
                  Sair
                </button>
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
        </div>
      </header>

      <main className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ marginBottom: '2rem' }}>
            <h2>Servidor Local de Aplicativos</h2>
            <p style={{ color: '#86868b', marginTop: '0.5rem' }}>Baixe programas e utilitários direto da rede local com velocidade máxima.</p>
          </div>

          <AnimatePresence>
            <div className="app-grid">
              {filteredApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  className="app-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img src={app.icon} alt={app.name} className="app-icon" />
                    <div>
                      <h3 style={{ margin: 0 }}>{app.name}</h3>
                      <span className="badge">{app.category}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#86868b', lineHeight: '1.4' }}>
                    {app.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
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
                        <Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Obter
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          {filteredApps.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: '4rem', color: '#86868b' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Nenhum aplicativo encontrado.</p>
            </div>
          )}
        </motion.div>
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

                <div className="form-group">
                  <label>Arquivo do Programa (.exe, .dmg, .apk, etc)</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      onChange={e => setSelectedFile(e.target.files[0])}
                      style={{ display: 'none' }}
                      id="file-input"
                    />
                    <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <span>{selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo'}</span>
                    </label>
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '400px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>Acesso Restrito</h3>
                <X style={{ cursor: 'pointer' }} onClick={() => setIsLoginOpen(false)} />
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Usuário</label>
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Senha</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <button type="submit" className="download-btn" style={{ width: '100%', marginTop: '1rem' }}>
                  Entrar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
