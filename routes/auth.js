// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Register
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
  body('displayName').isLength({ min: 2 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, displayName } = req.body;
    
    let user = await User.findOne({ username: username.toLowerCase() });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = new User({
      username: username.toLowerCase(),
      password,
      displayName
    });

    await user.save();
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed after registration' });
      res.json({ 
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          goingTo: user.goingTo || []
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName,
      goingTo: req.user.goingTo || []
    }
  });
});

// Twitter Auth
router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/?auth=failed' }),
  (req, res) => {
    // Redirect with last search preserved
    const redirect = req.session.lastSearch ? `/?location=${encodeURIComponent(req.session.lastSearch)}` : '/';
    res.redirect(redirect);
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

// Get Current User
router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName,
      goingTo: req.user.goingTo || []
    }
  });
});

module.exports = router;
