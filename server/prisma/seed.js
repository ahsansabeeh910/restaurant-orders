import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.alert.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.orderCollaborator.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const manager1 = await prisma.user.create({
    data: { email: 'manager@restaurant.com', passwordHash, name: 'Alice Manager', role: 'MANAGER' },
  });
  const manager2 = await prisma.user.create({
    data: { email: 'manager2@restaurant.com', passwordHash, name: 'Bob Manager', role: 'MANAGER' },
  });
  const waiter1 = await prisma.user.create({
    data: { email: 'waiter1@restaurant.com', passwordHash, name: 'Charlie Waiter', role: 'WAITER' },
  });
  const waiter2 = await prisma.user.create({
    data: { email: 'waiter2@restaurant.com', passwordHash, name: 'Diana Waiter', role: 'WAITER' },
  });
  const waiter3 = await prisma.user.create({
    data: { email: 'waiter3@restaurant.com', passwordHash, name: 'Eve Waiter', role: 'WAITER' },
  });

  console.log('Users created');

  // Create menu items
  const menuItems = await Promise.all([
    prisma.menuItem.create({ data: { name: 'Margherita Pizza', price: 12.99 } }),
    prisma.menuItem.create({ data: { name: 'Pepperoni Pizza', price: 14.99 } }),
    prisma.menuItem.create({ data: { name: 'Caesar Salad', price: 8.99 } }),
    prisma.menuItem.create({ data: { name: 'Garlic Bread', price: 5.99 } }),
    prisma.menuItem.create({ data: { name: 'Pasta Carbonara', price: 13.99 } }),
    prisma.menuItem.create({ data: { name: 'Grilled Salmon', price: 18.99 } }),
    prisma.menuItem.create({ data: { name: 'Mushroom Risotto', price: 14.49 } }),
    prisma.menuItem.create({ data: { name: 'Tiramisu', price: 7.99 } }),
    prisma.menuItem.create({ data: { name: 'Bruschetta', price: 6.99 } }),
    prisma.menuItem.create({ data: { name: 'Minestrone Soup', price: 7.49 } }),
    prisma.menuItem.create({ data: { name: 'Chicken Parmesan', price: 15.99 } }),
    prisma.menuItem.create({ data: { name: 'Beef Lasagna', price: 14.99 } }),
    prisma.menuItem.create({ data: { name: 'Caprese Salad', price: 9.49 } }),
    prisma.menuItem.create({ data: { name: 'Lemonade', price: 3.99 } }),
    prisma.menuItem.create({ data: { name: 'Espresso', price: 2.99 } }),
    prisma.menuItem.create({ data: { name: 'House Wine (Glass)', price: 8.99, isAvailable: false } }),
  ]);

  console.log('Menu items created');

  // Helper to create orders with lines and history
  const createOrderWithHistory = async (data) => {
    const { tableNumber, waiterId, status, lines: lineData, placedAt, collaboratorIds } = data;

    let total = 0;
    const orderLines = lineData.map(l => {
      const mi = menuItems.find(m => m.name === l.itemName);
      const unitPrice = Number(mi.price);
      total += unitPrice * l.quantity;
      return {
        menuItemId: mi.id,
        quantity: l.quantity,
        specialInstructions: l.special || null,
        unitPrice,
        isVoid: l.isVoid || false,
        voidReason: l.voidReason || null,
      };
    });

    // Subtract voided lines from total
    for (const l of orderLines) {
      if (l.isVoid) {
        total -= Number(l.unitPrice) * l.quantity;
      }
    }

    const order = await prisma.order.create({
      data: {
        tableNumber,
        primaryWaiterId: waiterId,
        status,
        total: Math.max(0, total),
        placedAt: placedAt || new Date(),
        lines: { create: orderLines },
        history: {
          create: {
            performedBy: waiterId,
            action: 'STATUS_CHANGE',
            oldValue: null,
            newValue: 'PLACED',
            details: `Order placed for table ${tableNumber}`,
            createdAt: placedAt || new Date(),
          },
        },
      },
    });

    // Add collaborators if any
    if (collaboratorIds) {
      for (const cId of collaboratorIds) {
        await prisma.orderCollaborator.create({
          data: { orderId: order.id, userId: cId },
        });
      }
    }

    // Add status history transitions
    const statusFlow = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];
    const targetIdx = statusFlow.indexOf(status);
    if (targetIdx > 0) {
      for (let i = 1; i <= targetIdx; i++) {
        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            performedBy: waiterId,
            action: 'STATUS_CHANGE',
            oldValue: statusFlow[i - 1],
            newValue: statusFlow[i],
            details: `Status changed from ${statusFlow[i - 1]} to ${statusFlow[i]}`,
          },
        });
      }
    }

    return order;
  };

  const now = new Date();
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  const hoursAgo = (n) => {
    const d = new Date(now);
    d.setHours(d.getHours() - n);
    return d;
  };
  const minutesAgo = (n) => {
    const d = new Date(now);
    d.setMinutes(d.getMinutes() - n);
    return d;
  };

  // Create orders in various states
  // Today's orders
  await createOrderWithHistory({
    tableNumber: 1, waiterId: waiter1.id, status: 'PLACED',
    placedAt: minutesAgo(5),
    lines: [
      { itemName: 'Margherita Pizza', quantity: 2 },
      { itemName: 'Lemonade', quantity: 2 },
    ],
  });

  await createOrderWithHistory({
    tableNumber: 3, waiterId: waiter1.id, status: 'ACCEPTED',
    placedAt: minutesAgo(20),
    lines: [
      { itemName: 'Caesar Salad', quantity: 1 },
      { itemName: 'Pasta Carbonara', quantity: 1, special: 'Extra parmesan' },
      { itemName: 'Espresso', quantity: 2 },
    ],
    collaboratorIds: [waiter2.id],
  });

  await createOrderWithHistory({
    tableNumber: 5, waiterId: waiter2.id, status: 'PREPARING',
    placedAt: minutesAgo(35),
    lines: [
      { itemName: 'Grilled Salmon', quantity: 1, special: 'No dill' },
      { itemName: 'Mushroom Risotto', quantity: 1 },
      { itemName: 'Garlic Bread', quantity: 1 },
    ],
  });

  await createOrderWithHistory({
    tableNumber: 7, waiterId: waiter3.id, status: 'READY',
    placedAt: minutesAgo(45),
    lines: [
      { itemName: 'Chicken Parmesan', quantity: 2 },
      { itemName: 'Caprese Salad', quantity: 1 },
      { itemName: 'Lemonade', quantity: 3 },
    ],
  });

  await createOrderWithHistory({
    tableNumber: 2, waiterId: waiter1.id, status: 'SERVED',
    placedAt: hoursAgo(2),
    lines: [
      { itemName: 'Pepperoni Pizza', quantity: 1 },
      { itemName: 'Bruschetta', quantity: 1 },
      { itemName: 'Tiramisu', quantity: 1 },
    ],
  });

  await createOrderWithHistory({
    tableNumber: 4, waiterId: waiter2.id, status: 'SERVED',
    placedAt: hoursAgo(3),
    lines: [
      { itemName: 'Beef Lasagna', quantity: 2 },
      { itemName: 'Minestrone Soup', quantity: 2 },
      { itemName: 'Espresso', quantity: 2 },
    ],
  });

  // An order with a voided line
  await createOrderWithHistory({
    tableNumber: 6, waiterId: waiter3.id, status: 'PREPARING',
    placedAt: minutesAgo(30),
    lines: [
      { itemName: 'Margherita Pizza', quantity: 1 },
      { itemName: 'Caesar Salad', quantity: 1, isVoid: true, voidReason: 'Customer changed mind' },
      { itemName: 'Pasta Carbonara', quantity: 1 },
    ],
    collaboratorIds: [waiter1.id],
  });

  // A slow order (placed 25 minutes ago, should trigger alert)
  await createOrderWithHistory({
    tableNumber: 8, waiterId: waiter1.id, status: 'PLACED',
    placedAt: minutesAgo(25),
    lines: [
      { itemName: 'Grilled Salmon', quantity: 2 },
      { itemName: 'Mushroom Risotto', quantity: 1 },
    ],
  });

  // Past days' orders for the 14-day chart
  for (let day = 1; day <= 13; day++) {
    const numOrders = Math.floor(Math.random() * 5) + 2;
    for (let j = 0; j < numOrders; j++) {
      const randomItem = menuItems[Math.floor(Math.random() * (menuItems.length - 1))];
      await createOrderWithHistory({
        tableNumber: (j % 10) + 1,
        waiterId: [waiter1.id, waiter2.id, waiter3.id][j % 3],
        status: 'SERVED',
        placedAt: daysAgo(day),
        lines: [
          { itemName: randomItem.name, quantity: Math.floor(Math.random() * 3) + 1 },
        ],
      });
    }
  }

  console.log('Orders created');
  console.log('\nSeed complete!');
  console.log('\nDemo credentials:');
  console.log('Manager: manager@restaurant.com / password123');
  console.log('Waiter:  waiter1@restaurant.com / password123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
