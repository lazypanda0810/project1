const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../src/models/User');

// User serialization for sessions
// Use user ID for session serialization
passport.serializeUser((user, done) => {
  try {
    done(null, user._id || user.id || user);
  } catch (err) {
    done(err);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) return done(null, null);
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) return done(new Error('No email returned from Google'), null);

      // Upsert user in DB
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          firstName: profile.name?.givenName || 'Google',
          lastName: profile.name?.familyName || 'User',
          email,
          password: crypto.randomBytes(16).toString('hex'),
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          isVerified: true
        });
        await user.save();
      } else if (!user.googleId) {
        user.googleId = profile.id;
        user.avatar = user.avatar || profile.photos?.[0]?.value;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.warn('⚠️  Google OAuth credentials not found in .env file. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
}

// Email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Secure Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verification Code</h2>
        <p>Hello,</p>
        <p>Your verification code for secure login is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <p>Best regards,<br>${process.env.EMAIL_FROM_NAME}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Middleware to check if user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is fully verified (passed double-check)
const ensureDoubleChecked = (req, res, next) => {
  if (req.isAuthenticated() && req.session.doubleChecked) {
    return next();
  }
  res.status(401).json({ error: 'Double verification required' });
};

module.exports = {
  passport,
  generateVerificationCode,
  sendVerificationEmail,
  ensureAuthenticated,
  ensureDoubleChecked
};