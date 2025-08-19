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
  emailVerificationToken: { type: String },
  emailVerificationTokenExpires: { type: Date },
  // --- ADD THESE TWO LINES ---
  passwordResetToken: { type: String },
  passwordResetTokenExpires: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
