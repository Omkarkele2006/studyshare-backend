const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/authMiddleware');
const Note = require('../models/Note');
const Download = require('../models/Download'); // <-- Import the Download model

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

// @route   POST /api/notes/upload
// @desc    Upload a new note
// @access  Private/Admin
router.post('/upload', [protect, admin, upload.single('noteFile')], async (req, res) => {
    const { title, subject, year } = req.body;
    if (!req.file) {
        return res.status(400).json({ msg: 'Please upload a file' });
    }
    const { filename, path: filePath, mimetype } = req.file;
    try {
        const newNote = new Note({
            title,
            subject,
            year,
            fileName: filename,
            filePath: filePath,
            fileType: mimetype,
            uploadedBy: req.user.id
        });
        const note = await newNote.save();
        res.status(201).json(note);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/notes
// @desc    Get all notes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/notes/download/:id
// @desc    Download a specific note and log the event
// @access  Private
router.get('/download/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    // Create a new download record
    const newDownload = new Download({
      note: note._id,
      user: req.user.id,
    });
    await newDownload.save();

    const filePath = path.join(__dirname, '..', note.filePath);
    res.download(filePath, note.fileName);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/notes/:id/downloads
// @desc    Get all download records for a specific note
// @access  Private/Admin
router.get('/:id/downloads', [protect, admin], async (req, res) => {
    try {
        const downloads = await Download.find({ note: req.params.id })
            .populate('user', 'email prn'); // Fetches the user's email and prn

        res.json(downloads);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note and its download records
// @access  Private/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }
    const filePath = path.join(__dirname, '..', note.filePath);
    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error("Error deleting file, but proceeding:", err);
      }
      await Note.findByIdAndDelete(req.params.id);
      // Also delete download records associated with this note
      await Download.deleteMany({ note: req.params.id });
      res.json({ msg: 'Note and download records removed successfully' });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
