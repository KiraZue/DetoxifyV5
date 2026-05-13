'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  ShieldAlert, 
  MessageSquare,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

type RecentProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  updated_at: string;
};

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    reportedPosts: 0,
    totalPosts: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        const { data: latestUsers } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(5);

        setStats({
          totalUsers: userCount || 0,
          reportedPosts: reportCount || 0,
          totalPosts: postCount || 0
        });
        setRecentUsers((latestUsers as RecentProfileRow[] | null) || []);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, bgColor: 'bg-blue-500/10', textColor: 'text-blue-500', trend: '+12%', isUp: true },
    { label: 'Pending Reports', value: stats.reportedPosts, icon: ShieldAlert, bgColor: 'bg-red-500/10', textColor: 'text-red-500', trend: '-2%', isUp: false },
    { label: 'Total Posts', value: stats.totalPosts, icon: MessageSquare, bgColor: 'bg-purple-500/10', textColor: 'text-purple-500', trend: '+18%', isUp: true },
  ];

  const chartData = [
    { name: 'Users', value: stats.totalUsers, color: '#3B82F6' },
    { name: 'Reports', value: stats.reportedPosts, color: '#EF4444' },
    { name: 'Posts', value: stats.totalPosts, color: '#A855F7' },
  ];

  const trendData = [
    { name: 'Mon', value: Math.floor(stats.totalPosts * 0.7) },
    { name: 'Tue', value: Math.floor(stats.totalPosts * 0.8) },
    { name: 'Wed', value: Math.floor(stats.totalPosts * 0.75) },
    { name: 'Thu', value: Math.floor(stats.totalPosts * 0.9) },
    { name: 'Fri', value: Math.floor(stats.totalPosts * 0.85) },
    { name: 'Sat', value: Math.floor(stats.totalPosts * 0.95) },
    { name: 'Sun', value: stats.totalPosts },
  ];

  if (loading) return null;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Compact Top Bar */}
      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        {/* Compact Welcome */}
        <div className="flex-1 bg-white dark:bg-[#18181b] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin Dashboard Overview</h2>
            <p className="text-xs text-gray-500">Managing {stats.totalUsers} community members</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Activity size={18} className="text-green-500" />
            </button>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex-[2] grid grid-cols-3 gap-3">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-[#18181b] p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.textColor} shrink-0`}>
                <stat.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">{stat.label}</p>
                <p className="text-base font-black text-gray-900 dark:text-white">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section - Flexible Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Comparison Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181b] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Community Distribution</h3>
            <BarChart3 className="text-gray-400" size={16} />
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Trend */}
        <div className="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Activity Trend</h3>
            <p className="text-[10px] text-gray-500">Past 7 days</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#4CAF50" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row - Fixed Small Height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 h-[220px]">
        {/* Recent Activity - Scrollable internally */}
        <div className="bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white">Recent Users</h3>
            <button className="text-[10px] text-[#4CAF50] font-bold hover:underline">VIEW ALL</button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {recentUsers.map((user) => (
              <div key={user.id} className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users size={14} className="text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">@{user.username || 'unknown'}</p>
                  <p className="text-[9px] text-gray-500">{new Date(user.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Critical Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => window.location.href = '/dashboard/reports'} className="flex flex-col items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl hover:scale-[1.02] transition-transform">
              <ShieldAlert className="text-red-500" size={20} />
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{stats.reportedPosts} REPORTS</span>
            </button>
            <button onClick={() => window.location.href = '/dashboard/users'} className="flex flex-col items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-xl hover:scale-[1.02] transition-transform">
              <Users className="text-green-500" size={20} />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">USERS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
