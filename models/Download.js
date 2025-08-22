const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note', // This creates a link to the Note model
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This creates a link to the User model
    required: true,
  },
}, { timestamps: true }); // `createdAt` will be our download timestamp

module.exports = mongoose.model('Download', DownloadSchema);
