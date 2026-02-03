// config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Twitter Strategy (Optional - requires API keys)
  if (process.env.TWITTER_CONSUMER_KEY) {
    passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "/api/auth/twitter/callback"
    },
    async (token, tokenSecret, profile, done) => {
      try {
        let user = await User.findOne({ twitterId: profile.id });
        if (!user) {
          user = new User({
            twitterId: profile.id,
            username: profile.username,
            displayName: profile.displayName || profile.username
          });
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err, false);
      }
    }));
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).populate('goingTo');
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
