import { prisma } from '../config/db.js';

export const getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [openOrders, placedToday, servedToday, revenueToday] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] },
        isArchived: false,
      },
    }),
    prisma.order.count({
      where: {
        placedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.order.count({
      where: {
        status: 'SERVED',
        placedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: 'SERVED',
        placedAt: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  return {
    openOrders,
    placedToday,
    servedToday,
    revenueToday: Number(revenueToday._sum.total || 0),
  };
};

export const getByStatus = async () => {
  const result = await prisma.order.groupBy({
    by: ['status'],
    _count: { id: true },
    where: { isArchived: false },
  });
  return result.map(r => ({ status: r.status, count: r._count.id }));
};

export const getByWaiter = async () => {
  const result = await prisma.order.groupBy({
    by: ['primaryWaiterId'],
    _count: { id: true },
    where: { isArchived: false },
  });

  // Get waiter names
  const waiterIds = result.map(r => r.primaryWaiterId);
  const waiters = await prisma.user.findMany({
    where: { id: { in: waiterIds } },
    select: { id: true, name: true },
  });
  const waiterMap = new Map(waiters.map(w => [w.id, w.name]));

  return result.map(r => ({
    waiterId: r.primaryWaiterId,
    waiterName: waiterMap.get(r.primaryWaiterId) || 'Unknown',
    count: r._count.id,
  }));
};

export const getServedPerDay = async () => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      status: 'SERVED',
      placedAt: { gte: fourteenDaysAgo },
    },
    select: { placedAt: true },
  });

  // Group by day
  const dayMap = new Map();
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, 0);
  }

  for (const order of orders) {
    const key = order.placedAt.toISOString().split('T')[0];
    if (dayMap.has(key)) {
      dayMap.set(key, dayMap.get(key) + 1);
    }
  }

  return Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
