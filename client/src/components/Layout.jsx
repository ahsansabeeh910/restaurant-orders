import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
  ChefHat,
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const { data } = await api.get('/alerts/count');
        setAlertCount(data.count);
      } catch (e) {
        // ignore
      }
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/kitchen', icon: ChefHat, label: 'Kitchen Display' },
    ...(isManager ? [{ to: '/menu', icon: UtensilsCrossed, label: 'Menu' }] : []),
    { to: '/orders', icon: ClipboardList, label: 'Orders' },
    {
      to: '/alerts',
      icon: Bell,
      label: 'Alerts',
      badge: alertCount > 0 ? alertCount : null,
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b px-4 py-3">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="font-bold text-lg text-indigo-600">RestaurantOS</h1>
        <div className="w-6" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="font-bold text-lg text-indigo-600">RestaurantOS</h1>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent navItems={navItems} isActive={isActive} user={user} logout={logout} onClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center px-6 py-5 border-b">
            <h1 className="font-bold text-xl text-indigo-600">🍽️ RestaurantOS</h1>
          </div>
          <NavContent navItems={navItems} isActive={isActive} user={user} logout={logout} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavContent = ({ navItems, isActive, user, logout, onClick }) => (
  <div className="flex flex-col flex-grow justify-between">
    <nav className="mt-4 px-3 space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive(item.to)
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <item.icon className="h-5 w-5 mr-3" />
          {item.label}
          {item.badge && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
    <div className="px-3 py-4 border-t">
      <div className="px-3 py-2 text-sm">
        <p className="font-medium text-gray-900">{user?.name}</p>
        <p className="text-gray-500 text-xs">{user?.role}</p>
      </div>
      <button
        onClick={() => { logout(); onClick?.(); }}
        className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4 mr-3" />
        Sign out
      </button>
    </div>
  </div>
);

export default Layout;
