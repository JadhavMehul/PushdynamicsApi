const pool = require('../database/dbConfig');
const { hashPassword, verifyPassword } = require('../scripts/utils/hash');
const { generateAccessToken, generateRefreshToken } = require('../scripts/utils/jwt');
const { accessCookieOptions, refreshCookieOptions } = require("../scripts/utils/cookies");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require('dotenv').config();

exports.registerUser = async (req, res) => {
  const { userName, email, password, confirmPassword } = req.body;

  if ( !userName || !email || !password || !confirmPassword ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }


  console.log(userName, email, password, confirmPassword );

  try {
    const [checkUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (checkUser.length > 0) {
      return res.status(409).json({ error: 'Username or Email already in use.' });
    }

    const hashedPassword = await hashPassword(password);
    
    const [createUserQuery] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [userName, email, hashedPassword]);

    const user = {
      id: createUserQuery.insertId,
      email
    }

    // Send email to verify user authenticity 

    const transporter = nodemailer.createTransport({
      host: "mail.pushdynamics.co",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SUPPORT_EMAIL,
        pass: process.env.SUPPORT_EMAIL_PASSWORD,
      },
    });

    const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${createUserQuery.insertId}&email=${email}`

    
    await transporter.sendMail({
      from: `"PushDynamics" <${process.env.SUPPORT_EMAIL}>`,
      to: email,
      subject: 'Email verification from pushdynamics',
      html: `<h2>Verify your email</h2></br><p>please press the link to verify your email</p></br><a href=${verificationLink}>Verify</a>`
    })

    // res.status(201).json({
    //   message: 'User registered successfully.',
    //   user: {
    //     id: createUserQuery.insertId,
    //     name: userName,
    //     email
    //   },
    // });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res
      .cookie("accessToken", accessToken, accessCookieOptions)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .status(200)
      .json({
        user: {
          id: createUserQuery.insertId,
          email,
          name: userName,
          emailVerified: false,
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
    
    const emailVerified = user.email_verified_at !== null;
    

    // Verify password
    const isMatch = await verifyPassword(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // User Login Token
    // const token = generateToken(user);

    // res.status(200).json({
    //   message: 'Login successful',
    //   token,
    //   user: {
    //     id: user.id,
    //     username: user.name,
    //     email: user.email
    //   }
    // });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res
      .cookie("accessToken", accessToken, accessCookieOptions)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .status(200)
      .json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified
        },
      });
    
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error.' })
  }
}






exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'No refresh token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [
      decoded.email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const newAccessToken = generateAccessToken(user);
    res
      .cookie('accessToken', newAccessToken, accessCookieOptions)
      .status(200)
      .json({ success: true });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid refresh token.' });
  }
};


exports.logoutUser = (req, res) => {
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json({ message: "Logged out successfully" });
};

exports.getMe = async (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const [rows] = await pool.query("SELECT id, email, name, email_verified_at FROM users WHERE id = ?", [decoded.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const emailVerified = rows[0].email_verified_at !== null;

    const user = {
      id: rows[0].id,
      email: rows[0].email,
      name:  rows[0].name,
      emailVerified
    }
    
    // const emailVerified = [rows].email_verified_at !== null;


    return res.status(200).json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};




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
  
  if (!name || !email || !address1 || !address2 || !city || !country || !zipCode ) {
    return res.status(400).json({error: 'all fields require'})
  }

  if (newPassword || cnfNewPass) {
    if (newPassword !== cnfNewPass) {
      return res.status(400).json({error: 'new password and confirm password must be same'})
    }
  }

  try {
    if (newPassword) {
      const hashedPassword = await hashPassword(newPassword);

      const [updateQuery] = await pool.query(
        'UPDATE users SET name = ?, address = ?, addressL2 = ?, city = ?, country = ?, postal_code = ?, password = ? WHERE email = ?',
        [name, address1, address2, city, country, zipCode, hashedPassword, email]
      )

       return res.status(200).json({
        message: 'User details updated successfully.',
        updateQuery
      });
    } else {
      const [updateQuery] = await pool.query(
        'UPDATE users SET name = ?, address = ?, addressL2 = ?, city = ?, country = ?, postal_code = ? WHERE email = ?',
        [name, address1, address2, city, country, zipCode, email]
      )

       return res.status(200).json({
        message: 'User details updated successfully.',
        updateQuery
      });
    }
    

   

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