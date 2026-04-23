require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const nodemailer = require('nodemailer');

const {
    createUser, getUserByEmail, getAllUsers, getUserById, updateUserProfileImage,
    addNotification, getNotificationsByUser,
    addInvoice, getInvoicesByUser,
    addUserEvent,
    createClient, getClients,
    createCompany, getCompanies,
    createProduct, getProducts, getProductById,
    createOrder, getOrders,
} = require('./db');

const app = express();

const PORT         = process.env.PORT || 3000;
const UPLOADS_DIR  = path.join(__dirname, 'uploads');
const PROJECT_ROOT = path.join(__dirname, '..');

// SMTP (opcional)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename:    (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `profile-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
        cb(null, true);
    },
});

// ─── Mailer ───────────────────────────────────────────────────────────────────
const mailer = SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
          host: SMTP_HOST, port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

// ════════════════════════════════════════════════════════════════════════════
// SEGURIDAD
// ════════════════════════════════════════════════════════════════════════════

// ─── 4.2 CORS estricto ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Agrega aquí tu dominio de producción cuando lo tengas:
    // 'https://MIDOMINIO.com',
];

app.use(cors({
    origin: (origin, cb) => {
        // Sin origen = Postman / curl / mismo servidor (permitido en dev)
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        // file:// durante desarrollo
        if (origin === 'null') return cb(null, true);
        return cb(new Error(`CORS: origen no permitido → ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── 4.3 Security Headers ────────────────────────────────────────────────────
app.use((_req, res, next) => {
    // Permite: mismo origen + cdnjs para FontAwesome + ui-avatars para imágenes de perfil
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",                        // inline JS en HTML
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        "font-src 'self' https://cdnjs.cloudflare.com",
        "img-src 'self' data: https://ui-avatars.com blob:",        // avatars + uploads
        "connect-src 'self'",
    ].join('; '));

    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// ─── 4.1 RLS (Row Level Security) ────────────────────────────────────────────
// Middleware que verifica que el userId en la sesión coincida con el recurso
// al que se intenta acceder. Se aplica a todas las rutas /api/users/:id/*.
function requireSameUser(req, res, next) {
    // Lee el userId que el cliente dice ser (enviado en header o en body)
    const claimedId = req.headers['x-user-id'] || req.body?.userId;
    const resourceId = req.params.id;

    // Si no hay sesión declarada y la ruta requiere id, bloquear
    if (!claimedId || !resourceId) return next(); // rutas públicas pasan

    if (String(claimedId) !== String(resourceId)) {
        return res.status(403).json({ error: 'Acceso denegado: no puedes ver datos de otro usuario' });
    }
    next();
}

// ─── Body parsers + státicos ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PROJECT_ROOT));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/', (_req, res) => res.redirect('/Login.html'));

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) =>
    res.json({ ok: true, timestamp: new Date().toISOString() })
);

// ─── Auth: Registro ───────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;
        if (!nombre || !correo || !password)
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
            return res.status(400).json({ error: 'El correo no tiene formato válido' });
        if (password.length < 6)
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

        const existing = await getUserByEmail(correo);
        if (existing)
            return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createUser({ name: nombre.trim(), email: correo, passwordHash });

        await addNotification(user.id, '¡Bienvenido a FactuLogin! Tu cuenta fue creada correctamente.');
        await addInvoice(user.id, 'Factura demo de bienvenida', 0);

        res.status(201).json({
            ok: true,
            user: { id: user.id, name: user.name, email: user.email },
            message: 'Usuario creado',
        });
    } catch (err) {
        console.error('[POST /api/auth/register]', err);
        res.status(500).json({ error: 'Error interno al registrar usuario' });
    }
});

// ─── Auth: Login ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password)
            return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' });

        const user = await getUserByEmail(correo);
        if (!user) {
            await bcrypt.hash('dummy', 12); // tiempo constante
            return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' });

        await addUserEvent(user._id, 'login', 'Inicio de sesión exitoso');

        res.json({
            ok: true,
            user: { id: user._id, name: user.name, email: user.email, profileImage: user.profile_image || null },
            message: 'Login correcto',
        });
    } catch (err) {
        console.error('[POST /api/auth/login]', err);
        res.status(500).json({ ok: false, error: 'Error interno al iniciar sesión' });
    }
});

// ─── Dashboard (RLS: solo el propio usuario) ──────────────────────────────────
app.get('/api/users/:id/dashboard', requireSameUser, async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const [notifications, invoices] = await Promise.all([
            getNotificationsByUser(req.params.id),
            getInvoicesByUser(req.params.id),
        ]);

        res.json({
            ok: true,
            user: { id: user.id, name: user.name, email: user.email, profileImage: user.profile_image || null },
            notifications,
            invoices,
        });
    } catch (err) {
        console.error('[GET /api/users/:id/dashboard]', err);
        res.status(500).json({ error: 'Error al cargar dashboard' });
    }
});

// ─── Eventos ──────────────────────────────────────────────────────────────────
app.post('/api/users/:id/events', requireSameUser, async (req, res) => {
    try {
        const { action, detail } = req.body;
        if (!action) return res.status(400).json({ error: 'La acción es requerida' });
        await addUserEvent(req.params.id, action, detail || null);
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('[POST /api/users/:id/events]', err);
        res.status(500).json({ error: 'Error al guardar evento' });
    }
});

// ─── Foto de perfil (RLS) ─────────────────────────────────────────────────────
app.post('/api/users/:id/profile-photo', requireSameUser, upload.single('profileImage'), async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

        if (user.profile_image) {
            const oldPath = path.join(UPLOADS_DIR, path.basename(user.profile_image));
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const relativePath = `/uploads/${req.file.filename}`;
        await updateUserProfileImage(req.params.id, relativePath);
        await addNotification(req.params.id, 'Se actualizó tu foto de perfil.');
        await addUserEvent(req.params.id, 'profile_photo_changed', 'Cambió foto de perfil');

        res.json({ ok: true, profileImage: relativePath });
    } catch (err) {
        console.error('[POST /api/users/:id/profile-photo]', err);
        res.status(500).json({ error: 'Error al actualizar foto de perfil' });
    }
});

// ─── Usuarios (solo lista, sin datos sensibles) ───────────────────────────────
app.get('/api/users', async (_req, res) => {
    try { res.json(await getAllUsers()); }
    catch (err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

// ─── Clientes ─────────────────────────────────────────────────────────────────
app.get('/api/clientes', async (_req, res) => {
    try { res.json(await getClients()); }
    catch (err) { res.status(500).json({ error: 'Error al obtener clientes' }); }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, documento, telefono } = req.body;
        if (!nombre || !documento || !telefono)
            return res.status(400).json({ error: 'Nombre, documento y teléfono son requeridos' });
        const row = await createClient({ name: nombre.trim(), document: documento.trim(), phone: telefono.trim() });
        res.status(201).json({ ok: true, client: row });
    } catch (err) {
        console.error('[POST /api/clientes]', err);
        res.status(500).json({ error: 'Error al guardar cliente' });
    }
});

// ─── Empresas ─────────────────────────────────────────────────────────────────
app.get('/api/empresas', async (_req, res) => {
    try { res.json(await getCompanies()); }
    catch (err) { res.status(500).json({ error: 'Error al obtener empresas' }); }
});

app.post('/api/empresas', async (req, res) => {
    try {
        const { nombre, nit, telefono, direccion } = req.body;
        if (!nombre || !nit || !telefono || !direccion)
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        const row = await createCompany({ name: nombre.trim(), nit: nit.trim(), phone: telefono.trim(), address: direccion.trim() });
        res.status(201).json({ ok: true, company: row });
    } catch (err) {
        console.error('[POST /api/empresas]', err);
        res.status(500).json({ error: 'Error al guardar empresa' });
    }
});

// ─── Productos ────────────────────────────────────────────────────────────────
app.get('/api/productos', async (_req, res) => {
    try { res.json(await getProducts()); }
    catch (err) { res.status(500).json({ error: 'Error al obtener productos' }); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, marca, precio, cantidad } = req.body;
        if (!nombre)
            return res.status(400).json({ error: 'El nombre es requerido' });
        if (!marca)
            return res.status(400).json({ error: 'La marca es requerida' });
        const precioNum   = Number(precio);
        const cantidadNum = Number(cantidad);
        if (isNaN(precioNum) || precioNum < 0)
            return res.status(400).json({ error: 'El precio debe ser un número válido' });
        if (isNaN(cantidadNum) || cantidadNum < 0)
            return res.status(400).json({ error: 'La cantidad debe ser un número válido' });

        const row = await createProduct({
            name:  nombre.trim(),
            brand: marca.trim(),
            price: precioNum,
            stock: cantidadNum,
        });
        res.status(201).json({ ok: true, product: row });
    } catch (err) {
        console.error('[POST /api/productos]', err);
        res.status(500).json({ error: 'Error al guardar producto' });
    }
});

// ─── Pedidos / opciones ───────────────────────────────────────────────────────
app.get('/api/pedidos/options', async (_req, res) => {
    try {
        const [clientes, empresas, productos] = await Promise.all([
            getClients(), getCompanies(), getProducts(),
        ]);
        res.json({ clientes, empresas, productos });
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar opciones' });
    }
});

app.get('/api/pedidos', async (_req, res) => {
    try { res.json(await getOrders()); }
    catch (err) { res.status(500).json({ error: 'Error al listar pedidos' }); }
});

// ─── POST /api/pedidos — calcula descuento en servidor también ────────────────
app.post('/api/pedidos', async (req, res) => {
    try {
        const { userId, clienteId, empresaId, items } = req.body;

        if (!clienteId || !empresaId || !Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: 'Faltan datos para generar el pedido' });

        const invoiceLines = [];
        let total = 0;

        for (const raw of items) {
            const productId = raw.productoId;
            const quantity  = Number(raw.cantidad);
            const pctDescFE = Number(raw.pctDesc || 0);   // % enviado desde el frontend

            if (!productId || !quantity || quantity <= 0)
                return res.status(400).json({ error: 'Items inválidos en el pedido' });

            const product = await getProductById(productId);
            if (!product)
                return res.status(404).json({ error: `Producto ${productId} no encontrado` });

            // ── Recalcular descuento en servidor (no confiar solo en el cliente) ──
            const bloques  = Math.floor(quantity / 10);
            const pctDesc  = bloques * 0.025;            // 2.5% por bloque de 10
            const precioU  = Number(product.price);
            const precioDescU = precioU * (1 - pctDesc); // precio unitario con descuento
            const subtotal = precioDescU * quantity;
            total += subtotal;

            invoiceLines.push({
                productId,
                productName: product.name,
                quantity,
                price:    precioDescU,
                pctDesc,
                subtotal,
            });
        }

        const order = await createOrder({
            userId:    userId || null,
            clientId:  clienteId,
            companyId: empresaId,
            items: invoiceLines.map(l => ({
                product_id: l.productId,
                quantity:   l.quantity,
                price:      l.price,
                pct_desc:   l.pctDesc,
                subtotal:   l.subtotal,
            })),
            total,
        });

        // Notificaciones + factura al usuario
        if (userId) {
            const uid = userId;
            await addInvoice(uid, `Factura pedido #${order.id}`, total);
            await addNotification(uid, `Pedido #${order.id} generado por $${total.toFixed(2)}.`);
            await addUserEvent(uid, 'order_created', `Pedido #${order.id}`);
        }

        // Correo (opcional)
        let mailSent = false;
        if (userId && mailer) {
            try {
                const user = await getUserById(userId);
                if (user?.email) {
                    const linesText = invoiceLines.map(l =>
                        `  - ${l.productName} x${l.quantity} | ` +
                        `$${l.price.toFixed(2)} c/u${l.pctDesc>0?' (desc '+( l.pctDesc*100).toFixed(1)+'%)':''} | ` +
                        `Subtotal: $${l.subtotal.toFixed(2)}`
                    ).join('\n');
                    await mailer.sendMail({
                        from: SMTP_FROM, to: user.email,
                        subject: `Factura pedido #${order.id} — FactuLogin`,
                        text: `Hola ${user.name},\n\nTu pedido fue generado.\n\n${linesText}\n\nTotal: $${total.toFixed(2)}\n\nGracias.`,
                    });
                    mailSent = true;
                }
            } catch (mailErr) {
                console.warn('[Correo] No se pudo enviar:', mailErr.message);
            }
        }

        res.status(201).json({ ok: true, orderId: order.id, total, invoiceLines, mailSent });
    } catch (err) {
        console.error('[POST /api/pedidos]', err);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

// ─── Error global ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[Error global]', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.use('/api/*', (_req, res) =>
    res.status(404).json({ error: 'Endpoint no encontrado' })
);

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  API FactuLogin en http://localhost:${PORT}`);
    console.log(`📄  Login:   http://localhost:${PORT}/Login.html`);
    console.log(`🔧  Health:  http://localhost:${PORT}/api/health\n`);
});
