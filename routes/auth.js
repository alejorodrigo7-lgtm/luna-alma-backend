const express = require('express');
const router = express.Router();
const { login, getUsers, getUserById } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Ruta pública
router.post('/login', login);

// Rutas protegidas
router.get('/users', auth, getUsers);
router.get('/users/:id', auth, getUserById);

module.exports = router;