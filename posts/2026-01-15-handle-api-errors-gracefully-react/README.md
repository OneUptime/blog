# How to Handle API Errors Gracefully in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Error Handling, API, UX, Best Practices, Frontend

Description: Learn to implement robust API error handling in React applications using error boundaries, toast notifications, retry logic, and centralized error management for better user experience.

---

API errors are inevitable in web applications. Networks fail, servers return unexpected responses, and users experience connectivity issues. How your React application handles these errors determines whether users get frustrated or continue their journey smoothly.

This guide covers comprehensive strategies for handling API errors gracefully, from basic try-catch patterns to advanced error boundaries and centralized error management systems.

## Understanding API Error Types

Before implementing error handling, understand the types of errors you will encounter:

### HTTP Status Code Categories

```typescript
// Common HTTP error status codes
const HTTP_ERRORS = {
  // Client Errors (4xx)
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',

  // Server Errors (5xx)
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};
```

### Error Classification

```typescript
type ErrorType =
  | 'network'       // No internet, DNS failure
  | 'timeout'       // Request took too long
  | 'auth'          // 401, 403
  | 'validation'    // 400, 422
  | 'not_found'     // 404
  | 'rate_limit'    // 429
  | 'server'        // 5xx
  | 'unknown';      // Unexpected errors

function classifyError(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'network';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }

  if (error instanceof Response) {
    const status = error.status;
    if (status === 401 || status === 403) return 'auth';
    if (status === 400 || status === 422) return 'validation';
    if (status === 404) return 'not_found';
    if (status === 429) return 'rate_limit';
    if (status >= 500) return 'server';
  }

  return 'unknown';
}
```

## Basic Error Handling with Try-Catch

### Simple Fetch with Error Handling

```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);

    // Parse response body
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data?.message || `HTTP Error: ${response.status}`,
          code: data?.code,
          details: data?.errors,
        },
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    // Network error or JSON parsing error
    return {
      data: null,
      error: {
        message: error instanceof Error
          ? error.message
          : 'An unexpected error occurred',
      },
      status: 0,
    };
  }
}
```

### Using in Components

```tsx
import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setError(null);

      const response = await fetchWithErrorHandling<User>(
        `/api/users/${userId}`
      );

      if (response.error) {
        setError(response.error.message);
      } else {
        setUser(response.data);
      }

      setLoading(false);
    }

    loadUser();
  }, [userId]);

  if (loading) {
    return <div className="loading">Loading user...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
    </div>
  );
}
```

## Creating a Custom API Hook

### useApi Hook with Full Error Handling

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  status: number | null;
}

interface UseApiOptions {
  retryCount?: number;
  retryDelay?: number;
  onError?: (error: ApiError) => void;
  onSuccess?: <T>(data: T) => void;
}

function useApi<T>(options: UseApiOptions = {}) {
  const {
    retryCount = 0,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
    status: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (url: string, fetchOptions?: RequestInit): Promise<T | null> => {
      // Cancel previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, loading: true, error: null }));

      const attemptFetch = async (): Promise<ApiResponse<T>> => {
        try {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: abortControllerRef.current?.signal,
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            return {
              data: null,
              error: {
                message: data?.message || getDefaultErrorMessage(response.status),
                code: data?.code,
                details: data?.errors,
              },
              status: response.status,
            };
          }

          return { data, error: null, status: response.status };
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error; // Re-throw abort errors
          }

          return {
            data: null,
            error: {
              message: error instanceof Error
                ? error.message
                : 'Network error occurred',
            },
            status: 0,
          };
        }
      };

      let result = await attemptFetch();

      // Retry logic for server errors and network errors
      while (
        result.error &&
        (result.status === 0 || result.status >= 500) &&
        retryCountRef.current < retryCount
      ) {
        retryCountRef.current++;
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCountRef.current));
        result = await attemptFetch();
      }

      retryCountRef.current = 0;

      if (result.error) {
        setState({
          data: null,
          error: result.error,
          loading: false,
          status: result.status,
        });
        onError?.(result.error);
        return null;
      }

      setState({
        data: result.data,
        error: null,
        loading: false,
        status: result.status,
      });
      onSuccess?.(result.data as T);
      return result.data;
    },
    [retryCount, retryDelay, onError, onSuccess]
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      data: null,
      error: null,
      loading: false,
      status: null,
    });
  }, []);

  return { ...state, execute, reset };
}

function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'The request was invalid. Please check your input.',
    401: 'Please log in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with the current state.',
    422: 'The provided data is invalid.',
    429: 'Too many requests. Please try again later.',
    500: 'An internal server error occurred.',
    502: 'The server is temporarily unavailable.',
    503: 'The service is currently unavailable.',
    504: 'The server took too long to respond.',
  };

  return messages[status] || 'An unexpected error occurred.';
}
```

### Using the Custom Hook

```tsx
function UserList() {
  const { data: users, error, loading, execute } = useApi<User[]>({
    retryCount: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Failed to load users:', error.message);
    },
  });

  useEffect(() => {
    execute('/api/users');
  }, [execute]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorDisplay
        message={error.message}
        onRetry={() => execute('/api/users')}
      />
    );
  }

  return (
    <ul className="user-list">
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Error Boundaries for React Components

Error boundaries catch JavaScript errors anywhere in their child component tree and display a fallback UI.

### Creating an Error Boundary

```tsx
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.reset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### API-Specific Error Boundary

```tsx
interface ApiErrorBoundaryProps {
  children: ReactNode;
  onAuthError?: () => void;
  onNetworkError?: () => void;
}

interface ApiErrorBoundaryState {
  hasError: boolean;
  errorType: ErrorType | null;
  errorMessage: string | null;
}

class ApiErrorBoundary extends Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorType: null,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ApiErrorBoundaryState> {
    const errorType = classifyError(error);
    return {
      hasError: true,
      errorType,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error): void {
    const errorType = classifyError(error);

    if (errorType === 'auth') {
      this.props.onAuthError?.();
    } else if (errorType === 'network') {
      this.props.onNetworkError?.();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      errorType: null,
      errorMessage: null,
    });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { errorType, errorMessage } = this.state;

    switch (errorType) {
      case 'network':
        return (
          <NetworkErrorFallback
            onRetry={this.reset}
          />
        );

      case 'auth':
        return (
          <AuthErrorFallback
            message="Your session has expired"
            onLogin={() => window.location.href = '/login'}
          />
        );

      case 'not_found':
        return (
          <NotFoundFallback
            message={errorMessage || 'Resource not found'}
            onGoBack={() => window.history.back()}
          />
        );

      case 'server':
        return (
          <ServerErrorFallback
            message="We are experiencing technical difficulties"
            onRetry={this.reset}
          />
        );

      default:
        return (
          <GenericErrorFallback
            message={errorMessage || 'Something went wrong'}
            onRetry={this.reset}
          />
        );
    }
  }
}
```

### Fallback Components

```tsx
function NetworkErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-fallback network-error">
      <svg className="error-icon" viewBox="0 0 24 24">
        <path d="M1 1h22v22H1z" fill="none" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z" />
      </svg>
      <h2>Connection Error</h2>
      <p>Unable to connect to the server. Please check your internet connection.</p>
      <button onClick={onRetry} className="retry-button">
        Try Again
      </button>
    </div>
  );
}

function ServerErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-fallback server-error">
      <h2>Server Error</h2>
      <p>{message}</p>
      <p className="error-hint">
        Please try again in a few moments. If the problem persists,
        contact support.
      </p>
      <button onClick={onRetry} className="retry-button">
        Try Again
      </button>
    </div>
  );
}

function AuthErrorFallback({
  message,
  onLogin,
}: {
  message: string;
  onLogin: () => void;
}) {
  return (
    <div className="error-fallback auth-error">
      <h2>Authentication Required</h2>
      <p>{message}</p>
      <button onClick={onLogin} className="login-button">
        Log In
      </button>
    </div>
  );
}

function NotFoundFallback({
  message,
  onGoBack,
}: {
  message: string;
  onGoBack: () => void;
}) {
  return (
    <div className="error-fallback not-found">
      <h2>Not Found</h2>
      <p>{message}</p>
      <button onClick={onGoBack} className="back-button">
        Go Back
      </button>
    </div>
  );
}

function GenericErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-fallback generic-error">
      <h2>Oops! Something went wrong</h2>
      <p>{message}</p>
      <button onClick={onRetry} className="retry-button">
        Try Again
      </button>
    </div>
  );
}
```

## Toast Notifications for Error Feedback

Toast notifications provide non-intrusive error feedback without blocking the user interface.

### Toast Context and Provider

```tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

### Toast Container Component

```tsx
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const icons: Record<ToastType, string> = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  return (
    <div className={`toast toast-${toast.type}`} role="alert">
      <span className={`toast-icon icon-${icons[toast.type]}`} />
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        x
      </button>
    </div>
  );
}
```

### Toast Styles

```css
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  background-color: #10b981;
  color: white;
}

.toast-error {
  background-color: #ef4444;
  color: white;
}

.toast-warning {
  background-color: #f59e0b;
  color: white;
}

.toast-info {
  background-color: #3b82f6;
  color: white;
}

.toast-message {
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
}
```

### Using Toast for API Errors

```tsx
function useApiWithToast<T>() {
  const { addToast } = useToast();
  const api = useApi<T>({
    onError: (error) => {
      addToast({
        type: 'error',
        message: error.message,
        duration: 5000,
      });
    },
    onSuccess: () => {
      // Optional success toast
    },
  });

  return api;
}

// Usage in component
function CreateUserForm() {
  const { addToast } = useToast();
  const { execute, loading } = useApiWithToast<User>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const user = await execute('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });

    if (user) {
      addToast({
        type: 'success',
        message: 'User created successfully!',
      });
      setName('');
      setEmail('');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
        required
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

## Centralized Error Management

### Global Error Handler

```typescript
type ErrorHandler = (error: ApiError, context?: ErrorContext) => void;

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class ErrorManager {
  private handlers: Map<ErrorType, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];

  registerHandler(errorType: ErrorType, handler: ErrorHandler): () => void {
    const handlers = this.handlers.get(errorType) || [];
    handlers.push(handler);
    this.handlers.set(errorType, handlers);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(errorType) || [];
      this.handlers.set(
        errorType,
        current.filter(h => h !== handler)
      );
    };
  }

  registerGlobalHandler(handler: ErrorHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      this.globalHandlers = this.globalHandlers.filter(h => h !== handler);
    };
  }

  handleError(error: ApiError, context?: ErrorContext): void {
    const errorType = this.classifyApiError(error);

    // Execute type-specific handlers
    const typeHandlers = this.handlers.get(errorType) || [];
    typeHandlers.forEach(handler => handler(error, context));

    // Execute global handlers
    this.globalHandlers.forEach(handler => handler(error, context));
  }

  private classifyApiError(error: ApiError): ErrorType {
    if (error.code === 'NETWORK_ERROR') return 'network';
    if (error.code === 'TIMEOUT') return 'timeout';
    if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') return 'auth';
    if (error.code === 'VALIDATION_ERROR') return 'validation';
    if (error.code === 'NOT_FOUND') return 'not_found';
    if (error.code === 'RATE_LIMITED') return 'rate_limit';
    if (error.code?.startsWith('SERVER_')) return 'server';
    return 'unknown';
  }
}

export const errorManager = new ErrorManager();
```

### Error Provider Component

```tsx
import { useEffect, ReactNode } from 'react';

interface ErrorProviderProps {
  children: ReactNode;
  onAuthError?: () => void;
  onNetworkError?: () => void;
}

export function ErrorProvider({
  children,
  onAuthError,
  onNetworkError,
}: ErrorProviderProps) {
  const { addToast } = useToast();

  useEffect(() => {
    // Register auth error handler
    const unsubAuth = errorManager.registerHandler('auth', (error) => {
      addToast({
        type: 'error',
        message: 'Your session has expired. Please log in again.',
        duration: 0, // Don't auto-dismiss
      });
      onAuthError?.();
    });

    // Register network error handler
    const unsubNetwork = errorManager.registerHandler('network', (error) => {
      addToast({
        type: 'warning',
        message: 'Network connection lost. Please check your internet.',
        duration: 0,
      });
      onNetworkError?.();
    });

    // Register rate limit handler
    const unsubRateLimit = errorManager.registerHandler('rate_limit', (error) => {
      addToast({
        type: 'warning',
        message: 'Too many requests. Please wait a moment before trying again.',
        duration: 10000,
      });
    });

    // Register global handler for logging
    const unsubGlobal = errorManager.registerGlobalHandler((error, context) => {
      console.error('API Error:', {
        error,
        context,
        timestamp: new Date().toISOString(),
      });

      // Send to error tracking service (e.g., Sentry, LogRocket)
      // trackError(error, context);
    });

    return () => {
      unsubAuth();
      unsubNetwork();
      unsubRateLimit();
      unsubGlobal();
    };
  }, [addToast, onAuthError, onNetworkError]);

  return <>{children}</>;
}
```

## Axios Interceptors for Error Handling

If you use Axios, interceptors provide a clean way to handle errors globally.

### Setting Up Axios Interceptors

```typescript
import axios, { AxiosError, AxiosInstance } from 'axios';

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for auth tokens
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const apiError = transformAxiosError(error);
      errorManager.handleError(apiError, {
        action: error.config?.url,
        metadata: {
          method: error.config?.method,
          status: error.response?.status,
        },
      });
      return Promise.reject(apiError);
    }
  );

  return client;
}

function transformAxiosError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
    };
  }

  if (!error.response) {
    return {
      message: 'Unable to connect to the server.',
      code: 'NETWORK_ERROR',
    };
  }

  const status = error.response.status;
  const data = error.response.data as Record<string, unknown>;

  const codeMap: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
    502: 'SERVER_BAD_GATEWAY',
    503: 'SERVER_UNAVAILABLE',
    504: 'SERVER_TIMEOUT',
  };

  return {
    message: (data?.message as string) || getDefaultErrorMessage(status),
    code: codeMap[status] || 'UNKNOWN_ERROR',
    details: data?.errors as Record<string, string[]>,
  };
}

export const apiClient = createApiClient('/api');
```

## Form Validation Error Handling

### Handling Validation Errors

```tsx
interface ValidationErrors {
  [field: string]: string[];
}

interface FormState<T> {
  values: T;
  errors: ValidationErrors;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {} as Record<keyof T, boolean>,
    isSubmitting: false,
    isValid: true,
  });

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  const setFieldError = useCallback((field: string, errors: string[]) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: errors },
      isValid: false,
    }));
  }, []);

  const setErrors = useCallback((errors: ValidationErrors) => {
    setState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearErrors();
      setState(prev => ({ ...prev, isSubmitting: true }));

      try {
        await onSubmit(state.values);
      } catch (error) {
        if (error && typeof error === 'object' && 'details' in error) {
          const apiError = error as ApiError;
          if (apiError.details) {
            setErrors(apiError.details);
          }
        }
      } finally {
        setState(prev => ({ ...prev, isSubmitting: false }));
      }
    },
    [state.values, onSubmit, clearErrors, setErrors]
  );

  return {
    ...state,
    setFieldValue,
    setFieldError,
    setErrors,
    clearErrors,
    handleSubmit,
  };
}
```

### Form Component with Error Display

```tsx
interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
}

function RegistrationForm() {
  const { addToast } = useToast();

  const form = useForm<RegistrationForm>(
    { email: '', password: '', confirmPassword: '' },
    async (values) => {
      const response = await apiClient.post('/auth/register', values);
      addToast({
        type: 'success',
        message: 'Registration successful! Please check your email.',
      });
    }
  );

  return (
    <form onSubmit={form.handleSubmit} className="registration-form">
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.values.email}
          onChange={e => form.setFieldValue('email', e.target.value)}
          className={form.errors.email ? 'input-error' : ''}
        />
        {form.errors.email && (
          <div className="field-errors">
            {form.errors.email.map((error, i) => (
              <span key={i} className="error-message">{error}</span>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.values.password}
          onChange={e => form.setFieldValue('password', e.target.value)}
          className={form.errors.password ? 'input-error' : ''}
        />
        {form.errors.password && (
          <div className="field-errors">
            {form.errors.password.map((error, i) => (
              <span key={i} className="error-message">{error}</span>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={form.values.confirmPassword}
          onChange={e => form.setFieldValue('confirmPassword', e.target.value)}
          className={form.errors.confirmPassword ? 'input-error' : ''}
        />
        {form.errors.confirmPassword && (
          <div className="field-errors">
            {form.errors.confirmPassword.map((error, i) => (
              <span key={i} className="error-message">{error}</span>
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

## Retry Logic with Exponential Backoff

### Implementing Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableStatuses } = {
    ...defaultRetryConfig,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (
          retryableStatuses.includes(response.status) &&
          attempt < maxRetries
        ) {
          const delay = calculateBackoff(attempt, baseDelay, maxDelay);
          await sleep(delay);
          continue;
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Network errors are retryable
      if (
        error instanceof TypeError &&
        error.message === 'Failed to fetch' &&
        attempt < maxRetries
      ) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Retry Hook

```tsx
function useRetryableApi<T>(config?: Partial<RetryConfig>) {
  const [state, setState] = useState({
    data: null as T | null,
    error: null as Error | null,
    loading: false,
    retryCount: 0,
  });

  const execute = useCallback(
    async (url: string, options?: RequestInit) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const data = await fetchWithRetry<T>(url, options, config);
        setState({ data, error: null, loading: false, retryCount: 0 });
        return data;
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        }));
        return null;
      }
    },
    [config]
  );

  return { ...state, execute };
}
```

## Offline Detection and Handling

### Online Status Hook

```tsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Offline-Aware API Hook

```tsx
function useOfflineAwareApi<T>() {
  const isOnline = useOnlineStatus();
  const { addToast } = useToast();
  const api = useApi<T>();
  const pendingRequestsRef = useRef<Array<() => Promise<void>>>([]);

  const execute = useCallback(
    async (url: string, options?: RequestInit) => {
      if (!isOnline) {
        addToast({
          type: 'warning',
          message: 'You are offline. Request will be sent when connection is restored.',
          duration: 5000,
        });

        // Queue the request
        pendingRequestsRef.current.push(() => api.execute(url, options));
        return null;
      }

      return api.execute(url, options);
    },
    [isOnline, api, addToast]
  );

  // Process queued requests when back online
  useEffect(() => {
    if (isOnline && pendingRequestsRef.current.length > 0) {
      addToast({
        type: 'info',
        message: 'Connection restored. Sending pending requests...',
      });

      const requests = pendingRequestsRef.current;
      pendingRequestsRef.current = [];

      Promise.all(requests.map(fn => fn())).then(() => {
        addToast({
          type: 'success',
          message: 'All pending requests have been processed.',
        });
      });
    }
  }, [isOnline, addToast]);

  return { ...api, execute, isOnline };
}
```

### Offline Banner Component

```tsx
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="alert">
      <span className="offline-icon" />
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
}
```

## Summary

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| **Try-Catch** | Basic error handling for individual API calls | Wrap fetch calls in try-catch blocks |
| **Custom Hooks** | Reusable error handling logic across components | `useApi` hook with loading, error, and data states |
| **Error Boundaries** | Catch rendering errors and display fallback UI | Class component with `componentDidCatch` |
| **Toast Notifications** | Non-intrusive error feedback to users | Context-based toast system with auto-dismiss |
| **Centralized Error Manager** | Global error handling and logging | Singleton pattern with type-specific handlers |
| **Axios Interceptors** | Global request/response error handling | Request and response interceptors |
| **Form Validation** | Display field-level validation errors | Map API validation errors to form fields |
| **Retry Logic** | Handle transient failures automatically | Exponential backoff with configurable retries |
| **Offline Detection** | Handle network connectivity issues | Online status hook with request queueing |

Graceful error handling is essential for building reliable React applications. By combining these strategies, you create a robust system that handles errors at every level: from individual API calls to global error management, from silent retries to user-facing notifications.

The key principles to remember:

1. **Classify errors** to handle them appropriately
2. **Provide clear feedback** to users about what went wrong
3. **Offer recovery options** like retry buttons or alternative actions
4. **Log errors** for debugging and monitoring
5. **Fail gracefully** without breaking the entire application

Implementing these patterns ensures your users have a smooth experience even when things go wrong, which is inevitable in distributed systems.
