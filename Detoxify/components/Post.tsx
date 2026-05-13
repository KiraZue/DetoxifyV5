import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { spacing, fontSize, fontWeight } from './theme';
import { Card } from './Card';
import { useNotification } from './NotificationProvider';
import { useTheme } from './ThemeContext';
import { CommentsModal } from './CommentsModal';
import { PostOptions } from './PostOptions';
import { supabase } from '../supabase';

interface Comment {
  id: string;
  user: {
    name: string;
  };
  text: string;
  time: string;
  replies?: Comment[];
}

interface PostProps {
  user: {
    name: string;
    avatar: string;
  };
  image?: string | null;
  caption: string;
  likes: number;
  isLiked?: boolean;
  comments: number;
  time: string;
  postId?: string;
  initialComments?: Comment[];
  style?: StyleProp<ViewStyle>;
  type?: 'photo' | 'text';
  bgColor?: string | null;
  textContent?: string;
}

export const Post: React.FC<PostProps> = ({
  user,
  image,
  caption,
  likes,
  isLiked: initialIsLiked = false,
  comments,
  time,
  postId,
  initialComments = [],
  style,
  type = 'photo',
  bgColor,
  textContent,
}) => {
  const { showToast } = useNotification();
  const { colors } = useTheme();
  const [isLiked, setIsLiked] = React.useState(initialIsLiked);
  const [likeCount, setLikeCount] = React.useState(likes);
  const [commentCount, setCommentCount] = React.useState(comments);
  const [showComments, setShowComments] = React.useState(false);
  const [showOptions, setShowOptions] = React.useState(false);
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  React.useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  const handleCommentUpdate = (newCount: number) => {
    setCommentCount(newCount);
  };

  const handleLike = async () => {
    if (postId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          console.error('User must be logged in to like');
          return;
        }

        const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await response.json();
        setIsLiked(data.liked);
        setLikeCount(data.likes);
        
        if (data.liked) {
          showToast({ message: '🌿 Liked!', type: 'success', icon: 'leaf' });
        }
      } catch (error) {
        console.error('Error liking post:', error);
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      }
    } else {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleReport = async () => {
    if (!postId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        showToast({ message: 'Please sign in to report', type: 'error' });
        return;
      }

      console.log('Attempting to report post:', { postId, userId });

      const { data, error } = await supabase
        .from('reports')
        .insert([
          { 
            post_id: postId, 
            reporter_id: userId,
            reason: 'Reported by user'
          }
        ])
        .select();

      console.log('Supabase Report Response:', { data, error });

      if (error) throw error;

      showToast({ message: '🌿 Report sent for review', type: 'success', icon: 'shield-checkmark' });
    } catch (error) {
      console.error('Error reporting post:', error);
      showToast({ message: 'Failed to send report', type: 'error' });
    }
  };

  return (
    <>
      <Card style={[styles.container, style]}>
        {/* User Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
            )}
            <View>
              <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
              <Text style={[styles.time, { color: colors.textLight }]}>{time}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Caption - Above Image */}
        {caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
          </View>
        )}

        {/* Post Content */}
        {type === 'photo' ? (
          <>
            {image ? (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: image }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                </View>
              </View>
            )}
          </>
        ) : type === 'text' ? (
          <View style={[styles.textContentContainer, { backgroundColor: bgColor || colors.surface }]}>
            <Text style={[styles.textContent, { color: colors.text }]}>{textContent || caption}</Text>
          </View>
        ) : null}

        {/* Interactions */}
        <View style={styles.interactions}>
          <View style={styles.leftInteractions}>
            <TouchableOpacity onPress={handleLike} style={styles.interactionButton}>
              <Ionicons 
                name={isLiked ? "leaf" : "leaf-outline"} 
                size={24} 
                color={isLiked ? colors.primary : colors.text} 
              />
              <Text style={[styles.interactionText, { color: colors.text }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowComments(true)} style={styles.interactionButton}>
              <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
              <Text style={[styles.interactionText, { color: colors.text }]}>{commentCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={postId}
        initialCount={commentCount}
        onAddComment={handleCommentUpdate}
      />

      <PostOptions
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onBookmark={handleBookmark}
        onReport={handleReport}
        isBookmarked={isBookmarked}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
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
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  time: {
    fontSize: fontSize.xs,
  },
  captionContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  caption: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContentContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  textContent: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  interactions: {
    padding: spacing.md,
  },
  leftInteractions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  interactionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
