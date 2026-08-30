import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, dashboardController.getStats);
router.get('/by-status', authenticate, dashboardController.getByStatus);
router.get('/by-waiter', authenticate, dashboardController.getByWaiter);
router.get('/served-per-day', authenticate, dashboardController.getServedPerDay);

export default router;
