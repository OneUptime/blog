# How to Handle API Errors and Retry Logic in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, API, Error Handling, Retry Logic, Mobile Development, Networking

Description: Learn how to implement robust API error handling and retry logic in React Native for reliable network operations.

---

Mobile applications operate in unpredictable network environments. Users switch between WiFi and cellular data, enter tunnels, experience signal drops, and encounter server issues. Building resilient React Native applications requires comprehensive error handling and intelligent retry mechanisms. This guide covers everything you need to implement production-ready API error handling.

## Understanding API Error Types

Before implementing error handling, you need to understand the different types of errors your application might encounter.

### Network Errors

Network errors occur when the request cannot reach the server. These include:

```typescript
// Common network error scenarios
const NetworkErrorTypes = {
  NO_INTERNET: 'No internet connection',
  DNS_FAILURE: 'DNS resolution failed',
  CONNECTION_REFUSED: 'Server refused connection',
  NETWORK_TIMEOUT: 'Request timed out',
  SSL_ERROR: 'SSL certificate error',
};
```

### Server Errors (5xx)

Server errors indicate problems on the backend:

```typescript
const ServerErrorCodes = {
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};
```

### Client Errors (4xx)

Client errors indicate issues with the request itself:

```typescript
const ClientErrorCodes = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
};
```

## Setting Up Axios for React Native

Axios is the most popular HTTP client for React Native. Let us create a robust configuration.

### Basic Axios Instance

```typescript
// src/api/axiosInstance.ts
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  return instance;
};

export const apiClient = createAxiosInstance();
```

### Adding Request Interceptors

Request interceptors allow you to modify requests before they are sent:

```typescript
// src/api/interceptors/requestInterceptor.ts
import { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
      // Add authentication token
      const token = await AsyncStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request timestamp for tracking
      config.metadata = { startTime: new Date() };

      // Add unique request ID for debugging
      config.headers['X-Request-ID'] = generateRequestId();

      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);

      return config;
    },
    (error: AxiosError) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );
};

const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

### Adding Response Interceptors

Response interceptors handle responses and errors globally:

```typescript
// src/api/interceptors/responseInterceptor.ts
import { AxiosResponse, AxiosError } from 'axios';

export const setupResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Calculate request duration
      const duration = new Date().getTime() - response.config.metadata?.startTime?.getTime();
      console.log(`[API Response] ${response.status} - ${duration}ms`);

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config;

      // Handle specific error scenarios
      if (error.response) {
        const { status } = error.response;

        // Handle 401 Unauthorized - Token refresh
        if (status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshAuthToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            // Redirect to login
            navigateToLogin();
            return Promise.reject(refreshError);
          }
        }

        // Handle 429 Too Many Requests
        if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
        }
      }

      return Promise.reject(error);
    }
  );
};
```

## HTTP Status Code Handling

Create a comprehensive error handler based on HTTP status codes:

```typescript
// src/api/errorHandler.ts
import { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  retryable: boolean;
}

export const handleHttpError = (error: AxiosError): ApiError => {
  if (!error.response) {
    // Network error - no response received
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
    };
  }

  const { status, data } = error.response;

  switch (status) {
    case 400:
      return {
        code: 'BAD_REQUEST',
        message: data?.message || 'Invalid request. Please check your input.',
        status,
        details: data?.errors,
        retryable: false,
      };

    case 401:
      return {
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again.',
        status,
        retryable: false,
      };

    case 403:
      return {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
        status,
        retryable: false,
      };

    case 404:
      return {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        status,
        retryable: false,
      };

    case 408:
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'The request took too long. Please try again.',
        status,
        retryable: true,
      };

    case 409:
      return {
        code: 'CONFLICT',
        message: 'A conflict occurred. Please refresh and try again.',
        status,
        retryable: false,
      };

    case 422:
      return {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed. Please check your input.',
        status,
        details: data?.errors,
        retryable: false,
      };

    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.',
        status,
        retryable: true,
      };

    case 500:
      return {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Our team has been notified.',
        status,
        retryable: true,
      };

    case 502:
    case 503:
    case 504:
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The service is temporarily unavailable. Please try again later.',
        status,
        retryable: true,
      };

    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
        status,
        retryable: status >= 500,
      };
  }
};
```

## Network Connectivity Detection

React Native provides tools to detect network connectivity. Use the `@react-native-community/netinfo` package:

```typescript
// src/utils/networkMonitor.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';

class NetworkMonitor extends EventEmitter {
  private isConnected: boolean = true;
  private connectionType: string = 'unknown';
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      this.connectionType = state.type;

      if (wasConnected !== this.isConnected) {
        this.emit('connectionChange', {
          isConnected: this.isConnected,
          type: this.connectionType,
        });
      }

      if (!wasConnected && this.isConnected) {
        this.emit('reconnected');
      }

      if (wasConnected && !this.isConnected) {
        this.emit('disconnected');
      }
    });
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    return this.isConnected;
  }

  getConnectionStatus(): { isConnected: boolean; type: string } {
    return {
      isConnected: this.isConnected,
      type: this.connectionType,
    };
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const networkMonitor = new NetworkMonitor();
```

### Using Network Monitor in Components

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { networkMonitor } from '../utils/networkMonitor';

interface NetworkStatus {
  isConnected: boolean;
  connectionType: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const handleConnectionChange = (newStatus: NetworkStatus) => {
      setStatus(newStatus);
    };

    networkMonitor.on('connectionChange', handleConnectionChange);

    // Check initial status
    networkMonitor.checkConnection().then((isConnected) => {
      setStatus(prev => ({ ...prev, isConnected }));
    });

    return () => {
      networkMonitor.off('connectionChange', handleConnectionChange);
    };
  }, []);

  return status;
};
```

## Implementing Exponential Backoff

Exponential backoff increases the delay between retry attempts exponentially:

```typescript
// src/utils/retryStrategy.ts
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffFactor: 2,
};

export const calculateExponentialBackoff = (
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): number => {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelay);
};

// Example delays with default config:
// Attempt 0: 1000ms (1 second)
// Attempt 1: 2000ms (2 seconds)
// Attempt 2: 4000ms (4 seconds)
// Attempt 3: 8000ms (8 seconds)
```

## Adding Jitter to Retries

Jitter prevents the "thundering herd" problem where many clients retry simultaneously:

```typescript
// src/utils/retryWithJitter.ts
export type JitterType = 'full' | 'equal' | 'decorrelated';

export const calculateJitter = (
  baseDelay: number,
  jitterType: JitterType = 'full'
): number => {
  switch (jitterType) {
    case 'full':
      // Full jitter: random value between 0 and calculated delay
      return Math.random() * baseDelay;

    case 'equal':
      // Equal jitter: half the delay plus random half
      return (baseDelay / 2) + (Math.random() * baseDelay / 2);

    case 'decorrelated':
      // Decorrelated jitter: random between base and 3x previous delay
      return Math.min(
        defaultRetryConfig.maxDelay,
        Math.random() * baseDelay * 3
      );

    default:
      return baseDelay;
  }
};

export const calculateDelayWithJitter = (
  attempt: number,
  config: RetryConfig = defaultRetryConfig,
  jitterType: JitterType = 'full'
): number => {
  const exponentialDelay = calculateExponentialBackoff(attempt, config);
  return Math.floor(calculateJitter(exponentialDelay, jitterType));
};
```

## Complete Retry Logic Implementation

Here is a complete retry wrapper for API calls:

```typescript
// src/api/retryWrapper.ts
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './axiosInstance';
import { handleHttpError, ApiError } from './errorHandler';
import { networkMonitor } from '../utils/networkMonitor';
import {
  RetryConfig,
  defaultRetryConfig,
  calculateDelayWithJitter,
} from '../utils/retryStrategy';

interface RetryableRequestConfig extends AxiosRequestConfig {
  retryConfig?: Partial<RetryConfig>;
  onRetry?: (attempt: number, error: ApiError) => void;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const isRetryableError = (error: AxiosError): boolean => {
  // Network errors are retryable
  if (!error.response) {
    return true;
  }

  const { status } = error.response;

  // Retry on server errors and specific client errors
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(status);
};

export const retryableRequest = async <T>(
  config: RetryableRequestConfig
): Promise<AxiosResponse<T>> => {
  const retryConfig: RetryConfig = {
    ...defaultRetryConfig,
    ...config.retryConfig,
  };

  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Check network connectivity before attempting
      const isConnected = await networkMonitor.checkConnection();
      if (!isConnected) {
        throw new Error('No network connection');
      }

      const response = await apiClient.request<T>(config);
      return response;
    } catch (error) {
      lastError = error as AxiosError;
      const apiError = handleHttpError(lastError);

      // Do not retry if error is not retryable
      if (!isRetryableError(lastError) || attempt === retryConfig.maxRetries) {
        throw apiError;
      }

      // Calculate delay with jitter
      const delay = calculateDelayWithJitter(attempt, retryConfig, 'full');

      // Notify caller about retry
      if (config.onRetry) {
        config.onRetry(attempt + 1, apiError);
      }

      console.log(
        `[Retry] Attempt ${attempt + 1}/${retryConfig.maxRetries} ` +
        `after ${delay}ms - ${apiError.message}`
      );

      await sleep(delay);
    }
  }

  throw handleHttpError(lastError!);
};
```

## Timeout Configuration

Proper timeout configuration is crucial for mobile applications:

```typescript
// src/api/timeoutConfig.ts
import axios, { AxiosRequestConfig } from 'axios';

export interface TimeoutConfig {
  connectionTimeout: number;  // Time to establish connection
  responseTimeout: number;    // Time to receive response
  uploadTimeout: number;      // Timeout for uploads
  downloadTimeout: number;    // Timeout for downloads
}

export const defaultTimeouts: TimeoutConfig = {
  connectionTimeout: 10000,   // 10 seconds
  responseTimeout: 30000,     // 30 seconds
  uploadTimeout: 60000,       // 60 seconds
  downloadTimeout: 60000,     // 60 seconds
};

export const createTimeoutConfig = (
  requestType: 'default' | 'upload' | 'download'
): Partial<AxiosRequestConfig> => {
  switch (requestType) {
    case 'upload':
      return {
        timeout: defaultTimeouts.uploadTimeout,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      };

    case 'download':
      return {
        timeout: defaultTimeouts.downloadTimeout,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Download progress: ${percentCompleted}%`);
        },
      };

    default:
      return {
        timeout: defaultTimeouts.responseTimeout,
      };
  }
};
```

## Request Cancellation

Implement request cancellation to prevent memory leaks and unnecessary network calls:

```typescript
// src/api/requestCancellation.ts
import axios, { CancelTokenSource, AxiosRequestConfig } from 'axios';

class RequestManager {
  private pendingRequests: Map<string, CancelTokenSource> = new Map();

  createCancelToken(requestId: string): CancelTokenSource {
    // Cancel existing request with same ID
    this.cancelRequest(requestId);

    const source = axios.CancelToken.source();
    this.pendingRequests.set(requestId, source);
    return source;
  }

  cancelRequest(requestId: string): void {
    const source = this.pendingRequests.get(requestId);
    if (source) {
      source.cancel(`Request ${requestId} cancelled`);
      this.pendingRequests.delete(requestId);
    }
  }

  cancelAllRequests(): void {
    this.pendingRequests.forEach((source, requestId) => {
      source.cancel(`Request ${requestId} cancelled - cleanup`);
    });
    this.pendingRequests.clear();
  }

  isRequestCancelled(error: unknown): boolean {
    return axios.isCancel(error);
  }

  removeRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }
}

export const requestManager = new RequestManager();

// Usage in components
export const useCancellableRequest = () => {
  const makeRequest = async <T>(
    requestId: string,
    config: AxiosRequestConfig
  ): Promise<T> => {
    const source = requestManager.createCancelToken(requestId);

    try {
      const response = await apiClient.request<T>({
        ...config,
        cancelToken: source.token,
      });
      requestManager.removeRequest(requestId);
      return response.data;
    } catch (error) {
      if (requestManager.isRequestCancelled(error)) {
        console.log(`Request ${requestId} was cancelled`);
        throw error;
      }
      requestManager.removeRequest(requestId);
      throw error;
    }
  };

  return { makeRequest, cancelRequest: requestManager.cancelRequest.bind(requestManager) };
};
```

### Using AbortController (Modern Approach)

```typescript
// src/api/abortController.ts
import { useEffect, useRef } from 'react';

export const useAbortController = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getSignal = (): AbortSignal => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };

  const abort = (): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, []);

  return { getSignal, abort };
};

// Usage example
const MyComponent = () => {
  const { getSignal, abort } = useAbortController();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: getSignal(),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      throw error;
    }
  };

  return null;
};
```

## User Feedback During Errors

Providing clear feedback improves user experience:

```typescript
// src/components/ErrorDisplay.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ApiError } from '../api/errorHandler';

interface ErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}) => {
  const getErrorIcon = (code: string): string => {
    switch (code) {
      case 'NETWORK_ERROR':
        return 'wifi-off';
      case 'SERVER_ERROR':
        return 'server-error';
      case 'UNAUTHORIZED':
        return 'lock';
      default:
        return 'error';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.errorIcon}>{getErrorIcon(error.code)}</Text>
      <Text style={styles.errorTitle}>{error.code}</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>

      {error.retryable && onRetry && (
        <View style={styles.retryContainer}>
          {isRetrying ? (
            <View style={styles.retryingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.retryingText}>
                Retrying... ({retryCount}/{maxRetries})
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              disabled={isRetrying}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryContainer: {
    marginTop: 16,
  },
  retryingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryingText: {
    marginLeft: 8,
    color: '#007AFF',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

### Toast Notifications for Errors

```typescript
// src/utils/toast.ts
import { Alert, Platform, ToastAndroid } from 'react-native';

export const showErrorToast = (message: string): void => {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(
      message,
      ToastAndroid.LONG,
      ToastAndroid.BOTTOM
    );
  } else {
    // For iOS, use a custom toast library or Alert
    Alert.alert('Error', message);
  }
};

export const showNetworkErrorBanner = (isConnected: boolean): void => {
  if (!isConnected) {
    // Show persistent banner
    console.log('No internet connection');
  }
};
```

## Offline Queue Strategy

Queue requests when offline and execute them when connectivity is restored:

```typescript
// src/api/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkMonitor } from '../utils/networkMonitor';
import { AxiosRequestConfig } from 'axios';
import { apiClient } from './axiosInstance';

interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing: boolean = false;
  private readonly STORAGE_KEY = '@offline_queue';
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.cleanupOldRequests();
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    this.queue = this.queue.filter(
      (request) => now - request.timestamp < this.MAX_AGE_MS
    );
  }

  private setupNetworkListener(): void {
    networkMonitor.on('reconnected', () => {
      console.log('Network reconnected, processing offline queue');
      this.processQueue();
    });
  }

  async addToQueue(config: AxiosRequestConfig): Promise<string> {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest request
      this.queue.shift();
    }

    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      config,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(request);
    await this.saveQueue();

    console.log(`Request queued for offline: ${request.id}`);
    return request.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    const isConnected = await networkMonitor.checkConnection();
    if (!isConnected) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await apiClient.request(request.config);
        console.log(`Offline request ${request.id} succeeded`);
        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        request.retryCount++;

        if (request.retryCount >= 3) {
          console.error(`Offline request ${request.id} failed after 3 retries`);
          this.queue.shift();
          await this.saveQueue();
        } else {
          // Move to end of queue
          this.queue.push(this.queue.shift()!);
          await this.saveQueue();
          break;
        }
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineQueue = new OfflineQueue();
```

### Using Offline Queue in API Calls

```typescript
// src/api/offlineAwareRequest.ts
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { networkMonitor } from '../utils/networkMonitor';
import { offlineQueue } from './offlineQueue';
import { apiClient } from './axiosInstance';

interface OfflineAwareConfig extends AxiosRequestConfig {
  queueIfOffline?: boolean;
  criticalRequest?: boolean;
}

export const offlineAwareRequest = async <T>(
  config: OfflineAwareConfig
): Promise<AxiosResponse<T> | { queued: true; queueId: string }> => {
  const isConnected = await networkMonitor.checkConnection();

  if (!isConnected) {
    if (config.queueIfOffline && config.method !== 'GET') {
      const queueId = await offlineQueue.addToQueue(config);
      return { queued: true, queueId };
    }

    throw new Error('No network connection');
  }

  return apiClient.request<T>(config);
};
```

## Global Error Handling

Set up global error handling for your entire application:

```typescript
// src/api/globalErrorHandler.ts
import { AxiosError } from 'axios';
import { handleHttpError, ApiError } from './errorHandler';
import { showErrorToast } from '../utils/toast';

type ErrorCallback = (error: ApiError) => void;

class GlobalErrorHandler {
  private errorCallbacks: Map<string, ErrorCallback> = new Map();
  private globalCallback: ErrorCallback | null = null;

  setGlobalErrorCallback(callback: ErrorCallback): void {
    this.globalCallback = callback;
  }

  registerErrorCallback(errorCode: string, callback: ErrorCallback): void {
    this.errorCallbacks.set(errorCode, callback);
  }

  unregisterErrorCallback(errorCode: string): void {
    this.errorCallbacks.delete(errorCode);
  }

  handleError(error: AxiosError): void {
    const apiError = handleHttpError(error);

    // Check for specific error handler
    const specificHandler = this.errorCallbacks.get(apiError.code);
    if (specificHandler) {
      specificHandler(apiError);
      return;
    }

    // Use global handler
    if (this.globalCallback) {
      this.globalCallback(apiError);
      return;
    }

    // Default handling
    this.defaultErrorHandler(apiError);
  }

  private defaultErrorHandler(error: ApiError): void {
    console.error(`[Global Error] ${error.code}: ${error.message}`);

    // Show toast for user-facing errors
    if (error.code !== 'UNAUTHORIZED') {
      showErrorToast(error.message);
    }
  }
}

export const globalErrorHandler = new GlobalErrorHandler();

// Setup in app initialization
globalErrorHandler.registerErrorCallback('UNAUTHORIZED', (error) => {
  // Redirect to login screen
  console.log('Redirecting to login due to unauthorized error');
});

globalErrorHandler.registerErrorCallback('NETWORK_ERROR', (error) => {
  // Show offline mode UI
  console.log('Showing offline mode');
});
```

### Error Boundary for React Components

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

## Complete API Service Example

Here is a complete example bringing everything together:

```typescript
// src/api/apiService.ts
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './axiosInstance';
import { retryableRequest } from './retryWrapper';
import { offlineAwareRequest } from './offlineAwareRequest';
import { requestManager } from './requestCancellation';
import { globalErrorHandler } from './globalErrorHandler';
import { ApiError } from './errorHandler';

interface ApiServiceConfig extends AxiosRequestConfig {
  retry?: boolean;
  retryCount?: number;
  queueIfOffline?: boolean;
  cancelPrevious?: boolean;
  requestId?: string;
}

class ApiService {
  async get<T>(
    url: string,
    config: ApiServiceConfig = {}
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(
    url: string,
    data?: unknown,
    config: ApiServiceConfig = {}
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(
    url: string,
    data?: unknown,
    config: ApiServiceConfig = {}
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T>(
    url: string,
    config: ApiServiceConfig = {}
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  private async request<T>(config: ApiServiceConfig): Promise<T> {
    const {
      retry = true,
      retryCount = 3,
      queueIfOffline = false,
      cancelPrevious = false,
      requestId,
      ...axiosConfig
    } = config;

    try {
      // Handle request cancellation
      if (cancelPrevious && requestId) {
        const source = requestManager.createCancelToken(requestId);
        axiosConfig.cancelToken = source.token;
      }

      let response: AxiosResponse<T>;

      if (retry) {
        response = await retryableRequest<T>({
          ...axiosConfig,
          retryConfig: { maxRetries: retryCount },
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt}: ${error.message}`);
          },
        });
      } else if (queueIfOffline) {
        const result = await offlineAwareRequest<T>({
          ...axiosConfig,
          queueIfOffline: true,
        });

        if ('queued' in result) {
          throw new Error(`Request queued with ID: ${result.queueId}`);
        }
        response = result;
      } else {
        response = await apiClient.request<T>(axiosConfig);
      }

      return response.data;
    } catch (error) {
      if (!requestManager.isRequestCancelled(error)) {
        globalErrorHandler.handleError(error as any);
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();

// Usage examples
const fetchUserProfile = async (userId: string) => {
  return apiService.get(`/users/${userId}`, {
    retry: true,
    retryCount: 3,
    requestId: `user-profile-${userId}`,
    cancelPrevious: true,
  });
};

const submitOrder = async (orderData: unknown) => {
  return apiService.post('/orders', orderData, {
    queueIfOffline: true,
    retry: true,
  });
};
```

## Custom Hook for API Calls

Create a reusable hook for API calls with built-in error handling:

```typescript
// src/hooks/useApi.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { ApiError } from '../api/errorHandler';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiOptions {
  immediate?: boolean;
  retry?: boolean;
  retryCount?: number;
}

export const useApi = <T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) => {
  const { immediate = false, retry = true, retryCount = 3 } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();

      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
      }

      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error as ApiError,
        }));
      }
      throw error;
    }
  }, [apiCall]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.data && !state.error,
  };
};
```

## Best Practices Summary

When implementing API error handling in React Native, follow these best practices:

1. **Categorize errors appropriately**: Distinguish between network errors, client errors, and server errors. Each category requires different handling strategies.

2. **Implement intelligent retry logic**: Use exponential backoff with jitter to avoid overwhelming servers during recovery. Only retry errors that are likely to succeed on retry.

3. **Set appropriate timeouts**: Configure different timeouts for different types of requests. Uploads and downloads typically need longer timeouts than simple API calls.

4. **Monitor network connectivity**: Use NetInfo to detect connectivity changes and adjust your application behavior accordingly.

5. **Provide clear user feedback**: Users should understand what went wrong and what they can do about it. Show progress during retries and offer manual retry options.

6. **Implement offline support**: Queue important requests when offline and process them when connectivity is restored. This improves the user experience significantly.

7. **Use request cancellation**: Cancel in-flight requests when components unmount or when newer requests supersede older ones.

8. **Centralize error handling**: Use interceptors and global error handlers to maintain consistent error handling across your application.

9. **Log errors appropriately**: Capture enough context to debug issues while being mindful of sensitive data.

10. **Test error scenarios**: Test your error handling by simulating network failures, timeouts, and various HTTP error codes.

By implementing these patterns, your React Native application will handle API errors gracefully, providing a smooth user experience even under adverse network conditions.
