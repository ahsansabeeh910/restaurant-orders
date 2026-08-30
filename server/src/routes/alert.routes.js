import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, alertController.getAll);
router.get('/count', authenticate, alertController.getCount);
router.patch('/:id/acknowledge', authenticate, alertController.acknowledge);

export default router;
