import { useState, useEffect } from 'react';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingBag, Clock, CheckCircle, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byWaiter, setByWaiter] = useState([]);
  const [servedPerDay, setServedPerDay] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, statusRes, waiterRes, chartRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/by-status'),
          api.get('/dashboard/by-waiter'),
          api.get('/dashboard/served-per-day'),
        ]);
        setStats(statsRes.data);
        setByStatus(statusRes.data);
        setByWaiter(waiterRes.data);
        setServedPerDay(chartRes.data);
      } catch (e) {
        console.error('Dashboard error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const statCards = [
    { label: 'Open Orders', value: stats?.openOrders || 0, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Placed Today', value: stats?.placedToday || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Served Today', value: stats?.servedToday || 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Revenue Today', value: `$${(stats?.revenueToday || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-purple-500' },
  ];

  const statusColors = {
    PLACED: 'bg-yellow-500/10 text-yellow-400',
    ACCEPTED: 'bg-blue-500/10 text-blue-400',
    PREPARING: 'bg-orange-500/10 text-orange-400',
    READY: 'bg-green-500/10 text-green-400',
    SERVED: 'bg-gray-500/10 text-gray-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`${card.color}/20 p-3 rounded-lg`}>
                <card.icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Orders by Status</h2>
          <div className="space-y-3">
            {byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-white/5'}`}>
                  {item.status}
                </span>
                <span className="text-lg font-semibold text-white">{item.count}</span>
              </div>
            ))}
            {byStatus.length === 0 && <p className="text-gray-500 text-sm">No orders yet</p>}
          </div>
        </div>

        {/* Orders by waiter */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Orders by Waiter</h2>
          <div className="space-y-3">
            {byWaiter.map((item) => (
              <div key={item.waiterId} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{item.waiterName}</span>
                <span className="text-lg font-semibold text-white">{item.count}</span>
              </div>
            ))}
            {byWaiter.length === 0 && <p className="text-gray-500 text-sm">No orders yet</p>}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Orders Served — Last 14 Days</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={servedPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => val.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
