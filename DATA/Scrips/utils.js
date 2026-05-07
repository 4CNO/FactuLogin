/**
 * DATA/Scripts/utils.js
 * FactuLogin — Utilidades compartidas
 * Funciones reutilizables en todos los módulos
 */

'use strict';

/* ── Constantes globales ─────────────────────────────────────────── */
const API_URL     = window.location.origin;
const currentUser = JSON.parse(localStorage.getItem('factulogin_user') || 'null');
const userId      = currentUser?.id || null;
const SESSION     = Boolean(userId);

/* ── Toast ───────────────────────────────────────────────────────── */
function toast(msg, ms = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className   = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastOut 0.28s ease forwards';
        setTimeout(() => t.remove(), 300);
    }, ms);
}

/* ── Mensajes de formulario ──────────────────────────────────────── */
function showMsg(errorId, okId, type, msg) {
    const errorDiv = document.getElementById(errorId);
    const okDiv    = document.getElementById(okId);
    if (errorDiv) errorDiv.style.display = 'none';
    if (okDiv)    okDiv.style.display    = 'none';
    if (type === 'error' && errorDiv) { errorDiv.textContent = msg; errorDiv.style.display = 'block'; }
    if (type === 'ok'    && okDiv)    { okDiv.textContent    = msg; okDiv.style.display    = 'block'; }
}

/* ── Avatar ──────────────────────────────────────────────────────── */
function photoSrc(path, name) {
    return path
        ? `${API_URL}${path}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=e0e7ff&color=4f46e5&size=80`;
}

/* ── Transición suave entre páginas ─────────────────────────────── */
function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#')) return;
            e.preventDefault();
            document.body.style.opacity    = '0';
            document.body.style.transition = 'opacity 0.22s ease';
            setTimeout(() => { window.location.href = href; }, 220);
        });
    });
}

/* ── Track evento usuario ────────────────────────────────────────── */
async function track(action, detail) {
    if (!userId) return;
    try {
        await fetch(`${API_URL}/api/users/${userId}/events`, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id':    userId,
            },
            body: JSON.stringify({ action, detail }),
        });
    } catch (_) { /* silencioso — no interrumpir flujo */ }
}

/* ── Sanitizar texto para prevenir XSS en innerHTML ─────────────── */
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}
