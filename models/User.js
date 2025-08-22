const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  prn: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  // --- REPLACE THE OLD TOKEN FIELDS ---
  otp: { type: String },
  otpExpires: { type: Date },
  // --- WITH THESE NEW OTP FIELDS ---
  passwordResetToken: { type: String },
  passwordResetTokenExpires: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
