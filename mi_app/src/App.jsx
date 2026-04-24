import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = 'https://prueva-semana-10-1.onrender.com'

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error desconocido')
  return data
}

// ── GLOBAL TOAST ──────────────────────────────────────────────────
function GlobalToast({ msg }) {
  if (!msg.text) return null
  return (
    <div className={`global-toast show ${msg.type}`}>
      {msg.text}
    </div>
  )
}

// ── NAVBAR ────────────────────────────────────────────────────────
function Navbar({ online, view, userEmail, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="white">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>
          </svg>
        </div>
        <span>Inventario</span>
      </div>
      <div className="navbar-status">
        <div className={`status-dot ${online ? 'online' : ''}`}></div>
        <span>{online ? 'conectado' : 'verificando...'}</span>
        <span className="sep">·</span>
        <span className="mono">Railway · MySQL</span>
      </div>
    </nav>
  )
}

// ── PRODUCT CARD ──────────────────────────────────────────────────
function ProductCard({ item, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={`product-card ${item.estado ? '' : 'inactive'}`}>
      <div className="card-img">
        <div className="card-img-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
          </svg>
          <span>sin imagen</span>
        </div>
        <span className="card-id">#{item.id}</span>
        <div className="card-menu-wrap" ref={menuRef}>
          <button className="menu-btn" onClick={() => setMenuOpen(o => !o)}>⋮</button>
          {menuOpen && (
            <div className="card-menu">
              <button className="menu-item" onClick={() => { onEdit(item); setMenuOpen(false) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>
                Editar
              </button>
              <div className="menu-divider"></div>
              <button className="menu-item delete" onClick={() => { onDelete(item); setMenuOpen(false) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="card-name">{item.nombre}</div>
        <div className="card-desc">{item.descripcion || 'Sin descripción'}</div>
        <div className="card-footer">
          <span className="card-price">
            {item.precio != null ? `S/. ${Number(item.precio).toFixed(2)}` : '—'}
          </span>
          <div className="card-meta">
            <span className={`badge ${item.estado ? 'badge-active' : 'badge-inactive'}`}>
              {item.estado ? 'Activo' : 'Inactivo'}
            </span>
            {item.categoria && <span className="badge badge-cat">{item.categoria}</span>}
            {item.stock != null && <span className="card-stock">stock: {item.stock}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ITEM MODAL (CREATE / EDIT) ────────────────────────────────────
function ItemModal({ isOpen, editItem, onClose, onSave, loading }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', estado: 1, precio: '', stock: '', categoria: '' })

  useEffect(() => {
    if (editItem) {
      setForm({
        nombre: editItem.nombre || '',
        descripcion: editItem.descripcion || '',
        estado: editItem.estado ?? 1,
        precio: editItem.precio ?? '',
        stock: editItem.stock ?? '',
        categoria: editItem.categoria || '',
      })
    } else {
      setForm({ nombre: '', descripcion: '', estado: 1, precio: '', stock: '', categoria: '' })
    }
  }, [editItem, isOpen])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  return (
    <div className={`modal-overlay ${isOpen ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{editItem ? 'Editar Ítem' : 'Nuevo Ítem'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-fields">
            <div className="field">
              <label>Nombre <span className="req">*</span></label>
              <input type="text" placeholder="Ej: Laptop Dell XPS 15" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea placeholder="Descripción del ítem..." value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Precio (S/.)</label>
                <input type="number" placeholder="0.00" min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} />
              </div>
              <div className="field">
                <label>Stock</label>
                <input type="number" placeholder="0" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="">Sin categoría</option>
                <option value="Electrónica">Electrónica</option>
                <option value="Ropa">Ropa</option>
                <option value="Alimentos">Alimentos</option>
                <option value="Hogar">Hogar</option>
                <option value="Deportes">Deportes</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Estado</span>
              <button
                className={`switch ${form.estado ? 'on' : ''}`}
                onClick={() => set('estado', form.estado ? 0 : 1)}
                type="button"
              ></button>
              <span className={`switch-text ${form.estado ? 'on' : ''}`}>{form.estado ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            {loading ? 'Guardando...' : 'Guardar ítem'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CONFIRM DELETE MODAL ──────────────────────────────────────────
function ConfirmModal({ isOpen, itemName, onCancel, onConfirm }) {
  return (
    <div className={`modal-overlay ${isOpen ? 'show' : ''}`}>
      <div className="modal-box confirm-box">
        <div className="confirm-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
        </div>
        <h3>¿Eliminar ítem?</h3>
        <p>"{itemName}" será eliminado permanentemente.</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────
export default function App() {
  const [token, setToken]       = useState(localStorage.getItem('token') || '')
  const [view, setView]         = useState('login')
  const [items, setItems]       = useState([])
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState({ email: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [online, setOnline]     = useState(false)
  const [msg, setMsg]           = useState({ text: '', type: '' })
  const [modalOpen, setModalOpen]     = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)
  const toastTimer = useRef(null)

  const userEmail = (() => { try { return JSON.parse(atob(token.split('.')[1])).email } catch { return '' } })()

  useEffect(() => {
    // Ping backend
    fetch(`${API}/`).then(() => setOnline(true)).catch(() => setOnline(false))
    if (token) { setView('items'); fetchItems() }
  }, [])

  function notify(text, type = 'ok') {
    clearTimeout(toastTimer.current)
    setMsg({ text, type })
    toastTimer.current = setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  async function fetchItems() {
    try {
      const data = await apiFetch('/api/items')
      setItems(data)
    } catch (err) { notify(err.message, 'err') }
  }

  // ── AUTH ──
  async function handleLogin(e) {
    e.preventDefault(); setLoading(true)
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setView('items')
      fetchItems()
      notify('¡Bienvenido!')
    } catch (err) { notify(err.message, 'err') }
    finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault(); setLoading(true)
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      notify('Cuenta creada, inicia sesión')
      setView('login')
      setForm({ email: '', password: '' })
    } catch (err) { notify(err.message, 'err') }
    finally { setLoading(false) }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(''); setItems([]); setView('login')
    setForm({ email: '', password: '' })
  }

  // ── CRUD ──
  async function handleSave(form) {
    if (!form.nombre.trim()) return notify('El nombre es requerido', 'err')
    setLoading(true)
    try {
      if (editItem) {
        await apiFetch(`/api/items/${editItem.id}`, { method: 'PUT', body: JSON.stringify(form) })
        notify('Ítem actualizado')
      } else {
        await apiFetch('/api/items', { method: 'POST', body: JSON.stringify(form) })
        notify('Ítem creado')
      }
      setModalOpen(false); setEditItem(null)
      fetchItems()
    } catch (err) { notify(err.message, 'err') }
    finally { setLoading(false) }
  }

  async function handleConfirmDelete() {
    if (!confirmItem) return
    try {
      await apiFetch(`/api/items/${confirmItem.id}`, { method: 'DELETE' })
      notify('Ítem eliminado')
      setConfirmItem(null)
      fetchItems()
    } catch (err) { notify(err.message, 'err') }
  }

  const filtered = items.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (i.descripcion || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── RENDER ──
  return (
    <>
      <Navbar online={online} view={view} userEmail={userEmail} onLogout={handleLogout} />
      <GlobalToast msg={msg} />

      {/* LOGIN */}
      {view === 'login' && (
        <div className="auth-layout">
          <div className="auth-wrap">
            <div className="auth-card">
              <div className="auth-logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"/>
                </svg>
              </div>
              <h2>Iniciar sesión</h2>
              <p className="auth-sub">POST /login</p>
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" placeholder="usuario@correo.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" placeholder="Tu contraseña" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"/></svg>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
              <div className="auth-footer">
                ¿No tienes cuenta? <a onClick={() => { setView('register'); setForm({ email: '', password: '' }) }}>Regístrate aquí</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER */}
      {view === 'register' && (
        <div className="auth-layout">
          <div className="auth-wrap">
            <div className="auth-card">
              <div className="auth-logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"/>
                </svg>
              </div>
              <h2>Crear cuenta</h2>
              <p className="auth-sub">POST /register</p>
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" placeholder="usuario@correo.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"/></svg>
                {loading ? 'Creando...' : 'Registrarse'}
              </button>
              <div className="auth-footer">
                ¿Ya tienes cuenta? <a onClick={() => { setView('login'); setForm({ email: '', password: '' }) }}>Inicia sesión</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {view === 'items' && (
        <div className="dash-page">
          <div className="dash-topbar">
            <div className="topbar-left">
              <h2>Productos</h2>
              <span className="mono topbar-sub">MySQL · Railway</span>
            </div>
            <div className="topbar-right">
              <div className="user-chip">
                <div className="avatar-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
                </div>
                <span>{userEmail}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/></svg>
                Salir
              </button>
            </div>
          </div>

          <div className="dash-body">
            <div className="search-bar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
              <input type="text" placeholder="Buscar ítems..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="products-grid">
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>
                  </div>
                  <p>{items.length === 0 ? 'No hay ítems aún' : 'Sin resultados'}</p>
                  <span>{items.length === 0 ? 'Presiona + para agregar el primero' : 'Prueba con otro término'}</span>
                </div>
              ) : (
                filtered.map(item => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onEdit={item => { setEditItem(item); setModalOpen(true) }}
                    onDelete={item => setConfirmItem(item)}
                  />
                ))
              )}
            </div>
          </div>

          <button className="fab" onClick={() => { setEditItem(null); setModalOpen(true) }} title="Agregar ítem">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          </button>
        </div>
      )}

      <ItemModal
        isOpen={modalOpen}
        editItem={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        onSave={handleSave}
        loading={loading}
      />

      <ConfirmModal
        isOpen={!!confirmItem}
        itemName={confirmItem?.nombre || ''}
        onCancel={() => setConfirmItem(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
