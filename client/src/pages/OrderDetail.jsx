import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, UserPlus, MessageSquare, Ban, Archive, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  PLACED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
  PREPARING: 'bg-orange-100 text-orange-800 border-orange-300',
  READY: 'bg-green-100 text-green-800 border-green-300',
  SERVED: 'bg-gray-100 text-gray-800 border-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

const NEXT_STATUS = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
};

const STATUS_BUTTON_COLORS = {
  ACCEPTED: 'bg-blue-600 hover:bg-blue-700 text-white',
  PREPARING: 'bg-orange-600 hover:bg-orange-700 text-white',
  READY: 'bg-green-600 hover:bg-green-700 text-white',
  SERVED: 'bg-gray-600 hover:bg-gray-700 text-white',
  CANCELLED: 'bg-red-600 hover:bg-red-700 text-white',
};

const HISTORY_ICONS = {
  STATUS_CHANGE: '🔄',
  LINE_ADDED: '➕',
  LINE_VOIDED: '🚫',
  NOTE_ADDED: '📝',
  COLLABORATOR_ADDED: '👤',
  ORDER_ARCHIVED: '📦',
  ORDER_RESTORED: '📤',
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Add line state
  const [showAddLine, setShowAddLine] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [newLine, setNewLine] = useState({ menuItemId: '', quantity: 1, specialInstructions: '' });

  // Void line state
  const [voidLineId, setVoidLineId] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  // Collaborator state
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState('');

  // Note state
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setActionError('');
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed to update status');
    }
  };

  const handleArchive = async () => {
    try {
      await api.patch(`/orders/${id}/archive`);
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed');
    }
  };

  const handleAddLine = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/orders/${id}/lines`, {
        lines: [{
          menuItemId: newLine.menuItemId,
          quantity: parseInt(newLine.quantity) || 1,
          specialInstructions: newLine.specialInstructions || undefined,
        }],
      });
      setShowAddLine(false);
      setNewLine({ menuItemId: '', quantity: 1, specialInstructions: '' });
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed to add line');
    }
  };

  const handleVoidLine = async (lineId) => {
    setActionError('');
    try {
      await api.patch(`/orders/${id}/lines/${lineId}/void`, { reason: voidReason });
      setVoidLineId(null);
      setVoidReason('');
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed to void line');
    }
  };

  const handleAddCollaborator = async () => {
    setActionError('');
    try {
      await api.post(`/orders/${id}/collaborators`, { userId: selectedWaiter });
      setShowAddCollaborator(false);
      setSelectedWaiter('');
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed');
    }
  };

  const handleAddNote = async () => {
    setActionError('');
    try {
      await api.post(`/orders/${id}/notes`, { note: noteText });
      setShowAddNote(false);
      setNoteText('');
      fetchOrder();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed');
    }
  };

  const openAddLine = () => {
    api.get('/menu-items').then(({ data }) => {
      setMenuItems(data.filter(i => i.isAvailable && !i.isArchived));
    });
    setShowAddLine(true);
  };

  const openAddCollaborator = () => {
    api.get('/auth/waiters').then(({ data }) => setWaiters(data));
    setShowAddCollaborator(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate('/orders')} className="text-indigo-600 hover:underline">← Back to Orders</button>
      </div>
    );
  }

  const isOpen = !['SERVED', 'CANCELLED'].includes(order.status);
  const nextStatuses = NEXT_STATUS[order.status] || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Table #{order.tableNumber}</h1>
          <p className="text-sm text-gray-500">Order {order.id.slice(0, 8)}... • Placed {format(new Date(order.placedAt), 'PPp')}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {/* Actions */}
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${STATUS_BUTTON_COLORS[s]}`}
            >
              {s === 'CANCELLED' ? 'Cancel Order' : `Mark ${s.charAt(0) + s.slice(1).toLowerCase()}`}
            </button>
          ))}
          {isOpen && (
            <>
              <button onClick={openAddLine} className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Plus className="h-4 w-4" /> Add Item
              </button>
              <button onClick={openAddCollaborator} className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <UserPlus className="h-4 w-4" /> Add Waiter
              </button>
            </>
          )}
          <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <MessageSquare className="h-4 w-4" /> Add Note
          </button>
          {isManager && (
            <button onClick={handleArchive} className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              {order.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {order.isArchived ? 'Restore' : 'Archive'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order lines */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Order Lines</h2>
            </div>
            <div className="divide-y">
              {order.lines?.map((line) => (
                <div key={line.id} className={`px-5 py-3 ${line.isVoid ? 'opacity-50 bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium text-gray-900 ${line.isVoid ? 'line-through' : ''}`}>
                        {line.menuItem?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {line.quantity} × ${Number(line.unitPrice).toFixed(2)}
                        {line.specialInstructions && ` • ${line.specialInstructions}`}
                      </p>
                      {line.isVoid && (
                        <p className="text-xs text-red-600 mt-1">VOID: {line.voidReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${line.isVoid ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        ${(Number(line.unitPrice) * line.quantity).toFixed(2)}
                      </span>
                      {!line.isVoid && isOpen && (
                        <>
                          {voidLineId === line.id ? (
                            <div className="flex gap-1 items-center">
                              <input
                                type="text"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="Void reason..."
                                className="border rounded px-2 py-1 text-xs w-32"
                              />
                              <button
                                onClick={() => handleVoidLine(line.id)}
                                className="text-red-600 text-xs font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setVoidLineId(null); setVoidReason(''); }}
                                className="text-gray-500 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setVoidLineId(line.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Void this line"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t bg-gray-50 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-lg text-gray-900">${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Collaborators */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Team</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                {order.primaryWaiter?.name} (Primary)
              </span>
              {order.collaborators?.map((c) => (
                <span key={c.user.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {c.user.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            {order.history?.map((h) => (
              <div key={h.id} className="flex gap-3">
                <span className="text-lg mt-0.5">{HISTORY_ICONS[h.action] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{h.details || `${h.action}: ${h.oldValue || ''} → ${h.newValue || ''}`}</p>
                  <p className="text-xs text-gray-500">
                    {h.user?.name} • {format(new Date(h.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add line modal */}
      {showAddLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">Add Item to Order</h2>
            <form onSubmit={handleAddLine} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Menu Item</label>
                <select
                  value={newLine.menuItemId}
                  onChange={(e) => setNewLine({ ...newLine, menuItemId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select item...</option>
                  {menuItems.map(mi => (
                    <option key={mi.id} value={mi.id}>{mi.name} (${Number(mi.price).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newLine.quantity}
                  onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Special Instructions</label>
                <input
                  type="text"
                  value={newLine.specialInstructions}
                  onChange={(e) => setNewLine({ ...newLine, specialInstructions: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. No onions"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddLine(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add collaborator modal */}
      {showAddCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">Add Collaborator</h2>
            <select
              value={selectedWaiter}
              onChange={(e) => setSelectedWaiter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">Select waiter...</option>
              {waiters.filter(w => w.id !== order.primaryWaiterId && !order.collaborators?.some(c => c.user.id === w.id)).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddCollaborator(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddCollaborator} disabled={!selectedWaiter} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add note modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">Add Note</h2>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              rows={3}
              placeholder="Type your note..."
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddNote(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteText.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
