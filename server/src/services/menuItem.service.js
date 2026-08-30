import { prisma } from '../config/db.js';

export const getMenuItems = async ({ includeArchived = false } = {}) => {
  const where = includeArchived ? {} : { isArchived: false };
  return prisma.menuItem.findMany({
    where,
    orderBy: { name: 'asc' },
  });
};

export const createMenuItem = async ({ name, price }) => {
  if (!name || name.trim() === '') {
    throw Object.assign(new Error('Name is required'), { status: 400 });
  }
  if (price === undefined || price === null || Number(price) <= 0) {
    throw Object.assign(new Error('Price must be greater than 0'), { status: 400 });
  }
  return prisma.menuItem.create({
    data: { name: name.trim(), price: Number(price) },
  });
};

export const updateMenuItem = async (id, { name, price, isAvailable }) => {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) {
    throw Object.assign(new Error('Menu item not found'), { status: 404 });
  }
  if (item.isArchived) {
    throw Object.assign(new Error('Cannot update an archived menu item'), { status: 400 });
  }
  const data = {};
  if (name !== undefined) {
    if (name.trim() === '') throw Object.assign(new Error('Name cannot be empty'), { status: 400 });
    data.name = name.trim();
  }
  if (price !== undefined) {
    if (Number(price) <= 0) throw Object.assign(new Error('Price must be greater than 0'), { status: 400 });
    data.price = Number(price);
  }
  if (isAvailable !== undefined) {
    data.isAvailable = Boolean(isAvailable);
  }
  return prisma.menuItem.update({ where: { id }, data });
};

export const archiveMenuItem = async (id) => {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) {
    throw Object.assign(new Error('Menu item not found'), { status: 404 });
  }
  return prisma.menuItem.update({
    where: { id },
    data: { isArchived: !item.isArchived },
  });
};

export const bulkUpdateMenuItems = async (itemIds, { price, isAvailable }) => {
  const results = [];
  for (const itemId of itemIds) {
    try {
      const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
      if (!item) {
        results.push({ id: itemId, success: false, error: 'Menu item not found' });
        continue;
      }
      if (item.isArchived) {
        results.push({ id: itemId, success: false, error: 'Cannot update an archived menu item' });
        continue;
      }
      const data = {};
      if (price !== undefined) {
        if (Number(price) <= 0) {
          results.push({ id: itemId, name: item.name, success: false, error: 'Price must be greater than 0' });
          continue;
        }
        data.price = Number(price);
      }
      if (isAvailable !== undefined) {
        data.isAvailable = Boolean(isAvailable);
      }
      const updated = await prisma.menuItem.update({ where: { id: itemId }, data });
      results.push({ id: itemId, name: updated.name, success: true, item: updated });
    } catch (error) {
      results.push({ id: itemId, success: false, error: error.message });
    }
  }
  return results;
};
