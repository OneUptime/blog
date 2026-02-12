# How to Implement Cognito Authentication in a Mobile App

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Mobile, React Native, Authentication

Description: Learn how to implement AWS Cognito authentication in mobile apps using React Native, covering secure token storage, biometric auth, deep linking, and offline-friendly token management.

---

Mobile authentication has unique challenges that web apps don't face. You need secure storage for tokens (not localStorage), you have to handle app backgrounding and foregrounding, biometric authentication is expected, and network connectivity can be unreliable. Let's build a Cognito auth integration for React Native that handles all of these.

## Project Setup

We'll use React Native with the AWS SDK and secure storage.

Install the required packages:

```bash
npx react-native init CognitoMobileApp --template react-native-template-typescript
cd CognitoMobileApp

# AWS Cognito SDK
npm install @aws-sdk/client-cognito-identity-provider

# Secure storage for tokens (uses Keychain on iOS, Keystore on Android)
npm install react-native-keychain

# JWT decoding
npm install jwt-decode

# For iOS, install pods
cd ios && pod install && cd ..
```

Create your configuration:

```typescript
// src/config.ts
export const CognitoConfig = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_XXXXXXXXX',
    clientId: 'your-app-client-id'
};
```

## Secure Token Storage

On mobile, never store tokens in AsyncStorage - it's essentially plaintext. Use the device's secure enclave instead.

Here's a secure storage wrapper:

```typescript
// src/services/SecureStorage.ts
import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.yourapp.cognito';

interface StoredAuth {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export class SecureStorage {
    static async storeTokens(tokens: StoredAuth): Promise<void> {
        const serialized = JSON.stringify(tokens);
        await Keychain.setGenericPassword(
            'cognito_tokens',
            serialized,
            { service: SERVICE_NAME }
        );
    }

    static async getTokens(): Promise<StoredAuth | null> {
        try {
            const credentials = await Keychain.getGenericPassword({
                service: SERVICE_NAME
            });

            if (credentials) {
                return JSON.parse(credentials.password);
            }
        } catch (error) {
            console.error('Failed to read secure storage:', error);
        }
        return null;
    }

    static async clearTokens(): Promise<void> {
        await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    }

    // Check if biometrics are available for extra security
    static async isBiometricAvailable(): Promise<boolean> {
        const biometryType = await Keychain.getSupportedBiometryType();
        return biometryType !== null;
    }

    // Store with biometric protection
    static async storeWithBiometrics(tokens: StoredAuth): Promise<void> {
        const serialized = JSON.stringify(tokens);
        await Keychain.setGenericPassword(
            'cognito_tokens',
            serialized,
            {
                service: SERVICE_NAME,
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
            }
        );
    }
}
```

## Auth Service

Build the auth service that handles Cognito operations and token lifecycle.

Here's the mobile auth service:

```typescript
// src/services/AuthService.ts
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
    GlobalSignOutCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';
import { SecureStorage } from './SecureStorage';
import { CognitoConfig } from '../config';
import { AppState, AppStateStatus } from 'react-native';

export interface User {
    sub: string;
    email: string;
    name: string;
    groups: string[];
}

type AuthListener = (user: User | null) => void;

class AuthService {
    private client: CognitoIdentityProviderClient;
    private currentUser: User | null = null;
    private listeners: Set<AuthListener> = new Set();
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.client = new CognitoIdentityProviderClient({
            region: CognitoConfig.region
        });

        // Handle app state changes
        AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    }

    // Subscribe to auth state changes
    onAuthStateChanged(listener: AuthListener): () => void {
        this.listeners.add(listener);
        // Immediately call with current state
        listener(this.currentUser);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.currentUser));
    }

    async initialize(): Promise<void> {
        const tokens = await SecureStorage.getTokens();
        if (!tokens) {
            this.currentUser = null;
            this.notifyListeners();
            return;
        }

        try {
            const decoded: any = jwtDecode(tokens.idToken);
            if (decoded.exp * 1000 > Date.now()) {
                this.setUser(tokens.idToken);
                this.scheduleRefresh(tokens.expiresAt);
            } else {
                await this.refreshSession();
            }
        } catch {
            await SecureStorage.clearTokens();
            this.currentUser = null;
            this.notifyListeners();
        }
    }

    async signUp(email: string, password: string, name: string): Promise<void> {
        await this.client.send(new SignUpCommand({
            ClientId: CognitoConfig.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'name', Value: name }
            ]
        }));
    }

    async confirmSignUp(email: string, code: string): Promise<void> {
        await this.client.send(new ConfirmSignUpCommand({
            ClientId: CognitoConfig.clientId,
            Username: email,
            ConfirmationCode: code
        }));
    }

    async signIn(email: string, password: string): Promise<User> {
        const response = await this.client.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CognitoConfig.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        }));

        const result = response.AuthenticationResult;
        if (!result?.IdToken || !result?.AccessToken || !result?.RefreshToken) {
            throw new Error('Authentication failed');
        }

        const expiresAt = Date.now() + (result.ExpiresIn || 3600) * 1000;

        await SecureStorage.storeTokens({
            idToken: result.IdToken,
            accessToken: result.AccessToken,
            refreshToken: result.RefreshToken,
            expiresAt
        });

        this.setUser(result.IdToken);
        this.scheduleRefresh(expiresAt);

        return this.currentUser!;
    }

    async signOut(): Promise<void> {
        const tokens = await SecureStorage.getTokens();
        if (tokens?.accessToken) {
            try {
                await this.client.send(new GlobalSignOutCommand({
                    AccessToken: tokens.accessToken
                }));
            } catch {
                // Continue with local sign out
            }
        }

        await SecureStorage.clearTokens();
        this.clearRefreshTimer();
        this.currentUser = null;
        this.notifyListeners();
    }

    async refreshSession(): Promise<string | null> {
        const tokens = await SecureStorage.getTokens();
        if (!tokens?.refreshToken) {
            this.currentUser = null;
            this.notifyListeners();
            return null;
        }

        try {
            const response = await this.client.send(new InitiateAuthCommand({
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: CognitoConfig.clientId,
                AuthParameters: {
                    REFRESH_TOKEN: tokens.refreshToken
                }
            }));

            const result = response.AuthenticationResult;
            if (result?.IdToken && result?.AccessToken) {
                const expiresAt = Date.now() + (result.ExpiresIn || 3600) * 1000;
                await SecureStorage.storeTokens({
                    idToken: result.IdToken,
                    accessToken: result.AccessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt
                });

                this.setUser(result.IdToken);
                this.scheduleRefresh(expiresAt);
                return result.AccessToken;
            }
        } catch {
            await SecureStorage.clearTokens();
            this.currentUser = null;
            this.notifyListeners();
        }

        return null;
    }

    async getAccessToken(): Promise<string | null> {
        const tokens = await SecureStorage.getTokens();
        if (!tokens) return null;

        // If token is expiring within 5 minutes, refresh
        if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
            return this.refreshSession();
        }

        return tokens.accessToken;
    }

    private setUser(idToken: string) {
        const decoded: any = jwtDecode(idToken);
        this.currentUser = {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded['cognito:username'],
            groups: decoded['cognito:groups'] || []
        };
        this.notifyListeners();
    }

    private scheduleRefresh(expiresAt: number) {
        this.clearRefreshTimer();
        // Refresh 5 minutes before expiry
        const refreshIn = expiresAt - Date.now() - 5 * 60 * 1000;
        if (refreshIn > 0) {
            this.refreshTimer = setTimeout(() => this.refreshSession(), refreshIn);
        }
    }

    private clearRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // When app returns to foreground, check if tokens need refresh
    private async handleAppStateChange(state: AppStateStatus) {
        if (state === 'active' && this.currentUser) {
            const tokens = await SecureStorage.getTokens();
            if (tokens && tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
                await this.refreshSession();
            }
        }
    }
}

// Export singleton
export const authService = new AuthService();
```

## React Native Auth Hook

Create a hook that components use to access auth state:

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService, User } from '../services/AuthService';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((authUser) => {
            setUser(authUser);
            setIsLoading(false);
        });

        authService.initialize();

        return unsubscribe;
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: user !== null,
        signIn: authService.signIn.bind(authService),
        signUp: authService.signUp.bind(authService),
        signOut: authService.signOut.bind(authService),
        getAccessToken: authService.getAccessToken.bind(authService)
    };
}
```

## Login Screen

Here's a login screen component:

```tsx
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
            // Navigation happens automatically via auth state
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign In</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Signing in...' : 'Sign In'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 16, alignItems: 'center' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: '600' }
});
```

For more on working with Cognito tokens on the server side, see [decoding and validating Cognito JWT tokens](https://oneuptime.com/blog/post/decode-validate-cognito-jwt-tokens/view). For token lifecycle management, check out [handling Cognito token refresh in applications](https://oneuptime.com/blog/post/cognito-token-refresh-applications/view).

## Wrapping Up

Mobile Cognito authentication requires more care than web authentication. Secure token storage with the device keychain, background/foreground state handling, and network resilience are all critical. The pattern we've built here - a service singleton managing the Cognito lifecycle, secure storage for tokens, and a hook for React components - gives you a solid foundation. The service handles the complexity so your UI components stay simple and focused on presentation.
