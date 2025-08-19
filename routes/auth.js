const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    // --- FIX: Get user data from the request body. This was missing. ---
    const { email, prn, password } = req.body;

    // 1. Check for missing fields
    if (!email || !prn || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Check if user already exists (by email or PRN)
    let user = await User.findOne({ $or: [{ email }, { prn }] });
    if (user) {
      return res.status(400).json({ msg: 'User with this email or PRN already exists' });
    }

    // 3. If user is new, create a new instance of the User model
    user = new User({
      email,
      prn,
      password,
    });

    // 4. Create a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = Date.now() + 3600000; // 1 hour from now

    // 5. Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 6. Save the user to the database
    await user.save();

    // 7. Send Verification Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"StudyShare" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email for StudyShare',
      html: `<p>Hi there,</p>
             <p>Thanks for signing up for StudyShare! Please click the link below to verify your email address:</p>
             <a href="${verificationUrl}">${verificationUrl}</a>
             <p>This link will expire in one hour.</p>`,
    });

    // 8. Send a success response
    res.status(201).json({ msg: 'User registered successfully! Please check your email to verify your account.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user's email
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpires: { $gt: Date.now() } // Check if token is not expired
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired verification token.' });
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;
        await user.save();

        res.json({ msg: 'Email verified successfully! You can now log in.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // --- FIX: Get user data from the request body. This was missing. ---
    const { email, password } = req.body;

    // 1. Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Check if a user with that email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Compare the provided password with the hashed password in the DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // 4. Check if the user's email is verified
    if (!user.isVerified) {
      return res.status(401).json({ msg: 'Please verify your email before logging in.' });
    }

    // 5. If credentials are correct, create the JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      },
    };

    // 6. Sign the token and send it back to the user
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, // Token will be valid for 5 hours
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
