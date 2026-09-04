import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const STATUS_COLORS = {
  PLACED: 'bg-yellow-500/10 text-yellow-400',
  ACCEPTED: 'bg-blue-500/10 text-blue-400',
  PREPARING: 'bg-orange-500/10 text-orange-400',
  READY: 'bg-green-500/10 text-green-400',
  SERVED: 'bg-gray-500/10 text-gray-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
};

const OrderList = () => {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('placedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [newOrder, setNewOrder] = useState({ tableNumber: '', lines: [{ menuItemId: '', quantity: 1, specialInstructions: '' }] });
  const [createError, setCreateError] = useState('');

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', '10');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, sortBy, sortOrder]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const fetchMenuItems = async () => {
    const { data } = await api.get('/menu-items');
    setMenuItems(data.filter(i => i.isAvailable && !i.isArchived));
  };

  const openCreateModal = () => {
    fetchMenuItems();
    setShowCreateModal(true);
    setCreateError('');
  };

  const addLine = () => {
    setNewOrder(prev => ({
      ...prev,
      lines: [...prev.lines, { menuItemId: '', quantity: 1, specialInstructions: '' }],
    }));
  };

  const removeLine = (idx) => {
    setNewOrder(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const updateLine = (idx, field, value) => {
    setNewOrder(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      const payload = {
        tableNumber: parseInt(newOrder.tableNumber),
        lines: newOrder.lines.filter(l => l.menuItemId).map(l => ({
          menuItemId: l.menuItemId,
          quantity: parseInt(l.quantity) || 1,
          specialInstructions: l.specialInstructions || undefined,
        })),
      };
      const { data } = await api.post('/orders', payload);
      setShowCreateModal(false);
      setNewOrder({ tableNumber: '', lines: [{ menuItemId: '', quantity: 1, specialInstructions: '' }] });
      navigate(`/orders/${data.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create order');
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data } = await api.get('/orders/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <div className="flex gap-3">
          {isManager && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table #..."
              className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm w-40 placeholder-gray-500"
            />
          </div>
          <button type="submit" className="bg-white/5 border border-white/10 text-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-white/10">Search</button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="placedAt">Sort by Time</option>
          <option value="tableNumber">Sort by Table</option>
          <option value="status">Sort by Status</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Table</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Waiter</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Items</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="hover:bg-white/5 cursor-pointer transition"
              >
                <td className="px-4 py-3 font-medium text-white">#{order.tableNumber}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{order.primaryWaiter?.name}</td>
                <td className="px-4 py-3 text-gray-300">{order.lines?.length || 0}</td>
                <td className="px-4 py-3 font-medium text-white">${Number(order.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(order.placedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">No orders found</div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} – {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/5 text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/5 text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create order modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121a] backdrop-blur-2xl border border-white/10 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">New Order</h2>
            {createError && <div className="mb-3 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{createError}</div>}
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Table Number</label>
                <input
                  type="number"
                  min="1"
                  value={newOrder.tableNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, tableNumber: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Order Lines</label>
                  <button type="button" onClick={addLine} className="text-xs text-amber-400 hover:underline">+ Add line</button>
                </div>
                {newOrder.lines.map((line, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 mb-2 items-start">
                    <select
                      value={line.menuItemId}
                      onChange={(e) => updateLine(idx, 'menuItemId', e.target.value)}
                      className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-sm flex-1"
                      required
                    >
                      <option value="">Select item...</option>
                      {menuItems.map(mi => (
                        <option key={mi.id} value={mi.id}>{mi.name} (${Number(mi.price).toFixed(2)})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-sm w-16"
                    />
                    <input
                      type="text"
                      value={line.specialInstructions}
                      onChange={(e) => updateLine(idx, 'specialInstructions', e.target.value)}
                      placeholder="Notes"
                      className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-sm flex-1 placeholder-gray-500"
                    />
                    {newOrder.lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-400 text-sm px-1">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:bg-white/5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
