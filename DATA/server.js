require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const { createUser, getUserByEmail, getAllUsers } = require('./db');

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';/* rey esto es para la conexion con la base de datos pa qjue sepa :p*/

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'API FactuLogin funcionando' });
});

app.get('/api/users', async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existing = await getUserByEmail(correo);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'El usuario ya existe con ese correo' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
      name: nombre,
      email: correo,
      passwordHash,
    });

    res.status(201).json({
      ok: true,
      user,
      message: 'Usuario creado correctamente',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const user = await getUserByEmail(correo);

    if (!user) {
      return res
        .status(401)
        .json({ ok: false, error: 'Correo o contraseña incorrectos' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res
        .status(401)
        .json({ ok: false, error: 'Correo o contraseña incorrectos' });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: 'Login correcto',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.listen(PORT, () => {
  console.log(`API FactuLogin escuchando en http://localhost:${PORT}`);
});

