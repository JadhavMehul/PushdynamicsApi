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

exports.getProductsByCategory = async (req, res) => {

  const { categoryID } = req.body;

  try {
    const result = await pool.query('SELECT * FROM products WHERE category_id = ?', [categoryID]);
    console.log(result[0]);
    
    res.status(200).json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

