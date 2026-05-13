import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { API_URL } from '../config';
import { colors, spacing, fontSize, fontWeight, borderRadius } from './theme';
import { Button } from './Button';
import { useNotification } from './NotificationProvider';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.xl * 2 - spacing.md) / 2;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const Profiles = () => {
  const { showToast } = useNotification();
  const { isDarkMode, toggleTheme, colors: themeColors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);

  const [themeExpanded, setThemeExpanded] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);

  const toggleThemeExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeExpanded((v) => !v);
  };

  const toggleHelpExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHelpExpanded((v) => !v);
  };

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        setUsername(user.user_metadata?.username || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
        fetchUserPosts(user.id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserPosts(id: string) {
    try {
      const response = await fetch(`${API_URL}/api/posts?author_id=${id}`);
      const data = await response.json();
      if (Array.isArray(data)) setUserPosts(data);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      let finalAvatarUrl = avatarUrl;

      if (avatarUrl && avatarUrl.startsWith('file://')) {
        const formData = new FormData();
        const uriParts = avatarUrl.split('.');
        const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
        
        formData.append('avatar', {
          uri: avatarUrl,
          name: `avatar_${user.id}.${fileExtension}`,
          type: `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`,
        } as any);

        const response = await fetch(`${API_URL}/api/profiles/avatar`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload avatar');
        finalAvatarUrl = data.avatar_url;
      }
      
      const { error } = await supabase.auth.updateUser({
        data: { username, avatar_url: finalAvatarUrl }
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;
      
      setAvatarUrl(finalAvatarUrl);
      showToast({ message: '✨ Profile updated successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast({ message: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error signing out', error.message);
  }

  if (loading && !user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Absolute Settings Icon at the very top right */}
      <TouchableOpacity 
        style={styles.absoluteSettingsBtn} 
        onPress={() => setSettingsVisible(true)}
      >
        <Ionicons name="settings-outline" size={26} color={themeColors.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Main Profile Info */}
        <View style={styles.heroSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: themeColors.surface }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Ionicons name="person" size={60} color={themeColors.textMuted} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: themeColors.primary, borderColor: themeColors.background }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.email, { color: themeColors.textLight }]}>{user?.email}</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textLight }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={themeColors.textMuted}
              autoCapitalize="none"
            />
          </View>
          
          <Button 
            title="Save Changes" 
            onPress={updateProfile} 
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        {/* Showcase Section */}
        <View style={styles.showcaseSection}>
          <Text style={[styles.sectionHeader, { color: themeColors.text }]}>My Posts</Text>

          <View style={styles.grid}>
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <View key={post.id} style={[styles.gridItem, { backgroundColor: themeColors.surface }]}>
                  {post.image ? (
                    <Image source={{ uri: post.image }} style={styles.gridImage} />
                  ) : (
                    <View style={[styles.gridImage, { backgroundColor: post.bgColor || themeColors.surface, padding: 10 }]}>
                      <Text style={[styles.gridText, { color: themeColors.text }]} numberOfLines={3}>{post.textContent}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyShowcase}>
                <Ionicons name="images-outline" size={32} color={themeColors.textMuted} />
                <Text style={[styles.emptyShowcaseText, { color: themeColors.textMuted }]}>No posts yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Settings</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={toggleThemeExpanded}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="color-palette-outline" size={22} color={themeColors.text} />
                <Text style={[styles.settingText, { color: themeColors.text }]}>Theme</Text>
              </View>
              <Ionicons 
                name={themeExpanded ? "chevron-down" : "chevron-forward"} 
                size={20} 
                color={themeColors.textMuted} 
              />
            </TouchableOpacity>

            {themeExpanded && (
              <View style={[styles.expandedSection, { backgroundColor: themeColors.surface }]}>
                <View style={styles.subSettingRow}>
                  <View style={styles.subSettingLeft}>
                    <Ionicons name="moon-outline" size={20} color={themeColors.textLight} />
                    <Text style={[styles.subSettingText, { color: themeColors.text }]}>Dark Mode</Text>
                  </View>
                  <Switch 
                    value={isDarkMode} 
                    onValueChange={toggleTheme}
                    trackColor={{ false: themeColors.border, true: themeColors.primary + '80' }}
                    thumbColor={isDarkMode ? themeColors.primary : '#f4f3f4'}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: themeColors.border }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="ribbon-outline" size={22} color={themeColors.text} />
                <Text style={[styles.settingText, { color: themeColors.text }]}>Credit</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: themeColors.border }]}
              onPress={toggleHelpExpanded}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle-outline" size={22} color={themeColors.text} />
                <Text style={[styles.settingText, { color: themeColors.text }]}>Help & Support</Text>
              </View>
              <Ionicons
                name={helpExpanded ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={themeColors.textMuted}
              />
            </TouchableOpacity>

            {helpExpanded && (
              <View style={[styles.expandedSection, { backgroundColor: themeColors.surface }]}>
                <Text style={[styles.comingSoonText, { color: themeColors.textMuted }]}>
                  Coming Soon
                </Text>
              </View>
            )}

            <View style={styles.signOutContainer}>
              <Button 
                title="Sign Out" 
                onPress={handleSignOut}
                variant="danger"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteSettingsBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: spacing.sm,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  email: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  formSection: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  showcaseSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridText: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
  emptyShowcase: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyShowcaseText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    padding: spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  expandedSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  subSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  subSettingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subSettingText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  comingSoonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  signOutContainer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  signOutBtn: {
    borderColor: colors.error,
  },
});
