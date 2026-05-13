'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Loader2, Leaf } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access denied. You do not have administrator privileges.');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#09090b] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#4CAF50] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-200 dark:shadow-none">
            <Leaf size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detoxify Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to manage your community</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4CAF50] outline-none transition-all text-gray-900 dark:text-white"
                placeholder="admin@detoxify.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4CAF50] outline-none transition-all text-gray-900 dark:text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#4CAF50] hover:bg-[#43a047] disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-green-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Only authorized administrators can access this portal.
        </p>
      </div>
    </div>
  );
}
