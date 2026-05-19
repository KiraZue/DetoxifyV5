import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

if (!genAI) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY is missing in .env. Chatbot will not work, but the rest of the server is running.');
}

// Initialize Storage Buckets
const initBuckets = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    const requiredBuckets = ['post-images', 'avatars'];
    for (const bucketName of requiredBuckets) {
      if (!buckets?.find(b => b.name === bucketName)) {
        console.log(`Creating missing bucket: ${bucketName}`);
        await supabase.storage.createBucket(bucketName, { public: true });
      }
    }
  } catch (err) {
    console.error('Bucket initialization failed:', err);
  }
};
initBuckets();

app.use(cors());
app.use(express.json());

// Use memory storage for multer as we'll upload to Supabase Storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/api/posts', async (req, res) => {
  const user_id = req.query.user_id as string || '00000000-0000-0000-0000-000000000000';
  const author_id = req.query.author_id as string;
  
  let query = supabase
    .from('posts')
    .select('*, profiles(username, avatar_url), post_likes!left(user_id)')
    .order('created_at', { ascending: false });

  if (author_id) {
    query = query.eq('user_id', author_id);
  }
  
  const { data: posts, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }

  const formattedPosts = posts.map((post: any) => {
    const isLiked = post.post_likes.some((like: any) => like.user_id === user_id);
    
    // Get public URL for the image if it exists
    let imageUrl: string | null = null;
    if (post.image_url) {
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(post.image_url);
      imageUrl = data.publicUrl;
    }

    return {
      id: post.id.toString(),
      user: { 
        name: post.profiles?.username || post.user_name || 'Anonymous', 
        avatar: post.profiles?.avatar_url || '' 
      },
      image: imageUrl,
      caption: post.caption || '',
      textContent: post.text_content || '',
      bgColor: post.bg_color || null,
      type: post.type,
      likes: post.likes,
      isLiked: isLiked,
      comments: post.comments,
      time: formatTime(post.created_at)
    };
  });

  res.json(formattedPosts);
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
  const { user_name, type, caption, text_content, bg_color, user_id } = req.body;
  let image_filename: string | null = null;

  if (req.file) {
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    image_filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(image_filename, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('Error uploading image to Supabase:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user_id || null,
      user_name: user_name || 'Your Name',
      type,
      image_url: image_filename,
      caption,
      text_content,
      bg_color
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }

  res.json({
    id: data.id,
    message: 'Post created successfully',
    image_filename: image_filename
  });
});

app.post('/api/profiles/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file;
  const fileExt = file.originalname.split('.').pop();
  const filename = `avatar_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
    });

  if (uploadError) {
    console.error('Error uploading avatar to Supabase:', uploadError);
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filename);

  res.json({ avatar_url: publicUrl });
});

app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', id)
    .eq('user_id', user_id)
    .maybeSingle();

  let newLiked: boolean;
  if (existingLike) {
    await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user_id);
    await supabase.rpc('decrement_likes', { post_id_param: parseInt(id) });
    newLiked = false;
  } else {
    await supabase.from('post_likes').insert({ post_id: parseInt(id), user_id });
    await supabase.rpc('increment_likes', { post_id_param: parseInt(id) });
    newLiked = true;
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('likes')
    .eq('id', id)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json({ likes: post.likes, liked: newLiked });
});

// Get comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  
  const { data: comments, error } = await supabase
    .from('post_comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      parent_id,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('post_id', id)
    .order('created_at', { ascending: true }); // Ascending so parent comes before child

  if (error) return res.status(500).json({ error: error.message });

  // Format and nest comments
  const commentMap = new Map();
  const topLevelComments: any[] = [];

  comments.forEach((c: any) => {
    const formatted = {
      id: c.id.toString(),
      user: {
        name: c.profiles?.username || 'Anonymous',
        avatar: c.profiles?.avatar_url || null,
      },
      text: c.content,
      time: formatTime(c.created_at),
      replies: [],
    };
    commentMap.set(formatted.id, formatted);

    if (c.parent_id) {
      const parent = commentMap.get(c.parent_id.toString());
      if (parent) parent.replies.push(formatted);
    } else {
      topLevelComments.push(formatted);
    }
  });

  res.json(topLevelComments.reverse()); // Reverse top-level to show newest first
});

// Add a comment or reply
app.post('/api/posts/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { user_id, content, parent_id } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'user_id and content are required' });
  }

  const { error: commentError } = await supabase
    .from('post_comments')
    .insert({
      post_id: id,
      user_id: user_id,
      content: content,
      parent_id: parent_id || null,
    });

  if (commentError) return res.status(500).json({ error: commentError.message });

  await supabase.rpc('increment_comments', { post_id_param: id });

  const { data: post } = await supabase.from('posts').select('comments').eq('id', id).single();
  res.json({ success: true, comments: post?.comments || 0 });
});

// ROUTINES & STREAKS
app.get('/api/routines', async (req, res) => {
  const { user_id } = req.query;
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('routine_completions')
    .select('task_id')
    .eq('user_id', user_id)
    .gte('completed_at', `${today}T00:00:00Z`)
    .lte('completed_at', `${today}T23:59:59Z`);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ completed_tasks: data.map((d: any) => d.task_id) });
});

app.post('/api/routines/toggle', async (req, res) => {
  const { user_id, task_id, category, is_completed } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (is_completed) {
    const { error } = await supabase
      .from('routine_completions')
      .insert({ user_id, task_id, category, completed_at: new Date().toISOString() });
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase
      .from('routine_completions')
      .delete()
      .eq('user_id', user_id)
      .eq('task_id', task_id)
      .gte('completed_at', `${today}T00:00:00Z`)
      .lte('completed_at', `${today}T23:59:59Z`);
    if (error) return res.status(500).json({ error: error.message });
  }

  // Check if all routines are complete (24 tasks total: 8 per category * 3 categories)
  const { count, error: countError } = await supabase
    .from('routine_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .gte('completed_at', `${today}T00:00:00Z`)
    .lte('completed_at', `${today}T23:59:59Z`);

  if (!countError && count === 24) {
    // Check if streak was already updated today
    const { data: streakData } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const lastDate = streakData?.last_completed_date;
    if (lastDate !== today) {
      let newStreak = 1;
      if (lastDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastDate === yesterdayStr) {
          newStreak = (streakData.current_streak || 0) + 1;
        }
      }

      await supabase
        .from('user_streaks')
        .upsert({ 
          user_id, 
          current_streak: newStreak, 
          last_completed_date: today,
          updated_at: new Date().toISOString()
        });
        
      return res.json({ completed: true, all_done: true, streak_updated: true, new_streak: newStreak });
    }
  }

  res.json({ completed: true, all_done: count === 24 });
});

app.get('/api/streaks/:user_id', async (req, res) => {
  const { user_id } = req.params;
  console.log(`Fetching streak for user: ${user_id}`);
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, last_completed_date')
    .eq('user_id', user_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`Supabase error for user ${user_id}:`, error);
    return res.status(500).json({ error: error.message });
  }
  
  if (!data) {
    console.log(`No streak found for user ${user_id}, returning 0`);
    return res.json({ current_streak: 0 });
  }

  // Reset streak if missed a day
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (data.last_completed_date !== today && data.last_completed_date !== yesterdayStr) {
    return res.json({ current_streak: 0 });
  }

  res.json(data);
});

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}


// ADMIN ENDPOINTS
app.get('/api/admin/users', async (req, res) => {
  try {
    // 1. Fetch all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (profileError) throw profileError;

    // 2. Fetch streaks for all users
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('*');

    // 3. Fetch post counts for all users
    const { data: postCounts } = await supabase
      .from('posts')
      .select('user_id');

    // Aggregate data
    const users = profiles.map((p: any) => {
      const streak = streaks?.find((s: any) => s.user_id === p.id);
      const count = postCounts?.filter((pc: any) => pc.user_id === p.id).length || 0;
      
      return {
        ...p,
        streak: streak?.current_streak || 0,
        postCount: count
      };
    });

    res.json(users);
  } catch (error: any) {
    console.error('Admin Fetch Users Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/ban', async (req, res) => {
  const { id } = req.params;
  const { is_banned } = req.body;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, is_banned });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`--- Admin: Deleting User ${id} ---`);

  try {
    // 1. Delete from profiles table first 
    // (This should trigger cascades to posts/comments if set up in SQL)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (profileError) {
      console.warn('Profile deletion warning (might not exist):', profileError.message);
    }

    // 2. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) {
      console.error('Auth deletion error:', authError.message);
      throw authError;
    }

    console.log(`User ${id} deleted successfully from Auth and Profiles`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Admin Delete User Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chatbot Endpoint
app.post('/api/chat', async (req, res) => {
  console.log('--- New Chat Request ---');
  const { messages } = req.body;

  if (!genAI) {
    console.error('Gemini error: genAI is not initialized');
    return res.status(503).json({ error: 'Chatbot service is not configured.' });
  }

  if (!messages || !Array.isArray(messages)) {
    console.error('Request error: messages array is missing');
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are Detoxify AI, a helpful assistant for a health and wellness app called Detoxify. Your goal is to help users maintain their detox routines, stay motivated, and answer questions about healthy habits. Be encouraging, concise, and professional."
    });

    // Convert history to Gemini format (role must be 'user' or 'model')
    // Note: Gemini requires the first message in history to be from the 'user'
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })).filter((m, i) => i > 0 || m.role === 'user'); // Remove initial assistant greeting if it's the first message

    const lastMessage = messages[messages.length - 1].content;
    console.log(`Sending to Gemini: "${lastMessage.substring(0, 50)}..."`);

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();
    
    console.log('Gemini responded successfully');

    res.json({ 
      message: { 
        role: 'assistant', 
        content: responseText 
      } 
    });
  } catch (error: any) {
    console.error('Gemini API Error Detail:', error);
    res.status(500).json({ error: 'Failed to get response from AI', detail: error.message });
  }
});


// 404 Handler
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
