/**
 * DATA/Scripts/empresas.js
 * FactuLogin — Módulo de Empresas
 * Buscador por NIT, upsert, modo edición automático
 */

'use strict';

/* ── utils.js debe cargarse antes ───────────────────────────────── */

/* ── Referencias DOM ─────────────────────────────────────────────── */
const buscarNit      = document.getElementById('buscarNit');
const btnBuscar      = document.getElementById('btnBuscar');
const searchStatus   = document.getElementById('searchStatus');
const modoIndicador  = document.getElementById('modoIndicador');
const nombreInput    = document.getElementById('nombreEmpresa');
const nitInput       = document.getElementById('nitEmpresa');
const telefonoInput  = document.getElementById('telefonoEmpresa');
const direccionInput = document.getElementById('direccionEmpresa');
const saveBtn        = document.getElementById('saveEmpresaBtn');
const saveBtnText    = document.getElementById('saveBtnText');
const clearBtn       = document.getElementById('clearBtn');
const tbody          = document.getElementById('empresasBody');
const empty          = document.getElementById('empresasEmpty');

let modoEdicion = false;

/* ── Helpers de UI ───────────────────────────────────────────────── */
function _showMsg(type, msg) {
    showMsg('empresa-error', 'empresa-ok', type, msg);
}

function setSearchStatus(text, cls = '') {
    searchStatus.textContent = text;
    searchStatus.className   = `search-status ${cls}`.trim();
}

function setModo(edicion) {
    modoEdicion = edicion;
    modoIndicador.className = `modo-badge ${edicion ? 'modo-edicion' : 'modo-nuevo'}`;
    modoIndicador.innerHTML = edicion
        ? '<i class="fa-solid fa-pen-to-square"></i> Modo: Editando empresa existente'
        : '<i class="fa-solid fa-plus-circle"></i> Modo: Nueva empresa';
    saveBtnText.textContent = edicion ? 'Actualizar empresa' : 'Guardar empresa';
    nitInput.readOnly       = edicion;
}

function clearForm() {
    [buscarNit, nombreInput, nitInput, telefonoInput, direccionInput]
        .forEach(el => { if (el) el.value = ''; });
    setSearchStatus('');
    setModo(false);
    _showMsg(null);
}

/* ── Buscador ────────────────────────────────────────────────────── */
async function buscarEmpresa() {
    const nit = buscarNit.value.trim();
    if (!nit) { setSearchStatus('Ingresa un NIT para buscar.', 'status-warn'); return; }
    setSearchStatus('Buscando…');
    try {
        const res  = await fetch(`${API_URL}/api/empresas/buscar?nit=${encodeURIComponent(nit)}`);
        const data = await res.json();

        if (!data.found) {
            setSearchStatus('No encontrada — se creará una nueva empresa.', 'status-warn');
            nitInput.value = nit;
            [nombreInput, telefonoInput, direccionInput].forEach(el => { if (el) el.value = ''; });
            setModo(false);
            return;
        }
        const em = data.empresa;
        nombreInput.value    = em.name;
        nitInput.value       = em.nit;
        telefonoInput.value  = em.phone;
        direccionInput.value = em.address;
        setSearchStatus('✅ Empresa encontrada — puedes editar los datos.', 'status-ok');
        setModo(true);
        _showMsg(null);
    } catch { setSearchStatus('Error de conexión.', 'status-error'); }
}

btnBuscar.addEventListener('click', buscarEmpresa);
buscarNit.addEventListener('keydown', e => { if (e.key === 'Enter') buscarEmpresa(); });
clearBtn.addEventListener('click', clearForm);

/* ── Guardar / actualizar ────────────────────────────────────────── */
saveBtn.addEventListener('click', async () => {
    _showMsg(null);
    const nombre   = nombreInput.value.trim();
    const nit      = nitInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const direccion= direccionInput.value.trim();

    if (!nombre || !nit || !telefono || !direccion)
        return _showMsg('error', 'Todos los campos son obligatorios.');

    saveBtn.disabled = true; saveBtnText.textContent = 'Guardando…';
    try {
        const res  = await fetch(`${API_URL}/api/empresas`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, nit, telefono, direccion }),
        });
        const data = await res.json();
        if (!res.ok) { _showMsg('error', data.error || 'No se pudo guardar.'); return; }

        const msg = modoEdicion ? 'Empresa actualizada correctamente.' : 'Empresa creada correctamente.';
        _showMsg('ok', msg);
        toast(modoEdicion ? '✏️ Empresa actualizada' : '🏢 Empresa guardada');
        clearForm();
        loadEmpresas();
    } catch { _showMsg('error', 'Error de conexión.'); }
    finally {
        saveBtn.disabled    = false;
        saveBtnText.textContent = modoEdicion ? 'Actualizar empresa' : 'Guardar empresa';
    }
});

/* ── Tabla ───────────────────────────────────────────────────────── */
function renderEmpresas(rows) {
    if (!rows.length) { empty.style.display = 'block'; tbody.innerHTML = ''; return; }
    empty.style.display = 'none';
    tbody.innerHTML = rows.map((r, i) => {
        const name    = sanitize(r.name);
        const nit     = sanitize(r.nit);
        const phone   = sanitize(r.phone);
        const address = sanitize(r.address);
        return `<tr>
            <td>${i + 1}</td>
            <td>${name}</td>
            <td><button class="link-table-btn"
                data-name="${name}" data-nit="${nit}"
                data-phone="${phone}" data-address="${address}">${nit}</button></td>
            <td>${phone}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.link-table-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cargarEmpresa(btn.dataset.nit, btn.dataset.name, btn.dataset.phone, btn.dataset.address);
        });
    });
}

function cargarEmpresa(nit, name, phone, address) {
    buscarNit.value      = nit;
    nitInput.value       = nit;
    nombreInput.value    = name;
    telefonoInput.value  = phone;
    direccionInput.value = address;
    setSearchStatus('✅ Empresa cargada — puedes editar los datos.', 'status-ok');
    setModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadEmpresas() {
    try {
        const res = await fetch(`${API_URL}/api/empresas`);
        renderEmpresas(await res.json());
    } catch { _showMsg('error', 'No se pudo cargar la lista.'); }
}

/* ── Init ────────────────────────────────────────────────────────── */
if (!SESSION) {
    [buscarNit, btnBuscar, nombreInput, nitInput, telefonoInput, direccionInput, saveBtn, clearBtn]
        .forEach(el => { if (el) el.disabled = true; });
    empty.textContent   = 'Inicia sesión para habilitar empresas';
    empty.style.display = 'block';
} else {
    loadEmpresas();
}
initPageTransitions();
