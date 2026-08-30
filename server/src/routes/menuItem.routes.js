import { Router } from 'express';
import { getAll, create, update, archive, bulkUpdate } from '../controllers/menuItem.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireRole('MANAGER'), create);
router.put('/:id', authenticate, requireRole('MANAGER'), update);
router.patch('/:id/archive', authenticate, requireRole('MANAGER'), archive);
router.patch('/bulk', authenticate, requireRole('MANAGER'), bulkUpdate);

export default router;
