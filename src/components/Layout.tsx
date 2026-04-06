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
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Ticket } from 'lucide-react';
import { FloatingSupport } from './FloatingSupport';
import { NotificationPanel } from './NotificationPanel';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';

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
    });
    return () => unsub();
  }, [user]);

  if (isAdminUser) {
    navItems.push({ name: 'Admin Panel', icon: LayoutDashboard, path: '/admin' });
    navItems.push({ name: 'Users', icon: Users, path: '/admin/users' });
    navItems.push({ name: 'Settings', icon: Settings, path: '/admin/settings' });
  }

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300",
      theme === 'dark' ? "bg-black text-white" : "bg-white text-zinc-900"
    )}>
      <FloatingSupport />
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r transition-transform duration-300 lg:translate-x-0",
        theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <Link to="/" className="flex items-center gap-3 mb-8 group">
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

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                  location.pathname === item.path 
                    ? "bg-blue-500/10 text-blue-500" 
                    : theme === 'dark'
                      ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4",
                  location.pathname === item.path ? "text-blue-500" : theme === 'dark' ? "group-hover:text-white" : "group-hover:text-zinc-900"
                )} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className={cn(
            "pt-4 border-t",
            theme === 'dark' ? "border-zinc-800" : "border-zinc-200"
          )}>
            {user && (
              <Link 
                to="/redeem"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all duration-200 mb-1",
                  theme === 'dark' ? "text-zinc-400 hover:bg-blue-500/10 hover:text-blue-500" : "text-zinc-500 hover:bg-blue-500/10 hover:text-blue-500"
                )}
              >
                <Ticket className="w-4 h-4" />
                <span className="font-medium text-sm">Redeem Code</span>
              </Link>
            )}
            {user ? (
              <button 
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all duration-200",
                  theme === 'dark' ? "text-zinc-400 hover:bg-red-500/10 hover:text-red-500" : "text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                )}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            ) : (
              <Link 
                to="/login"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all duration-200",
                  theme === 'dark' ? "text-zinc-400 hover:bg-blue-500/10 hover:text-blue-500" : "text-zinc-500 hover:bg-blue-500/10 hover:text-blue-500"
                )}
              >
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className={cn(
          "sticky top-0 z-40 h-16 backdrop-blur-md border-b px-4 lg:px-6 flex items-center justify-between transition-colors",
          theme === 'dark' ? "bg-black/80 border-zinc-800" : "bg-white/80 border-zinc-200"
        )}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search anime, movies..."
                className={cn(
                  "w-full border rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-blue-500 transition-all",
                  theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-900"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className={cn(
                "p-1.5 transition-colors",
                theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-1.5 relative transition-colors",
                  theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                <Bell className="w-4 h-4" />
                {hasUnread && (
                  <span className={cn(
                    "absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full border",
                    theme === 'dark' ? "border-black" : "border-white"
                  )} />
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
