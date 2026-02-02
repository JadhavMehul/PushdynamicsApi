const express = require('express');
const router = express.Router();
const { loginUser, registerUser } = require('../controllers/authController');

// // Register Auth
router.post('/register', registerUser);
// router.post('/checkEmail', emailChecker)
// router.post('/checkUsername', usernameChecker)

// Login Auth
router.post('/login', loginUser);

module.exports = router;
