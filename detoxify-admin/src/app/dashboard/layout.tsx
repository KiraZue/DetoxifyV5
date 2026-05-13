'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  BarChart3, 
  LogOut, 
  Leaf,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        // Verify admin role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || profile?.role !== 'admin') {
          await supabase.auth.signOut();
          router.push('/login');
        } else {
          setLoading(false);
        }
      }
    };
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#09090b]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50]"></div>
      </div>
    );
  }

  const menuItems = [
    { name: 'Overview', icon: BarChart3, path: '/dashboard' },
    { name: 'Users', icon: Users, path: '/dashboard/users' },
    { name: 'Reports', icon: ShieldAlert, path: '/dashboard/reports' },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] dark:bg-[#09090b]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#18181b] border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 bg-[#4CAF50] rounded-xl flex items-center justify-center">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white leading-tight">Detoxify</h1>
            <p className="text-xs text-gray-500 font-medium">ADMIN PORTAL</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-green-50 dark:bg-green-900/10 text-[#4CAF50] font-semibold' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {menuItems.find(i => i.path === pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
              <p className="text-xs text-gray-500">Super Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <Users size={18} className="text-gray-500" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
