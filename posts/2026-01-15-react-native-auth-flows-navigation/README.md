# How to Handle Authentication Flows with React Navigation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Navigation, Authentication, Mobile Development, TypeScript, Security

Description: Learn how to implement secure authentication flows in React Native using React Navigation with proper state management and UX patterns.

---

Authentication is one of the most critical aspects of mobile application development. A well-implemented authentication flow not only secures your application but also provides a seamless user experience. In this comprehensive guide, we will explore how to handle authentication flows in React Native using React Navigation, covering everything from basic patterns to advanced security considerations.

## Table of Contents

1. [Understanding Authentication Flow Patterns](#understanding-authentication-flow-patterns)
2. [Project Setup](#project-setup)
3. [Authentication Context and State Management](#authentication-context-and-state-management)
4. [Conditional Navigation Based on Auth State](#conditional-navigation-based-on-auth-state)
5. [Login and Register Screen Structure](#login-and-register-screen-structure)
6. [Protected Routes Implementation](#protected-routes-implementation)
7. [Persisting Authentication State](#persisting-authentication-state)
8. [Token Refresh Handling](#token-refresh-handling)
9. [Logout and Session Cleanup](#logout-and-session-cleanup)
10. [Splash Screen During Auth Check](#splash-screen-during-auth-check)
11. [Social Authentication Integration](#social-authentication-integration)
12. [Biometric Authentication Flow](#biometric-authentication-flow)
13. [Error Handling in Auth Flows](#error-handling-in-auth-flows)
14. [Security Best Practices](#security-best-practices)

## Understanding Authentication Flow Patterns

Before diving into implementation, it is essential to understand the common authentication patterns used in mobile applications:

### Pattern 1: Token-Based Authentication
The most common pattern where the server issues a JWT (JSON Web Token) upon successful login. This token is stored securely on the device and sent with each subsequent request.

### Pattern 2: Session-Based Authentication
Traditional approach where the server maintains session state and the client stores a session cookie or identifier.

### Pattern 3: OAuth 2.0 / Social Authentication
Delegating authentication to third-party providers like Google, Apple, or Facebook.

### Pattern 4: Biometric Authentication
Using device-level security features like fingerprint or face recognition for authentication.

For this guide, we will primarily focus on token-based authentication while incorporating elements of the other patterns.

## Project Setup

First, let us set up a new React Native project with the necessary dependencies:

```bash
npx react-native init AuthFlowDemo --template react-native-template-typescript
cd AuthFlowDemo

# Install React Navigation dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Install storage and security dependencies
npm install @react-native-async-storage/async-storage
npm install react-native-keychain
npm install react-native-biometrics

# For iOS
cd ios && pod install && cd ..
```

## Authentication Context and State Management

The foundation of our authentication flow is a robust state management system. We will use React Context combined with useReducer for managing authentication state:

```typescript
// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import * as Keychain from 'react-native-keychain';
import { AuthService } from '../services/AuthService';

// Type definitions
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'TOKEN_REFRESH'; payload: AuthTokens }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  clearError: () => void;
  loginWithBiometrics: () => Promise<void>;
  loginWithSocial: (provider: 'google' | 'apple' | 'facebook') => Promise<void>;
}

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  tokens: null,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        tokens: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        tokens: null,
        error: null,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        tokens: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const credentials = await Keychain.getGenericPassword();

      if (credentials) {
        const tokens: AuthTokens = JSON.parse(credentials.password);

        // Check if token is expired
        if (tokens.expiresAt > Date.now()) {
          // Validate token with server
          const user = await AuthService.validateToken(tokens.accessToken);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, tokens },
          });
        } else {
          // Try to refresh the token
          const newTokens = await AuthService.refreshToken(tokens.refreshToken);
          if (newTokens) {
            const user = await AuthService.validateToken(newTokens.accessToken);
            await storeTokens(newTokens);
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, tokens: newTokens },
            });
          } else {
            await clearStoredCredentials();
            dispatch({ type: 'AUTH_LOGOUT' });
          }
        }
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const storeTokens = async (tokens: AuthTokens): Promise<void> => {
    await Keychain.setGenericPassword('auth', JSON.stringify(tokens), {
      service: 'com.authflowdemo.auth',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  };

  const clearStoredCredentials = async (): Promise<void> => {
    await Keychain.resetGenericPassword({ service: 'com.authflowdemo.auth' });
  };

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      dispatch({ type: 'AUTH_LOADING' });
      try {
        const { user, tokens } = await AuthService.login(email, password);
        await storeTokens(tokens);
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, tokens } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: message });
        throw error;
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name: string): Promise<void> => {
      dispatch({ type: 'AUTH_LOADING' });
      try {
        const { user, tokens } = await AuthService.register(email, password, name);
        await storeTokens(tokens);
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, tokens } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        dispatch({ type: 'AUTH_FAILURE', payload: message });
        throw error;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (state.tokens?.accessToken) {
        await AuthService.logout(state.tokens.accessToken);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await clearStoredCredentials();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [state.tokens]);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!state.tokens?.refreshToken) return false;

    try {
      const newTokens = await AuthService.refreshToken(state.tokens.refreshToken);
      if (newTokens) {
        await storeTokens(newTokens);
        dispatch({ type: 'TOKEN_REFRESH', payload: newTokens });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  }, [state.tokens, logout]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const loginWithBiometrics = useCallback(async (): Promise<void> => {
    // Implementation covered in Biometric Authentication section
  }, []);

  const loginWithSocial = useCallback(
    async (provider: 'google' | 'apple' | 'facebook'): Promise<void> => {
      // Implementation covered in Social Authentication section
    },
    []
  );

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshTokens,
      clearError,
      loginWithBiometrics,
      loginWithSocial,
    }),
    [state, login, register, logout, refreshTokens, clearError, loginWithBiometrics, loginWithSocial]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Conditional Navigation Based on Auth State

React Navigation 6 provides an elegant way to handle conditional navigation based on authentication state. The key concept is to render different navigators based on the current auth state:

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainTabNavigator from './MainTabNavigator';

// Type definitions for navigation
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string };
};

export type AppStackParamList = {
  MainTabs: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator(): React.ReactElement {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          headerTitle: 'Reset Password',
          presentation: 'modal',
        }}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator(): React.ReactElement {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
      <AppStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
        }}
      />
    </AppStack.Navigator>
  );
}

export default function RootNavigator(): React.ReactElement {
  const { isLoading, isAuthenticated } = useAuth();

  // Show splash screen while checking auth status
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

## Login and Register Screen Structure

Here is a well-structured login screen with proper form handling, validation, and error display:

```typescript
// src/screens/LoginScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/RootNavigator';
import { validateEmail, validatePassword } from '../utils/validation';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen({ navigation }: Props): React.ReactElement {
  const { login, loginWithBiometrics, loginWithSocial, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async (): Promise<void> => {
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation happens automatically due to auth state change
    } catch (err) {
      // Error is already handled in AuthContext
    }
  }, [email, password, login, validateForm, clearError]);

  const handleBiometricLogin = useCallback(async (): Promise<void> => {
    try {
      await loginWithBiometrics();
    } catch (err) {
      Alert.alert(
        'Biometric Login Failed',
        'Unable to authenticate using biometrics. Please use email and password.'
      );
    }
  }, [loginWithBiometrics]);

  const handleSocialLogin = useCallback(
    async (provider: 'google' | 'apple' | 'facebook'): Promise<void> => {
      try {
        await loginWithSocial(provider);
      } catch (err) {
        Alert.alert(
          'Social Login Failed',
          `Unable to authenticate with ${provider}. Please try again.`
        );
      }
    },
    [loginWithSocial]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, formErrors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              editable={!isLoading}
            />
            {formErrors.email && (
              <Text style={styles.fieldError}>{formErrors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, styles.passwordInput, formErrors.password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {formErrors.password && (
              <Text style={styles.fieldError}>{formErrors.password}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword', { email })}
            disabled={isLoading}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Text style={styles.biometricButtonText}>Use Biometrics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialLogin('apple')}
              disabled={isLoading}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Do not have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#c62828',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  showPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldError: {
    color: '#c62828',
    fontSize: 12,
    marginTop: 4,
  },
  forgotPassword: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  socialButtons: {
    marginBottom: 32,
  },
  socialButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appleButtonText: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

## Protected Routes Implementation

For routes that require authentication, we can create a higher-order component or use navigation listeners:

```typescript
// src/navigation/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: string;
}

export function ProtectedRoute({
  children,
  requiredRole
}: ProtectedRouteProps): React.ReactElement | null {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated) {
      // User is not authenticated, navigation will automatically
      // switch to auth navigator due to our conditional rendering
      return;
    }

    // Check for required role if specified
    if (requiredRole && user?.role !== requiredRole) {
      navigation.goBack();
      // Show unauthorized alert
    }
  }, [isAuthenticated, user, requiredRole, navigation]);

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

// Alternative: Navigation listener approach
// src/hooks/useAuthGuard.ts
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export function useAuthGuard(): void {
  const { isAuthenticated, isLoading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isAuthenticated && !isLoading) {
        // Prevent leaving protected screen without authentication
        e.preventDefault();
      }
    });

    return unsubscribe;
  }, [navigation, isAuthenticated, isLoading]);
}
```

## Persisting Authentication State

Secure token storage is critical. We use react-native-keychain for secure storage:

```typescript
// src/services/SecureStorage.ts
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SERVICE = 'com.myapp.auth';
const BIOMETRIC_SERVICE = 'com.myapp.biometric';

interface StoredCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const SecureStorage = {
  // Store authentication tokens securely
  async storeTokens(tokens: StoredCredentials): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(
        'tokens',
        JSON.stringify(tokens),
        {
          service: AUTH_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  },

  // Retrieve stored tokens
  async getTokens(): Promise<StoredCredentials | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: AUTH_SERVICE,
      });

      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  },

  // Clear stored tokens
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  },

  // Store credentials for biometric login
  async storeBiometricCredentials(
    email: string,
    password: string
  ): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(email, password, {
        service: BIOMETRIC_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      });
      return true;
    } catch (error) {
      console.error('Failed to store biometric credentials:', error);
      return false;
    }
  },

  // Retrieve credentials using biometrics
  async getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: BIOMETRIC_SERVICE,
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Use biometrics to sign in',
          cancel: 'Cancel',
        },
      });

      if (credentials) {
        return {
          email: credentials.username,
          password: credentials.password,
        };
      }
      return null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  },

  // Store non-sensitive preferences
  async setPreference(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  // Get non-sensitive preferences
  async getPreference(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
};
```

## Token Refresh Handling

Implementing automatic token refresh is crucial for maintaining session continuity:

```typescript
// src/services/ApiClient.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SecureStorage } from './SecureStorage';

interface QueueItem {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: QueueItem[] = [];
  private onLogout: (() => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: 'https://api.example.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setLogoutHandler(handler: () => void): void {
    this.onLogout = handler;
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const tokens = await SecureStorage.getTokens();

        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // If error is not 401 or request was already retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // If already refreshing, queue the request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        this.isRefreshing = true;

        try {
          const tokens = await SecureStorage.getTokens();

          if (!tokens?.refreshToken) {
            throw new Error('No refresh token available');
          }

          // Call refresh endpoint
          const response = await axios.post(
            'https://api.example.com/auth/refresh',
            { refreshToken: tokens.refreshToken }
          );

          const newTokens = {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresAt: Date.now() + response.data.expiresIn * 1000,
          };

          await SecureStorage.storeTokens(newTokens);

          // Process queued requests
          this.processQueue(null, newTokens.accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return this.instance(originalRequest);
        } catch (refreshError) {
          this.processQueue(refreshError as Error, null);

          // Clear tokens and logout
          await SecureStorage.clearTokens();
          this.onLogout?.();

          return Promise.reject(refreshError);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }

  private processQueue(error: Error | null, token: string | null): void {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else if (token) {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  get<T>(url: string, config?: object): Promise<T> {
    return this.instance.get(url, config).then((res) => res.data);
  }

  post<T>(url: string, data?: object, config?: object): Promise<T> {
    return this.instance.post(url, data, config).then((res) => res.data);
  }

  put<T>(url: string, data?: object, config?: object): Promise<T> {
    return this.instance.put(url, data, config).then((res) => res.data);
  }

  delete<T>(url: string, config?: object): Promise<T> {
    return this.instance.delete(url, config).then((res) => res.data);
  }
}

export const apiClient = new ApiClient();
```

## Logout and Session Cleanup

Proper logout implementation ensures all sensitive data is cleared:

```typescript
// src/hooks/useLogout.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SecureStorage } from '../services/SecureStorage';
import { apiClient } from '../services/ApiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseLogoutReturn {
  logout: () => Promise<void>;
  logoutWithConfirmation: () => void;
  logoutAllDevices: () => Promise<void>;
}

export function useLogout(): UseLogoutReturn {
  const { logout: authLogout, tokens } = useAuth();

  const performCleanup = useCallback(async (): Promise<void> => {
    // Clear all secure storage
    await SecureStorage.clearTokens();

    // Clear AsyncStorage (non-sensitive data)
    const keysToKeep = ['@app_theme', '@onboarding_completed'];
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter((key) => !keysToKeep.includes(key));
    await AsyncStorage.multiRemove(keysToRemove);

    // Clear any in-memory caches
    // queryClient.clear(); // If using React Query

    // Reset any global state
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Notify server about logout (invalidate token server-side)
      if (tokens?.accessToken) {
        await apiClient.post('/auth/logout', {
          accessToken: tokens.accessToken,
        }).catch(() => {
          // Continue with logout even if server call fails
        });
      }
    } finally {
      await performCleanup();
      await authLogout();
    }
  }, [tokens, authLogout, performCleanup]);

  const logoutWithConfirmation = useCallback((): void => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  }, [logout]);

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all devices. You will need to sign in again on each device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/auth/logout-all');
            } finally {
              await performCleanup();
              await authLogout();
            }
          },
        },
      ]
    );
  }, [authLogout, performCleanup]);

  return {
    logout,
    logoutWithConfirmation,
    logoutAllDevices,
  };
}
```

## Splash Screen During Auth Check

A proper splash screen provides feedback while checking authentication status:

```typescript
// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen(): React.ReactElement {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading spinner animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, scaleAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>MyApp</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeAnim,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <View style={styles.spinner} />
      </Animated.View>

      <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
        Loading...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  loadingContainer: {
    width: 40,
    height: 40,
    marginBottom: 20,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
```

## Social Authentication Integration

Implementing social authentication with Google and Apple:

```typescript
// src/services/SocialAuthService.ts
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import { apiClient } from './ApiClient';

interface SocialAuthResult {
  provider: 'google' | 'apple' | 'facebook';
  token: string;
  email: string;
  name: string;
  avatar?: string;
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

export const SocialAuthService = {
  async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      return {
        provider: 'google',
        token: tokens.idToken,
        email: userInfo.user.email,
        name: userInfo.user.name || '',
        avatar: userInfo.user.photo || undefined,
      };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play services not available');
      }
      throw error;
    }
  },

  async signInWithApple(): Promise<SocialAuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthResponse.user
      );

      if (credentialState !== appleAuth.State.AUTHORIZED) {
        throw new Error('Apple Sign-In not authorized');
      }

      return {
        provider: 'apple',
        token: appleAuthResponse.identityToken || '',
        email: appleAuthResponse.email || '',
        name: appleAuthResponse.fullName
          ? `${appleAuthResponse.fullName.givenName} ${appleAuthResponse.fullName.familyName}`
          : '',
      };
    } catch (error: any) {
      if (error.code === appleAuth.Error.CANCELED) {
        throw new Error('Sign in cancelled');
      }
      throw error;
    }
  },

  async signOutGoogle(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google sign out error:', error);
    }
  },

  // Exchange social token for app token
  async exchangeToken(socialAuth: SocialAuthResult): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await apiClient.post('/auth/social', {
      provider: socialAuth.provider,
      token: socialAuth.token,
      email: socialAuth.email,
      name: socialAuth.name,
      avatar: socialAuth.avatar,
    });

    return response;
  },
};
```

## Biometric Authentication Flow

Implementing biometric authentication for returning users:

```typescript
// src/hooks/useBiometricAuth.ts
import { useState, useEffect, useCallback } from 'react';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { SecureStorage } from '../services/SecureStorage';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Platform } from 'react-native';

interface BiometricAuthState {
  isAvailable: boolean;
  biometryType: string | null;
  isEnabled: boolean;
}

interface UseBiometricAuthReturn extends BiometricAuthState {
  authenticateWithBiometrics: () => Promise<boolean>;
  enableBiometrics: (email: string, password: string) => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
}

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

export function useBiometricAuth(): UseBiometricAuthReturn {
  const { login } = useAuth();
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    biometryType: null,
    isEnabled: false,
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async (): Promise<void> => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();

      let biometryLabel: string | null = null;
      if (biometryType === BiometryTypes.FaceID) {
        biometryLabel = 'Face ID';
      } else if (biometryType === BiometryTypes.TouchID) {
        biometryLabel = 'Touch ID';
      } else if (biometryType === BiometryTypes.Biometrics) {
        biometryLabel = 'Biometrics';
      }

      // Check if biometrics are enabled for this app
      const credentials = await SecureStorage.getBiometricCredentials().catch(
        () => null
      );

      setState({
        isAvailable: available,
        biometryType: biometryLabel,
        isEnabled: credentials !== null,
      });
    } catch (error) {
      console.error('Biometric check failed:', error);
      setState({
        isAvailable: false,
        biometryType: null,
        isEnabled: false,
      });
    }
  };

  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable || !state.isEnabled) {
      return false;
    }

    try {
      // First, verify biometrics
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: `Sign in with ${state.biometryType}`,
        cancelButtonText: 'Cancel',
      });

      if (!success) {
        return false;
      }

      // Retrieve stored credentials
      const credentials = await SecureStorage.getBiometricCredentials();

      if (!credentials) {
        Alert.alert(
          'Biometric Login',
          'No stored credentials found. Please sign in with email and password first.'
        );
        return false;
      }

      // Perform login with stored credentials
      await login(credentials.email, credentials.password);
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, [state, login]);

  const enableBiometrics = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!state.isAvailable) {
        Alert.alert(
          'Biometrics Unavailable',
          `${state.biometryType || 'Biometric authentication'} is not available on this device.`
        );
        return false;
      }

      try {
        // Verify biometrics first
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: `Enable ${state.biometryType} for sign in`,
          cancelButtonText: 'Cancel',
        });

        if (!success) {
          return false;
        }

        // Store credentials securely
        const stored = await SecureStorage.storeBiometricCredentials(
          email,
          password
        );

        if (stored) {
          setState((prev) => ({ ...prev, isEnabled: true }));
          Alert.alert(
            'Success',
            `${state.biometryType} has been enabled for sign in.`
          );
        }

        return stored;
      } catch (error) {
        console.error('Enable biometrics failed:', error);
        Alert.alert(
          'Error',
          'Failed to enable biometric authentication. Please try again.'
        );
        return false;
      }
    },
    [state]
  );

  const disableBiometrics = useCallback(async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({
        service: 'com.myapp.biometric',
      });
      setState((prev) => ({ ...prev, isEnabled: false }));
      Alert.alert(
        'Success',
        `${state.biometryType} has been disabled for sign in.`
      );
    } catch (error) {
      console.error('Disable biometrics failed:', error);
    }
  }, [state.biometryType]);

  return {
    ...state,
    authenticateWithBiometrics,
    enableBiometrics,
    disableBiometrics,
  };
}
```

## Error Handling in Auth Flows

Comprehensive error handling ensures a good user experience:

```typescript
// src/utils/authErrors.ts

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

interface AuthError {
  code: AuthErrorCode;
  message: string;
  recoverable: boolean;
  action?: string;
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, AuthError> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    code: AuthErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password. Please check your credentials and try again.',
    recoverable: true,
    action: 'Check your email and password',
  },
  [AuthErrorCode.USER_NOT_FOUND]: {
    code: AuthErrorCode.USER_NOT_FOUND,
    message: 'No account found with this email. Would you like to create one?',
    recoverable: true,
    action: 'Create an account',
  },
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: {
    code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
    message: 'An account with this email already exists. Try signing in instead.',
    recoverable: true,
    action: 'Sign in',
  },
  [AuthErrorCode.WEAK_PASSWORD]: {
    code: AuthErrorCode.WEAK_PASSWORD,
    message: 'Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.',
    recoverable: true,
  },
  [AuthErrorCode.NETWORK_ERROR]: {
    code: AuthErrorCode.NETWORK_ERROR,
    message: 'Network connection error. Please check your internet connection and try again.',
    recoverable: true,
    action: 'Retry',
  },
  [AuthErrorCode.TOKEN_EXPIRED]: {
    code: AuthErrorCode.TOKEN_EXPIRED,
    message: 'Your session has expired. Please sign in again.',
    recoverable: true,
    action: 'Sign in',
  },
  [AuthErrorCode.UNAUTHORIZED]: {
    code: AuthErrorCode.UNAUTHORIZED,
    message: 'You are not authorized to perform this action.',
    recoverable: false,
  },
  [AuthErrorCode.TOO_MANY_ATTEMPTS]: {
    code: AuthErrorCode.TOO_MANY_ATTEMPTS,
    message: 'Too many failed attempts. Please wait a few minutes before trying again.',
    recoverable: true,
    action: 'Wait and retry',
  },
  [AuthErrorCode.ACCOUNT_DISABLED]: {
    code: AuthErrorCode.ACCOUNT_DISABLED,
    message: 'This account has been disabled. Please contact support for assistance.',
    recoverable: false,
    action: 'Contact support',
  },
  [AuthErrorCode.SERVER_ERROR]: {
    code: AuthErrorCode.SERVER_ERROR,
    message: 'Server error occurred. Please try again later.',
    recoverable: true,
    action: 'Retry',
  },
  [AuthErrorCode.UNKNOWN]: {
    code: AuthErrorCode.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.',
    recoverable: true,
    action: 'Retry',
  },
};

export function parseAuthError(error: unknown): AuthError {
  if (error instanceof Error) {
    // Parse API error response
    const apiError = error as any;

    if (apiError.response?.data?.code) {
      const code = apiError.response.data.code as AuthErrorCode;
      return AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN];
    }

    // Network errors
    if (apiError.message === 'Network Error' || !apiError.response) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.NETWORK_ERROR];
    }

    // HTTP status code based errors
    const status = apiError.response?.status;
    if (status === 401) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.INVALID_CREDENTIALS];
    }
    if (status === 403) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.UNAUTHORIZED];
    }
    if (status === 429) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.TOO_MANY_ATTEMPTS];
    }
    if (status >= 500) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.SERVER_ERROR];
    }
  }

  return AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN];
}

// Error display component
// src/components/AuthErrorDisplay.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthError } from '../utils/authErrors';

interface Props {
  error: AuthError;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function AuthErrorDisplay({ error, onAction, onDismiss }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{error.message}</Text>
      <View style={styles.actions}>
        {error.recoverable && error.action && onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionText}>{error.action}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  message: {
    color: '#c62828',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#c62828',
    borderRadius: 4,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dismissText: {
    color: '#c62828',
    fontSize: 14,
  },
});
```

## Security Best Practices

Implementing security best practices is essential for protecting user data:

### 1. Secure Token Storage

Always use the device's secure storage mechanisms (Keychain on iOS, Keystore on Android) for storing sensitive data like tokens.

```typescript
// NEVER do this
await AsyncStorage.setItem('token', accessToken);

// Always do this
await Keychain.setGenericPassword('auth', accessToken, {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});
```

### 2. Certificate Pinning

Implement certificate pinning to prevent man-in-the-middle attacks:

```typescript
// src/services/ApiClientSecure.ts
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

const createSecureAxiosInstance = () => {
  const instance = axios.create({
    baseURL: 'https://api.example.com',
    timeout: 30000,
  });

  // Certificate pinning configuration
  // This typically requires native module integration
  // Using libraries like react-native-ssl-pinning

  return instance;
};
```

### 3. Input Validation and Sanitization

```typescript
// src/utils/validation.ts

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .slice(0, 255); // Limit length
}
```

### 4. Rate Limiting and Brute Force Protection

```typescript
// src/hooks/useRateLimiting.ts
import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

interface UseRateLimitingReturn {
  isLocked: boolean;
  attemptsRemaining: number;
  lockoutEndTime: number | null;
  recordAttempt: () => boolean;
  reset: () => void;
}

export function useRateLimiting(config: RateLimitConfig): UseRateLimitingReturn {
  const { maxAttempts, windowMs, lockoutMs } = config;

  const [attempts, setAttempts] = useState<number[]>([]);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const isLocked = lockoutEndTime !== null && Date.now() < lockoutEndTime;

  const attemptsInWindow = attempts.filter(
    (time) => Date.now() - time < windowMs
  ).length;

  const attemptsRemaining = Math.max(0, maxAttempts - attemptsInWindow);

  const recordAttempt = useCallback((): boolean => {
    if (isLocked) {
      return false;
    }

    const now = Date.now();
    const recentAttempts = attempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts - 1) {
      setLockoutEndTime(now + lockoutMs);
      setAttempts([...recentAttempts, now]);
      return false;
    }

    setAttempts([...recentAttempts, now]);
    return true;
  }, [attempts, isLocked, maxAttempts, windowMs, lockoutMs]);

  const reset = useCallback((): void => {
    setAttempts([]);
    setLockoutEndTime(null);
  }, []);

  return {
    isLocked,
    attemptsRemaining,
    lockoutEndTime,
    recordAttempt,
    reset,
  };
}
```

### 5. Session Management

```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useSessionTimeout(): void {
  const { logout, isAuthenticated } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);

  const resetTimer = useCallback((): void => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      if (inactiveTime > SESSION_TIMEOUT) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTimeout);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background') {
          backgroundTimeRef.current = Date.now();
        } else if (nextState === 'active' && backgroundTimeRef.current) {
          const backgroundDuration = Date.now() - backgroundTimeRef.current;
          if (backgroundDuration > BACKGROUND_TIMEOUT && isAuthenticated) {
            logout();
          }
          backgroundTimeRef.current = null;
        }
      }
    );

    return () => subscription.remove();
  }, [isAuthenticated, logout]);

  // Export resetTimer if you need to call it on user activity
}
```

## Conclusion

Implementing authentication flows in React Native requires careful consideration of security, user experience, and maintainability. By following the patterns and practices outlined in this guide, you can create a robust authentication system that:

1. **Provides a seamless user experience** with conditional navigation and proper loading states
2. **Secures user data** using encrypted storage and proper token management
3. **Handles errors gracefully** with informative messages and recovery options
4. **Supports multiple authentication methods** including email/password, social login, and biometrics
5. **Maintains session security** with automatic token refresh and session timeout handling

Remember to always test your authentication flows thoroughly, including edge cases like network failures, expired tokens, and concurrent login attempts. Security should never be an afterthought - it should be built into every layer of your authentication system from the start.

For production applications, consider additional measures such as:

- Implementing two-factor authentication (2FA)
- Adding device fingerprinting for suspicious activity detection
- Setting up proper logging and monitoring for security events
- Conducting regular security audits of your authentication code
- Keeping all dependencies up to date to patch security vulnerabilities

By following these best practices, you will create a secure and user-friendly authentication experience for your React Native application.
