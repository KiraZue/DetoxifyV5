import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../components/theme';
import { API_URL } from '../../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatbotScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // We use a larger offset for iOS to account for the Tab Bar
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : 0;

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Prepare messages for OpenAI format (only role and content)
      const apiMessages = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
        >
          {messages.length < 3 && (
            <View style={styles.welcomeContainer}>
              <View style={[styles.botAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="chatbubble-ellipses" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Detoxify AI</Text>
              <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
                Ask me about routines, streaks, or healthy habits!
              </Text>
            </View>
          )}

          <View style={styles.chatArea}>
            {messages.map((message, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageWrapper,
                  message.role === 'user' ? styles.userWrapper : styles.botWrapper
                ]}
              >
                <View 
                  style={[
                    styles.messageBubble, 
                    message.role === 'user' 
                      ? [styles.userMessage, { backgroundColor: colors.primary }] 
                      : [styles.botMessage, { backgroundColor: colors.surface }]
                  ]}
                >
                  <Text 
                    style={[
                      styles.messageText, 
                      { color: message.role === 'user' ? '#FFFFFF' : colors.text }
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text 
                    style={[
                      styles.messageTime, 
                      { color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : colors.textMuted }
                    ]}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View style={styles.botWrapper}>
                <View style={[styles.messageBubble, styles.botMessage, { backgroundColor: colors.surface, paddingVertical: spacing.sm }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Type your message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              { backgroundColor: inputText.trim() ? colors.primary : colors.textMuted }
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  botAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  welcomeSub: {
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  chatArea: {
    flex: 1,
    gap: spacing.md,
  },
  messageWrapper: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  botWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  botMessage: {
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
