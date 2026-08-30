import * as dashboardService from '../services/dashboard.service.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getByStatus = async (req, res, next) => {
  try {
    const data = await dashboardService.getByStatus();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getByWaiter = async (req, res, next) => {
  try {
    const data = await dashboardService.getByWaiter();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getServedPerDay = async (req, res, next) => {
  try {
    const data = await dashboardService.getServedPerDay();
    res.json(data);
  } catch (error) {
    next(error);
  }
};
