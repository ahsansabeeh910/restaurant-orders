import * as orderService from '../services/order.service.js';
import { ordersToCSV } from '../utils/csvExport.js';

export const create = async (req, res, next) => {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const result = await orderService.getOrders({
      userId: req.user.id,
      userRole: req.user.role,
      search: req.query.search,
      status: req.query.status,
      waiterId: req.query.waiterId,
      date: req.query.date,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      page: req.query.page,
      limit: req.query.limit,
      includeArchived: req.query.includeArchived === 'true',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const order = await orderService.updateOrderStatus(req.params.id, status, req.user.id, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const archive = async (req, res, next) => {
  try {
    const order = await orderService.archiveOrder(req.params.id);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const addLines = async (req, res, next) => {
  try {
    const { lines } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Lines array is required' });
    }
    const order = await orderService.addOrderLines(req.params.id, lines, req.user.id, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const voidLine = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await orderService.voidOrderLine(
      req.params.id, req.params.lineId, reason, req.user.id, req.user.role
    );
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const addCollaborator = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const order = await orderService.addCollaborator(req.params.id, userId, req.user.id, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const order = await orderService.addNote(req.params.id, note, req.user.id, req.user.role);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const exportCSV = async (req, res, next) => {
  try {
    const orders = await orderService.exportOrdersCSV(req.query.date);
    const csv = ordersToCSV(orders);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${req.query.date || new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
