const pool = require('../database/dbConfig');

// GET all products
exports.getProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    console.log(result);
    
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

