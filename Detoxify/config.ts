import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  // Always use localhost for web
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  
  // Use development host if available (Expo Go)
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost && __DEV__) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:3000`;
  }
  
  // PRODUCTION / APK FALLBACK: Use your laptop's current local IP
  // Note: Change this if your laptop IP changes!
  const productionIp = '10.0.0.12'; 
  return `http://${productionIp}:3000`;
};

export const API_URL = getApiUrl();
