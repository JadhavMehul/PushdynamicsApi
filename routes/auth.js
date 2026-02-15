const express = require('express');
const router = express.Router();
const { loginUser, registerUser, verifyUser, updateUserDetails, getUserDetails } = require('../controllers/authController');

// // Register Auth
router.post('/register', registerUser);
// router.post('/checkEmail', emailChecker)
// router.post('/checkUsername', usernameChecker)

// Login Auth
router.post('/login', loginUser);
router.get('/verify-email', verifyUser);

router.post('/update-user-details', updateUserDetails)

router.get('/get-user-details', getUserDetails);

module.exports = router;
