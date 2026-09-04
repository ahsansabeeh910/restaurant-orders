import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bell, Check, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/alerts/${alertId}/acknowledge`);
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        {alerts.length > 0 && (
          <span className="bg-red-500/80 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No active alerts. All orders are on track!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => navigate(`/orders/${alert.order.id}`)}
              className="bg-white/5 backdrop-blur-xl border border-red-500/20 rounded-xl p-5 flex items-center justify-between hover:bg-red-500/5 cursor-pointer transition"
            >
              <div className="flex items-center gap-4">
                <div className="bg-red-500/10 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    Table #{alert.order.tableNumber} — Order taking too long
                  </p>
                  <p className="text-sm text-gray-400">
                    Status: {alert.order.status} • Waiter: {alert.order.primaryWaiter?.name}
                  </p>
                  <p className="text-xs text-red-400">
                    Placed {formatDistanceToNow(new Date(alert.order.placedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => handleAcknowledge(alert.id, e)}
                className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20 transition border border-green-500/20"
              >
                <Check className="h-4 w-4" /> Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
