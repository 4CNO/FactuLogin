/**
 * DATA/Scripts/pedidos.js
 * FactuLogin — Módulo de Pedidos
 * Descuento 2.5% por cada 10 unidades, generación de recibo
 */

'use strict';

/* ── utils.js debe cargarse antes ───────────────────────────────── */

/* ── Referencias DOM ─────────────────────────────────────────────── */
const clienteSelect  = document.getElementById('clientePedido');
const empresaSelect  = document.getElementById('empresaPedido');
const productoSelect = document.getElementById('productoPedido');
const cantidadInput  = document.getElementById('cantidadProducto');
const agregarBtn     = document.getElementById('agregarBtn');
const generarBtn     = document.getElementById('generarBtn');
const detalleBody    = document.getElementById('detalleBody');
const detalleEmpty   = document.getElementById('detalleEmpty');
const totalLabel     = document.getElementById('totalLabel');
const descuentoBadge = document.getElementById('descuentoBadge');
const descuentoTexto = document.getElementById('descuentoTexto');

let productosCache = [];
let items          = [];

/* ── Helpers ─────────────────────────────────────────────────────── */
function _showMsg(type, msg) {
    showMsg('pedido-error', 'pedido-ok', type, msg);
}

/* Descuento: 2.5% por cada bloque de 10 unidades */
function calcDesc(precioBase, cantidad) {
    const bloques     = Math.floor(cantidad / 10);
    const pct         = bloques * 0.025;
    const precioFinal = precioBase * (1 - pct);
    const subtotal    = precioFinal * cantidad;
    return { pct, precioFinal, subtotal };
}

/* Badge en tiempo real */
function actualizarBadge() {
    const productoId = Number(productoSelect.value);
    const cantidad   = Number(cantidadInput.value);
    const producto   = productosCache.find(p => Number(p.id) === productoId);
    if (!producto || !cantidad || cantidad < 10) {
        descuentoBadge.style.display = 'none';
        return;
    }
    const { pct } = calcDesc(Number(producto.price), cantidad);
    if (pct > 0) {
        descuentoTexto.textContent   = `${(pct * 100).toFixed(1)}% de descuento aplicado`;
        descuentoBadge.style.display = 'inline-flex';
    } else {
        descuentoBadge.style.display = 'none';
    }
}

productoSelect.addEventListener('change', actualizarBadge);
cantidadInput.addEventListener('input',   actualizarBadge);

/* ── Tabla de detalle ────────────────────────────────────────────── */
function renderDetalle() {
    if (!items.length) {
        detalleEmpty.style.display = 'block';
        detalleBody.innerHTML      = '';
        totalLabel.textContent     = 'Total: $0.00';
        return;
    }
    detalleEmpty.style.display = 'none';
    detalleBody.innerHTML = items.map((item, i) => `
        <tr>
            <td>${sanitize(item.nombre)}</td>
            <td>${item.cantidad}</td>
            <td>$${Number(item.precioBase).toFixed(2)}</td>
            <td>${item.pct > 0
                ? `<span class="descuento-badge" style="font-size:.72rem;">−${(item.pct * 100).toFixed(1)}%</span>`
                : '—'}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td><button class="quitar-item-btn" data-idx="${i}"
                style="width:auto;padding:2px 8px;font-size:.75rem;background:#ef4444;box-shadow:none;">✕</button></td>
        </tr>`).join('');

    detalleBody.querySelectorAll('.quitar-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            items.splice(Number(btn.dataset.idx), 1);
            renderDetalle();
        });
    });

    const total = items.reduce((acc, it) => acc + it.subtotal, 0);
    totalLabel.textContent = `Total: $${total.toFixed(2)}`;
}

/* ── Cargar opciones (clientes, empresas, productos) ─────────────── */
async function loadOptions() {
    try {
        const res  = await fetch(`${API_URL}/api/pedidos/options`);
        const data = await res.json();
        productosCache = data.productos;

        clienteSelect.innerHTML = '<option value="">Seleccionar cliente</option>' +
            data.clientes.map(c => `<option value="${sanitize(String(c.id))}">${sanitize(c.name)}</option>`).join('');

        empresaSelect.innerHTML = '<option value="">Seleccionar empresa</option>' +
            data.empresas.map(e => `<option value="${sanitize(String(e.id))}">${sanitize(e.name)}</option>`).join('');

        productoSelect.innerHTML = '<option value="">Seleccionar producto</option>' +
            data.productos.map(p =>
                `<option value="${sanitize(String(p.id))}">${sanitize(p.name)} — $${Number(p.price).toFixed(2)}</option>`
            ).join('');
    } catch (err) {
        _showMsg('error', 'No se pudieron cargar las opciones del pedido');
        console.error(err);
    }
}

/* ── Agregar ítem ────────────────────────────────────────────────── */
agregarBtn.addEventListener('click', () => {
    _showMsg(null);
    const productoId = Number(productoSelect.value);
    const cantidad   = Number(cantidadInput.value);

    if (!productoId)            return _showMsg('error', 'Selecciona un producto.');
    if (!cantidad || cantidad < 1) return _showMsg('error', 'Ingresa una cantidad válida.');

    const producto = productosCache.find(p => Number(p.id) === productoId);
    if (!producto)              return _showMsg('error', 'Producto no encontrado.');

    const precioBase = Number(producto.price);
    const { pct, precioFinal, subtotal } = calcDesc(precioBase, cantidad);

    items.push({ productoId, nombre: producto.name, cantidad, precioBase, pct, precioFinal, subtotal });
    cantidadInput.value  = '';
    productoSelect.value = '';
    descuentoBadge.style.display = 'none';
    renderDetalle();

    const msgDesc = pct > 0
        ? `✅ "${sanitize(producto.name)}" agregado con ${(pct * 100).toFixed(1)}% de descuento.`
        : `✅ "${sanitize(producto.name)}" agregado al pedido.`;
    _showMsg('ok', msgDesc);
});

/* ── Generar pedido ──────────────────────────────────────────────── */
generarBtn.addEventListener('click', async () => {
    _showMsg(null);
    const clienteId = Number(clienteSelect.value);
    const empresaId = Number(empresaSelect.value);

    if (!clienteId)    return _showMsg('error', 'Selecciona un cliente.');
    if (!empresaId)    return _showMsg('error', 'Selecciona una empresa.');
    if (!items.length) return _showMsg('error', 'Agrega al menos un producto.');

    generarBtn.disabled    = true;
    generarBtn.textContent = 'Generando…';

    try {
        const payload = {
            userId:    userId || null,
            clienteId,
            empresaId,
            items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
        };
        const res  = await fetch(`${API_URL}/api/pedidos`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { _showMsg('error', data.error || 'No se pudo generar el pedido'); return; }

        const mailTxt = data.mailSent ? ' · Factura enviada al correo.' : '';
        _showMsg('ok', `✅ Pedido #${data.orderId} generado. Total: $${Number(data.total).toFixed(2)}${mailTxt}`);
        toast(`🧾 Pedido #${data.orderId} generado por $${Number(data.total).toFixed(2)}`);
        items = [];
        renderDetalle();
        clienteSelect.value = empresaSelect.value = productoSelect.value = '';
    } catch (err) {
        _showMsg('error', 'Error de conexión con el servidor');
        console.error(err);
    } finally {
        generarBtn.disabled    = false;
        generarBtn.textContent = 'Generar pedido 🧾';
    }
});

/* ── Init ────────────────────────────────────────────────────────── */
renderDetalle();

if (!SESSION) {
    [clienteSelect, empresaSelect, productoSelect, cantidadInput, agregarBtn, generarBtn]
        .forEach(el => { if (el) el.disabled = true; });
    detalleEmpty.textContent   = 'Inicia sesión para habilitar pedidos';
    detalleEmpty.style.display = 'block';
} else {
    loadOptions();
}
initPageTransitions();
