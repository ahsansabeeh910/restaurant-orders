import dotenv from 'dotenv';
dotenv.config();

const parseCorsOrigin = (origin) => {
  if (!origin) return 'http://localhost:5173';
  if (origin === '*') return '*';
  if (origin.includes(',')) return origin.split(',').map(o => o.trim());
  return origin;
};

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  databaseUrl: process.env.DATABASE_URL,
  alertThresholdMinutes: parseInt(process.env.ALERT_THRESHOLD_MINUTES || '15'),
  alertReappearMinutes: parseInt(process.env.ALERT_REAPPEAR_MINUTES || '10'),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
};
