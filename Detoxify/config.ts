import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  // Always connect to live Vercel backend, even during local development
  return 'https://detoxify-v5.vercel.app';
};

export const API_URL = getApiUrl();
