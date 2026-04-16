import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_super_secret_jwt_key_change_this') {
    const err = new Error('JWT_SECRET');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function infraErrorMessage(err) {
  if (err.code === 'JWT_SECRET_MISSING') {
    return 'Server misconfiguration: set JWT_SECRET in backend/.env (use a long random string, not the example value).';
  }
  if (err.name === 'MongoServerSelectionError' || err.name === 'MongooseServerSelectionError') {
    return 'Cannot reach MongoDB. Check MONGODB_URI in backend/.env and Atlas network access (IP allowlist).';
  }
  return null;
}

/** Turns DB/JWT errors into a safe message for the client (and logs full error server-side). */
function registerErrorMessage(err) {
  const infra = infraErrorMessage(err);
  if (infra) return infra;
  if (err.code === 11000 || err.code === '11000') {
    return 'Email already registered';
  }
  if (err.name === 'ValidationError') {
    return Object.values(err.errors || {})
      .map((e) => e.message)
      .join(' ');
  }
  return 'Registration failed';
}

function loginErrorMessage(err) {
  const infra = infraErrorMessage(err);
  if (infra) return infra;
  return 'Login failed';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password =
      typeof body.password === 'string' ? body.password : String(body.password ?? '');

    if (!name || !email || !password) {
      const hint =
        Object.keys(body).length === 0
          ? ' No JSON body was received — use Content-Type: application/json with {"name","email","password"}.'
          : '';
      return res.status(400).json({
        message: `Name, email, and password are required.${hint}`,
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: body.role === 'admin' ? 'user' : undefined,
    });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors || {})
        .map((e) => e.message)
        .join(' ');
      return res.status(400).json({ message: message || 'Invalid registration data' });
    }
    const message = registerErrorMessage(err);
    const status = message === 'Email already registered' ? 409 : 500;
    res.status(status).json({ message });
  }
}

export async function login(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password =
      typeof body.password === 'string' ? body.password : String(body.password ?? '');
    if (!email || !password) {
      return res.status(400).json({
        message:
          'Email and password are required. Send JSON: {"email","password"} with Content-Type: application/json.',
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: loginErrorMessage(err) });
  }
}

/** Current user profile (protected route). */
export async function me(req, res) {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
}
