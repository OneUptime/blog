# How to Implement Biometric Authentication in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Biometric Authentication, Face ID, Touch ID, Fingerprint, Security, Mobile Development

Description: Learn how to implement biometric authentication (Face ID, Touch ID, Fingerprint) in React Native for secure and convenient user authentication.

---

## Introduction

Biometric authentication has become the gold standard for mobile app security. Users expect the convenience of unlocking apps with their face or fingerprint rather than typing passwords. In this comprehensive guide, we will explore how to implement biometric authentication in React Native applications, covering both iOS (Face ID/Touch ID) and Android (Fingerprint/Face Recognition) platforms.

By the end of this tutorial, you will understand how to:
- Check for biometric hardware availability
- Prompt users for biometric authentication
- Handle authentication results gracefully
- Implement fallback mechanisms
- Integrate biometrics with secure storage
- Follow security best practices

## Understanding Biometric Authentication

### What is Biometric Authentication?

Biometric authentication uses unique physical characteristics to verify a user's identity. The most common types in mobile devices include:

- **Fingerprint Recognition (Touch ID):** Uses the unique patterns of a user's fingerprint
- **Facial Recognition (Face ID):** Analyzes facial features using depth sensors and machine learning
- **Iris Scanning:** Less common but highly secure method using eye patterns

### Why Use Biometric Authentication?

1. **Enhanced Security:** Biometrics are unique to each individual and difficult to replicate
2. **Improved User Experience:** Faster and more convenient than typing passwords
3. **Reduced Password Fatigue:** Users do not need to remember complex passwords
4. **Compliance:** Meets security requirements for financial and healthcare apps
5. **Multi-Factor Authentication:** Can be combined with other authentication methods

### Platform Support Overview

| Platform | Biometric Types | Minimum OS Version |
|----------|-----------------|-------------------|
| iOS | Face ID, Touch ID | iOS 8+ (Touch ID), iOS 11+ (Face ID) |
| Android | Fingerprint, Face, Iris | Android 6.0+ (API 23) |

## Setting Up Your Project

Before implementing biometric authentication, ensure your React Native project is properly configured. We will cover two popular libraries:

1. **expo-local-authentication:** Best for Expo managed workflow
2. **react-native-biometrics:** Best for bare React Native projects

### Prerequisites

```bash
# Ensure you have React Native CLI installed
npx react-native --version

# For Expo projects
npx expo --version
```

## Method 1: Using expo-local-authentication

The `expo-local-authentication` library provides a simple API for biometric authentication in Expo and bare React Native projects.

### Installation

```bash
# For Expo managed projects
npx expo install expo-local-authentication

# For bare React Native projects
npm install expo-local-authentication
npx expo install expo-local-authentication
```

### iOS Configuration

Add the following to your `ios/YourApp/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID to securely authenticate you</string>
```

### Android Configuration

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### Basic Implementation

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Types for biometric authentication
interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

// Check if biometric hardware is available
async function checkBiometricAvailability(): Promise<BiometricCapabilities> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

  return {
    hasHardware,
    isEnrolled,
    supportedTypes,
    securityLevel,
  };
}

// Get human-readable biometric type name
function getBiometricTypeName(
  types: LocalAuthentication.AuthenticationType[]
): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometrics';
}
```

### Complete Authentication Hook

```typescript
import { useState, useCallback, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

interface UseBiometricAuthOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}

interface UseBiometricAuthReturn {
  isAvailable: boolean;
  biometricType: string;
  isAuthenticating: boolean;
  authenticate: () => Promise<BiometricAuthResult>;
  checkAvailability: () => Promise<void>;
}

export function useBiometricAuth(
  options: UseBiometricAuthOptions = {}
): UseBiometricAuthReturn {
  const {
    promptMessage = 'Authenticate to continue',
    cancelLabel = 'Cancel',
    fallbackLabel = 'Use Passcode',
    disableDeviceFallback = false,
  } = options;

  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const checkAvailability = useCallback(async (): Promise<void> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setIsAvailable(hasHardware && isEnrolled);
      setBiometricType(getBiometricTypeName(supportedTypes));
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const authenticate = useCallback(async (): Promise<BiometricAuthResult> => {
    if (!isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        fallbackLabel,
        disableDeviceFallback,
      });

      if (result.success) {
        return { success: true };
      }

      // Handle different error types
      switch (result.error) {
        case 'user_cancel':
          return { success: false, error: 'Authentication cancelled by user' };
        case 'user_fallback':
          return { success: false, warning: 'User chose fallback authentication' };
        case 'system_cancel':
          return { success: false, error: 'Authentication cancelled by system' };
        case 'not_enrolled':
          return { success: false, error: 'No biometrics enrolled on device' };
        case 'lockout':
          return { success: false, error: 'Too many failed attempts. Try again later.' };
        case 'lockout_permanent':
          return { success: false, error: 'Biometrics permanently locked. Use device passcode.' };
        default:
          return { success: false, error: 'Authentication failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAvailable, promptMessage, cancelLabel, fallbackLabel, disableDeviceFallback]);

  return {
    isAvailable,
    biometricType,
    isAuthenticating,
    authenticate,
    checkAvailability,
  };
}
```

### Usage in a Component

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useBiometricAuth } from './hooks/useBiometricAuth';

export function BiometricLoginScreen(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const {
    isAvailable,
    biometricType,
    isAuthenticating,
    authenticate,
  } = useBiometricAuth({
    promptMessage: 'Sign in to MyApp',
    fallbackLabel: 'Use Password',
  });

  const handleAuthenticate = async (): Promise<void> => {
    const result = await authenticate();

    if (result.success) {
      setIsAuthenticated(true);
      Alert.alert('Success', 'You are now authenticated!');
    } else if (result.error) {
      Alert.alert('Authentication Failed', result.error);
    } else if (result.warning) {
      // Handle fallback case
      navigateToPasswordLogin();
    }
  };

  const navigateToPasswordLogin = (): void => {
    // Navigate to password login screen
    console.log('Navigating to password login');
  };

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Biometric authentication is not available on this device.
        </Text>
        <TouchableOpacity style={styles.button} onPress={navigateToPasswordLogin}>
          <Text style={styles.buttonText}>Use Password Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>
        Use {biometricType} to sign in quickly and securely
      </Text>

      <TouchableOpacity
        style={[styles.biometricButton, isAuthenticating && styles.buttonDisabled]}
        onPress={handleAuthenticate}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.biometricButtonText}>
            Sign in with {biometricType}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={navigateToPasswordLogin}>
        <Text style={styles.linkText}>Use password instead</Text>
      </TouchableOpacity>

      {isAuthenticated && (
        <View style={styles.successBadge}>
          <Text style={styles.successText}>Authenticated</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  biometricButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  successBadge: {
    marginTop: 30,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  successText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

## Method 2: Using react-native-biometrics

For more advanced features and better control over the authentication flow, `react-native-biometrics` is an excellent choice.

### Installation

```bash
npm install react-native-biometrics

# iOS pods installation
cd ios && pod install && cd ..
```

### iOS Configuration

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to use Face ID for authentication</string>
```

### Android Configuration

Ensure `minSdkVersion` is at least 23 in `android/build.gradle`:

```groovy
buildscript {
    ext {
        minSdkVersion = 23
        // ...
    }
}
```

### Implementation with Key Generation

```typescript
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

interface BiometricKeyPair {
  publicKey: string;
  created: boolean;
}

// Check available biometric type
async function checkBiometricType(): Promise<string | null> {
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();

  if (!available) {
    return null;
  }

  switch (biometryType) {
    case BiometryTypes.TouchID:
      return 'Touch ID';
    case BiometryTypes.FaceID:
      return 'Face ID';
    case BiometryTypes.Biometrics:
      return 'Biometrics';
    default:
      return null;
  }
}

// Generate cryptographic keys protected by biometrics
async function createBiometricKeys(): Promise<BiometricKeyPair | null> {
  try {
    const { keysExist } = await rnBiometrics.biometricKeysExist();

    if (keysExist) {
      // Delete existing keys and create new ones
      await rnBiometrics.deleteKeys();
    }

    const { publicKey } = await rnBiometrics.createKeys();

    return {
      publicKey,
      created: true,
    };
  } catch (error) {
    console.error('Error creating biometric keys:', error);
    return null;
  }
}

// Create a cryptographic signature with biometric verification
async function createSignature(payload: string): Promise<string | null> {
  try {
    const { success, signature } = await rnBiometrics.createSignature({
      promptMessage: 'Confirm your identity',
      payload,
    });

    if (success && signature) {
      return signature;
    }

    return null;
  } catch (error) {
    console.error('Error creating signature:', error);
    return null;
  }
}

// Simple biometric prompt (no cryptographic operations)
async function simplePrompt(message: string): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: message,
      cancelButtonText: 'Cancel',
    });

    return success;
  } catch (error) {
    console.error('Error with simple prompt:', error);
    return false;
  }
}
```

### Advanced Authentication Service

```typescript
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthConfig {
  allowDeviceCredentials: boolean;
  serverUrl: string;
}

interface AuthState {
  isEnrolled: boolean;
  biometricType: string | null;
  publicKey: string | null;
}

class BiometricAuthService {
  private rnBiometrics: ReactNativeBiometrics;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: config.allowDeviceCredentials,
    });
  }

  async getAuthState(): Promise<AuthState> {
    const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
    const { keysExist } = await this.rnBiometrics.biometricKeysExist();
    const publicKey = await AsyncStorage.getItem('biometric_public_key');

    return {
      isEnrolled: available && keysExist,
      biometricType: available ? this.getBiometryTypeName(biometryType) : null,
      publicKey,
    };
  }

  private getBiometryTypeName(biometryType: string | undefined): string {
    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return 'Fingerprint';
      default:
        return 'Biometrics';
    }
  }

  async enrollBiometrics(userId: string): Promise<boolean> {
    try {
      // Check if biometrics are available
      const { available } = await this.rnBiometrics.isSensorAvailable();
      if (!available) {
        throw new Error('Biometric sensor not available');
      }

      // Create new keys
      const { publicKey } = await this.rnBiometrics.createKeys();

      // Store public key locally
      await AsyncStorage.setItem('biometric_public_key', publicKey);
      await AsyncStorage.setItem('biometric_user_id', userId);

      // Send public key to server for registration
      await this.registerPublicKeyWithServer(userId, publicKey);

      return true;
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      return false;
    }
  }

  async authenticateWithBiometrics(): Promise<{ success: boolean; token?: string }> {
    try {
      const userId = await AsyncStorage.getItem('biometric_user_id');
      if (!userId) {
        throw new Error('No enrolled user found');
      }

      // Create a challenge for the signature
      const challenge = await this.getServerChallenge(userId);

      // Create signature with biometric verification
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Sign in with biometrics',
        payload: challenge,
      });

      if (!success || !signature) {
        return { success: false };
      }

      // Verify signature on server and get auth token
      const token = await this.verifySignatureWithServer(userId, challenge, signature);

      return { success: true, token };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false };
    }
  }

  async unenrollBiometrics(): Promise<void> {
    await this.rnBiometrics.deleteKeys();
    await AsyncStorage.removeItem('biometric_public_key');
    await AsyncStorage.removeItem('biometric_user_id');
  }

  private async registerPublicKeyWithServer(
    userId: string,
    publicKey: string
  ): Promise<void> {
    const response = await fetch(`${this.config.serverUrl}/biometric/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, publicKey }),
    });

    if (!response.ok) {
      throw new Error('Failed to register public key with server');
    }
  }

  private async getServerChallenge(userId: string): Promise<string> {
    const response = await fetch(
      `${this.config.serverUrl}/biometric/challenge?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error('Failed to get challenge from server');
    }

    const data = await response.json();
    return data.challenge;
  }

  private async verifySignatureWithServer(
    userId: string,
    challenge: string,
    signature: string
  ): Promise<string> {
    const response = await fetch(`${this.config.serverUrl}/biometric/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, challenge, signature }),
    });

    if (!response.ok) {
      throw new Error('Signature verification failed');
    }

    const data = await response.json();
    return data.token;
  }
}

// Usage
const authService = new BiometricAuthService({
  allowDeviceCredentials: true,
  serverUrl: 'https://api.yourapp.com',
});
```

## Keychain Integration with Biometrics

Securely store sensitive data protected by biometric authentication using the Keychain (iOS) or Keystore (Android).

### Installation

```bash
npm install react-native-keychain
cd ios && pod install && cd ..
```

### Secure Storage Implementation

```typescript
import * as Keychain from 'react-native-keychain';

interface SecureCredentials {
  username: string;
  password: string;
}

// Store credentials with biometric protection
async function storeCredentialsSecurely(
  credentials: SecureCredentials
): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(
      credentials.username,
      credentials.password,
      {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        storage: Keychain.STORAGE_TYPE.RSA,
      }
    );
    return true;
  } catch (error) {
    console.error('Error storing credentials:', error);
    return false;
  }
}

// Retrieve credentials with biometric verification
async function getCredentialsSecurely(): Promise<SecureCredentials | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      authenticationPrompt: {
        title: 'Authentication Required',
        subtitle: 'Access your saved credentials',
        description: 'Use your biometrics to access your saved login',
        cancel: 'Cancel',
      },
    });

    if (credentials) {
      return {
        username: credentials.username,
        password: credentials.password,
      };
    }

    return null;
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    return null;
  }
}

// Check what biometric type is supported for keychain
async function getSupportedBiometryType(): Promise<string | null> {
  const biometryType = await Keychain.getSupportedBiometryType();

  switch (biometryType) {
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      return 'Touch ID';
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      return 'Face ID';
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      return 'Fingerprint';
    case Keychain.BIOMETRY_TYPE.FACE:
      return 'Face Recognition';
    case Keychain.BIOMETRY_TYPE.IRIS:
      return 'Iris';
    default:
      return null;
  }
}

// Reset stored credentials
async function clearStoredCredentials(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword();
    return true;
  } catch (error) {
    console.error('Error clearing credentials:', error);
    return false;
  }
}
```

## Implementing Fallback Mechanisms

Always provide alternative authentication methods when biometrics fail or are unavailable.

```typescript
import React, { useState } from 'react';
import { Alert } from 'react-native';

interface AuthResult {
  method: 'biometric' | 'password' | 'pin';
  success: boolean;
  userId?: string;
}

type FallbackMethod = 'password' | 'pin' | 'email';

async function authenticateWithFallback(
  primaryMethod: () => Promise<boolean>,
  fallbackMethods: FallbackMethod[]
): Promise<AuthResult | null> {
  // Try primary biometric authentication
  try {
    const biometricSuccess = await primaryMethod();
    if (biometricSuccess) {
      return { method: 'biometric', success: true };
    }
  } catch (error) {
    console.log('Biometric authentication failed, trying fallback');
  }

  // Present fallback options
  return new Promise((resolve) => {
    const buttons = fallbackMethods.map((method) => ({
      text: getFallbackButtonText(method),
      onPress: () => handleFallback(method, resolve),
    }));

    buttons.push({
      text: 'Cancel',
      onPress: () => resolve(null),
    });

    Alert.alert(
      'Authentication Required',
      'Biometric authentication failed. Please choose an alternative method.',
      buttons
    );
  });
}

function getFallbackButtonText(method: FallbackMethod): string {
  switch (method) {
    case 'password':
      return 'Use Password';
    case 'pin':
      return 'Use PIN';
    case 'email':
      return 'Email Magic Link';
  }
}

async function handleFallback(
  method: FallbackMethod,
  resolve: (result: AuthResult | null) => void
): Promise<void> {
  switch (method) {
    case 'password':
      // Navigate to password screen or show password modal
      resolve({ method: 'password', success: false });
      break;
    case 'pin':
      // Navigate to PIN entry screen
      resolve({ method: 'pin', success: false });
      break;
    case 'email':
      // Trigger email magic link flow
      resolve(null);
      break;
  }
}
```

## Best UX Practices

### 1. Clear Communication

```typescript
interface BiometricPromptConfig {
  title: string;
  subtitle: string;
  description: string;
  negativeButtonText: string;
}

function getContextualPromptConfig(action: string): BiometricPromptConfig {
  const configs: Record<string, BiometricPromptConfig> = {
    login: {
      title: 'Sign In',
      subtitle: 'Verify your identity',
      description: 'Use your biometrics to sign in securely',
      negativeButtonText: 'Use Password',
    },
    transaction: {
      title: 'Confirm Payment',
      subtitle: 'Authorize this transaction',
      description: 'Verify your identity to complete the payment',
      negativeButtonText: 'Cancel',
    },
    sensitiveData: {
      title: 'Access Protected Data',
      subtitle: 'Authentication required',
      description: 'Verify your identity to view sensitive information',
      negativeButtonText: 'Cancel',
    },
  };

  return configs[action] || configs.login;
}
```

### 2. Graceful Degradation

```typescript
async function getAvailableAuthMethods(): Promise<string[]> {
  const methods: string[] = [];

  // Check biometric availability
  const biometricType = await checkBiometricType();
  if (biometricType) {
    methods.push(biometricType);
  }

  // Always include password as fallback
  methods.push('Password');

  // Check if PIN is configured
  const hasPinConfigured = await checkPinConfiguration();
  if (hasPinConfigured) {
    methods.push('PIN');
  }

  return methods;
}
```

### 3. User Preferences

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricPreferences {
  enabled: boolean;
  preferredMethod: 'biometric' | 'password' | 'pin';
  autoPrompt: boolean;
}

const DEFAULT_PREFERENCES: BiometricPreferences = {
  enabled: true,
  preferredMethod: 'biometric',
  autoPrompt: true,
};

async function getBiometricPreferences(): Promise<BiometricPreferences> {
  const stored = await AsyncStorage.getItem('biometric_preferences');
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_PREFERENCES;
}

async function setBiometricPreferences(
  preferences: Partial<BiometricPreferences>
): Promise<void> {
  const current = await getBiometricPreferences();
  const updated = { ...current, ...preferences };
  await AsyncStorage.setItem('biometric_preferences', JSON.stringify(updated));
}
```

## Security Considerations

### 1. Never Store Biometric Data

Biometric data should never leave the device's secure enclave. Only use system APIs.

```typescript
// WRONG: Never do this
const badExample = {
  fingerprintData: 'base64encodeddata...',
  faceTemplate: 'facialdata...',
};

// CORRECT: Use system authentication
const authenticate = async (): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Verify your identity',
  });
  return result.success;
};
```

### 2. Implement Rate Limiting

```typescript
interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

async function checkRateLimit(): Promise<{ allowed: boolean; waitTime?: number }> {
  const state = await getRateLimitState();
  const now = Date.now();

  // Check if currently locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    return {
      allowed: false,
      waitTime: state.lockedUntil - now,
    };
  }

  // Reset if lockout has expired
  if (state.lockedUntil && now >= state.lockedUntil) {
    await resetRateLimitState();
    return { allowed: true };
  }

  return { allowed: true };
}

async function recordAuthAttempt(success: boolean): Promise<void> {
  const state = await getRateLimitState();

  if (success) {
    await resetRateLimitState();
    return;
  }

  const newAttempts = state.attempts + 1;
  const newState: RateLimitState = {
    attempts: newAttempts,
    lastAttempt: Date.now(),
    lockedUntil: newAttempts >= MAX_ATTEMPTS
      ? Date.now() + LOCKOUT_DURATION
      : null,
  };

  await AsyncStorage.setItem('auth_rate_limit', JSON.stringify(newState));
}
```

### 3. Secure Token Storage

```typescript
import * as Keychain from 'react-native-keychain';

async function storeAuthToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('auth_token', token, {
    service: 'com.yourapp.auth',
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function getAuthToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.auth',
      authenticationPrompt: {
        title: 'Authentication Required',
      },
    });

    return credentials ? credentials.password : null;
  } catch (error) {
    return null;
  }
}
```

## Testing Biometric Flows

### Unit Testing with Mocks

```typescript
import { authenticateAsync, hasHardwareAsync } from 'expo-local-authentication';

// Mock the module
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

describe('BiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when biometrics are available', async () => {
    (hasHardwareAsync as jest.Mock).mockResolvedValue(true);

    const result = await checkBiometricAvailability();

    expect(result.hasHardware).toBe(true);
  });

  it('should handle successful authentication', async () => {
    (authenticateAsync as jest.Mock).mockResolvedValue({
      success: true,
    });

    const result = await authenticate();

    expect(result.success).toBe(true);
  });

  it('should handle user cancellation', async () => {
    (authenticateAsync as jest.Mock).mockResolvedValue({
      success: false,
      error: 'user_cancel',
    });

    const result = await authenticate();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication cancelled by user');
  });

  it('should handle lockout', async () => {
    (authenticateAsync as jest.Mock).mockResolvedValue({
      success: false,
      error: 'lockout',
    });

    const result = await authenticate();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many failed attempts');
  });
});
```

### E2E Testing with Detox

```typescript
// e2e/biometricAuth.e2e.ts
describe('Biometric Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { faceid: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show biometric prompt on login screen', async () => {
    await element(by.id('biometric-login-button')).tap();

    // On iOS Simulator, you can trigger Face ID/Touch ID
    await device.matchFace(); // For Face ID
    // await device.matchFinger(); // For Touch ID

    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should handle biometric failure gracefully', async () => {
    await element(by.id('biometric-login-button')).tap();

    await device.unmatchFace(); // Simulate failed Face ID

    await expect(element(by.text('Authentication Failed'))).toBeVisible();
  });

  it('should show fallback options when biometrics fail', async () => {
    await element(by.id('biometric-login-button')).tap();

    await device.unmatchFace();

    await expect(element(by.id('password-fallback-button'))).toBeVisible();
  });
});
```

### Simulator/Emulator Testing

For iOS Simulator:

```bash
# Enable Face ID enrollment
xcrun simctl privacy booted grant face-id com.yourapp.bundleid

# Trigger successful Face ID
xcrun simctl ui booted biometrics match

# Trigger failed Face ID
xcrun simctl ui booted biometrics non-match
```

For Android Emulator:

```bash
# Open fingerprint settings
adb -e emu finger touch 1

# Simulate fingerprint authentication
adb -e emu finger touch 1
```

## Conclusion

Biometric authentication significantly enhances both security and user experience in React Native applications. By following the patterns and practices outlined in this guide, you can implement robust biometric authentication that works seamlessly across iOS and Android platforms.

Key takeaways:
1. Always check for biometric availability before prompting
2. Provide clear fallback mechanisms for devices without biometrics
3. Use secure storage (Keychain/Keystore) for sensitive data
4. Never store biometric data directly; always use system APIs
5. Implement proper error handling and user feedback
6. Test thoroughly on both platforms and various device configurations

Remember that biometric authentication should complement, not replace, other security measures. Consider implementing it as part of a multi-factor authentication strategy for sensitive applications.

## Further Reading

- [Apple Face ID Documentation](https://developer.apple.com/documentation/localauthentication)
- [Android Biometric Authentication](https://developer.android.com/training/sign-in/biometric-auth)
- [expo-local-authentication Documentation](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [react-native-biometrics GitHub](https://github.com/SelfLender/react-native-biometrics)
- [react-native-keychain Documentation](https://github.com/oblador/react-native-keychain)
