'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Loader2, 
  Search,
  MessageSquare,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://detoxify-v5.vercel.app';

type AdminUserRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  streak: number;
  postCount: number;
  is_banned: boolean;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async (showLoadingSpinner: boolean) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = (await response.json()) as AdminUserRow[];
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchUsers(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleBanUser = async (userId: string, currentBannedStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentBannedStatus ? 'unban' : 'ban'} this user?`)) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: !currentBannedStatus })
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !currentBannedStatus } : u));
      } else {
        throw new Error('Action failed');
      }
    } catch {
      alert('Failed to update ban status. Make sure backend is running.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('CRITICAL: This will permanently delete the user from AUTH and all their data. Are you sure?')) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        throw new Error('Action failed');
      }
    } catch {
      alert('Failed to delete user. Make sure backend is running.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="animate-spin text-[#4CAF50]" size={40} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-[#4CAF50]" />
            User Management
          </h2>
          <p className="text-[10px] text-gray-500 font-medium">Monitor and manage community members.</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#18181b] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl w-full md:w-64 outline-none focus:border-[#4CAF50] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur z-10">
              <tr className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4">User Profile</th>
                <th className="px-6 py-4">Stats</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all group">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users size={14} className="text-gray-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">@{user.username || 'unknown'}</p>
                        <p className="text-[9px] text-gray-400 font-mono opacity-60 truncate max-w-[100px]">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Zap size={12} fill="currentColor" /> {user.streak}
                      </div>
                      <div className="flex items-center gap-1 text-blue-500 font-bold">
                        <MessageSquare size={12} /> {user.postCount}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      user.is_banned 
                        ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
                        : 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-red-900/30'
                    }`}>
                      {user.is_banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleBanUser(user.id, user.is_banned)}
                        disabled={actionLoading === user.id}
                        className={`p-1.5 rounded-lg transition-all ${
                          user.is_banned 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                        }`}
                      >
                        {user.is_banned ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                      >
                        {actionLoading === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="py-20 text-center text-gray-400 text-xs">No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
