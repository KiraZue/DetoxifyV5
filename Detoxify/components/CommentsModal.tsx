import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { API_URL } from '../config';
import { spacing, fontSize, fontWeight, borderRadius } from './theme';
import { useTheme } from './ThemeContext';

interface Comment {
  id: string;
  user: {
    name: string;
    avatar?: string | null;
  };
  text: string;
  time: string;
  replies?: Comment[];
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId?: string;
  initialCount?: number;
  onAddComment?: (newCount: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  postId,
  onAddComment,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { colors } = useTheme();

  React.useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
    fetchUser();
  }, [visible, postId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({
        name: user.user_metadata?.username || 'Anonymous',
        avatar: user.user_metadata?.avatar_url || null,
        id: user.id, // Add ID for posting
      });
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setComments(data);
      } else {
        console.error('Invalid comments data received:', data);
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<{ name: string; avatar: string | null; id?: string }>({
    name: 'Anonymous',
    avatar: null,
  });

  const handlePostComment = async () => {
    if (!newComment.trim() || !postId || !currentUser.id) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          content: newComment,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh comments list
        fetchComments();
        setNewComment('');
        if (onAddComment) onAddComment(result.comments);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim() || !postId || !currentUser.id) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          content: replyText,
          parent_id: commentId,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchComments();
        setReplyText('');
        setReplyingTo(null);
        if (onAddComment) onAddComment(result.comments);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <View key={comment.id} style={[styles.comment, isReply && styles.reply]}>
      <View style={[styles.commentAvatar, { backgroundColor: colors.surface }]}>
        {comment.user.avatar ? (
          <Image source={{ uri: comment.user.avatar }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={isReply ? 16 : 20} color={colors.primary} />
        )}
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUser, { color: colors.text }]}>{comment.user.name}</Text>
          <Text style={[styles.commentTime, { color: colors.textMuted }]}>{comment.time}</Text>
        </View>
        <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>
        {!isReply && (
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          >
            <Text style={[styles.replyButtonText, { color: colors.textMuted }]}>Reply</Text>
          </TouchableOpacity>
        )}
        {replyingTo === comment.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={[styles.replyInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
            />
            <TouchableOpacity 
              style={[styles.replyPostButton, { backgroundColor: colors.primary }]}
              onPress={() => handlePostReply(comment.id)}
            >
              <Ionicons name="send" size={16} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
          <View style={styles.closeButton} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Comments List */}
          <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No comments yet</Text>
              </View>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Comment Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.inputAvatar, { backgroundColor: colors.surface }]}>
            {currentUser.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={20} color={colors.primary} />
            )}
          </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity 
              style={[styles.postButton, { backgroundColor: newComment.trim() ? colors.primary : colors.disabled }]}
              onPress={handlePostComment}
              disabled={!newComment.trim()}
            >
              <Text style={[styles.postButtonText, { color: colors.secondary }]}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  keyboardView: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
    padding: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  reply: {
    marginLeft: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 0,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentUser: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  commentTime: {
    fontSize: fontSize.sm,
  },
  commentText: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  replyButton: {
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  replyInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
  },
  replyPostButton: {
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repliesContainer: {
    marginTop: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  postButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  postButtonText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
});
