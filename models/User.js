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
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('User', UserSchema);