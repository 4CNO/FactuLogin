/**
 * DATA/Scripts/productos.js
 * FactuLogin — Módulo de Productos
 * Buscador por ID, upsert, modo edición automático
 */

'use strict';

/* ── utils.js debe cargarse antes ───────────────────────────────── */

/* ── Referencias DOM ─────────────────────────────────────────────── */
const buscarId      = document.getElementById('buscarId');
const btnBuscar     = document.getElementById('btnBuscar');
const searchStatus  = document.getElementById('searchStatus');
const modoIndicador = document.getElementById('modoIndicador');
const idGroup       = document.getElementById('idGroup');
const productoIdInp = document.getElementById('productoId');
const nombreInput   = document.getElementById('nombreProducto');
const marcaInput    = document.getElementById('marcaProducto');
const precioInput   = document.getElementById('precioProducto');
const cantidadInput = document.getElementById('cantidadProducto');
const saveBtn       = document.getElementById('saveProductoBtn');
const saveBtnText   = document.getElementById('saveBtnText');
const clearBtn      = document.getElementById('clearBtn');
const tbody         = document.getElementById('productosBody');
const empty         = document.getElementById('productosEmpty');

let modoEdicion = false;

/* ── Helpers ─────────────────────────────────────────────────────── */
function _showMsg(type, msg) {
    showMsg('producto-error', 'producto-ok', type, msg);
}

function setSearchStatus(text, cls = '') {
    searchStatus.textContent = text;
    searchStatus.className   = `search-status ${cls}`.trim();
}

function setModo(edicion, pid = '') {
    modoEdicion = edicion;
    modoIndicador.className = `modo-badge ${edicion ? 'modo-edicion' : 'modo-nuevo'}`;
    modoIndicador.innerHTML = edicion
        ? `<i class="fa-solid fa-pen-to-square"></i> Modo: Editando producto #${sanitize(String(pid))}`
        : '<i class="fa-solid fa-plus-circle"></i> Modo: Nuevo producto';
    saveBtnText.textContent = edicion ? 'Actualizar producto' : 'Guardar producto';
    idGroup.style.display   = edicion ? 'flex' : 'none';
    productoIdInp.value     = pid;
}

function clearForm() {
    [buscarId, nombreInput, marcaInput, precioInput, cantidadInput]
        .forEach(el => { if (el) el.value = ''; });
    setSearchStatus('');
    setModo(false);
    _showMsg(null);
}

/* ── Buscador ────────────────────────────────────────────────────── */
async function buscarProducto() {
    const pid = buscarId.value.trim();
    if (!pid) { setSearchStatus('Ingresa un ID para buscar.', 'status-warn'); return; }
    setSearchStatus('Buscando…');
    try {
        const res  = await fetch(`${API_URL}/api/productos/buscar?productId=${encodeURIComponent(pid)}`);
        const data = await res.json();

        if (!data.found) {
            setSearchStatus(`ID #${sanitize(pid)} no existe.`, 'status-error');
            [nombreInput, marcaInput, precioInput, cantidadInput].forEach(el => { if (el) el.value = ''; });
            setModo(false);
            return;
        }
        const p = data.producto;
        nombreInput.value   = p.name;
        marcaInput.value    = p.brand;
        precioInput.value   = p.price;
        cantidadInput.value = p.stock;
        setSearchStatus(`✅ Producto #${p.productId} encontrado — puedes editar.`, 'status-ok');
        setModo(true, p.productId);
        _showMsg(null);
    } catch { setSearchStatus('Error de conexión.', 'status-error'); }
}

btnBuscar.addEventListener('click', buscarProducto);
buscarId.addEventListener('keydown', e => { if (e.key === 'Enter') buscarProducto(); });
clearBtn.addEventListener('click', clearForm);

/* ── Guardar / actualizar ────────────────────────────────────────── */
saveBtn.addEventListener('click', async () => {
    _showMsg(null);
    const nombre   = nombreInput.value.trim();
    const marca    = marcaInput.value.trim();
    const precio   = Number(precioInput.value);
    const cantidad = Number(cantidadInput.value);
    const pid      = modoEdicion ? productoIdInp.value : null;

    if (!nombre)                          return _showMsg('error', 'El nombre es obligatorio.');
    if (!marca)                           return _showMsg('error', 'La marca es obligatoria.');
    if (isNaN(precio)   || precio   < 0)  return _showMsg('error', 'Ingresa un precio válido (≥ 0).');
    if (isNaN(cantidad) || cantidad < 0)  return _showMsg('error', 'Ingresa una cantidad válida (≥ 0).');

    saveBtn.disabled = true; saveBtnText.textContent = 'Guardando…';
    try {
        const body = { nombre, marca, precio, cantidad };
        if (pid) body.productId = pid;

        const res  = await fetch(`${API_URL}/api/productos`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { _showMsg('error', data.error || 'No se pudo guardar.'); return; }

        const msg = modoEdicion
            ? `Producto #${sanitize(String(pid))} actualizado.`
            : `Producto creado con ID #${data.product?.productId ?? ''}.`;
        _showMsg('ok', msg);
        toast(modoEdicion ? '✏️ Producto actualizado' : '📦 Producto creado');
        clearForm();
        loadProductos();
    } catch { _showMsg('error', 'Error de conexión.'); }
    finally {
        saveBtn.disabled    = false;
        saveBtnText.textContent = modoEdicion ? 'Actualizar producto' : 'Guardar producto';
    }
});

/* ── Tabla ───────────────────────────────────────────────────────── */
function renderProductos(rows) {
    if (!rows.length) { empty.style.display = 'block'; tbody.innerHTML = ''; return; }
    empty.style.display = 'none';
    tbody.innerHTML = rows.map(r => {
        const pid   = sanitize(String(r.productId));
        const name  = sanitize(r.name);
        const brand = sanitize(r.brand || '—');
        const price = Number(r.price).toFixed(2);
        const stock = r.stock ?? 0;
        return `<tr>
            <td><button class="link-table-btn" data-pid="${pid}">#${pid}</button></td>
            <td>${name}</td>
            <td>${brand}</td>
            <td>$${price}</td>
            <td>${stock}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.link-table-btn').forEach(btn => {
        btn.addEventListener('click', () => cargarProducto(btn.dataset.pid));
    });
}

async function cargarProducto(pid) {
    buscarId.value = pid;
    await buscarProducto();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadProductos() {
    try {
        const res = await fetch(`${API_URL}/api/productos`);
        renderProductos(await res.json());
    } catch { _showMsg('error', 'No se pudo cargar la lista.'); }
}

/* ── Init ────────────────────────────────────────────────────────── */
if (!SESSION) {
    [buscarId, btnBuscar, nombreInput, marcaInput, precioInput, cantidadInput, saveBtn, clearBtn]
        .forEach(el => { if (el) el.disabled = true; });
    empty.textContent   = 'Inicia sesión para habilitar productos';
    empty.style.display = 'block';
} else {
    loadProductos();
}
initPageTransitions();
