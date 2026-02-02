const pool = require('../database/dbConfig');
const { hashPassword, verifyPassword } = require('../scripts/utils/hash');
const { generateToken } = require('../scripts/utils/jwt');



// Login Auth
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    const user = rows[0];

    // Verify password
    const isMatch = await verifyPassword(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // User Login Token
    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error.' })
  }
}