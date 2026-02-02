const express = require('express');
const dotenv = require('dotenv');
const app = express();
dotenv.config();

const productRoutes = require('./routes/products')
const authRoutes = require('./routes/auth')

app.use(express.json());


app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
