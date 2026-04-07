import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Crown, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Menu, 
  X, 
  Search,
  Bell,
  ChevronDown,
  Settings,
  ShieldCheck,
  Users,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Ticket } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';
import { GlobalAds } from './GlobalAds';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { user, userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Premium', icon: Crown, path: '/premium' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  const isAdminUser = user && userData?.role === 'admin';

  React.useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsub();
  }, [user]);

  if (isAdminUser) {
    navItems.push({ name: 'Admin Panel', icon: LayoutDashboard, path: '/admin' });
    navItems.push({ name: 'Users', icon: Users, path: '/admin/users' });
    navItems.push({ name: 'AI Agent', icon: Bot, path: '/admin/agent' });
    navItems.push({ name: 'Settings', icon: Settings, path: '/admin/settings' });
  }

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      <GlobalAds />
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r transition-all duration-500 lg:translate-x-0",
        theme === 'dark' ? "bg-zinc-950 border-zinc-900 shadow-[20px_0_50px_-20px_rgba(0,0,0,0.5)]" : "bg-white border-zinc-200 shadow-[20px_0_50px_-20px_rgba(0,0,0,0.05)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <Link to="/" className="flex items-center gap-4 mb-10 group">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-2xl shadow-blue-500/20 group-hover:rotate-6 transition-all duration-500">
              <img 
                src="https://i.ibb.co/r2BqPyM1/IMG-20260406-235046-639.jpg" 
                alt="sahidanime logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-xl font-black tracking-tighter leading-none",
                theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>
                SAHID<span className="text-blue-500">ANIME</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Premium Streaming</span>
            </div>
          </Link>

          <nav className="flex-1 space-y-2">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 ml-3">Menu</div>
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  location.pathname === item.path 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : theme === 'dark'
                      ? "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  location.pathname === item.path ? "text-white" : theme === 'dark' ? "group-hover:text-blue-500" : "group-hover:text-blue-600"
                )} />
                <span className="font-black text-sm tracking-tight">{item.name}</span>
                {location.pathname === item.path && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute left-0 w-1 h-6 bg-white rounded-full"
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className={cn(
            "pt-6 border-t mt-6",
            theme === 'dark' ? "border-zinc-900" : "border-zinc-200"
          )}>
            {user && (
              <Link 
                to="/redeem"
                className={cn(
                  "flex items-center gap-4 px-4 py-3 w-full rounded-2xl transition-all duration-300 mb-2 group",
                  theme === 'dark' ? "text-zinc-400 hover:bg-blue-500/10 hover:text-blue-500" : "text-zinc-500 hover:bg-blue-500/10 hover:text-blue-500"
                )}
              >
                <Ticket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="font-black text-sm tracking-tight">Redeem Code</span>
              </Link>
            )}
            {user ? (
              <button 
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 w-full rounded-2xl transition-all duration-300 group",
                  theme === 'dark' ? "text-zinc-400 hover:bg-red-500/10 hover:text-red-500" : "text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                )}
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-black text-sm tracking-tight">Logout</span>
              </button>
            ) : (
              <Link 
                to="/login"
                className={cn(
                  "flex items-center gap-4 px-4 py-3 w-full rounded-2xl transition-all duration-300 group",
                  theme === 'dark' ? "text-zinc-400 hover:bg-blue-500/10 hover:text-blue-500" : "text-zinc-500 hover:bg-blue-500/10 hover:text-blue-500"
                )}
              >
                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm tracking-tight">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className={cn(
          "sticky top-0 z-40 h-20 backdrop-blur-xl border-b px-6 lg:px-10 flex items-center justify-between transition-all duration-500",
          theme === 'dark' ? "bg-black/60 border-zinc-900" : "bg-white/60 border-zinc-200"
        )}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search your favorite anime..."
                className={cn(
                  "w-full border-2 rounded-2xl py-2.5 pl-12 pr-6 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm",
                  theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-900"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className={cn(
                "p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95",
                theme === 'dark' ? "bg-zinc-900 text-yellow-500" : "bg-zinc-100 text-blue-600"
              )}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2.5 rounded-xl relative transition-all hover:scale-110 active:scale-95",
                  theme === 'dark' ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                )}
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <NotificationPanel onClose={() => setIsNotificationsOpen(false)} />
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-white bg-zinc-800">
                  {user ? (
                    userData?.photoURL ? (
                      <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userData?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
                    )
                  ) : (
                    <User className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <ChevronDown className={cn("w-3 h-3 text-zinc-500 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute right-0 mt-2 w-56 border rounded-2xl shadow-2xl z-20 overflow-hidden",
                        theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "p-4 border-b",
                        theme === 'dark' ? "border-zinc-800" : "border-zinc-200"
                      )}>
                        {user ? (
                          <>
                            <p className={cn(
                              "font-bold text-sm truncate",
                              theme === 'dark' ? "text-white" : "text-zinc-900"
                            )}>{userData?.name || user?.email}</p>
                            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                            {userData?.subscription_status === 'active' && (
                              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <ShieldCheck className="w-3 h-3" />
                                Premium
                              </div>
                            )}
                          </>
                        ) : (
                          <p className={cn(
                            "font-bold text-sm",
                            theme === 'dark' ? "text-white" : "text-zinc-900"
                          )}>Guest User</p>
                        )}
                      </div>
                      <div className="p-2">
                        {user ? (
                          <>
                            <Link 
                              to="/profile" 
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                              )}
                            >
                              <User className="w-4 h-4" /> Profile
                            </Link>
                            <Link 
                              to="/settings" 
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                              )}
                            >
                              <Settings className="w-4 h-4" /> Settings
                            </Link>
                            <button 
                              onClick={handleLogout}
                              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-red-500/10 text-red-500 text-sm transition-colors"
                            >
                              <LogOut className="w-4 h-4" /> Logout
                            </button>
                          </>
                        ) : (
                          <Link 
                            to="/login" 
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                              theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                            )}
                          >
                            <User className="w-4 h-4" /> Sign In
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-0">
          {children}
        </div>

        {/* Footer */}
        <footer className={cn(
          "py-12 px-6 border-t mt-auto",
          theme === 'dark' ? "bg-zinc-950 border-zinc-900" : "bg-zinc-50 border-zinc-200"
        )}>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/50 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <img 
                    src="https://i.ibb.co/r2BqPyM1/IMG-20260406-235046-639.jpg" 
                    alt="sahidanime logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={cn(
                  "text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r",
                  theme === 'dark' ? "from-white to-zinc-400" : "from-zinc-900 to-zinc-600"
                )}>
                  sahidanime
                </span>
              </Link>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Your ultimate destination for the best anime and donghua experience. 
                Premium content, ad-free streaming, and fan-dubbed favorites.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Legal</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/privacy-policy" className="text-xs text-zinc-500 hover:text-blue-500 transition-colors font-medium">Privacy Policy</Link>
                <Link to="/terms-conditions" className="text-xs text-zinc-500 hover:text-blue-500 transition-colors font-medium">Terms & Conditions</Link>
                <Link to="/refund-policy" className="text-xs text-zinc-500 hover:text-blue-500 transition-colors font-medium">Refund Policy</Link>
              </nav>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Disclaimer</h4>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">
                sahidanime provides content that may include fan-made translations and dubbing (Fan Dub). 
                We do not claim ownership of the original intellectual property.
              </p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto pt-12 mt-12 border-t border-zinc-900/50 text-center">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              © 2026 sahidanime. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
