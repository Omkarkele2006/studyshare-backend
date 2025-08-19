const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // This loads the variables from .env

const app = express();

// --- Middlewares ---
app.use(cors()); // Allows requests from different origins (our frontend)
app.use(express.json()); // Allows our app to understand JSON format

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected successfully!'))
.catch(err => console.error(err));

// --- A simple test route ---
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));