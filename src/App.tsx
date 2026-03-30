import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, CloudRain, Thermometer, Droplets,
  TrendingUp, Users, ArrowRight, Menu, X,
  Calendar, MapPin, BarChart3, Moon, Sun as SunIcon,
  Upload, Globe, Target, Zap,
  FileText, ChevronDown, User, LogOut, Lock, Mail,
  WifiOff, Wifi, Database, Trash2, CheckCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import './index.css';
import { auth, User as AuthUser } from './services/auth';
import { db, StoredCSV } from './services/database';
import { fetchCurrentWeather, fetchForecast, WeatherData, parseCSV } from './services/weatherApi';
import { register } from './serviceWorkerRegistration';

// Register service worker for PWA
register();

// Regions data with coordinates
const regions = [
  { id: 'hyderabad', name: 'Hyderabad', country: 'India', lat: 17.3850, lon: 78.4867 },
  { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
  { id: 'delhi', name: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
  { id: 'bangalore', name: 'Bangalore', country: 'India', lat: 12.9716, lon: 77.5946 },
  { id: 'chennai', name: 'Chennai', country: 'India', lat: 13.0827, lon: 80.2707 },
];

const modelMetrics = [
  { metric: 'RMSE', value: 1.24, fullMark: 5, color: '#3b82f6' },
  { metric: 'MAE', value: 0.98, fullMark: 5, color: '#10b981' },
  { metric: 'R² Score', value: 0.92, fullMark: 1, color: '#f59e0b' },
  { metric: 'Accuracy', value: 94.5, fullMark: 100, color: '#8b5cf6' },
  { metric: 'Precision', value: 93.2, fullMark: 100, color: '#ec4899' },
];

const teamMembers = [
  { name: 'Mohammed Mudassir', role: 'Team Lead & Data Analyst', color: 'from-blue-500 to-cyan-400' },
  { name: 'Pravallika Kolagani', role: 'ML Engineer & Frontend Dev', color: 'from-purple-500 to-pink-400' },
  { name: 'Nishok Dhiren', role: 'Backend Developer', color: 'from-green-500 to-emerald-400' },
  { name: 'Srinivas J', role: 'Data Visualization Expert', color: 'from-orange-500 to-yellow-400' },
];

const features = [
  { icon: Thermometer, title: 'Temperature Forecasting', desc: 'Accurate temperature predictions using moving average models', color: 'text-orange-400' },
  { icon: Droplets, title: 'Humidity Analysis', desc: 'Real-time humidity tracking with trend analysis', color: 'text-blue-400' },
  { icon: CloudRain, title: 'Rainfall Prediction', desc: 'Short-term rainfall forecasting for agricultural planning', color: 'text-cyan-400' },
  { icon: TrendingUp, title: 'Time Series Analysis', desc: 'Advanced statistical modeling with interpretable results', color: 'text-green-400' },
  { icon: Globe, title: 'Multi-Region Support', desc: 'Weather forecasting for 5 major Indian cities', color: 'text-purple-400' },
  { icon: Zap, title: 'Real-time Updates', desc: 'Live weather data with hourly refresh rates', color: 'text-yellow-400' },
];

// Theme Context
const ThemeContext = React.createContext({ isDark: true, toggleTheme: () => {} });
// Auth Context
const AuthContext = React.createContext({ 
  isAuthenticated: false, 
  user: null as AuthUser | null, 
  login: (email: string, password: string) => Promise.resolve({ success: false } as any),
  logout: () => {},
  register: (email: string, password: string, name: string) => Promise.resolve({ success: false } as any),
});

// Alert generator with real data
function generateAlerts(current: WeatherData) {
  const alerts = [];
  if (current.temp > 35) {
    alerts.push({ type: 'warning', title: 'High Temperature Alert', message: `Temperature at ${current.temp}°C. Stay hydrated!`, icon: Thermometer });
  }
  if (current.rainfall > 5) {
    alerts.push({ type: 'info', title: 'Rainfall Alert', message: `Heavy rainfall expected: ${current.rainfall}mm`, icon: CloudRain });
  }
  if (current.humidity > 70 && current.humidity < 85) {
    alerts.push({ type: 'success', title: 'Optimal Conditions', message: 'Good weather for outdoor activities', icon: CheckCircle });
  }
  if (alerts.length === 0) {
    alerts.push({ type: 'success', title: 'Weather Stable', message: 'Current conditions are normal', icon: CheckCircle });
  }
  return alerts;
}

// Main App Component
function App() {
  const [isDark, setIsDark] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('hyderabad');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);

  // Weather state
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);

  // Check auth on mount
  useEffect(() => {
    const authState = auth.checkAuth();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);
    setIsLoading(false);

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch weather data when region changes
  useEffect(() => {
    const loadWeatherData = async () => {
      const region = regions.find(r => r.id === selectedRegion);
      if (!region) return;

      // Check cache first
      const cached = db.getCachedWeather(selectedRegion);
      if (cached && !isOnline) {
        setCurrentWeather(cached.current);
        setForecast(cached.forecast);
        return;
      }

      // Fetch from API
      const [current, forecastData] = await Promise.all([
        fetchCurrentWeather(region.lat, region.lon),
        fetchForecast(region.lat, region.lon),
      ]);

      setCurrentWeather(current);
      setForecast(forecastData);

      // Generate historical data
      const historical = generateHistoricalData(selectedRegion);
      setHistoricalData(historical);

      // Generate time series data
      const timeSeries = generateTimeSeriesData(selectedRegion);
      setTimeSeriesData(timeSeries);

      // Cache data
      db.cacheWeatherData(selectedRegion, { current, forecast: forecastData });
    };

    loadWeatherData();
  }, [selectedRegion, isOnline]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogin = async (email: string, password: string) => {
    const result = await auth.login(email, password);
    if (result.success) {
      setIsAuthenticated(true);
      setUser(result.user || null);
      setShowLogin(false);
    }
    return result;
  };

  const handleRegister = async (email: string, password: string, name: string, phone?: string, state?: string, city?: string) => {
    const result = await auth.register(email, password, name, phone, state, city);
    if (result.success) {
      setIsAuthenticated(true);
      setUser(result.user || null);
      setShowRegister(false);
    }
    return result;
  };

  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
        />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ isAuthenticated, user, login: handleLogin, logout: handleLogout, register: handleRegister }}>
        <div className={`min-h-screen transition-colors duration-300 ${
          isDark ? 'bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
        }`}>
          {/* Offline Indicator */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                exit={{ y: -50 }}
                className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4" />
                <span>You are offline. Using cached data.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Navigation 
            isAuthenticated={isAuthenticated} 
            user={user} 
            onLoginClick={() => setShowLogin(true)}
            onLogout={handleLogout}
            isOnline={isOnline}
          />
          
          <HeroSection 
            selectedRegion={selectedRegion} 
            onRegionChange={setSelectedRegion}
            current={currentWeather}
            isOnline={isOnline}
          />
          
          <DashboardSection 
            weatherData={forecast}
            historicalData={historicalData}
          />
          
          <AnalysisSection 
            timeSeriesData={timeSeriesData}
          />
          
          <AlertsSection 
            alerts={currentWeather ? generateAlerts(currentWeather) : []} 
          />
          
          <UploadSection isAuthenticated={isAuthenticated} onLoginClick={() => setShowLogin(true)} />
          
          <TeamSection />
          
          <Footer />

          {/* Login Modal */}
          <AnimatePresence>
            {showLogin && (
              <LoginModal 
                onClose={() => setShowLogin(false)} 
                onLogin={handleLogin}
                onRegisterClick={() => { setShowLogin(false); setShowRegister(true); }}
              />
            )}
          </AnimatePresence>

          {/* Register Modal */}
          <AnimatePresence>
            {showRegister && (
              <RegisterModal 
                onClose={() => setShowRegister(false)} 
                onRegister={handleRegister}
                onLoginClick={() => { setShowRegister(false); setShowLogin(true); }}
              />
            )}
          </AnimatePresence>
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// Navigation Component
function Navigation({ isAuthenticated, user, onLoginClick, onLogout, isOnline }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { isDark, toggleTheme } = React.useContext(ThemeContext);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Dashboard', href: '#dashboard' },
    { name: 'Analysis', href: '#analysis' },
    { name: 'Alerts', href: '#alerts' },
    { name: 'Upload', href: '#upload' },
    { name: 'Team', href: '#team' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? (isDark ? 'glass-dark py-3' : 'bg-white/90 shadow-lg py-3') : 'bg-transparent py-5'
      } ${!isOnline ? 'mt-10' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
          <Cloud className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Weather<span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>AI</span>
          </span>
          {!isOnline && <WifiOff className="w-4 h-4 text-yellow-400 ml-2" />}
        </motion.div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className={`transition-colors font-medium ${
              isDark ? 'text-white/80 hover:text-cyan-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              {link.name}
            </a>
          ))}
          
          <button onClick={toggleTheme} className={`p-2 rounded-full transition-all ${
            isDark ? 'glass hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
          }`}>
            {isDark ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'glass' : 'bg-gray-200'}`}>
                  <User className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{user?.name}</span>
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-700'} transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 ${isDark ? 'glass-dark' : 'bg-white'}`}
                  >
                    <div className="py-2">
                      <div className={`px-4 py-2 border-b ${isDark ? 'border-white/20' : 'border-gray-200'}`}>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                        <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{user?.email}</p>
                        {user?.phone && <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>📱 {user?.phone}</p>}
                        {(user?.city || user?.state) && (
                          <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                            📍 {user?.city}{user?.city && user?.state ? ', ' : ''}{user?.state}
                          </p>
                        )}
                      </div>
                      <button onClick={onLogout} className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                        isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-gray-50'
                      }`}>
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-full font-semibold transition-all"
            >
              Login
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <button onClick={toggleTheme} className={`p-2 rounded-full ${isDark ? 'glass' : 'bg-gray-100'}`}>
            {isDark ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
          </button>
          <button className={isDark ? 'text-white' : 'text-gray-800'} onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={isDark ? 'glass-dark md:hidden' : 'bg-white md:hidden shadow-lg'}>
            <div className="px-6 py-4 space-y-3">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} className={`block py-2 ${
                  isDark ? 'text-white/80 hover:text-cyan-400' : 'text-gray-700 hover:text-blue-600'
                }`} onClick={() => setIsOpen(false)}>
                  {link.name}
                </a>
              ))}
              {!isAuthenticated && (
                <button onClick={() => { onLoginClick(); setIsOpen(false); }}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-full font-semibold mt-4">
                  Login
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// Login Modal
function LoginModal({ onClose, onLogin, onRegisterClick }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isDark } = React.useContext(ThemeContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className={`relative w-full max-w-md rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white shadow-2xl'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
          <X className="w-6 h-6" />
        </button>
        
        <h2 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <User className="w-5 h-5" /> Login
              </>
            )}
          </button>
        </form>
        
        <p className={`mt-4 text-center text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Don't have an account?{' '}
          <button onClick={onRegisterClick} className="text-cyan-400 hover:underline">Register</button>
        </p>
        
        <div className={`mt-4 p-3 rounded-lg text-xs ${isDark ? 'glass-dark text-white/60' : 'bg-gray-100 text-gray-600'}`}>
          <p className="font-medium mb-1">Demo credentials:</p>
          <p>Email: admin@weatherapp.com / Password: admin123</p>
          <p>Email: user@weatherapp.com / Password: user123</p>
        </div>
      </motion.div>
    </div>
  );
}

// Register Modal
function RegisterModal({ onClose, onRegister, onLoginClick }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isDark } = React.useContext(ThemeContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const result = await onRegister(email, password, name, phone, state, city);
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className={`relative w-full max-w-md rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white shadow-2xl'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
          <X className="w-6 h-6" />
        </button>
        
        <h2 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Account</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Name</label>
            <div className="relative">
              <User className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your name"
                required
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Create a password"
                required
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Phone Number</label>
            <div className="relative">
              <span className={`absolute left-3 top-3 text-lg ${isDark ? 'text-white/50' : 'text-gray-400'}`}>📱</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="State"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${
                  isDark ? 'glass text-white placeholder-white/50' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="City"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <User className="w-5 h-5" /> Create Account
              </>
            )}
          </button>
        </form>
        
        <p className={`mt-4 text-center text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Already have an account?{' '}
          <button onClick={onLoginClick} className="text-cyan-400 hover:underline">Login</button>
        </p>
      </motion.div>
    </div>
  );
}

// Regional Selector Component
function RegionalSelector({ selectedRegion, onSelect }: { selectedRegion: string; onSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = React.useContext(ThemeContext);
  const selected = regions.find(r => r.id === selectedRegion);

  return (
    <div className="relative">
      <motion.button onClick={() => setIsOpen(!isOpen)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all ${
          isDark ? 'glass text-white hover:bg-white/20' : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
        }`}>
        <MapPin className="w-5 h-5 text-cyan-400" />
        <span>{selected?.name}, {selected?.country}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full left-0 mt-2 w-64 rounded-xl overflow-hidden shadow-xl z-50 ${isDark ? 'glass-dark' : 'bg-white'}`}>
            {regions.map((region) => (
              <button key={region.id} onClick={() => { onSelect(region.id); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left transition-all flex items-center gap-3 ${
                  selectedRegion === region.id
                    ? (isDark ? 'bg-cyan-500/30 text-cyan-400' : 'bg-blue-50 text-blue-600')
                    : (isDark ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50')
                }`}>
                <MapPin className="w-4 h-4" />
                <div>
                  <p className="font-medium">{region.name}</p>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{region.country}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hero Section
function HeroSection({ selectedRegion, onRegionChange, current, isOnline }: any) {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <section id="home" className={`relative min-h-screen flex items-center justify-center overflow-hidden pt-20 ${
      isDark ? 'bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500' : 'bg-gradient-to-br from-blue-100 via-blue-50 to-white'
    }`}>
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div key={i} className={`absolute w-2 h-2 rounded-full ${isDark ? 'bg-white/20' : 'bg-blue-400/20'}`}
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
        ))}
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <motion.div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${isDark ? 'glass' : 'bg-white/80 shadow-md'}`} whileHover={{ scale: 1.05 }}>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
              {isOnline ? 'Live Weather Data • Updated Hourly' : 'Offline Mode • Using Cached Data'}
            </span>
          </motion.div>
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Regional Weather<br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Forecasting System</span>
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-8 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            Advanced time series analysis for accurate temperature, humidity, and rainfall predictions.
          </p>
          <div className="flex justify-center mb-8">
            <RegionalSelector selectedRegion={selectedRegion} onSelect={onRegionChange} />
          </div>
          <motion.div className="flex flex-wrap justify-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <a href="#dashboard" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105">
              Explore Dashboard<ArrowRight className="w-5 h-5" />
            </a>
            <a href="#analysis" className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${
              isDark ? 'glass text-white hover:bg-white/20' : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
            }`}>View Analysis</a>
          </motion.div>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Thermometer, label: 'Temperature', value: `${current?.temp || '--'}°C`, color: 'text-orange-400' },
            { icon: Droplets, label: 'Humidity', value: `${current?.humidity || '--'}%`, color: 'text-blue-400' },
            { icon: CloudRain, label: 'Rainfall', value: `${current?.rainfall || '--'}mm`, color: 'text-cyan-400' },
          ].map((item, i) => (
            <motion.div key={item.label} className={`rounded-2xl p-6 animate-float ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`}
              style={{ animationDelay: `${i * 0.5}s` }} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.2 }} whileHover={{ scale: 1.05 }}>
              <item.icon className={`w-8 h-8 ${item.color} mb-3`} />
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{item.label}</p>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Dashboard Section
function DashboardSection({ weatherData, historicalData }: { weatherData: any[]; historicalData: any[] }) {
  const [activeMetric, setActiveMetric] = useState('temp');
  const { isDark } = React.useContext(ThemeContext);

  return (
    <section id="dashboard" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Weather Dashboard</h2>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Real-time forecasts and historical data visualization</p>
        </motion.div>
        <div className="flex justify-center gap-4 mb-8">
          {[
            { id: 'temp', label: 'Temperature', icon: Thermometer, color: 'bg-orange-500' },
            { id: 'humidity', label: 'Humidity', icon: Droplets, color: 'bg-blue-500' },
            { id: 'rainfall', label: 'Rainfall', icon: CloudRain, color: 'bg-cyan-500' },
          ].map((metric) => (
            <motion.button key={metric.id} onClick={() => setActiveMetric(metric.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                activeMetric === metric.id ? `${metric.color} text-white` : (isDark ? 'glass text-white/70 hover:bg-white/20' : 'bg-white text-gray-700 shadow-md hover:shadow-lg')
              }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <metric.icon className="w-5 h-5" />{metric.label}
            </motion.button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div className={`rounded-2xl p-6 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Calendar className="w-5 h-5 text-cyan-400" />7-Day Forecast
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weatherData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeMetric === 'temp' ? '#f97316' : activeMetric === 'humidity' ? '#3b82f6' : '#06b6d4'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={activeMetric === 'temp' ? '#f97316' : activeMetric === 'humidity' ? '#3b82f6' : '#06b6d4'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                <XAxis dataKey="day" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px' }} labelStyle={{ color: isDark ? 'white' : '#333' }} />
                <Area type="monotone" dataKey={activeMetric} stroke={activeMetric === 'temp' ? '#f97316' : activeMetric === 'humidity' ? '#3b82f6' : '#06b6d4'} fillOpacity={1} fill="url(#colorMetric)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div className={`rounded-2xl p-6 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <BarChart3 className="w-5 h-5 text-purple-400" />Annual Weather Pattern
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                <XAxis dataKey="month" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px' }} labelStyle={{ color: isDark ? 'white' : '#333' }} />
                <Bar dataKey="avgTemp" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rainfall" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Analysis Section
function AnalysisSection({ timeSeriesData }: { timeSeriesData: any[] }) {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <section id="analysis" className={`py-20 relative ${isDark ? 'bg-black/20' : 'bg-blue-50/50'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Time Series Analysis</h2>
          <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Our moving average model provides interpretable and efficient predictions</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, i) => (
            <motion.div key={feature.title} className={`rounded-2xl p-6 transition-all cursor-pointer ${isDark ? 'glass hover:bg-white/10' : 'bg-white/80 shadow-lg hover:shadow-xl'}`}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.05 }}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div className={`rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3 className={`text-2xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <TrendingUp className="w-6 h-6 text-green-400" />Model Predictions vs Actual Data
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                <XAxis dataKey="day" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)', borderRadius: '8px' }} labelStyle={{ color: isDark ? 'white' : '#333' }} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
                <Line type="monotone" dataKey="movingAvg" stroke="#10b981" strokeWidth={2} dot={false} name="Moving Average" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div className={`rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3 className={`text-2xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Target className="w-6 h-6 text-purple-400" />Model Performance Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {modelMetrics.map((metric, i) => (
                <motion.div key={metric.metric} className={`rounded-xl p-4 ${isDark ? 'glass-dark' : 'bg-gray-50'}`}
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{metric.metric}</p>
                  <p className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.value}{metric.metric.includes('Score') ? '' : metric.metric === 'Accuracy' || metric.metric === 'Precision' ? '%' : '°C'}
                  </p>
                  <div className={`w-full h-2 rounded-full mt-2 ${isDark ? 'bg-white/20' : 'bg-gray-200'}`}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(metric.value / metric.fullMark) * 100}%`, backgroundColor: metric.color }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Alerts Section
function AlertsSection({ alerts }: { alerts: any[] }) {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <section id="alerts" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Weather Alerts</h2>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Important notifications for your region</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alerts.map((alert, i) => (
            <motion.div key={alert.title} className={`rounded-2xl p-6 ${
              alert.type === 'warning' ? (isDark ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-yellow-50 border border-yellow-200') :
              alert.type === 'info' ? (isDark ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-blue-50 border border-blue-200') :
              (isDark ? 'bg-green-500/20 border border-green-500/50' : 'bg-green-50 border border-green-200')
            }`} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  alert.type === 'warning' ? 'bg-yellow-500/30 text-yellow-400' :
                  alert.type === 'info' ? 'bg-blue-500/30 text-blue-400' : 'bg-green-500/30 text-green-400'
                }`}>
                  <alert.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.title}</h3>
                  <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{alert.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Section
function TeamSection() {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <section id="team" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Meet Our Team</h2>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Team 2B2 - Department of Computer Science and Engineering</p>
          <p className={`mt-2 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>Guided by Dr. Manoj Kumar</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <motion.div key={member.name} className={`rounded-2xl p-6 text-center group ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.05, y: -10 }}>
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.color} mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{member.name}</h3>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{member.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <footer className={`py-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Regional Weather Forecasting</span>
          </div>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>&copy; 2024 Team 2B2. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Wifi className={`w-5 h-5 ${navigator.onLine ? 'text-green-400' : 'text-red-400'}`} />
          </div>
        </div>
      </div>
    </footer>
  );
}

// Upload Section with Database
function UploadSection({ isAuthenticated, onLoginClick }: { isAuthenticated: boolean; onLoginClick: () => void }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedFiles, setSavedFiles] = useState<StoredCSV[]>([]);
  const { isDark } = React.useContext(ThemeContext);

  useEffect(() => {
    setSavedFiles(db.getAllCSV());
  }, []);

  const handleFile = (file: File) => {
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedData = parseCSV(csvText);
      
      const storedFile: StoredCSV = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        data: parsedData,
        uploadedAt: new Date().toISOString(),
        region: 'hyderabad',
      };
      
      db.saveCSV(storedFile);
      setSavedFiles(db.getAllCSV());
    };
    reader.readAsText(file);
  };

  const handleDelete = (id: string) => {
    db.deleteCSV(id);
    setSavedFiles(db.getAllCSV());
  };

  return (
    <section id="upload" className={`py-20 relative ${isDark ? 'bg-black/20' : 'bg-blue-50/50'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data Management</h2>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Upload CSV files and manage your weather data</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div className={`rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Upload className="w-5 h-5 text-cyan-400" />Upload Weather Data
            </h3>
            {!isAuthenticated ? (
              <div className={`rounded-xl p-8 text-center ${isDark ? 'glass-dark' : 'bg-gray-50'}`}>
                <Lock className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                <p className={`mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Please login to upload and manage CSV files</p>
                <button onClick={onLoginClick} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-full font-semibold">Login to Continue</button>
              </div>
            ) : (
              <>
                <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); }}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    isDragging ? (isDark ? 'border-cyan-400 bg-cyan-500/10' : 'border-blue-500 bg-blue-50') : (isDark ? 'border-white/30 hover:border-white/50' : 'border-gray-300 hover:border-gray-400')
                  }`}>
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
                  <p className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Drag & drop your CSV file here</p>
                  <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-full font-semibold transition-all cursor-pointer">
                    <Upload className="w-4 h-4" /> Select File
                  </label>
                </div>
                {uploadedFile && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-4 rounded-xl ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{uploadedFile.name}</p>
                          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => setUploadedFile(null)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/20 text-white/60' : 'hover:bg-gray-200 text-gray-500'}`}><X className="w-5 h-5" /></button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>

          <motion.div className={`rounded-2xl p-8 ${isDark ? 'glass' : 'bg-white/80 shadow-lg'}`} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Database className="w-5 h-5 text-cyan-400" />Saved Files ({savedFiles.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {savedFiles.length === 0 ? (
                <p className={`text-center py-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>No files uploaded yet</p>
              ) : (
                savedFiles.map((file, i) => (
                  <motion.div key={file.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'glass-dark' : 'bg-gray-50'}`}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <div className="flex items-center gap-3">
                      <FileText className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
                        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{file.data.length} records • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(file.id)} className={`p-2 rounded-full ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Helper Functions
function generateHistoricalData(regionId: string) {
  const baseTemp = { hyderabad: 28, mumbai: 27, delhi: 30, bangalore: 25, chennai: 29 }[regionId] || 28;
  return [
    { month: 'Jan', avgTemp: baseTemp - 5, rainfall: 5 },
    { month: 'Feb', avgTemp: baseTemp - 3, rainfall: 8 },
    { month: 'Mar', avgTemp: baseTemp + 2, rainfall: 15 },
    { month: 'Apr', avgTemp: baseTemp + 5, rainfall: 25 },
    { month: 'May', avgTemp: baseTemp + 8, rainfall: 35 },
    { month: 'Jun', avgTemp: baseTemp + 6, rainfall: 120 },
    { month: 'Jul', avgTemp: baseTemp + 3, rainfall: 180 },
    { month: 'Aug', avgTemp: baseTemp + 2, rainfall: 160 },
    { month: 'Sep', avgTemp: baseTemp + 3, rainfall: 90 },
    { month: 'Oct', avgTemp: baseTemp, rainfall: 60 },
    { month: 'Nov', avgTemp: baseTemp - 3, rainfall: 30 },
    { month: 'Dec', avgTemp: baseTemp - 5, rainfall: 10 },
  ];
}

function generateTimeSeriesData(regionId: string) {
  const base = { hyderabad: 32, mumbai: 30, delhi: 35, bangalore: 28, chennai: 33 }[regionId] || 30;
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    actual: base + Math.sin(i * 0.3) * 4 + (Math.random() - 0.5) * 2,
    predicted: base + Math.sin(i * 0.3) * 4,
    movingAvg: base + Math.sin(i * 0.3) * 3.5,
  }));
}

export default App;
