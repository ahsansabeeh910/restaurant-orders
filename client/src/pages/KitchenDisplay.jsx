import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import client from '../api/client';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await client.get('/orders?includeArchived=false&limit=50');
        const activeOrders = data.orders.filter(
          o => ['ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
        );
        setOrders(activeOrders);
      } catch (err) {
        console.error('Failed to fetch kitchen orders', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socket.on('connect', () => { socket.emit('join_kitchen'); });
    socket.on('order_created', (newOrder) => {
      if (['ACCEPTED', 'PREPARING', 'READY'].includes(newOrder.status)) {
        setOrders(prev => [newOrder, ...prev]);
      }
    });
    socket.on('order_updated', (updatedOrder) => {
      setOrders(prev => {
        if (!['ACCEPTED', 'PREPARING', 'READY'].includes(updatedOrder.status)) {
          return prev.filter(o => o.id !== updatedOrder.id);
        }
        const exists = prev.some(o => o.id === updatedOrder.id);
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        } else {
          return [updatedOrder, ...prev].sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
        }
      });
    });
    return () => socket.disconnect();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      await client.patch(`/orders/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const getOrdersByStatus = (status) => orders.filter(o => o.status === status).sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));

  if (loading) return <div className="p-8 text-gray-400">Loading Kitchen Display...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-8 p-4 overflow-hidden">
      <div className="mb-4 flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <ChefHat className="w-8 h-8 text-amber-400" />
          Kitchen Display
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live Updates Active
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        <Column
          title="Accepted (Queue)"
          orders={getOrdersByStatus('ACCEPTED')}
          icon={Clock}
          color="bg-yellow-500/5"
          headerColor="bg-yellow-500/10 text-yellow-400 border-b border-yellow-500/20"
          onAction={(id) => updateStatus(id, 'PREPARING')}
          actionText="Start Preparing"
        />
        <Column
          title="Preparing"
          orders={getOrdersByStatus('PREPARING')}
          icon={ChefHat}
          color="bg-orange-500/5"
          headerColor="bg-orange-500/10 text-orange-400 border-b border-orange-500/20"
          onAction={(id) => updateStatus(id, 'READY')}
          actionText="Mark Ready"
        />
        <Column
          title="Ready for Pickup"
          orders={getOrdersByStatus('READY')}
          icon={CheckCircle2}
          color="bg-green-500/5"
          headerColor="bg-green-500/10 text-green-400 border-b border-green-500/20"
        />
      </div>
    </div>
  );
}

function Column({ title, orders, icon: Icon, color, headerColor, onAction, actionText }) {
  return (
    <div className={clsx('flex flex-col min-w-[350px] max-w-sm rounded-xl border border-white/10 overflow-hidden backdrop-blur-xl', color)}>
      <div className={clsx('px-4 py-3 font-semibold flex justify-between items-center', headerColor)}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </div>
        <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No orders in this state
          </div>
        )}
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onAction={onAction ? () => onAction(order.id) : null}
            actionText={actionText}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, actionText }) {
  const waitTime = formatDistanceToNow(new Date(order.placedAt));
  const isUrgent = new Date() - new Date(order.placedAt) > 15 * 60 * 1000;

  return (
    <div className={clsx(
      'bg-white/5 backdrop-blur-xl p-4 rounded-lg border-l-4 transition-all border border-white/10',
      isUrgent ? 'border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-l-amber-500'
    )}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-bold text-lg text-white">Table {order.tableNumber}</span>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {waitTime} ago
          </div>
        </div>
        <span className="text-xs px-2 py-1 bg-white/5 rounded-md font-medium text-gray-400 border border-white/10">
          Waiter: {order.primaryWaiter?.name.split(' ')[0]}
        </span>
      </div>
      <ul className="space-y-2 mb-4 divide-y divide-white/5">
        {order.lines.filter(l => !l.isVoid).map(line => (
          <li key={line.id} className="pt-2 text-sm first:pt-0">
            <div className="font-medium flex items-start gap-2 text-gray-200">
              <span className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-bold text-xs">{line.quantity}x</span>
              {line.menuItem.name}
            </div>
            {line.specialInstructions && (
              <div className="text-red-400 text-xs mt-1 ml-7 bg-red-500/10 p-1.5 rounded border border-red-500/20">
                ⚠️ {line.specialInstructions}
              </div>
            )}
          </li>
        ))}
      </ul>
      {onAction && (
        <button
          onClick={onAction}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-colors text-sm active:scale-[0.98]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
