const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/authMiddleware');
const Note = require('../models/Note');

// --- Multer Configuration for file storage ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // This saves the files in the 'uploads' folder in the backend's root directory
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent files with the same name from overwriting each other
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// @route   POST /api/notes/upload
// @desc    Upload a new note
// @access  Private/Admin
router.post('/upload', [protect, admin, upload.single('noteFile')], async (req, res) => {
    const { title, subject, year } = req.body;
    
    // Check if a file was uploaded
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
// @access  Private (for any logged-in user)
router.get('/', protect, async (req, res) => {
  try {
    // Fetch all notes from the database and sort them by creation date (newest first)
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/notes/download/:id
// @desc    Download a specific note by its ID
// @access  Private (for any logged-in user)
router.get('/download/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    // Construct the absolute path to the file
    const filePath = path.join(__dirname, '..', note.filePath);
    
    // Use res.download() to send the file to the client.
    // This prompts the browser to download the file with its original name.
    res.download(filePath, note.fileName);

  } catch (err) {
    console.error(err.message);
    if (err.code === 'ENOENT') { // Handle case where file is not found on the server
        return res.status(404).json({ msg: 'File not found on server.' });
    }
    res.status(500).send('Server Error');
  }
});

// --- NEW: DELETE A NOTE ROUTE ---
// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private/Admin
router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    // 1. Define the path to the file
    const filePath = path.join(__dirname, '..', note.filePath);

    // 2. Delete the file from the server's filesystem
    fs.unlink(filePath, async (err) => {
      if (err) {
        // If the file doesn't exist, we can still proceed to delete the DB entry
        console.error("Error deleting file, but proceeding:", err);
      }

      // 3. Delete the note from the database
      await Note.findByIdAndDelete(req.params.id);
      
      res.json({ msg: 'Note removed successfully' });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;
