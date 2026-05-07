/**
 * DATA/Scripts/login.js
 * FactuLogin — Módulo de autenticación
 * Maneja login y registro con flujo automático
 */

'use strict';

const API_URL = window.location.origin;

/* ── Referencias DOM ─────────────────────────────────────────────── */
const tabLogin     = document.getElementById('tab-login');
const tabRegister  = document.getElementById('tab-register');
const formLogin    = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const goRegister   = document.getElementById('go-register');
const goLogin      = document.getElementById('go-login');

/* ── Navegación entre paneles ────────────────────────────────────── */
function showLogin() {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('form-active');
    formRegister.classList.remove('form-active');
    clearMessages();
}

function showRegister() {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('form-active');
    formLogin.classList.remove('form-active');
    clearMessages();
}

/* ── Mensajes inline ─────────────────────────────────────────────── */
function clearMessages() {
    ['login-error', 'register-error', 'register-ok'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        el.innerHTML     = '';
    });
}

function showError(id, msg, ofrecerRegistro = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (ofrecerRegistro) {
        /* Enlace seguro — sin innerHTML con datos del usuario */
        el.textContent = msg + ' ';
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'link-button';
        btn.style.cssText = 'color:#b91c1c;font-weight:600;';
        btn.textContent   = 'Crear cuenta';
        btn.addEventListener('click', showRegister);
        el.appendChild(btn);
    } else {
        el.textContent = msg;
    }
    el.style.display = 'block';
}

function showOk(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent   = msg;
    el.style.display = 'block';
}

/* ── Guardar sesión y redirigir ──────────────────────────────────── */
function iniciarSesion(user) {
    localStorage.setItem('factulogin_user', JSON.stringify(user));
    window.location.href = 'menú.html';
}

/* ── Validación de email en cliente ──────────────────────────────── */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── LOGIN ───────────────────────────────────────────────────────── */
formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const correo   = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    if (!correo || !password) {
        showError('login-error', 'Por favor completa todos los campos.');
        return;
    }
    if (!isValidEmail(correo)) {
        showError('login-error', 'Ingresa un correo válido.');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'Ingresando…';

    try {
        const res  = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo, password }),
        });
        const data = await res.json();

        if (res.status === 401) {
            const noExiste = data.error?.toLowerCase().includes('correo');
            showError('login-error', data.error || 'Correo o contraseña incorrectos.', noExiste);
            return;
        }
        if (!res.ok || !data.ok) {
            showError('login-error', data.error || 'Error al iniciar sesión.');
            return;
        }

        iniciarSesion(data.user);

    } catch {
        showError('login-error', 'No se pudo conectar con el servidor. ¿Está corriendo DATA/server.js?');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Ingresar';
    }
});

/* ── REGISTRO ────────────────────────────────────────────────────── */
formRegister.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const nombre    = document.getElementById('reg-nombre').value.trim();
    const correo    = document.getElementById('reg-correo').value.trim();
    const password  = document.getElementById('reg-password').value;
    const confirmar = document.getElementById('reg-confirmar').value;
    const btn       = document.getElementById('register-btn');

    if (!nombre || !correo || !password || !confirmar) {
        showError('register-error', 'Por favor completa todos los campos.');
        return;
    }
    if (!isValidEmail(correo)) {
        showError('register-error', 'El correo no tiene formato válido.');
        return;
    }
    if (password !== confirmar) {
        showError('register-error', 'Las contraseñas no coinciden.');
        return;
    }
    if (password.length < 6) {
        showError('register-error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'Creando cuenta…';

    try {
        /* Paso 1: Registro */
        const resReg  = await fetch(`${API_URL}/api/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, correo, password }),
        });
        const dataReg = await resReg.json();

        if (!resReg.ok) {
            showError('register-error', dataReg.error || 'No se pudo crear la cuenta.');
            return;
        }

        /* Paso 2: Login automático */
        showOk('register-ok', 'Cuenta creada. Iniciando sesión…');
        btn.textContent = 'Iniciando sesión…';

        const resLogin  = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo, password }),
        });
        const dataLogin = await resLogin.json();

        if (!resLogin.ok || !dataLogin.ok) {
            showOk('register-ok', '¡Cuenta creada! Ahora inicia sesión con tu correo y contraseña.');
            formRegister.reset();
            setTimeout(showLogin, 2000);
            return;
        }

        /* Paso 3: Sesión y redirección */
        iniciarSesion(dataLogin.user);

    } catch {
        showError('register-error', 'No se pudo conectar con el servidor. ¿Está corriendo DATA/server.js?');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Registrarse';
    }
});

/* ── Eventos de navegación entre tabs ────────────────────────────── */
tabLogin.addEventListener('click',   showLogin);
tabRegister.addEventListener('click', showRegister);
goRegister.addEventListener('click',  showRegister);
goLogin.addEventListener('click',     showLogin);
