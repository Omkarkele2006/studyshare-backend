
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Download = require('../models/Download');

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', [protect, admin], async (req, res) => {
  try {
    // Find all users but exclude their password field from the response
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user and their download history
// @access  Private/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Before deleting the user, we'll clean up their download records.
    await Download.deleteMany({ user: user._id });

    // Now, delete the user.
    await User.findByIdAndDelete(req.params.id);

    res.json({ msg: 'User and their download history have been removed.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
