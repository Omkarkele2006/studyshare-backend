const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

// @route   POST /api/auth/signup
// @desc    Register a new user and send OTP
// @access  Public
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 600000; // OTP is valid for 10 minutes

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

    await transporter.sendMail({
      from: `"StudyShare" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Your Verification Code for StudyShare',
      html: `<p>Hi there,</p>
             <p>Thanks for signing up! Your verification code is:</p>
             <h2 style="font-size: 24px; letter-spacing: 2px;"><b>${otp}</b></h2>
             <p>This code will expire in 10 minutes.</p>`,
    });

    res.status(201).json({ 
        msg: 'User registered! Please check your email for the verification code.',
        email: user.email 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify user's email with OTP
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email: email,
            otp: otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
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

// @route   POST /api/auth/forgot-password
// @desc    Send a password reset link
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ msg: 'If a user with that email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"StudyShare" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request for StudyShare',
      html: `<p>You requested a password reset. Please click the link below to set a new password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>This link will expire in one hour.</p>`,
    });

    res.json({ msg: 'If a user with that email exists, a password reset link has been sent.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset a user's password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    res.json({ msg: 'Password has been reset successfully!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
