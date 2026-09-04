import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ChefHat } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center md:justify-start px-4 md:px-16 lg:px-32 relative bg-cover bg-right bg-no-repeat"
      style={{ 
        backgroundImage: "url('/bg-login.png')",
        backgroundColor: '#f3f4f6'
      }}
    >
      <div className="w-full max-w-[420px] bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl relative z-10 my-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 border-2 border-[#ea580c] rounded-full flex items-center justify-center bg-white shadow-sm">
             <ChefHat className="text-[#ea580c] w-6 h-6" /> 
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">Login form</h1>
        <p className="text-sm text-gray-500 text-center mb-8 px-2 leading-relaxed">
          Welcome to RestaurantOS. Please sign in to manage your restaurant operations.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 ml-1">Username / Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-full text-gray-900 text-sm focus:ring-2 focus:ring-[#ea580c] focus:border-[#ea580c] outline-none transition-all placeholder-gray-400 shadow-sm"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-full text-gray-900 text-sm focus:ring-2 focus:ring-[#ea580c] focus:border-[#ea580c] outline-none transition-all placeholder-gray-400 shadow-sm"
                placeholder="Enter password"
                required
              />
            </div>
            <div className="mt-3 ml-1">
              <a href="#" className="text-xs font-bold text-[#ea580c] hover:text-[#c2410c] transition-colors">Forgot password?</a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white py-3.5 rounded-full font-bold text-sm transition-colors shadow-lg shadow-orange-500/30 mt-4"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1.5 text-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="font-semibold text-gray-600 mb-2 uppercase tracking-wider text-[10px]">Demo Credentials</p>
            <p><strong className="text-gray-700">Manager:</strong> manager@restaurant.com / password123</p>
            <p><strong className="text-gray-700">Waiter:</strong> waiter1@restaurant.com / password123</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">End user agreement</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
