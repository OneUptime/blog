# How to Secure React Applications with JWT Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Security, JWT, Authentication, Authorization, Frontend

Description: Learn to implement secure JWT authentication in React applications, including token storage, refresh mechanisms, protected routes, and security best practices.

---

JSON Web Tokens (JWT) have become the standard for securing modern web applications. In React applications, implementing JWT authentication correctly requires understanding token lifecycle management, secure storage strategies, and proper integration with your component architecture.

This guide covers everything from basic JWT concepts to production-ready implementations with token refresh, protected routes, and security hardening.

## Understanding JWT Authentication

### What is a JWT?

A JSON Web Token consists of three parts separated by dots: header, payload, and signature.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**: Contains the token type and signing algorithm
- **Payload**: Contains claims (user data, expiration, etc.)
- **Signature**: Verifies the token has not been tampered with

### JWT Authentication Flow

```
1. User submits credentials (username/password)
2. Server validates credentials
3. Server generates JWT (access token) and refresh token
4. Client stores tokens securely
5. Client includes access token in API requests
6. Server validates token on each request
7. When access token expires, client uses refresh token to get new access token
```

## Project Setup

### Installation

```bash
npm install axios jwt-decode react-router-dom
```

### Project Structure

```
src/
  auth/
    AuthContext.tsx
    AuthProvider.tsx
    useAuth.ts
    ProtectedRoute.tsx
  api/
    axiosInstance.ts
    authApi.ts
  hooks/
    useTokenRefresh.ts
  utils/
    tokenUtils.ts
  types/
    auth.types.ts
```

## Type Definitions

Create strongly typed interfaces for authentication:

```typescript
// src/types/auth.types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}
```

## Token Utilities

Create utility functions for token management:

```typescript
// src/utils/tokenUtils.ts

import { jwtDecode } from 'jwt-decode';
import type { JWTPayload } from '../types/auth.types';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Token storage functions
export const setTokens = (accessToken: string, refreshToken: string): void => {
  // Store access token in memory or sessionStorage for better security
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  // Refresh token can be stored in localStorage for persistence
  // Or better: use httpOnly cookies set by the server
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearTokens = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Token validation functions
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  // Add a buffer of 30 seconds to account for clock skew
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime + 30;
};

export const getTokenExpirationTime = (token: string): number | null => {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  return decoded.exp * 1000; // Convert to milliseconds
};

export const getTimeUntilExpiration = (token: string): number => {
  const expTime = getTokenExpirationTime(token);
  if (!expTime) return 0;
  return Math.max(0, expTime - Date.now());
};
```

## Axios Instance with Interceptors

Configure Axios to automatically handle authentication:

```typescript
// src/api/axiosInstance.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired
} from '../utils/tokenUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Track if we're currently refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - add auth token to requests
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = getAccessToken();

    if (accessToken && !isTokenExpired(accessToken)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is not 401 or request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      setTokens(accessToken, newRefreshToken);

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
```

## Authentication API

Create API functions for authentication operations:

```typescript
// src/api/authApi.ts

import axiosInstance from './axiosInstance';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthTokens
} from '../types/auth.types';

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await axiosInstance.post('/auth/logout', { refreshToken });
  },

  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await axiosInstance.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/auth/me');
    return response.data;
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await axiosInstance.put('/auth/password', {
      currentPassword,
      newPassword,
    });
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await axiosInstance.post('/auth/password/reset-request', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await axiosInstance.post('/auth/password/reset', {
      token,
      newPassword,
    });
  },
};
```

## Authentication Context

Create a React context for managing authentication state:

```typescript
// src/auth/AuthContext.tsx

import { createContext, useContext } from 'react';
import type { AuthContextType } from '../types/auth.types';

const defaultContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshAuth: async () => {},
  clearError: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
```

## Authentication Provider

Implement the authentication provider with full token lifecycle management:

```typescript
// src/auth/AuthProvider.tsx

import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { authApi } from '../api/authApi';
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isTokenExpired,
  getTimeUntilExpiration,
} from '../utils/tokenUtils';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthState,
} from '../types/auth.types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);

  // Schedule token refresh before expiration
  const scheduleTokenRefresh = useCallback((accessToken: string) => {
    // Clear any existing timeout
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    const timeUntilExpiry = getTimeUntilExpiration(accessToken);

    // Refresh 60 seconds before expiration
    const refreshTime = Math.max(0, timeUntilExpiry - 60000);

    if (refreshTime > 0) {
      const timeout = setTimeout(async () => {
        try {
          await refreshAuth();
        } catch (error) {
          console.error('Failed to refresh token:', error);
          logout();
        }
      }, refreshTime);

      setRefreshTimeout(timeout);
    }
  }, [refreshTimeout]);

  // Refresh authentication
  const refreshAuth = useCallback(async (): Promise<void> => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const { accessToken, refreshToken: newRefreshToken } = await authApi.refreshToken(refreshToken);
      setTokens(accessToken, newRefreshToken);

      const user = await authApi.getCurrentUser();

      setState((prev) => ({
        ...prev,
        user,
        isAuthenticated: true,
        error: null,
      }));

      scheduleTokenRefresh(accessToken);
    } catch (error) {
      clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired. Please log in again.',
      });
      throw error;
    }
  }, [scheduleTokenRefresh]);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        if (accessToken && !isTokenExpired(accessToken)) {
          // Valid access token exists
          const user = await authApi.getCurrentUser();
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          scheduleTokenRefresh(accessToken);
        } else if (refreshToken) {
          // Access token expired but refresh token exists
          await refreshAuth();
          setState((prev) => ({ ...prev, isLoading: false }));
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        clearTokens();
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initializeAuth();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { user, tokens } = await authApi.login(credentials);
      setTokens(tokens.accessToken, tokens.refreshToken);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      scheduleTokenRefresh(tokens.accessToken);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [scheduleTokenRefresh]);

  // Register function
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { user, tokens } = await authApi.register(data);
      setTokens(tokens.accessToken, tokens.refreshToken);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      scheduleTokenRefresh(tokens.accessToken);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [scheduleTokenRefresh]);

  // Logout function
  const logout = useCallback((): void => {
    const refreshToken = getRefreshToken();

    // Clear timeout
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      setRefreshTimeout(null);
    }

    // Invalidate refresh token on server (fire and forget)
    if (refreshToken) {
      authApi.logout(refreshToken).catch(console.error);
    }

    clearTokens();

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, [refreshTimeout]);

  // Clear error
  const clearError = useCallback((): void => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshAuth,
      clearError,
    }),
    [state, login, register, logout, refreshAuth, clearError]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Protected Route Component

Create a component to protect routes that require authentication:

```typescript
// src/auth/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = '/login',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0 && user) {
    const hasRequiredPermissions = requiredPermissions.every(
      (permission) => user.permissions.includes(permission)
    );
    if (!hasRequiredPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
```

## Login Component

Implement a login form with proper error handling:

```typescript
// src/components/Login.tsx

import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface LocationState {
  from?: { pathname: string };
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by context
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Sign In</h1>

        {error && (
          <div className="error-alert" role="alert">
            {error}
            <button type="button" onClick={clearError} aria-label="Dismiss">
              X
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="form-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create an account</Link>
        </div>
      </form>
    </div>
  );
};
```

## Application Setup

Wire everything together in your app:

```typescript
// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { Profile } from './components/Profile';
import { Unauthorized } from './components/Unauthorized';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - require specific role */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Route with permission check */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
```

## Token Refresh Hook

Create a custom hook for manual token refresh:

```typescript
// src/hooks/useTokenRefresh.ts

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAccessToken, getTimeUntilExpiration } from '../utils/tokenUtils';

interface UseTokenRefreshOptions {
  refreshThreshold?: number; // Milliseconds before expiration to trigger refresh
  checkInterval?: number;    // Milliseconds between expiration checks
}

export const useTokenRefresh = (options: UseTokenRefreshOptions = {}) => {
  const {
    refreshThreshold = 60000, // Refresh 1 minute before expiration
    checkInterval = 30000,    // Check every 30 seconds
  } = options;

  const { refreshAuth, isAuthenticated, logout } = useAuth();
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  const checkAndRefresh = useCallback(async () => {
    if (!isAuthenticated) return;

    const accessToken = getAccessToken();
    if (!accessToken) return;

    const timeUntilExpiry = getTimeUntilExpiration(accessToken);

    if (timeUntilExpiry <= refreshThreshold) {
      try {
        await refreshAuth();
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }
  }, [isAuthenticated, refreshAuth, logout, refreshThreshold]);

  useEffect(() => {
    if (isAuthenticated) {
      // Initial check
      checkAndRefresh();

      // Set up interval
      intervalRef.current = setInterval(checkAndRefresh, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, checkAndRefresh, checkInterval]);

  return { checkAndRefresh };
};
```

## Security Best Practices

### Secure Token Storage

```typescript
// src/utils/secureStorage.ts

// Option 1: In-memory storage (most secure, but tokens lost on refresh)
class InMemoryStorage {
  private storage: Map<string, string> = new Map();

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const secureStorage = new InMemoryStorage();

// Option 2: Encrypted localStorage (compromise between security and persistence)
const ENCRYPTION_KEY = 'your-encryption-key'; // In practice, derive from user input

export const encryptedStorage = {
  setItem: (key: string, value: string): void => {
    const encrypted = btoa(encodeURIComponent(value)); // Simple encoding, use proper encryption in production
    localStorage.setItem(key, encrypted);
  },

  getItem: (key: string): string | null => {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return decodeURIComponent(atob(encrypted));
    } catch {
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
};
```

### XSS Protection

```typescript
// src/utils/sanitize.ts

// Sanitize user input before displaying
export const sanitizeInput = (input: string): string => {
  const element = document.createElement('div');
  element.textContent = input;
  return element.innerHTML;
};

// Validate JWT format before processing
export const isValidJWTFormat = (token: string): boolean => {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  return jwtRegex.test(token);
};
```

### CSRF Protection

```typescript
// src/api/csrfProtection.ts

import axiosInstance from './axiosInstance';

// Get CSRF token from server and include in requests
export const setupCSRFProtection = async (): Promise<void> => {
  try {
    const response = await axiosInstance.get('/auth/csrf-token');
    const csrfToken = response.data.token;

    // Add CSRF token to all future requests
    axiosInstance.defaults.headers.common['X-CSRF-Token'] = csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
  }
};

// Add to axios interceptor
axiosInstance.interceptors.request.use((config) => {
  // Include CSRF token in state-changing requests
  if (['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});
```

### Rate Limiting on Client

```typescript
// src/utils/rateLimiter.ts

interface RateLimiterOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  private blocked: Map<string, number> = new Map();
  private options: RateLimiterOptions;

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = {
      maxAttempts: 5,
      windowMs: 60000,      // 1 minute window
      blockDurationMs: 300000, // 5 minute block
      ...options,
    };
  }

  isBlocked(key: string): boolean {
    const blockedUntil = this.blocked.get(key);
    if (blockedUntil && Date.now() < blockedUntil) {
      return true;
    }
    this.blocked.delete(key);
    return false;
  }

  recordAttempt(key: string): boolean {
    if (this.isBlocked(key)) {
      return false;
    }

    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.firstAttempt > this.options.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    record.count++;

    if (record.count > this.options.maxAttempts) {
      this.blocked.set(key, now + this.options.blockDurationMs);
      this.attempts.delete(key);
      return false;
    }

    return true;
  }

  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return this.options.maxAttempts;
    return Math.max(0, this.options.maxAttempts - record.count);
  }
}

export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 60000,
  blockDurationMs: 300000,
});
```

## Handling Token Expiration Gracefully

```typescript
// src/components/SessionExpiryModal.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAccessToken, getTimeUntilExpiration } from '../utils/tokenUtils';

export const SessionExpiryModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { refreshAuth, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkExpiry = () => {
      const token = getAccessToken();
      if (!token) return;

      const timeUntilExpiry = getTimeUntilExpiration(token);

      // Show modal 2 minutes before expiry
      if (timeUntilExpiry <= 120000 && timeUntilExpiry > 0) {
        setShowModal(true);
        setCountdown(Math.floor(timeUntilExpiry / 1000));
      }
    };

    const interval = setInterval(checkExpiry, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showModal) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showModal, logout]);

  const handleExtendSession = async () => {
    try {
      await refreshAuth();
      setShowModal(false);
    } catch (error) {
      logout();
    }
  };

  if (!showModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Session Expiring</h2>
        <p>
          Your session will expire in {countdown} seconds. Would you like to
          extend your session?
        </p>
        <div className="modal-actions">
          <button onClick={handleExtendSession} className="btn-primary">
            Extend Session
          </button>
          <button onClick={logout} className="btn-secondary">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Testing Authentication

```typescript
// src/auth/__tests__/AuthProvider.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../AuthContext';
import { authApi } from '../../api/authApi';

// Mock the API
jest.mock('../../api/authApi');

const TestComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      {user && <div data-testid="user-name">{user.name}</div>}
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should start with unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });

  it('should authenticate user on successful login', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'user', permissions: [] };
    const mockTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' };

    (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, tokens: mockTokens });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      userEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    });
  });

  it('should clear auth state on logout', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'user', permissions: [] };
    const mockTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' };

    (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, tokens: mockTokens });
    (authApi.logout as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    await act(async () => {
      userEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Then logout
    await act(async () => {
      userEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });
});
```

## Summary

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Token Storage** | Secure token persistence | sessionStorage for access tokens, localStorage/httpOnly cookies for refresh tokens |
| **Axios Interceptors** | Automatic token handling | Attach tokens to requests, handle 401 responses, queue failed requests during refresh |
| **AuthContext** | Global auth state | User data, authentication status, loading states, error handling |
| **AuthProvider** | Auth logic implementation | Login, logout, register, automatic token refresh scheduling |
| **ProtectedRoute** | Route protection | Authentication checks, role-based access, permission-based access |
| **Token Refresh** | Session management | Automatic refresh before expiration, queue management for concurrent requests |
| **Security Measures** | Attack prevention | XSS protection, CSRF tokens, rate limiting, input sanitization |
| **Session Expiry UI** | User experience | Countdown warnings, session extension prompts |

JWT authentication in React requires careful attention to token lifecycle, secure storage, and user experience. By implementing proper interceptors, automatic refresh mechanisms, and security measures, you can build authentication systems that are both secure and user-friendly. Remember to always validate tokens on the server side, use HTTPS in production, and consider using httpOnly cookies for refresh tokens when possible.
