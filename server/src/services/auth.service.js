import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

export const registerUser = async ({ email, password, name, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: role || 'WAITER' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });
  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  };
};

export const getAllWaiters = async () => {
  return prisma.user.findMany({
    where: { role: 'WAITER' },
    select: { id: true, email: true, name: true, role: true },
  });
};
