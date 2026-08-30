import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

export const checkSlowOrders = async () => {
  try {
    const thresholdTime = new Date(Date.now() - config.alertThresholdMinutes * 60 * 1000);
    const now = new Date();

    // Find open orders older than threshold that are not yet Ready/Served/Cancelled
    const slowOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PLACED', 'ACCEPTED', 'PREPARING'] },
        placedAt: { lt: thresholdTime },
        isArchived: false,
      },
      select: { id: true },
    });

    for (const order of slowOrders) {
      // Check if there's already an active alert for this order
      const existingAlert = await prisma.alert.findFirst({
        where: {
          orderId: order.id,
          isActive: true,
        },
      });

      if (!existingAlert) {
        // Check if there's an acknowledged alert whose reappear time has passed
        const acknowledgedAlert = await prisma.alert.findFirst({
          where: {
            orderId: order.id,
            isActive: false,
            acknowledgedAt: { not: null },
            reappearAfter: { lt: now },
          },
        });

        if (acknowledgedAlert) {
          // Reactivate the alert
          await prisma.alert.update({
            where: { id: acknowledgedAlert.id },
            data: {
              isActive: true,
              acknowledgedAt: null,
              acknowledgedBy: null,
              reappearAfter: null,
            },
          });
        } else {
          // Check if there's any alert at all for this order (acknowledged but not yet time to reappear)
          const anyAlert = await prisma.alert.findFirst({
            where: { orderId: order.id },
          });

          if (!anyAlert) {
            // Create new alert
            await prisma.alert.create({
              data: { orderId: order.id },
            });
          }
        }
      }
    }

    // Deactivate alerts for orders that have reached Ready/Served/Cancelled
    await prisma.alert.updateMany({
      where: {
        isActive: true,
        order: {
          status: { in: ['READY', 'SERVED', 'CANCELLED'] },
        },
      },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Alert checker error:', error.message);
  }
};

export const startAlertChecker = () => {
  // Run every 60 seconds
  setInterval(checkSlowOrders, 60 * 1000);
  // Also run once immediately
  checkSlowOrders();
  console.log('Alert checker started (interval: 60s)');
};
