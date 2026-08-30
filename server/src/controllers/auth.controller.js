import { registerUser, loginUser, getAllWaiters } from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const result = await registerUser({ email, password, name, role });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};

export const waiters = async (req, res, next) => {
  try {
    const list = await getAllWaiters();
    res.json(list);
  } catch (error) {
    next(error);
  }
};
