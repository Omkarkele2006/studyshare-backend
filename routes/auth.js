const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User'); // Ensure this is uppercase 'U'

// ... (signup route)
router.post('/signup', async (req, res) => {
  try {
    const { email, prn, password } = req.body;

    if (!email || !prn || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    let user = await User.findOne({ $or: [{ email }, { prn }] });
    if (user) {
      return res.status(400).json({ msg: 'User with this email or PRN already exists' });
    }

    user = new User({ email, prn, password });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = Date.now() + 3600000;

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // --- THIS IS THE CRUCIAL FIX ---
    // It now uses the FRONTEND_URL environment variable
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await transporter.sendMail({
      from: `"StudyShare" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email for StudyShare',
      html: `<p>Hi there,</p>
             <p>Thanks for signing up! Please click the link below to verify your email address:</p>
             <a href="${verificationUrl}">${verificationUrl}</a>
             <p>This link will expire in one hour.</p>`,
    });

    res.status(201).json({ msg: 'User registered! Please check your email to verify your account.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ... (verify-email and login routes remain the same)

router.get('/verify-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpires: { $gt: Date.now() }
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    if (!user.isVerified) {
      return res.status(401).json({ msg: 'Please verify your email before logging in.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
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
