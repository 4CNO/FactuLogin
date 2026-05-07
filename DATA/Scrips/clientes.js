/**
 * DATA/Scripts/clientes.js
 * FactuLogin — Módulo de Clientes
 * Buscador por documento, upsert, modo edición automático
 */

'use strict';

/* ── utils.js debe cargarse antes ───────────────────────────────── */

/* ── Referencias DOM ─────────────────────────────────────────────── */
const buscarDoc      = document.getElementById('buscarDoc');
const btnBuscar      = document.getElementById('btnBuscar');
const searchStatus   = document.getElementById('searchStatus');
const modoIndicador  = document.getElementById('modoIndicador');
const nombreInput    = document.getElementById('nombreCliente');
const documentoInput = document.getElementById('documentoCliente');
const telefonoInput  = document.getElementById('telefonoCliente');
const saveBtn        = document.getElementById('saveClienteBtn');
const saveBtnText    = document.getElementById('saveBtnText');
const clearBtn       = document.getElementById('clearBtn');
const tbody          = document.getElementById('clientesBody');
const empty          = document.getElementById('clientesEmpty');

let modoEdicion = false;

/* ── Helpers de UI ───────────────────────────────────────────────── */
function _showMsg(type, msg) {
    showMsg('cliente-error', 'cliente-ok', type, msg);
}

function setSearchStatus(text, cls = '') {
    searchStatus.textContent = text;
    searchStatus.className   = `search-status ${cls}`.trim();
}

function setModo(edicion) {
    modoEdicion = edicion;
    modoIndicador.className = `modo-badge ${edicion ? 'modo-edicion' : 'modo-nuevo'}`;
    modoIndicador.innerHTML = edicion
        ? '<i class="fa-solid fa-pen-to-square"></i> Modo: Editando cliente existente'
        : '<i class="fa-solid fa-plus-circle"></i> Modo: Nuevo cliente';
    saveBtnText.textContent    = edicion ? 'Actualizar cliente' : 'Guardar cliente';
    documentoInput.readOnly    = edicion;
}

function clearForm() {
    nombreInput.value = documentoInput.value = telefonoInput.value = buscarDoc.value = '';
    setSearchStatus('');
    setModo(false);
    _showMsg(null);
}

/* ── Buscador ────────────────────────────────────────────────────── */
async function buscarCliente() {
    const doc = buscarDoc.value.trim();
    if (!doc) { setSearchStatus('Ingresa un documento para buscar.', 'status-warn'); return; }
    setSearchStatus('Buscando…');
    try {
        const res  = await fetch(`${API_URL}/api/clientes/buscar?documento=${encodeURIComponent(doc)}`);
        const data = await res.json();

        if (!data.found) {
            setSearchStatus('No encontrado — se creará un nuevo cliente.', 'status-warn');
            documentoInput.value = doc;
            nombreInput.value = telefonoInput.value = '';
            setModo(false);
            return;
        }
        const c = data.cliente;
        nombreInput.value    = c.name;
        documentoInput.value = c.document;
        telefonoInput.value  = c.phone;
        setSearchStatus('✅ Cliente encontrado — puedes editar los datos.', 'status-ok');
        setModo(true);
        _showMsg(null);
    } catch { setSearchStatus('Error de conexión.', 'status-error'); }
}

btnBuscar.addEventListener('click', buscarCliente);
buscarDoc.addEventListener('keydown', e => { if (e.key === 'Enter') buscarCliente(); });
clearBtn.addEventListener('click', clearForm);

/* ── Guardar / actualizar ────────────────────────────────────────── */
saveBtn.addEventListener('click', async () => {
    _showMsg(null);
    const nombre    = nombreInput.value.trim();
    const documento = documentoInput.value.trim();
    const telefono  = telefonoInput.value.trim();
    if (!nombre || !documento || !telefono)
        return _showMsg('error', 'Todos los campos son obligatorios.');

    saveBtn.disabled = true; saveBtnText.textContent = 'Guardando…';
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, documento, telefono }),
        });
        const data = await res.json();
        if (!res.ok) { _showMsg('error', data.error || 'No se pudo guardar.'); return; }

        const msg = modoEdicion ? 'Cliente actualizado correctamente.' : 'Cliente creado correctamente.';
        _showMsg('ok', msg);
        toast(modoEdicion ? '✏️ Cliente actualizado' : '👥 Cliente guardado');
        clearForm();
        loadClientes();
    } catch { _showMsg('error', 'Error de conexión con el servidor.'); }
    finally {
        saveBtn.disabled    = false;
        saveBtnText.textContent = modoEdicion ? 'Actualizar cliente' : 'Guardar cliente';
    }
});

/* ── Tabla ───────────────────────────────────────────────────────── */
function renderClientes(rows) {
    if (!rows.length) { empty.style.display = 'block'; tbody.innerHTML = ''; return; }
    empty.style.display = 'none';
    tbody.innerHTML = rows.map((r, i) => {
        const doc  = sanitize(r.document);
        const name = sanitize(r.name);
        const ph   = sanitize(r.phone);
        return `<tr>
            <td>${i + 1}</td>
            <td>${name}</td>
            <td><button class="link-table-btn" data-doc="${doc}" data-name="${name}" data-phone="${ph}">${doc}</button></td>
            <td>${ph}</td>
        </tr>`;
    }).join('');

    /* Delegación de eventos — evita onclick inline */
    tbody.querySelectorAll('.link-table-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cargarCliente(btn.dataset.doc, btn.dataset.name, btn.dataset.phone);
        });
    });
}

function cargarCliente(doc, name, phone) {
    buscarDoc.value      = doc;
    documentoInput.value = doc;
    nombreInput.value    = name;
    telefonoInput.value  = phone;
    setSearchStatus('✅ Cliente cargado — puedes editar los datos.', 'status-ok');
    setModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadClientes() {
    try {
        const res = await fetch(`${API_URL}/api/clientes`);
        renderClientes(await res.json());
    } catch { _showMsg('error', 'No se pudo cargar la lista.'); }
}

/* ── Init ────────────────────────────────────────────────────────── */
if (!SESSION) {
    [buscarDoc, btnBuscar, nombreInput, documentoInput, telefonoInput, saveBtn, clearBtn]
        .forEach(el => { if (el) el.disabled = true; });
    empty.textContent    = 'Inicia sesión para habilitar clientes';
    empty.style.display  = 'block';
} else {
    loadClientes();
}
initPageTransitions();
