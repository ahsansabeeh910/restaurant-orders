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

  // Fetch initial orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await client.get('/orders?includeArchived=false&limit=50');
        // Filter out non-kitchen statuses
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

  // Socket setup
  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    
    socket.on('connect', () => {
      socket.emit('join_kitchen');
    });

    socket.on('order_created', (newOrder) => {
      if (['ACCEPTED', 'PREPARING', 'READY'].includes(newOrder.status)) {
        setOrders(prev => [newOrder, ...prev]);
      }
    });

    socket.on('order_updated', (updatedOrder) => {
      setOrders(prev => {
        // If it moved to SERVED or CANCELLED, remove it
        if (!['ACCEPTED', 'PREPARING', 'READY'].includes(updatedOrder.status)) {
          return prev.filter(o => o.id !== updatedOrder.id);
        }
        
        const exists = prev.some(o => o.id === updatedOrder.id);
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        } else {
          // Status changed into a kitchen status (e.g. from PLACED to ACCEPTED)
          return [updatedOrder, ...prev].sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      await client.patch(`/orders/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert will happen automatically if we refetch, but here we just log
    }
  };

  const getOrdersByStatus = (status) => orders.filter(o => o.status === status).sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));

  if (loading) return <div className="p-8">Loading Kitchen Display...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-8 p-4 bg-gray-100 overflow-hidden">
      <div className="mb-4 flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-indigo-600" />
          Kitchen Display
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
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
          color="bg-yellow-50"
          headerColor="bg-yellow-100 text-yellow-800"
          onAction={(id) => updateStatus(id, 'PREPARING')}
          actionText="Start Preparing"
        />
        <Column 
          title="Preparing" 
          orders={getOrdersByStatus('PREPARING')} 
          icon={ChefHat}
          color="bg-orange-50"
          headerColor="bg-orange-100 text-orange-800"
          onAction={(id) => updateStatus(id, 'READY')}
          actionText="Mark Ready"
        />
        <Column 
          title="Ready for Pickup" 
          orders={getOrdersByStatus('READY')} 
          icon={CheckCircle2}
          color="bg-green-50"
          headerColor="bg-green-100 text-green-800"
          // No action here, waiters mark as served
        />
      </div>
    </div>
  );
}

function Column({ title, orders, icon: Icon, color, headerColor, onAction, actionText }) {
  return (
    <div className={clsx("flex flex-col min-w-[350px] max-w-sm rounded-xl border border-gray-200 overflow-hidden", color)}>
      <div className={clsx("px-4 py-3 font-semibold flex justify-between items-center", headerColor)}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </div>
        <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm">{orders.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
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
  const isUrgent = new Date() - new Date(order.placedAt) > 15 * 60 * 1000; // 15 mins

  return (
    <div className={clsx(
      "bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all",
      isUrgent ? "border-l-red-500 shadow-red-100" : "border-l-indigo-500"
    )}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-bold text-lg">Table {order.tableNumber}</span>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {waitTime} ago
          </div>
        </div>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded-md font-medium text-gray-700">
          Waiter: {order.primaryWaiter?.name.split(' ')[0]}
        </span>
      </div>

      <ul className="space-y-2 mb-4 divide-y divide-gray-50">
        {order.lines.filter(l => !l.isVoid).map(line => (
          <li key={line.id} className="pt-2 text-sm first:pt-0 first:border-0">
            <div className="font-medium flex items-start gap-2">
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold text-xs">{line.quantity}x</span>
              {line.menuItem.name}
            </div>
            {line.specialInstructions && (
              <div className="text-red-500 text-xs mt-1 ml-7 bg-red-50 p-1.5 rounded border border-red-100">
                ⚠️ {line.specialInstructions}
              </div>
            )}
          </li>
        ))}
      </ul>

      {onAction && (
        <button
          onClick={onAction}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm active:scale-[0.98]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
