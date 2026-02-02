const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 1;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  verifyPassword
};
