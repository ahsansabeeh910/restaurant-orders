import * as alertService from '../services/alert.service.js';

export const getAll = async (req, res, next) => {
  try {
    const alerts = await alertService.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

export const getCount = async (req, res, next) => {
  try {
    const count = await alertService.getAlertCount();
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

export const acknowledge = async (req, res, next) => {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id, req.user.id);
    res.json(alert);
  } catch (error) {
    next(error);
  }
};
