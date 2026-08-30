import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.get('/export/csv', authenticate, requireRole('MANAGER'), orderController.exportCSV);
router.get('/', authenticate, orderController.getAll);
router.post('/', authenticate, orderController.create);
router.get('/:id', authenticate, orderController.getById);
router.patch('/:id/status', authenticate, orderController.updateStatus);
router.patch('/:id/archive', authenticate, requireRole('MANAGER'), orderController.archive);
router.post('/:id/lines', authenticate, orderController.addLines);
router.patch('/:id/lines/:lineId/void', authenticate, orderController.voidLine);
router.post('/:id/collaborators', authenticate, orderController.addCollaborator);
router.post('/:id/notes', authenticate, orderController.addNote);

export default router;
