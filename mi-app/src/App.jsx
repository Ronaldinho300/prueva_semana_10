import { useState, useEffect } from 'react'
import './App.css'

// ✅ URL del backend en Render
const API = 'https://prueva-semana-10-1.onrender.com'

// ─── UTILIDAD ────────────────────────────────────────────────────
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

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────
export default function App() {
  const [token, setToken]       = useState(localStorage.getItem('token') || '')
  const [view, setView]         = useState('login')
  const [items, setItems]       = useState([])
  const [form, setForm]         = useState({ email: '', password: '' })
  const [itemForm, setItemForm] = useState({ nombre: '', descripcion: '', estado: 1 })
  const [editId, setEditId]     = useState(null)
  const [msg, setMsg]           = useState({ text: '', type: '' })
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (token) {
      setView('items')
      fetchItems()
    }
  }, [token])

  function notify(text, type = 'ok') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  // ── AUTH ──────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      notify('¡Bienvenido!')
    } catch (err) {
      notify(err.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      notify('Usuario creado, ahora inicia sesión')
      setView('login')
    } catch (err) {
      notify(err.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken('')
    setItems([])
    setView('login')
    setForm({ email: '', password: '' })
  }

  // ── ITEMS CRUD ────────────────────────────────────────────────
  async function fetchItems() {
    try {
      const data = await apiFetch('/api/items')
      setItems(data)
    } catch (err) {
      notify(err.message, 'err')
    }
  }

  async function handleCreateOrUpdate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await apiFetch(`/api/items/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(itemForm),
        })
        notify('Ítem actualizado')
      } else {
        await apiFetch('/api/items', {
          method: 'POST',
          body: JSON.stringify(itemForm),
        })
        notify('Ítem creado')
      }
      setItemForm({ nombre: '', descripcion: '', estado: 1 })
      setEditId(null)
      fetchItems()
    } catch (err) {
      notify(err.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(item) {
    setEditId(item.id)
    setItemForm({ nombre: item.nombre, descripcion: item.descripcion || '', estado: item.estado })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setItemForm({ nombre: '', descripcion: '', estado: 1 })
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este ítem?')) return
    try {
      await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
      notify('Ítem eliminado')
      fetchItems()
    } catch (err) {
      notify(err.message, 'err')
    }
  }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* TOAST */}
      {msg.text && (
        <div className={`toast ${msg.type === 'err' ? 'toast-err' : 'toast-ok'}`}>
          {msg.text}
        </div>
      )}

      {/* ── LOGIN ── */}
      {view === 'login' && (
        <div className="auth-card">
          <h1>Iniciar Sesión</h1>
          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <p>
            ¿No tienes cuenta?{' '}
            <span className="link" onClick={() => setView('register')}>Regístrate</span>
          </p>
        </div>
      )}

      {/* ── REGISTER ── */}
      {view === 'register' && (
        <div className="auth-card">
          <h1>Crear Cuenta</h1>
          <form onSubmit={handleRegister}>
            <label>Email</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creando…' : 'Registrarse'}
            </button>
          </form>
          <p>
            ¿Ya tienes cuenta?{' '}
            <span className="link" onClick={() => setView('login')}>Inicia sesión</span>
          </p>
        </div>
      )}

      {/* ── ITEMS ── */}
      {view === 'items' && (
        <div className="dashboard">
          <header className="dash-header">
            <h1>📦 Mis Ítems</h1>
            <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
          </header>

          {/* Formulario crear / editar */}
          <div className="item-form-card">
            <h2>{editId ? '✏️ Editar Ítem' : '➕ Nuevo Ítem'}</h2>
            <form onSubmit={handleCreateOrUpdate}>
              <label>Nombre *</label>
              <input
                type="text"
                placeholder="Nombre del ítem"
                value={itemForm.nombre}
                onChange={e => setItemForm({ ...itemForm, nombre: e.target.value })}
                required
              />
              <label>Descripción</label>
              <textarea
                placeholder="Descripción opcional"
                value={itemForm.descripcion}
                onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })}
                rows={3}
              />
              <label>Estado</label>
              <select
                value={itemForm.estado}
                onChange={e => setItemForm({ ...itemForm, estado: Number(e.target.value) })}
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}
                </button>
                {editId && (
                  <button type="button" className="btn-cancel" onClick={cancelEdit}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de ítems */}
          <div className="items-list">
            {items.length === 0 ? (
              <p className="empty">No hay ítems aún. ¡Crea el primero!</p>
            ) : (
              items.map(item => (
                <div key={item.id} className={`item-card ${item.estado ? '' : 'inactive'}`}>
                  <div className="item-info">
                    <span className="item-badge">{item.estado ? 'Activo' : 'Inactivo'}</span>
                    <h3>{item.nombre}</h3>
                    {item.descripcion && <p>{item.descripcion}</p>}
                    <small>ID: {item.id} · {new Date(item.created_at).toLocaleDateString()}</small>
                  </div>
                  <div className="item-actions">
                    <button className="btn-edit" onClick={() => startEdit(item)}>Editar</button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}