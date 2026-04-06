import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Users, 
  Crown, 
  Tv, 
  TrendingUp, 
  Plus, 
  Settings, 
  CheckCircle2, 
  Clock,
  LayoutDashboard,
  Film,
  CreditCard,
  Bell,
  Ticket,
  Database,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalAnime: 0,
    pendingRequests: 0
  });

  const [isSeeding, setIsSeeding] = useState(false);

  const seedSampleData = async () => {
    if (!window.confirm('This will add 5 sample anime to your database. Continue?')) return;
    setIsSeeding(true);
    try {
      const sampleAnimes = [
        {
          title: "Demon Slayer: Kimetsu no Yaiba",
          description: "A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.",
          genre: "Action, Fantasy, Adventure",
          posterUrl: "https://m.media-amazon.com/images/M/MV5BZjZjNzI5MDctY2Y4YS00NmM4LTljMmItZTFkOTExNGI3ODRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          title: "Jujutsu Kaisen",
          description: "A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself. He enters a shaman's school to be able to locate the demon's other body parts and thus exorcise himself.",
          genre: "Action, Supernatural, School",
          posterUrl: "https://m.media-amazon.com/images/M/MV5BNGYyNmI3M2EtYzgyZC00MGYxLWIxZDctOTNlM2M1Y2ZlY2ZlXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          title: "Attack on Titan",
          description: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
          genre: "Action, Drama, Fantasy",
          posterUrl: "https://m.media-amazon.com/images/M/MV5BNDFjYTIxMjctYTQ2ZC00YzQ4LWE3ZmMtN2MzMWQ4NGC6ZGNjXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          title: "One Piece",
          description: "Follows the adventures of Monkey D. Luffy and his pirate crew in order to find the greatest treasure ever left by the legendary Pirate, Gold Roger. The famous mystery treasure named \"One Piece\".",
          genre: "Adventure, Action, Comedy",
          posterUrl: "https://m.media-amazon.com/images/M/MV5BODcwNWE3OTItMDc3MS00NDFjLWE1OTAtNDU3NjgxODMxY2UyXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_.jpg",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          title: "Naruto: Shippuden",
          description: "Naruto Uzumaki, is a loud, hyperactive, adolescent ninja who constantly searches for approval and recognition, as well as to become Hokage, who is acknowledged as the leader and strongest of all ninja in the village.",
          genre: "Action, Adventure, Fantasy",
          posterUrl: "https://m.media-amazon.com/images/M/MV5BZGFiMWFhNDAtMzUyZS00NmQ2LTljNDYtMmZjNTc5MDUxMzViXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_.jpg",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      ];

      for (const anime of sampleAnimes) {
        await addDoc(collection(db, 'anime'), anime);
      }
      toast.success('Sample data seeded successfully!');
      window.location.reload();
    } catch (error: any) {
      toast.error('Failed to seed data: ' + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const premiumSnap = await getDocs(query(collection(db, 'users'), where('subscription_status', '==', 'active')));
        const animeSnap = await getDocs(collection(db, 'anime'));
        const requestsSnap = await getDocs(query(collection(db, 'purchaseRequests'), where('status', '==', 'pending')));

        setStats({
          totalUsers: usersSnap.size,
          premiumUsers: premiumSnap.size,
          totalAnime: animeSnap.size,
          pendingRequests: requestsSnap.size
        });
      } catch (error) {
        console.error("Admin Dashboard Fetch Error:", error);
      }
    };

    fetchData();
  }, [user, userData]);

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { name: 'Premium Users', value: stats.premiumUsers, icon: Crown, color: 'yellow' },
    { name: 'Total Anime', value: stats.totalAnime, icon: Tv, color: 'purple' },
    { name: 'Pending Requests', value: stats.pendingRequests, icon: Clock, color: 'red' },
  ];

  return (
    <div className="space-y-10 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-zinc-500">Manage your anime streaming platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/admin/settings"
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors relative"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors relative">
            <Bell className="w-5 h-5" />
            {stats.pendingRequests > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <Link 
            to="/admin/anime" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" /> Add Anime
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-4 hover:border-zinc-700 transition-colors group"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
              stat.color === 'blue' && "bg-blue-500/10 text-blue-500",
              stat.color === 'yellow' && "bg-yellow-500/10 text-yellow-500",
              stat.color === 'purple' && "bg-purple-500/10 text-purple-500",
              stat.color === 'red' && "bg-red-500/10 text-red-500",
            )}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-sm font-medium">{stat.name}</p>
              <p className="text-3xl font-black">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Quick Management
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link 
              to="/admin/anime"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Film className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Manage Anime</h3>
                <p className="text-sm text-zinc-500">Add, edit or remove anime series</p>
              </div>
            </Link>
            <Link 
              to="/admin/requests"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-yellow-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-yellow-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Purchase Requests</h3>
                <p className="text-sm text-zinc-500">Review and approve subscriptions</p>
              </div>
            </Link>
            <Link 
              to="/admin/plans"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-purple-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-purple-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Manage Plans</h3>
                <p className="text-sm text-zinc-500">Configure subscription pricing</p>
              </div>
            </Link>
            <Link 
              to="/admin/users"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-green-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-green-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Manage Users</h3>
                <p className="text-sm text-zinc-500">Manage accounts and subscriptions</p>
              </div>
            </Link>
            <Link 
              to="/admin/settings"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Platform Settings</h3>
                <p className="text-sm text-zinc-500">Configure Telegram notifications</p>
              </div>
            </Link>

            <Link 
              to="/admin/redeem-codes"
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Ticket className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Redeem Codes</h3>
                <p className="text-sm text-zinc-500">Manage subscription codes</p>
              </div>
            </Link>

            <button 
              onClick={seedSampleData}
              disabled={isSeeding}
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center gap-6 hover:bg-zinc-900 hover:border-green-500/50 transition-all group text-left"
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {isSeeding ? <Loader2 className="w-7 h-7 text-green-500 animate-spin" /> : <Database className="w-7 h-7 text-green-500" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Seed Sample Data</h3>
                <p className="text-sm text-zinc-500">Populate empty database with anime</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-500" />
            Recent Activity
          </h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-200">New user registered: Alex Doe</p>
                  <p className="text-xs text-zinc-500">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
