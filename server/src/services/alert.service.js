import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

export const getActiveAlerts = async () => {
  return prisma.alert.findMany({
    where: { isActive: true },
    include: {
      order: {
        include: {
          primaryWaiter: { select: { id: true, name: true } },
        },
      },
      acknowledgedByUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
};

export const getAlertCount = async () => {
  return prisma.alert.count({ where: { isActive: true } });
};

export const acknowledgeAlert = async (alertId, userId) => {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) {
    throw Object.assign(new Error('Alert not found'), { status: 404 });
  }
  if (!alert.isActive) {
    throw Object.assign(new Error('Alert is already acknowledged'), { status: 400 });
  }

  const reappearAfter = new Date(Date.now() + config.alertReappearMinutes * 60 * 1000);

  return prisma.alert.update({
    where: { id: alertId },
    data: {
      isActive: false,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
      reappearAfter,
    },
  });
};
