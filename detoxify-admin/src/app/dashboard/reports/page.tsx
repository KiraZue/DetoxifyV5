'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Trash2, CheckCircle, Loader2 } from 'lucide-react';

type PendingReportRow = {
  id: string;
  created_at: string;
  reason: string;
  post_id: string;
  post?: {
    image_url?: string | null;
    image?: string | null;
    text_content?: string | null;
    caption?: string | null;
  } | null;
  reporter?: { username?: string | null } | null;
};

export default function PendingReportsPage() {
  const [reports, setReports] = useState<PendingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async (showLoadingSpinner: boolean) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const { data: detailedData, error: detailedError } = await supabase
        .from('reports')
        .select(`
          *,
          post:posts(*),
          reporter:profiles(username)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (detailedError) throw detailedError;
      setReports((detailedData as PendingReportRow[] | null) || []);
    } catch (error) {
      console.error('Error in fetchReports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchReports(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleDeletePost = async (reportId: string, postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setActionLoading(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('posts').delete().eq('id', postId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      await supabase.from('admin_logs').insert({
        admin_id: session?.user?.id,
        action: 'delete_post',
        target_id: postId,
        details: { report_id: reportId }
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error: unknown) {
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      await supabase.from('admin_logs').insert({
        admin_id: session?.user?.id,
        action: 'dismiss_report',
        target_id: reportId
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error: unknown) {
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  const getFullImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/post-images/${path}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#4CAF50]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={20} />
            Pending Reports ({reports.length})
          </h2>
          <p className="text-[10px] text-gray-500">Action required on flagged content.</p>
        </div>
        <button type="button" onClick={() => void fetchReports(true)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
          Refresh
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {reports.length === 0 ? (
          <div className="bg-white dark:bg-[#18181b] p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center h-full flex flex-col items-center justify-center">
            <CheckCircle size={32} className="text-green-500 mb-2 opacity-20" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">All Clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const imageUrl = getFullImageUrl(report.post?.image_url || report.post?.image || null);
              return (
                <div key={report.id} className="bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[180px]">
                  <div className="flex flex-1 min-h-0">
                    <div className="w-1/3 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-2 border-r border-gray-100 dark:border-gray-800">
                      {imageUrl ? (
                        <img src={imageUrl} className="max-h-full max-w-full rounded object-contain" alt="Content" />
                      ) : (
                        <p className="text-[10px] text-gray-400 italic line-clamp-4">
                          &ldquo;{report.post?.text_content || report.post?.caption || 'No text'}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                      <div className="min-w-0">
                        <p className="text-[9px] text-gray-400 mb-1">{new Date(report.created_at).toLocaleString()}</p>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">@{report.reporter?.username || 'unknown'}</p>
                        <p className="text-[10px] text-red-500 font-medium mt-1 line-clamp-2">{report.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading === report.id}
                          onClick={() => handleDeletePost(report.id, report.post_id)}
                          className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                        >
                          {actionLoading === report.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
                        <button
                          disabled={actionLoading === report.id}
                          onClick={() => handleDismissReport(report.id)}
                          className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={12} />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
