const API_URL = 'http://localhost:3000';

const tabLogin    = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin   = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const goRegister  = document.getElementById('go-register');
const goLogin     = document.getElementById('go-login');

function showLogin() {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.add('form-active');
  formRegister.classList.remove('form-active');
}

function showRegister() {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.add('form-active');
  formLogin.classList.remove('form-active');
}

tabLogin.addEventListener('click', showLogin);
tabRegister.addEventListener('click', showRegister);
goRegister.addEventListener('click', showRegister);
goLogin.addEventListener('click', showLogin);

/* ── Login ── */
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo   = document.getElementById('login-correo').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res  = await fetch(`${API_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ correo, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert(data.error || 'Correo o contraseña incorrectos');
      return;
    }

    localStorage.setItem('factulogin_user', JSON.stringify(data.user));
    window.location.href = 'menú.html';

  } catch (err) {
    alert('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    console.error(err);
  }
});

/* ── Registro ── */
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre    = document.getElementById('reg-nombre').value.trim();
  const correo    = document.getElementById('reg-correo').value.trim();
  const password  = document.getElementById('reg-password').value;
  const confirmar = document.getElementById('reg-confirmar').value;

  if (password !== confirmar) {
    alert('Las contraseñas no coinciden');
    return;
  }

  try {
    const res  = await fetch(`${API_URL}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nombre, correo, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'No se pudo registrar');
      return;
    }

    alert('¡Registro exitoso! Ahora inicia sesión.');
    showLogin();
    formRegister.reset();

  } catch (err) {
    alert('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    console.error(err);
  }
});
