import { prisma } from '../config/db.js';
import { canTransition, getTransitionError, canAddLines, canVoidLine } from '../utils/orderLifecycle.js';
import { getIo } from '../config/socket.js';

const ORDER_INCLUDE = {
  primaryWaiter: { select: { id: true, name: true, email: true } },
  collaborators: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  lines: {
    include: { menuItem: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
};

const canUserAccessOrder = (order, userId, userRole) => {
  if (userRole === 'MANAGER' || userRole === 'KITCHEN') return true;
  if (order.primaryWaiterId === userId) return true;
  if (order.collaborators?.some(c => c.userId === userId)) return true;
  return false;
};

export const createOrder = async ({ tableNumber, lines, userId }) => {
  if (!tableNumber || tableNumber < 1) {
    throw Object.assign(new Error('Valid table number is required'), { status: 400 });
  }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    throw Object.assign(new Error('At least one order line is required'), { status: 400 });
  }

  // Validate all menu items exist and are available
  const menuItemIds = lines.map(l => l.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isArchived: false },
  });

  const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));
  for (const line of lines) {
    const mi = menuItemMap.get(line.menuItemId);
    if (!mi) {
      throw Object.assign(new Error(`Menu item ${line.menuItemId} not found or archived`), { status: 400 });
    }
    if (!mi.isAvailable) {
      throw Object.assign(new Error(`Menu item "${mi.name}" is currently unavailable`), { status: 400 });
    }
    if (!line.quantity || line.quantity < 1) {
      throw Object.assign(new Error('Quantity must be at least 1'), { status: 400 });
    }
  }

  // Calculate total
  let total = 0;
  const orderLines = lines.map(line => {
    const mi = menuItemMap.get(line.menuItemId);
    const unitPrice = Number(mi.price);
    total += unitPrice * line.quantity;
    return {
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      specialInstructions: line.specialInstructions || null,
      unitPrice,
    };
  });

  const order = await prisma.order.create({
    data: {
      tableNumber,
      primaryWaiterId: userId,
      total,
      lines: { create: orderLines },
      history: {
        create: {
          performedBy: userId,
          action: 'STATUS_CHANGE',
          oldValue: null,
          newValue: 'PLACED',
          details: `Order placed for table ${tableNumber}`,
        },
      },
    },
    include: ORDER_INCLUDE,
  });

  getIo().to('kitchen_display').emit('order_created', order);

  return order;
};

export const getOrders = async ({ userId, userRole, search, status, waiterId, date, sortBy, sortOrder, page, limit, includeArchived }) => {
  const where = {};

  // Archived filter
  if (!includeArchived) {
    where.isArchived = false;
  }

  // Role-based filtering: waiters only see their own orders (primary or collaborator)
  if (userRole === 'WAITER') {
    where.OR = [
      { primaryWaiterId: userId },
      { collaborators: { some: { userId } } },
    ];
  }

  // Text search on table number
  if (search) {
    where.tableNumber = { equals: parseInt(search) || -1 };
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Waiter filter
  if (waiterId) {
    where.primaryWaiterId = waiterId;
  }

  // Date filter
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.placedAt = { gte: start, lte: end };
  }

  // Sorting
  const orderBy = {};
  const sortField = sortBy || 'placedAt';
  const sortDir = sortOrder || 'desc';
  if (sortField === 'tableNumber') orderBy.tableNumber = sortDir;
  else if (sortField === 'status') orderBy.status = sortDir;
  else orderBy.placedAt = sortDir;

  // Pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy,
      skip,
      take: limitNum,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    },
  };
};

export const getOrderById = async (id, userId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      ...ORDER_INCLUDE,
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!canUserAccessOrder(order, userId, userRole)) {
    throw Object.assign(new Error('You do not have access to this order'), { status: 403 });
  }

  return order;
};

export const updateOrderStatus = async (id, newStatus, userId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { collaborators: true },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!canUserAccessOrder(order, userId, userRole)) {
    throw Object.assign(new Error('You do not have access to this order'), { status: 403 });
  }

  if (!canTransition(order.status, newStatus)) {
    throw Object.assign(new Error(getTransitionError(order.status, newStatus)), { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: newStatus,
      history: {
        create: {
          performedBy: userId,
          action: 'STATUS_CHANGE',
          oldValue: order.status,
          newValue: newStatus,
          details: `Status changed from ${order.status} to ${newStatus}`,
        },
      },
    },
    include: ORDER_INCLUDE,
  });

  getIo().to('kitchen_display').emit('order_updated', updated);

  return updated;
};

export const archiveOrder = async (id) => {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  return prisma.order.update({
    where: { id },
    data: { isArchived: !order.isArchived },
    include: ORDER_INCLUDE,
  });
};

export const addOrderLines = async (orderId, lines, userId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { collaborators: true, lines: true },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!canUserAccessOrder(order, userId, userRole)) {
    throw Object.assign(new Error('You do not have access to this order'), { status: 403 });
  }

  if (!canAddLines(order.status)) {
    throw Object.assign(new Error(`Cannot add lines to an order that is ${order.status}`), { status: 400 });
  }

  // Validate menu items
  const menuItemIds = lines.map(l => l.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isArchived: false },
  });
  const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));

  let additionalTotal = 0;
  const newLines = [];
  const historyEntries = [];

  for (const line of lines) {
    const mi = menuItemMap.get(line.menuItemId);
    if (!mi) {
      throw Object.assign(new Error(`Menu item ${line.menuItemId} not found or archived`), { status: 400 });
    }
    if (!mi.isAvailable) {
      throw Object.assign(new Error(`Menu item "${mi.name}" is currently unavailable`), { status: 400 });
    }
    const unitPrice = Number(mi.price);
    additionalTotal += unitPrice * (line.quantity || 1);
    newLines.push({
      menuItemId: line.menuItemId,
      quantity: line.quantity || 1,
      specialInstructions: line.specialInstructions || null,
      unitPrice,
    });
    historyEntries.push({
      performedBy: userId,
      action: 'LINE_ADDED',
      newValue: `${mi.name} x${line.quantity || 1}`,
      details: line.specialInstructions || null,
    });
  }

  const currentTotal = Number(order.total);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      total: currentTotal + additionalTotal,
      lines: { create: newLines },
      history: { create: historyEntries },
    },
    include: ORDER_INCLUDE,
  });

  getIo().to('kitchen_display').emit('order_updated', updated);

  return updated;
};

export const voidOrderLine = async (orderId, lineId, reason, userId, userRole) => {
  if (!reason || reason.trim() === '') {
    throw Object.assign(new Error('Void reason is required'), { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { collaborators: true, lines: { include: { menuItem: true } } },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!canUserAccessOrder(order, userId, userRole)) {
    throw Object.assign(new Error('You do not have access to this order'), { status: 403 });
  }

  if (!canVoidLine(order.status)) {
    throw Object.assign(new Error(`Cannot void lines on an order that is ${order.status}`), { status: 400 });
  }

  const line = order.lines.find(l => l.id === lineId);
  if (!line) {
    throw Object.assign(new Error('Order line not found'), { status: 404 });
  }
  if (line.isVoid) {
    throw Object.assign(new Error('This line is already voided'), { status: 400 });
  }

  // Void the line and adjust total
  const lineTotal = Number(line.unitPrice) * line.quantity;
  const currentTotal = Number(order.total);

  await prisma.$transaction([
    prisma.orderLine.update({
      where: { id: lineId },
      data: { isVoid: true, voidReason: reason.trim() },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { total: Math.max(0, currentTotal - lineTotal) },
    }),
    prisma.orderHistory.create({
      data: {
        orderId,
        performedBy: userId,
        action: 'LINE_VOIDED',
        oldValue: `${line.menuItem.name} x${line.quantity}`,
        newValue: 'VOID',
        details: reason.trim(),
      },
    }),
  ]);

  const updatedOrder = await getOrderById(orderId, userId, userRole);
  getIo().to('kitchen_display').emit('order_updated', updatedOrder);
  return updatedOrder;
};

export const addCollaborator = async (orderId, collaboratorId, userId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { collaborators: true },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  // Only primary waiter or manager can add collaborators
  if (userRole !== 'MANAGER' && order.primaryWaiterId !== userId) {
    throw Object.assign(new Error('Only the primary waiter or a manager can add collaborators'), { status: 403 });
  }

  // Check if already a collaborator
  if (order.collaborators.some(c => c.userId === collaboratorId)) {
    throw Object.assign(new Error('User is already a collaborator on this order'), { status: 400 });
  }

  if (order.primaryWaiterId === collaboratorId) {
    throw Object.assign(new Error('Cannot add the primary waiter as a collaborator'), { status: 400 });
  }

  // Verify the collaborator exists and is a waiter
  const collaborator = await prisma.user.findUnique({ where: { id: collaboratorId } });
  if (!collaborator) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  await prisma.$transaction([
    prisma.orderCollaborator.create({
      data: { orderId, userId: collaboratorId },
    }),
    prisma.orderHistory.create({
      data: {
        orderId,
        performedBy: userId,
        action: 'COLLABORATOR_ADDED',
        newValue: collaborator.name,
        details: `${collaborator.name} added as collaborator`,
      },
    }),
  ]);

  return getOrderById(orderId, userId, userRole);
};

export const addNote = async (orderId, note, userId, userRole) => {
  if (!note || note.trim() === '') {
    throw Object.assign(new Error('Note content is required'), { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { collaborators: true },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!canUserAccessOrder(order, userId, userRole)) {
    throw Object.assign(new Error('You do not have access to this order'), { status: 403 });
  }

  await prisma.orderHistory.create({
    data: {
      orderId,
      performedBy: userId,
      action: 'NOTE_ADDED',
      details: note.trim(),
    },
  });

  return getOrderById(orderId, userId, userRole);
};

export const exportOrdersCSV = async (dateStr) => {
  const start = new Date(dateStr || new Date().toISOString().split('T')[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: start, lte: end } },
    include: {
      primaryWaiter: { select: { name: true } },
      lines: { include: { menuItem: { select: { name: true } } } },
    },
    orderBy: { placedAt: 'asc' },
  });

  return orders;
};
