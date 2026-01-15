# How to Implement OAuth 2.0 Authentication in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, OAuth, Authentication, Security, Authorization, Frontend

Description: Learn how to implement secure OAuth 2.0 authentication in React applications using PKCE flow, including best practices for token management and protected routes.

---

## Introduction

OAuth 2.0 has become the industry standard for authorization, enabling applications to obtain limited access to user accounts on third-party services. Whether you're integrating with Google, GitHub, Microsoft, or building your own authentication system, understanding OAuth 2.0 is essential for modern web development.

In this comprehensive guide, we'll walk through implementing OAuth 2.0 authentication in a React application. We'll cover the Authorization Code flow with PKCE (Proof Key for Code Exchange), which is the recommended approach for single-page applications (SPAs) and mobile apps.

## What is OAuth 2.0?

OAuth 2.0 is an authorization framework that allows third-party applications to obtain limited access to a web service. It works by delegating user authentication to the service that hosts the user account and authorizing third-party applications to access that user account.

### Key Terminology

Before diving into the implementation, let's understand the key terms:

- **Resource Owner**: The user who owns the data and grants access to it
- **Client**: The application requesting access to the resource owner's data
- **Authorization Server**: The server that authenticates the resource owner and issues access tokens
- **Resource Server**: The server hosting the protected resources
- **Access Token**: A credential used to access protected resources
- **Refresh Token**: A credential used to obtain new access tokens
- **Authorization Code**: A temporary code exchanged for an access token
- **PKCE**: Proof Key for Code Exchange - a security extension for public clients

## OAuth 2.0 Flows

OAuth 2.0 defines several grant types for different use cases:

### 1. Authorization Code Flow

The most secure flow, recommended for server-side applications:

```
+--------+                               +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |                               |     Owner     |
|        |<-(B)-- Authorization Grant ---|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C)-- Authorization Grant -->| Authorization |
| Client |                               |     Server    |
|        |<-(D)----- Access Token -------|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E)----- Access Token ------>|    Resource   |
|        |                               |     Server    |
|        |<-(F)--- Protected Resource ---|               |
+--------+                               +---------------+
```

### 2. Authorization Code Flow with PKCE

Enhanced security for SPAs and mobile apps. This is what we'll implement:

```
+--------+                                +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |       + Code Challenge        |     Owner     |
|        |                               |               |
|        |<-(B)-- Authorization Code ----|               |
|        |                               +---------------+
|        |
|        |--(C)-- Authorization Code -->+---------------+
| Client |        + Code Verifier       | Authorization |
|        |                              |     Server    |
|        |<-(D)----- Access Token ------|               |
+--------+                              +---------------+
```

### 3. Implicit Flow (Deprecated)

Previously used for SPAs, now deprecated due to security concerns. Do not use this flow for new applications.

### 4. Client Credentials Flow

Used for machine-to-machine communication where no user is involved.

## Project Setup

Let's create a new React application with the necessary dependencies.

### Creating the React Application

```bash
npx create-react-app oauth-demo --template typescript
cd oauth-demo
```

### Installing Dependencies

```bash
npm install react-router-dom axios js-cookie
npm install --save-dev @types/js-cookie
```

### Project Structure

```
src/
  components/
    Auth/
      Login.tsx
      Callback.tsx
      Logout.tsx
      ProtectedRoute.tsx
    Dashboard/
      Dashboard.tsx
    Layout/
      Header.tsx
      Footer.tsx
  contexts/
    AuthContext.tsx
  hooks/
    useAuth.ts
  services/
    authService.ts
    apiService.ts
  utils/
    pkce.ts
    storage.ts
  types/
    auth.types.ts
  App.tsx
  index.tsx
```

## Implementing PKCE Utilities

PKCE (Proof Key for Code Exchange) adds an extra layer of security to the authorization code flow. Let's implement the utilities.

### Creating the PKCE Helper Functions

```typescript
// src/utils/pkce.ts

/**
 * Generates a random string for use as a code verifier
 * The code verifier should be between 43 and 128 characters
 */
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

/**
 * Generates a code challenge from the code verifier
 * Uses SHA-256 hashing algorithm
 */
export const generateCodeChallenge = async (
  codeVerifier: string
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
};

/**
 * Base64 URL encoding function
 * Converts Uint8Array to base64url string
 */
const base64URLEncode = (array: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(array)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Generates a random state parameter for CSRF protection
 */
export const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};
```

## Defining Types

Let's define the TypeScript interfaces and types we'll use throughout the application.

```typescript
// src/types/auth.types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  scope: string;
  provider: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface PKCEState {
  codeVerifier: string;
  state: string;
  provider: string;
}
```

## Creating the OAuth Configuration

Define configurations for different OAuth providers.

```typescript
// src/config/oauth.config.ts

import { OAuthConfig } from '../types/auth.types';

export const oauthProviders: Record<string, OAuthConfig> = {
  google: {
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback`,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
    provider: 'google',
  },
  github: {
    clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback`,
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    scope: 'read:user user:email',
    provider: 'github',
  },
  microsoft: {
    clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback`,
    authorizationEndpoint:
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint:
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile',
    provider: 'microsoft',
  },
};

export const getOAuthConfig = (provider: string): OAuthConfig => {
  const config = oauthProviders[provider];
  if (!config) {
    throw new Error(`Unknown OAuth provider: ${provider}`);
  }
  return config;
};
```

## Implementing the Auth Service

The auth service handles all OAuth-related operations.

```typescript
// src/services/authService.ts

import {
  AuthTokens,
  OAuthConfig,
  PKCEState,
  TokenResponse,
  User
} from '../types/auth.types';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState
} from '../utils/pkce';
import { getOAuthConfig } from '../config/oauth.config';

const PKCE_STORAGE_KEY = 'oauth_pkce_state';

/**
 * Initiates the OAuth login flow
 * Generates PKCE values and redirects to authorization endpoint
 */
export const initiateLogin = async (provider: string): Promise<void> => {
  const config = getOAuthConfig(provider);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE state for later verification
  const pkceState: PKCEState = {
    codeVerifier,
    state,
    provider,
  };
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkceState));

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Redirect to authorization endpoint
  window.location.href = `${config.authorizationEndpoint}?${params.toString()}`;
};

/**
 * Exchanges authorization code for tokens
 */
export const exchangeCodeForTokens = async (
  code: string,
  state: string
): Promise<AuthTokens> => {
  // Retrieve and validate PKCE state
  const storedState = sessionStorage.getItem(PKCE_STORAGE_KEY);
  if (!storedState) {
    throw new Error('No PKCE state found. Please try logging in again.');
  }

  const pkceState: PKCEState = JSON.parse(storedState);

  // Validate state parameter to prevent CSRF attacks
  if (pkceState.state !== state) {
    throw new Error('State mismatch. Possible CSRF attack detected.');
  }

  const config = getOAuthConfig(pkceState.provider);

  // Exchange code for tokens
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code: code,
    code_verifier: pkceState.codeVerifier,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  const tokenResponse: TokenResponse = await response.json();

  // Clean up PKCE state
  sessionStorage.removeItem(PKCE_STORAGE_KEY);

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    tokenType: tokenResponse.token_type,
  };
};

/**
 * Fetches user information using the access token
 */
export const fetchUserInfo = async (
  accessToken: string,
  provider: string
): Promise<User> => {
  const config = getOAuthConfig(provider);

  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user information');
  }

  const data = await response.json();

  // Normalize user data across providers
  return normalizeUserData(data, provider);
};

/**
 * Normalizes user data from different providers
 */
const normalizeUserData = (data: any, provider: string): User => {
  switch (provider) {
    case 'google':
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
        provider,
      };
    case 'github':
      return {
        id: String(data.id),
        email: data.email,
        name: data.name || data.login,
        avatar: data.avatar_url,
        provider,
      };
    case 'microsoft':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        avatar: undefined,
        provider,
      };
    default:
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        provider,
      };
  }
};

/**
 * Refreshes the access token using the refresh token
 */
export const refreshToken = async (
  refreshToken: string,
  provider: string
): Promise<AuthTokens> => {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenResponse: TokenResponse = await response.json();

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || refreshToken,
    expiresIn: tokenResponse.expires_in,
    tokenType: tokenResponse.token_type,
  };
};

/**
 * Revokes the access token
 */
export const revokeToken = async (
  accessToken: string,
  provider: string
): Promise<void> => {
  // Token revocation endpoints vary by provider
  // This is an example for Google
  if (provider === 'google') {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST',
    });
  }
  // Add other providers as needed
};
```

## Creating the Auth Context

The Auth Context provides authentication state and methods throughout the application.

```typescript
// src/contexts/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback
} from 'react';
import {
  AuthContextType,
  AuthState,
  AuthTokens,
  User
} from '../types/auth.types';
import {
  initiateLogin,
  exchangeCodeForTokens,
  fetchUserInfo,
  refreshToken as refreshTokenService,
  revokeToken,
} from '../services/authService';

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: AuthTokens }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'REFRESH_TOKEN':
      return {
        ...state,
        tokens: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Storage keys
const TOKEN_STORAGE_KEY = 'auth_tokens';
const USER_STORAGE_KEY = 'auth_user';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load stored auth state on mount
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedTokens && storedUser) {
          const tokens: AuthTokens = JSON.parse(storedTokens);
          const user: User = JSON.parse(storedUser);

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, tokens },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  // Save auth state to storage
  const saveAuthState = useCallback((user: User, tokens: AuthTokens) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }, []);

  // Clear auth state from storage
  const clearAuthState = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // Login function
  const login = useCallback(async (provider: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      await initiateLogin(provider);
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }, []);

  // Handle OAuth callback
  const handleCallback = useCallback(
    async (code: string, callbackState: string) => {
      dispatch({ type: 'LOGIN_START' });
      try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, callbackState);

        // Get provider from stored PKCE state
        const pkceState = sessionStorage.getItem('oauth_pkce_state');
        const provider = pkceState
          ? JSON.parse(pkceState).provider
          : 'unknown';

        // Fetch user information
        const user = await fetchUserInfo(tokens.accessToken, provider);

        // Save to storage
        saveAuthState(user, tokens);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, tokens },
        });
      } catch (error) {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload:
            error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    },
    [saveAuthState]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (state.tokens && state.user) {
        await revokeToken(state.tokens.accessToken, state.user.provider);
      }
    } catch (error) {
      console.error('Failed to revoke token:', error);
    } finally {
      clearAuthState();
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.tokens, state.user, clearAuthState]);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!state.tokens?.refreshToken || !state.user) {
      throw new Error('No refresh token available');
    }

    try {
      const newTokens = await refreshTokenService(
        state.tokens.refreshToken,
        state.user.provider
      );

      saveAuthState(state.user, newTokens);
      dispatch({ type: 'REFRESH_TOKEN', payload: newTokens });
    } catch (error) {
      // If refresh fails, log out the user
      clearAuthState();
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  }, [state.tokens, state.user, saveAuthState, clearAuthState]);

  // Auto refresh token before expiry
  useEffect(() => {
    if (!state.tokens || !state.isAuthenticated) return;

    const expiresIn = state.tokens.expiresIn;
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;

    if (refreshTime <= 0) return;

    const timer = setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [state.tokens, state.isAuthenticated, refreshAccessToken]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    handleCallback,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Building the UI Components

### Login Component

```typescript
// src/components/Auth/Login.tsx

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (provider: string) => {
    await login(provider);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome</h1>
        <p>Sign in to continue to your account</p>

        {error && <div className="error-message">{error}</div>}

        <div className="login-buttons">
          <button
            className="login-btn google"
            onClick={() => handleLogin('google')}
            disabled={isLoading}
          >
            <svg className="provider-icon" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            className="login-btn github"
            onClick={() => handleLogin('github')}
            disabled={isLoading}
          >
            <svg className="provider-icon" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            Continue with GitHub
          </button>

          <button
            className="login-btn microsoft"
            onClick={() => handleLogin('microsoft')}
            disabled={isLoading}
          >
            <svg className="provider-icon" viewBox="0 0 24 24">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#00a4ef" d="M1 13h10v10H1z" />
              <path fill="#7fba00" d="M13 1h10v10H13z" />
              <path fill="#ffb900" d="M13 13h10v10H13z" />
            </svg>
            Continue with Microsoft
          </button>
        </div>

        {isLoading && <div className="loading">Redirecting...</div>}
      </div>
    </div>
  );
};

export default Login;
```

### Callback Component

```typescript
// src/components/Auth/Callback.tsx

import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Callback.css';

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback, error, isAuthenticated } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent double processing in strict mode
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        navigate('/login', {
          state: { error: errorDescription || errorParam },
        });
        return;
      }

      if (!code || !state) {
        navigate('/login', {
          state: { error: 'Missing authorization code or state' },
        });
        return;
      }

      try {
        await handleCallback(code, state);
      } catch (err) {
        console.error('Callback error:', err);
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      navigate('/login', { state: { error }, replace: true });
    }
  }, [error, navigate]);

  return (
    <div className="callback-container">
      <div className="callback-card">
        <div className="spinner"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};

export default Callback;
```

### Protected Route Component

```typescript
// src/components/Auth/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### Dashboard Component

```typescript
// src/components/Dashboard/Dashboard.tsx

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, tokens, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <section className="user-info">
          <h2>User Information</h2>
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className="user-avatar"
            />
          )}
          <div className="user-details">
            <p>
              <strong>Name:</strong> {user?.name}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Provider:</strong> {user?.provider}
            </p>
            <p>
              <strong>User ID:</strong> {user?.id}
            </p>
          </div>
        </section>

        <section className="token-info">
          <h2>Token Information</h2>
          <div className="token-details">
            <p>
              <strong>Token Type:</strong> {tokens?.tokenType}
            </p>
            <p>
              <strong>Expires In:</strong> {tokens?.expiresIn} seconds
            </p>
            <p>
              <strong>Access Token:</strong>{' '}
              <code>{tokens?.accessToken.substring(0, 20)}...</code>
            </p>
            <p>
              <strong>Has Refresh Token:</strong>{' '}
              {tokens?.refreshToken ? 'Yes' : 'No'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
```

## Setting Up Routes

Configure React Router for the application.

```typescript
// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Callback from './components/Auth/Callback';
import Dashboard from './components/Dashboard/Dashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
```

## Creating an API Service with Token Interceptor

Handle authenticated API requests with automatic token refresh.

```typescript
// src/services/apiService.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const TOKEN_STORAGE_KEY = 'auth_tokens';
const USER_STORAGE_KEY = 'auth_user';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds authorization header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedTokens) {
      const tokens = JSON.parse(storedTokens);
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const user = JSON.parse(storedUser);

          if (tokens.refreshToken) {
            // Import dynamically to avoid circular dependency
            const { refreshToken } = await import('./authService');
            const newTokens = await refreshToken(
              tokens.refreshToken,
              user.provider
            );

            // Update stored tokens
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newTokens));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Clear auth state and redirect to login
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Security Best Practices

When implementing OAuth 2.0 in React applications, follow these security best practices:

### 1. Always Use PKCE

PKCE protects against authorization code interception attacks. Always use the S256 code challenge method:

```typescript
// Generate code verifier and challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Include in authorization request
const params = new URLSearchParams({
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  // ... other params
});
```

### 2. Validate State Parameter

Always validate the state parameter to prevent CSRF attacks:

```typescript
if (storedState !== receivedState) {
  throw new Error('State mismatch. Possible CSRF attack.');
}
```

### 3. Store Tokens Securely

For SPAs, consider these storage options:

| Storage Method | Pros | Cons |
|----------------|------|------|
| localStorage | Persistent, easy to use | Vulnerable to XSS |
| sessionStorage | Cleared on tab close | Limited to single tab |
| Memory (state) | Most secure | Lost on refresh |
| HttpOnly cookies | XSS protected | Requires backend |

### 4. Implement Token Refresh

Automatically refresh tokens before they expire:

```typescript
useEffect(() => {
  if (!tokens) return;

  const refreshTime = (tokens.expiresIn - 300) * 1000; // 5 min before expiry
  const timer = setTimeout(refreshAccessToken, refreshTime);

  return () => clearTimeout(timer);
}, [tokens]);
```

### 5. Handle Token Revocation

Always revoke tokens on logout:

```typescript
const logout = async () => {
  await revokeToken(accessToken, provider);
  clearAuthState();
};
```

## Common OAuth 2.0 Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_grant` | Expired or already used auth code | Restart the authorization flow |
| `invalid_client` | Wrong client ID or secret | Verify OAuth app configuration |
| `invalid_request` | Missing required parameters | Check all required params are included |
| `access_denied` | User denied authorization | Handle gracefully, show message to user |
| `unauthorized_client` | Client not authorized for grant type | Check OAuth app settings |
| `invalid_scope` | Requested scope not allowed | Use only allowed scopes |

## Testing OAuth Implementation

### Unit Testing the PKCE Functions

```typescript
// src/utils/pkce.test.ts

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState
} from './pkce';

describe('PKCE Utilities', () => {
  test('generateCodeVerifier returns string of correct length', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  test('generateCodeChallenge returns base64url encoded hash', async () => {
    const verifier = 'test_verifier_string';
    const challenge = await generateCodeChallenge(verifier);

    // Should only contain base64url characters
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('generateState returns unique values', () => {
    const state1 = generateState();
    const state2 = generateState();
    expect(state1).not.toBe(state2);
  });

  test('code challenge is deterministic', async () => {
    const verifier = 'consistent_verifier';
    const challenge1 = await generateCodeChallenge(verifier);
    const challenge2 = await generateCodeChallenge(verifier);
    expect(challenge1).toBe(challenge2);
  });
});
```

### Integration Testing with Mock Server

```typescript
// src/services/authService.test.ts

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { exchangeCodeForTokens } from './authService';

const server = setupServer(
  rest.post('https://oauth2.googleapis.com/token', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Auth Service', () => {
  beforeEach(() => {
    sessionStorage.setItem(
      'oauth_pkce_state',
      JSON.stringify({
        codeVerifier: 'test_verifier',
        state: 'test_state',
        provider: 'google',
      })
    );
  });

  test('exchangeCodeForTokens returns tokens', async () => {
    const tokens = await exchangeCodeForTokens('auth_code', 'test_state');

    expect(tokens.accessToken).toBe('mock_access_token');
    expect(tokens.refreshToken).toBe('mock_refresh_token');
    expect(tokens.expiresIn).toBe(3600);
  });

  test('exchangeCodeForTokens throws on state mismatch', async () => {
    await expect(
      exchangeCodeForTokens('auth_code', 'wrong_state')
    ).rejects.toThrow('State mismatch');
  });
});
```

## Summary Table: OAuth 2.0 Implementation Checklist

| Component | Implementation | Security Consideration |
|-----------|----------------|----------------------|
| **PKCE Code Verifier** | 32-byte random string, base64url encoded | Store securely in sessionStorage |
| **PKCE Code Challenge** | SHA-256 hash of verifier, base64url encoded | Use S256 method, not plain |
| **State Parameter** | Random string for CSRF protection | Validate on callback |
| **Authorization Request** | Include all required params | Use HTTPS only |
| **Token Exchange** | POST to token endpoint | Validate response, handle errors |
| **Token Storage** | localStorage/sessionStorage/memory | Consider XSS risks |
| **Token Refresh** | Auto-refresh before expiry | Handle refresh failures |
| **Token Revocation** | Call revoke endpoint on logout | Clear local storage |
| **Protected Routes** | Check authentication state | Redirect to login if unauthenticated |
| **API Interceptors** | Add auth header, handle 401s | Refresh tokens automatically |

## Conclusion

Implementing OAuth 2.0 authentication in React requires careful attention to security details. By using the Authorization Code flow with PKCE, you can build secure authentication that protects your users from common attacks.

Key takeaways:

1. **Always use PKCE** for public clients like SPAs and mobile apps
2. **Validate the state parameter** to prevent CSRF attacks
3. **Store tokens appropriately** based on your security requirements
4. **Implement automatic token refresh** for seamless user experience
5. **Handle errors gracefully** and provide clear feedback to users
6. **Test thoroughly** including edge cases and error scenarios

With these patterns and practices, you can confidently implement OAuth 2.0 authentication in your React applications while maintaining security and providing a great user experience.

## Additional Resources

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
