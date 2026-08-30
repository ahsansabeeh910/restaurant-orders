import * as menuItemService from '../services/menuItem.service.js';

export const getAll = async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const items = await menuItemService.getMenuItems({ includeArchived });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const item = await menuItemService.createMenuItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const item = await menuItemService.updateMenuItem(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const archive = async (req, res, next) => {
  try {
    const item = await menuItemService.archiveMenuItem(req.params.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdate = async (req, res, next) => {
  try {
    const { itemIds, price, isAvailable } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array is required' });
    }
    const results = await menuItemService.bulkUpdateMenuItems(itemIds, { price, isAvailable });
    res.json({ results });
  } catch (error) {
    next(error);
  }
};
