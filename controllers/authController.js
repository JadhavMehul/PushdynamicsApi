const pool = require('../database/dbConfig');
const { hashPassword, verifyPassword } = require('../scripts/utils/hash');
const { generateToken } = require('../scripts/utils/jwt');
const nodemailer = require("nodemailer");

exports.registerUser = async (req, res) => {
  const { userName, email, password, confirmPassword } = req.body;

  if ( !userName || !email || !password || !confirmPassword ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const [checkUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (checkUser.length > 0) {
      return res.status(409).json({ error: 'Username or Email already in use.' });
    }

    const hashedPassword = await hashPassword(password);
    
    const [createUserQuery] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [userName, email, hashedPassword]);

    // Send email to verify user authenticity 

    const transporter = nodemailer.createTransport({
      host: "mail.pushdynamics.co",
      port: 587,
      secure: false,
      auth: {
        user: "support@pushdynamics.co",
        pass: "test@123@#",
      },
    });

    const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${createUserQuery.insertId}&email=${email}`

    
    await transporter.sendMail({
      to: email,
      subject: 'Email verification from pushdynamics',
      html: `<h2>Verify your email</h2></br><p>please press the link to verify your email</p></br><a href=${verificationLink}>Verify</a>`
    })

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: createUserQuery.insertId,
        name: userName,
        email
      },
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error.' });
  }

}

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

exports.verifyUser = async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({ error: 'Invalid verification link' });
  }

  try {
    const [checkUser] = await pool.query('SELECT * FROM users WHERE id = ? AND email = ?', [token, email]);    

    if (checkUser.length === 0) {
      return res.status(400).send("User not found or invalid link");
    }

    
    await pool.query(
      'UPDATE users SET email_verified_at = NOW() , updated_at = NOW() WHERE id = ?',[token]
    );
    
    return res.status(200).json({
      message: 'User verified successfully.',
    });

  } catch (error) {
    console.log(error);
    
    res.status(500).json({ error: 'Server error.' })
  }
  
}

exports.updateUserDetails = async (req, res) => {
  const { name, email, address1, address2, city, country, zipCode, newPassword, cnfNewPass } = req.body;

  if (!name || !email || !address1 || !address2 || !city || !country || !zipCode || !newPassword || !cnfNewPass) {
    return res.status(400).json({error: 'all fields require'})
  }

  if (newPassword !== cnfNewPass) {
    return res.status(400).json({error: 'new password and confirm password must be same'})
  }

  try {
    const hashedPassword = await hashPassword(newPassword);

    const [updateQuery] = await pool.query(
      'UPDATE users SET name = ?, address = ?, addressL2 = ?, city = ?, country = ?, postal_code = ?, password = ? WHERE email = ?',
      [name, address1, address2, city, country, zipCode, hashedPassword, email]
    )

    return res.status(200).json({
      message: 'User details updated successfully.',
      updateQuery
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error.' })
  }

  
  

}

exports.getUserDetails = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({error: 'Unable to get email'})
  }

  try {

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const userDetails = rows[0];

    const userObject = {
      id: userDetails.id,
      user_type: userDetails.user_type,
      name: userDetails.name,
      lname: userDetails.lname,
      email: userDetails.email,
      address: userDetails.address,
      addressL2: userDetails.addressL2,
      country: userDetails.country,
      city: userDetails.city,
      postal_code: userDetails.postal_code,
      stateProvince: userDetails.stateProvince,
      dob: userDetails.dob,
      phone: userDetails.phone,
    }

    return res.status(200).json({
      message: 'Successfully fetched user details',
      userObject
    })

  } catch (error) {
    return res.status(500).json({
      error: 'Server Error'
    })
  }

}