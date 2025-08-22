const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Creates a link to the User model
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled'], // A request can only be in one of these two states
    default: 'pending',
  },
}, { timestamps: true }); // `createdAt` will be our request timestamp

module.exports = mongoose.model('Request', RequestSchema);
