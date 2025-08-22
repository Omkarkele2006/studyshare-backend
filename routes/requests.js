const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const Request = require('../models/Request');

// @route   POST /api/requests
// @desc    Create a new note request
// @access  Private (for any logged-in user)
router.post('/', protect, async (req, res) => {
  try {
    const { subject, topic } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const newRequest = new Request({
      subject,
      topic,
      requestedBy: req.user.id, // req.user comes from our 'protect' middleware
    });

    const request = await newRequest.save();
    res.status(201).json(request);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/requests
// @desc    Get all note requests
// @access  Private/Admin
router.get('/', [protect, admin], async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('requestedBy', 'email prn') // Fetches the user's email and PRN
      .sort({ createdAt: -1 }); // Show newest requests first
      
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
