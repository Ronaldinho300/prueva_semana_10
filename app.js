const API = 'http://localhost:3000';
let token = null;
let userEmail = null;
let allItems = [];
let pendingDeleteId = null;
let editingId = null;
let imageBase64 = null;

/* ============================================
   SERVER STATUS
   ============================================ */
async function checkServer() {
  try {
    const r = await fetch(API + '/');
    if (r.ok) {
      document.getElementById('navDot').classList.add('online');
      document.getElementById('navStatus').textContent = 'conectado';
    } else {
      document.getElementById('navStatus').textContent = 'error';
    }
  } catch {
    document.getElementById('navStatus').textContent = 'sin conexión';
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
  document.getElementById('page-' + page).classList.add('show');
}

/* ============================================
   TOAST (in auth cards)
   ============================================ */
function toast(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 4000);
}

/* ============================================
   GLOBAL TOAST (floating pill)
   ============================================ */
function gToast(msg, type = 'ok') {
  const el = document.getElementById('global-toast');
  el.textContent = msg;
  el.className = 'global-toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ============================================
   TOGGLE SWITCH
   ============================================ */
function toggleSwitch(btn) {
  btn.classList.toggle('on');
  const on = btn.classList.contains('on');
  const lbl = document.getElementById('estado-label');
  lbl.textContent = on ? 'Activo' : 'Inactivo';
  lbl.className = 'switch-text ' + (on ? 'on' : '');
}

/* ============================================
   IMAGE HANDLING
   ============================================ */
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    gToast('La imagen supera los 5MB', 'err');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    imageBase64 = e.target.result;
    document.getElementById('img-placeholder').style.display = 'none';
    const preview = document.getElementById('img-preview');
    preview.src = imageBase64;
    preview.style.display = 'block';
    document.getElementById('img-remove').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function removeImage(event) {
  event.stopPropagation();
  imageBase64 = null;
  document.getElementById('img-file').value = '';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('img-remove').style.display = 'none';
  document.getElementById('img-placeholder').style.display = 'flex';
}

/* ============================================
   MODAL: OPEN / CLOSE
   ============================================ */
function openModal(item = null) {
  editingId = item ? item.id : null;
  imageBase64 = null;

  // Reset form
  document.getElementById('item-id').value = '';
  document.getElementById('item-nombre').value = '';
  document.getElementById('item-desc').value = '';
  document.getElementById('item-precio').value = '';
  document.getElementById('item-stock').value = '';
  document.getElementById('item-categoria').value = '';
  document.getElementById('img-file').value = '';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('img-remove').style.display = 'none';
  document.getElementById('img-placeholder').style.display = 'flex';

  const sw = document.getElementById('item-estado');
  const lbl = document.getElementById('estado-label');
  sw.classList.add('on');
  lbl.textContent = 'Activo';
  lbl.className = 'switch-text on';

  if (item) {
    document.getElementById('modal-title').textContent = 'Editar Producto';
    document.getElementById('modal-save-btn').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
      Actualizar producto`;

    document.getElementById('item-nombre').value = item.nombre || '';
    document.getElementById('item-desc').value   = item.descripcion || '';
    document.getElementById('item-precio').value = item.precio || '';
    document.getElementById('item-stock').value  = item.stock || '';
    document.getElementById('item-categoria').value = item.categoria || '';

    if (item.imagen) {
      imageBase64 = item.imagen;
      const preview = document.getElementById('img-preview');
      preview.src = item.imagen;
      preview.style.display = 'block';
      document.getElementById('img-remove').style.display = 'flex';
      document.getElementById('img-placeholder').style.display = 'none';
    }

    if (item.estado) {
      sw.classList.add('on');
      lbl.textContent = 'Activo';
      lbl.className = 'switch-text on';
    } else {
      sw.classList.remove('on');
      lbl.textContent = 'Inactivo';
      lbl.className = 'switch-text';
    }
  } else {
    document.getElementById('modal-title').textContent = 'Nuevo Producto';
    document.getElementById('modal-save-btn').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
      Guardar producto`;
  }

  document.getElementById('modal-overlay').classList.add('show');
  closeAllMenus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  editingId = null;
  imageBase64 = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/* ============================================
   CONFIRM DELETE MODAL
   ============================================ */
function openConfirm(id, name) {
  pendingDeleteId = id;
  document.getElementById('confirm-msg').textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
  document.getElementById('confirm-overlay').classList.add('show');
  closeAllMenus();
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  await quickDelete(pendingDeleteId);
  closeConfirm();
}

/* ============================================
   3-DOT MENU
   ============================================ */
function toggleMenu(id, event) {
  event.stopPropagation();
  const menu = document.getElementById('menu-' + id);
  const isOpen = menu.classList.contains('open');
  closeAllMenus();
  if (!isOpen) menu.classList.add('open');
}

function closeAllMenus() {
  document.querySelectorAll('.card-menu.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', closeAllMenus);

/* ============================================
   AUTH — REGISTER
   ============================================ */
async function doRegister() {
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;
  if (!email || !password) return toast('reg-toast', 'Completa todos los campos', 'err');

  try {
    const r = await fetch(API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    toast('reg-toast', d.message, r.ok ? 'ok' : 'err');
    if (r.ok) setTimeout(() => goTo('login'), 1500);
  } catch {
    toast('reg-toast', 'No se pudo conectar al servidor', 'err');
  }
}

/* ============================================
   AUTH — LOGIN
   ============================================ */
async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!email || !password) return toast('login-toast', 'Completa todos los campos', 'err');

  try {
    const r = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();

    if (r.ok && d.token) {
      token     = d.token;
      userEmail = email;
      document.getElementById('dash-email').textContent = email;
      toast('login-toast', d.message, 'ok');
      setTimeout(() => { goTo('dash'); loadItems(); }, 900);
    } else {
      toast('login-toast', d.message, 'err');
    }
  } catch {
    toast('login-toast', 'No se pudo conectar al servidor', 'err');
  }
}

/* ============================================
   LOGOUT
   ============================================ */
function logout() {
  token = null;
  userEmail = null;
  allItems = [];
  document.getElementById('items-grid').innerHTML = emptyState('Inicia sesión para ver los productos', '');
  goTo('login');
}

/* ============================================
   CRUD — LOAD ITEMS
   ============================================ */
async function loadItems() {
  if (!token) return;
  try {
    const r = await fetch(API + '/api/items', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await r.json();
    if (!r.ok) { gToast(data.message || 'Error al cargar', 'err'); return; }
    allItems = data;
    renderItems(data);
  } catch {
    gToast('Error de conexión', 'err');
  }
}

function renderItems(items) {
  const grid = document.getElementById('items-grid');
  if (!items.length) {
    grid.innerHTML = emptyState('No hay productos aún', 'Crea el primero con el botón +');
    return;
  }
  grid.innerHTML = items.map(item => productCard(item)).join('');
}

function filterItems() {
  const q = document.getElementById('search-input').value.toLowerCase();
  if (!q) { renderItems(allItems); return; }
  const filtered = allItems.filter(i =>
    (i.nombre || '').toLowerCase().includes(q) ||
    (i.descripcion || '').toLowerCase().includes(q) ||
    (i.categoria || '').toLowerCase().includes(q)
  );
  renderItems(filtered);
}

/* ============================================
   CRUD — SAVE (create or update)
   ============================================ */
async function saveItem() {
  const nombre      = document.getElementById('item-nombre').value.trim();
  const descripcion = document.getElementById('item-desc').value.trim();
  const precio      = document.getElementById('item-precio').value;
  const stock       = document.getElementById('item-stock').value;
  const categoria   = document.getElementById('item-categoria').value;
  const estado      = document.getElementById('item-estado').classList.contains('on');

  if (!nombre) { gToast('El nombre es requerido', 'err'); return; }

  const body = { nombre, descripcion, estado, imagen: imageBase64 || null };
  if (precio) body.precio = parseFloat(precio);
  if (stock !== '') body.stock = parseInt(stock);
  if (categoria) body.categoria = categoria;

  try {
    let r, d;
    if (editingId) {
      r = await fetch(API + '/api/items/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      d = await r.json();
      if (r.ok) { gToast('Producto actualizado ✓', 'ok'); closeModal(); loadItems(); }
      else gToast(d.message || 'Error al actualizar', 'err');
    } else {
      r = await fetch(API + '/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      d = await r.json();
      if (r.ok) { gToast('Producto creado ✓', 'ok'); closeModal(); loadItems(); }
      else gToast(d.message || 'Error al crear', 'err');
    }
  } catch {
    gToast('Error de conexión', 'err');
  }
}

/* ============================================
   CRUD — DELETE
   ============================================ */
async function quickDelete(id) {
  try {
    const r = await fetch(API + '/api/items/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
    const d = await r.json();
    if (r.ok) { gToast('Producto eliminado', 'ok'); loadItems(); }
    else gToast(d.message || 'Error al eliminar', 'err');
  } catch {
    gToast('Error de conexión', 'err');
  }
}

/* ============================================
   HELPERS
   ============================================ */
function formatDate(ts) {
  return new Date(ts).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(p) {
  if (!p && p !== 0) return '';
  return 'S/. ' + parseFloat(p).toFixed(2);
}

function productCard(item) {
  const imgHtml = item.imagen
    ? `<img class="card-img" src="${item.imagen}" alt="${escHtml(item.nombre)}">`
    : `<div class="card-img-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
        <span>Sin imagen</span>
       </div>`;

  const catBadge = item.categoria
    ? `<span class="badge badge-cat">${escHtml(item.categoria)}</span>`
    : '';

  const priceHtml = item.precio
    ? `<span class="card-price">${formatPrice(item.precio)}</span>`
    : `<span class="card-price" style="color:var(--light);font-weight:500;font-size:0.75rem;">Sin precio</span>`;

  const stockHtml = (item.stock !== null && item.stock !== undefined)
    ? `<span class="card-stock">Stock: ${item.stock}</span>`
    : '';

  // Serialize item data for onclick
  const itemJson = escAttr(JSON.stringify(item));

  return `
    <div class="product-card">
      <div class="card-id">#${item.id}</div>
      ${imgHtml}
      <div class="card-body">
        <div class="card-top">
          <div class="card-name">${escHtml(item.nombre)}</div>
          <div style="position:relative">
            <button class="menu-btn" onclick="toggleMenu(${item.id}, event)" title="Opciones">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"/></svg>
            </button>
            <div class="card-menu" id="menu-${item.id}">
              <button class="menu-item" onclick="openModal(${itemJson})">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/></svg>
                Editar
              </button>
              <div class="menu-divider"></div>
              <button class="menu-item delete" onclick="openConfirm(${item.id}, '${escAttr(item.nombre)}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
        <div class="card-desc">${escHtml(item.descripcion || 'Sin descripción')}</div>
        <div class="card-footer">
          ${priceHtml}
          <div class="card-meta">
            ${catBadge}
            <span class="badge ${item.estado ? 'badge-active' : 'badge-inactive'}">${item.estado ? 'Activo' : 'Inactivo'}</span>
            ${stockHtml}
          </div>
        </div>
      </div>
    </div>`;
}

function emptyState(title, sub) {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>
      </div>
      <p>${title}</p>
      <span>${sub}</span>
    </div>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g,'\\\\')
    .replace(/'/g,"\\'")
    .replace(/"/g,'&quot;');
}

/* ============================================
   INIT
   ============================================ */
checkServer();