import { useState, useEffect } from 'react';
import api from '../api/client';
import { Plus, Pencil, Archive, ArchiveRestore, Check, X } from 'lucide-react';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', price: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkAvailability, setBulkAvailability] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const { data } = await api.get(`/menu-items?includeArchived=${showArchived}`);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [showArchived]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        await api.put(`/menu-items/${editItem.id}`, form);
      } else {
        await api.post('/menu-items', form);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ name: '', price: '' });
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleArchive = async (id) => {
    await api.patch(`/menu-items/${id}/archive`);
    fetchItems();
  };

  const handleToggleAvailability = async (item) => {
    await api.put(`/menu-items/${item.id}`, { isAvailable: !item.isAvailable });
    fetchItems();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.filter(i => !i.isArchived).length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.filter(i => !i.isArchived).map(i => i.id));
    }
  };

  const handleBulkUpdate = async () => {
    setBulkResults(null);
    const payload = { itemIds: selectedIds };
    if (bulkPrice) payload.price = parseFloat(bulkPrice);
    if (bulkAvailability !== '') payload.isAvailable = bulkAvailability === 'true';
    try {
      const { data } = await api.patch('/menu-items/bulk', payload);
      setBulkResults(data.results);
      setSelectedIds([]);
      setBulkPrice('');
      setBulkAvailability('');
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk update failed');
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, price: item.price });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', price: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Menu Management</h1>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded accent-amber-500"
            />
            Show archived
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
          <p className="text-sm font-medium text-indigo-400 mb-3">
            {selectedIds.length} item(s) selected — Bulk Update
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">New Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm w-28 placeholder-gray-500"
                placeholder="e.g. 12.99"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Availability</label>
              <select
                value={bulkAvailability}
                onChange={(e) => setBulkAvailability(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">No change</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
            <button
              onClick={handleBulkUpdate}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-gray-400 px-3 py-1.5 text-sm hover:text-gray-200"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Bulk results */}
      {bulkResults && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-2">Bulk Update Results</h3>
          <div className="space-y-1">
            {bulkResults.map((r, i) => (
              <div key={i} className={`text-sm flex items-center gap-2 ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                {r.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {r.name || r.id}: {r.success ? 'Updated' : r.error}
              </div>
            ))}
          </div>
          <button onClick={() => setBulkResults(null)} className="text-xs text-gray-500 mt-2 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === items.filter(i => !i.isArchived).length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded accent-amber-500"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Available</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((item) => (
              <tr key={item.id} className={`${item.isArchived ? 'opacity-50' : ''} hover:bg-white/5 transition`}>
                <td className="px-4 py-3">
                  {!item.isArchived && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded accent-amber-500"
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                <td className="px-4 py-3 text-gray-300">${Number(item.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => !item.isArchived && handleToggleAvailability(item)}
                    disabled={item.isArchived}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.isAvailable
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {!item.isArchived && (
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1 text-gray-500 hover:text-amber-400"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="p-1 text-gray-500 hover:text-orange-400"
                      title={item.isArchived ? 'Restore' : 'Archive'}
                    >
                      {item.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">No menu items found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121a] backdrop-blur-2xl border border-white/10 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-white mb-4">{editItem ? 'Edit' : 'Add'} Menu Item</h2>
            {error && <div className="mb-3 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none placeholder-gray-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="px-4 py-2 text-sm text-gray-400 hover:bg-white/5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  {editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
