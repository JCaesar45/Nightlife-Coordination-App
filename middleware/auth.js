// middleware/auth.js
module.exports = {
  ensureAuth: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Please log in to perform this action' });
  },
  
  ensureGuest: function(req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }
};
