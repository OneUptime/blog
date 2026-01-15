# How to Set Up Crash Reporting and Error Tracking in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Crash Reporting, Error Tracking, Monitoring, Mobile Development, Debugging

Description: Learn how to set up comprehensive crash reporting and error tracking in React Native applications for faster bug resolution.

---

Mobile applications crash. It's an unfortunate reality that every React Native developer must face. The difference between a successful app and a failing one often comes down to how quickly you can identify, understand, and fix these crashes. This comprehensive guide will walk you through setting up robust crash reporting and error tracking in your React Native application.

## Why Crash Reporting Matters

Every crash in your mobile application represents a frustrated user. Without proper crash reporting, you're flying blind, relying on user complaints or app store reviews to discover issues. By the time you hear about a problem through these channels, hundreds or thousands of users may have already been affected.

Crash reporting provides several critical benefits:

1. **Immediate visibility** into production issues
2. **Stack traces and context** for faster debugging
3. **Crash frequency metrics** to prioritize fixes
4. **User impact assessment** to understand severity
5. **Release health monitoring** to catch regressions

Consider this scenario: your app has a bug that crashes 5% of sessions for users on Android 12 with a specific device manufacturer. Without crash reporting, you might never know this issue exists. With proper monitoring, you'll receive an alert within minutes of the first crash.

## Understanding Native vs JavaScript Crashes

React Native applications have a unique architecture that creates two distinct categories of crashes:

### JavaScript Crashes

These occur in the JavaScript runtime and include:

- Unhandled promise rejections
- Uncaught exceptions in your JavaScript code
- Errors in third-party JavaScript libraries
- Invalid state access or null pointer errors

```typescript
// Example JavaScript crash
const UserProfile: React.FC = () => {
  const [user, setUser] = useState(null);

  // This will crash if user is null
  return <Text>{user.name}</Text>;
};
```

### Native Crashes

These occur in the native iOS or Android layers:

- Memory issues (out of memory, memory corruption)
- Native module exceptions
- Threading violations
- Native library crashes
- Signal-based crashes (SIGSEGV, SIGABRT)

```java
// Example native crash in Android
public class CustomModule extends ReactContextBaseJavaModule {
    @ReactMethod
    public void riskyOperation() {
        // Native null pointer exception
        String str = null;
        str.length(); // Crash!
    }
}
```

Understanding this distinction is crucial because each type requires different handling strategies and tooling.

## Setting Up Error Boundaries

Error boundaries are React components that catch JavaScript errors in their child component tree. They're your first line of defense against JavaScript crashes.

### Basic Error Boundary Implementation

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to crash reporting service
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to monitoring service
    CrashReporter.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
```

### Strategic Error Boundary Placement

Don't wrap your entire app in a single error boundary. Instead, use multiple boundaries strategically:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ErrorBoundary from './components/ErrorBoundary';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home">
            {() => (
              <ErrorBoundary>
                <HomeScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {() => (
              <ErrorBoundary>
                <ProfileScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {() => (
              <ErrorBoundary>
                <SettingsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default App;
```

## Global Error Handling

Error boundaries don't catch everything. You need global handlers for unhandled errors and promise rejections.

### Setting Up Global Error Handlers

```typescript
// errorHandling.ts
import { Platform } from 'react-native';

interface ErrorContext {
  source: string;
  isFatal?: boolean;
  timestamp: number;
  platform: string;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private originalHandler: any;
  private isInitialized: boolean = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupGlobalErrorHandler();
    this.setupUnhandledPromiseHandler();
    this.isInitialized = true;
  }

  private setupGlobalErrorHandler(): void {
    // Store original handler
    this.originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const context: ErrorContext = {
        source: 'global_error_handler',
        isFatal,
        timestamp: Date.now(),
        platform: Platform.OS,
      };

      this.handleError(error, context);

      // Call original handler
      if (this.originalHandler) {
        this.originalHandler(error, isFatal);
      }
    });
  }

  private setupUnhandledPromiseHandler(): void {
    const tracking = require('promise/setimmediate/rejection-tracking');

    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: Error) => {
        const context: ErrorContext = {
          source: 'unhandled_promise_rejection',
          timestamp: Date.now(),
          platform: Platform.OS,
        };

        this.handleError(error, context);
      },
      onHandled: (id: number) => {
        // Promise was handled later, optional logging
        console.log(`Promise ${id} was handled after rejection`);
      },
    });
  }

  private handleError(error: Error, context: ErrorContext): void {
    console.error('Global error:', error);
    console.error('Context:', context);

    // Report to crash reporting service
    CrashReporter.captureException(error, {
      tags: {
        source: context.source,
        platform: context.platform,
      },
      extra: {
        isFatal: context.isFatal,
        timestamp: context.timestamp,
      },
    });

    // If fatal, you might want to show a crash screen
    if (context.isFatal) {
      this.showFatalErrorScreen(error);
    }
  }

  private showFatalErrorScreen(error: Error): void {
    // Implementation depends on your navigation setup
    // This is a placeholder for showing a fatal error UI
  }
}

export default GlobalErrorHandler.getInstance();
```

### Initializing Error Handling

```typescript
// index.js
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import GlobalErrorHandler from './errorHandling';

// Initialize error handling before app starts
GlobalErrorHandler.initialize();

AppRegistry.registerComponent(appName, () => App);
```

## Sourcemap Upload for Symbolication

When React Native code is bundled for production, it's minified and obfuscated. Without sourcemaps, your crash reports will show meaningless stack traces.

### Generating Sourcemaps

```bash
# For iOS
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map

# For Android
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --sourcemap-output android/app/src/main/assets/index.android.bundle.map
```

### Automating Sourcemap Upload

Create a script to upload sourcemaps during your build process:

```typescript
// scripts/uploadSourcemaps.ts
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

interface UploadConfig {
  apiKey: string;
  apiEndpoint: string;
  appVersion: string;
  platform: 'ios' | 'android';
}

async function uploadSourcemap(config: UploadConfig): Promise<void> {
  const { apiKey, apiEndpoint, appVersion, platform } = config;

  const sourcemapPath = platform === 'ios'
    ? path.join(__dirname, '../ios/main.jsbundle.map')
    : path.join(__dirname, '../android/app/src/main/assets/index.android.bundle.map');

  const bundlePath = platform === 'ios'
    ? path.join(__dirname, '../ios/main.jsbundle')
    : path.join(__dirname, '../android/app/src/main/assets/index.android.bundle');

  if (!fs.existsSync(sourcemapPath)) {
    throw new Error(`Sourcemap not found at ${sourcemapPath}`);
  }

  const formData = new FormData();
  formData.append('sourcemap', fs.createReadStream(sourcemapPath));
  formData.append('bundle', fs.createReadStream(bundlePath));
  formData.append('version', appVersion);
  formData.append('platform', platform);

  const response = await fetch(`${apiEndpoint}/sourcemaps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload sourcemap: ${response.statusText}`);
  }

  console.log(`Sourcemap uploaded successfully for ${platform} v${appVersion}`);
}

// Usage
const config: UploadConfig = {
  apiKey: process.env.CRASH_REPORTER_API_KEY || '',
  apiEndpoint: 'https://api.oneuptime.com',
  appVersion: require('../package.json').version,
  platform: process.argv[2] as 'ios' | 'android',
};

uploadSourcemap(config).catch(console.error);
```

## Capturing Crash Context

A stack trace alone is often not enough to debug a crash. You need context about what the user was doing when the crash occurred.

### Building a Context Collector

```typescript
// contextCollector.ts
import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

interface DeviceContext {
  platform: string;
  osVersion: string;
  deviceModel: string;
  deviceBrand: string;
  appVersion: string;
  buildNumber: string;
  screenDimensions: {
    width: number;
    height: number;
  };
  isEmulator: boolean;
}

interface NetworkContext {
  type: string;
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

interface UserContext {
  userId?: string;
  email?: string;
  username?: string;
  customAttributes: Record<string, any>;
}

interface AppContext {
  screen: string;
  navigationHistory: string[];
  sessionDuration: number;
  sessionId: string;
}

class ContextCollector {
  private static instance: ContextCollector;
  private userContext: UserContext = { customAttributes: {} };
  private appContext: AppContext;
  private sessionStartTime: number;

  private constructor() {
    this.sessionStartTime = Date.now();
    this.appContext = {
      screen: 'unknown',
      navigationHistory: [],
      sessionDuration: 0,
      sessionId: this.generateSessionId(),
    };
  }

  static getInstance(): ContextCollector {
    if (!ContextCollector.instance) {
      ContextCollector.instance = new ContextCollector();
    }
    return ContextCollector.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDeviceContext(): Promise<DeviceContext> {
    const { width, height } = Dimensions.get('window');

    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      deviceModel: await DeviceInfo.getModel(),
      deviceBrand: await DeviceInfo.getBrand(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      screenDimensions: { width, height },
      isEmulator: await DeviceInfo.isEmulator(),
    };
  }

  async getNetworkContext(): Promise<NetworkContext> {
    const state = await NetInfo.fetch();

    return {
      type: state.type,
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
    };
  }

  setUserContext(context: Partial<UserContext>): void {
    this.userContext = {
      ...this.userContext,
      ...context,
      customAttributes: {
        ...this.userContext.customAttributes,
        ...context.customAttributes,
      },
    };
  }

  setCurrentScreen(screen: string): void {
    this.appContext.screen = screen;
    this.appContext.navigationHistory.push(screen);

    // Keep only last 20 screens
    if (this.appContext.navigationHistory.length > 20) {
      this.appContext.navigationHistory.shift();
    }
  }

  getAppContext(): AppContext {
    return {
      ...this.appContext,
      sessionDuration: Date.now() - this.sessionStartTime,
    };
  }

  getUserContext(): UserContext {
    return { ...this.userContext };
  }

  async getAllContext(): Promise<{
    device: DeviceContext;
    network: NetworkContext;
    user: UserContext;
    app: AppContext;
  }> {
    const [device, network] = await Promise.all([
      this.getDeviceContext(),
      this.getNetworkContext(),
    ]);

    return {
      device,
      network,
      user: this.getUserContext(),
      app: this.getAppContext(),
    };
  }
}

export default ContextCollector.getInstance();
```

### Integration with Navigation

```typescript
// NavigationTracker.tsx
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import ContextCollector from './contextCollector';

interface Props {
  children: React.ReactNode;
}

const NavigationTracker: React.FC<Props> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string>();

  const onStateChange = (): void => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (currentRouteName && previousRouteName !== currentRouteName) {
      // Update crash reporter context
      ContextCollector.setCurrentScreen(currentRouteName);

      // Log breadcrumb
      BreadcrumbLogger.log({
        category: 'navigation',
        message: `Navigated to ${currentRouteName}`,
        data: {
          from: previousRouteName,
          to: currentRouteName,
        },
      });
    }

    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={onStateChange}
    >
      {children}
    </NavigationContainer>
  );
};

export default NavigationTracker;
```

## User Feedback Collection

Sometimes you need direct feedback from users when a crash occurs. Implementing a feedback mechanism can provide invaluable debugging information.

```typescript
// CrashFeedbackModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  crashId: string;
  onSubmit: (feedback: string, email?: string) => void;
  onDismiss: () => void;
}

const CrashFeedbackModal: React.FC<Props> = ({
  visible,
  crashId,
  onSubmit,
  onDismiss,
}) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (): void => {
    if (feedback.trim()) {
      onSubmit(feedback.trim(), email.trim() || undefined);
      setFeedback('');
      setEmail('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>We're Sorry!</Text>
          <Text style={styles.subtitle}>
            Something went wrong. Help us fix it by describing what happened.
          </Text>

          <TextInput
            style={styles.feedbackInput}
            placeholder="What were you trying to do?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            textAlignVertical="top"
          />

          <TextInput
            style={styles.emailInput}
            placeholder="Email (optional, for follow-up)"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.crashIdText}>Reference: {crashId}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  crashIdText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default CrashFeedbackModal;
```

## Breadcrumbs for Debugging

Breadcrumbs are a trail of events that led up to a crash. They're invaluable for understanding the sequence of actions that caused an error.

```typescript
// breadcrumbs.ts
type BreadcrumbCategory =
  | 'navigation'
  | 'user_action'
  | 'network'
  | 'state_change'
  | 'console'
  | 'custom';

type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

interface Breadcrumb {
  timestamp: number;
  category: BreadcrumbCategory;
  message: string;
  level: BreadcrumbLevel;
  data?: Record<string, any>;
}

class BreadcrumbLogger {
  private static instance: BreadcrumbLogger;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number = 100;

  private constructor() {}

  static getInstance(): BreadcrumbLogger {
    if (!BreadcrumbLogger.instance) {
      BreadcrumbLogger.instance = new BreadcrumbLogger();
    }
    return BreadcrumbLogger.instance;
  }

  log(options: {
    category: BreadcrumbCategory;
    message: string;
    level?: BreadcrumbLevel;
    data?: Record<string, any>;
  }): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category: options.category,
      message: options.message,
      level: options.level || 'info',
      data: options.data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Trim old breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clear(): void {
    this.breadcrumbs = [];
  }

  // Convenience methods
  logNavigation(from: string, to: string): void {
    this.log({
      category: 'navigation',
      message: `Navigated from ${from} to ${to}`,
      data: { from, to },
    });
  }

  logUserAction(action: string, details?: Record<string, any>): void {
    this.log({
      category: 'user_action',
      message: action,
      data: details,
    });
  }

  logNetworkRequest(
    method: string,
    url: string,
    status: number,
    duration: number
  ): void {
    this.log({
      category: 'network',
      message: `${method} ${url}`,
      level: status >= 400 ? 'error' : 'info',
      data: { method, url, status, duration },
    });
  }

  logStateChange(stateName: string, oldValue: any, newValue: any): void {
    this.log({
      category: 'state_change',
      message: `State '${stateName}' changed`,
      data: { stateName, oldValue, newValue },
    });
  }
}

export default BreadcrumbLogger.getInstance();
```

### Automatic Network Breadcrumbs

Intercept network requests to automatically create breadcrumbs:

```typescript
// networkInterceptor.ts
import BreadcrumbLogger from './breadcrumbs';

const originalFetch = global.fetch;

global.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method || 'GET';

  try {
    const response = await originalFetch(input, init);
    const duration = Date.now() - startTime;

    BreadcrumbLogger.logNetworkRequest(method, url, response.status, duration);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    BreadcrumbLogger.logNetworkRequest(method, url, 0, duration);
    BreadcrumbLogger.log({
      category: 'network',
      message: `Network error: ${(error as Error).message}`,
      level: 'error',
      data: { url, method, error: (error as Error).message },
    });

    throw error;
  }
};

export {};
```

## Filtering and Grouping Errors

Not all errors are equally important. Implementing smart filtering and grouping helps you focus on what matters.

```typescript
// errorFiltering.ts
interface ErrorFilter {
  pattern: RegExp;
  action: 'ignore' | 'sample' | 'group';
  sampleRate?: number; // 0-1 for sample action
  groupKey?: string; // Custom group key for group action
}

const errorFilters: ErrorFilter[] = [
  // Ignore network errors from analytics
  {
    pattern: /analytics\.example\.com/,
    action: 'ignore',
  },
  // Sample common timeout errors
  {
    pattern: /timeout|ETIMEDOUT/i,
    action: 'sample',
    sampleRate: 0.1, // Only report 10%
  },
  // Group all auth errors together
  {
    pattern: /unauthorized|401|authentication/i,
    action: 'group',
    groupKey: 'auth_errors',
  },
];

interface ProcessedError {
  shouldReport: boolean;
  groupKey?: string;
  error: Error;
}

function processError(error: Error): ProcessedError {
  const errorString = `${error.name}: ${error.message}`;

  for (const filter of errorFilters) {
    if (filter.pattern.test(errorString)) {
      switch (filter.action) {
        case 'ignore':
          return { shouldReport: false, error };

        case 'sample':
          const shouldSample = Math.random() < (filter.sampleRate || 0.5);
          return { shouldReport: shouldSample, error };

        case 'group':
          return {
            shouldReport: true,
            groupKey: filter.groupKey,
            error,
          };
      }
    }
  }

  // Default: report without special grouping
  return { shouldReport: true, error };
}

// Fingerprinting for better error grouping
function generateFingerprint(error: Error, context?: any): string {
  const parts: string[] = [
    error.name,
    // Use first line of stack trace for grouping
    error.stack?.split('\n')[1]?.trim() || '',
  ];

  // Add context-specific grouping if available
  if (context?.screen) {
    parts.push(context.screen);
  }

  return parts.join('::');
}

export { processError, generateFingerprint, ErrorFilter };
```

## Alert Configuration

Configure alerts to notify your team when crashes occur without overwhelming them with notifications.

```typescript
// alertConfig.ts
interface AlertThreshold {
  metric: 'count' | 'percentage' | 'unique_users';
  threshold: number;
  window: number; // in minutes
}

interface AlertRule {
  name: string;
  enabled: boolean;
  conditions: {
    errorPattern?: RegExp;
    platforms?: ('ios' | 'android')[];
    versions?: string[];
    thresholds: AlertThreshold[];
  };
  notifications: {
    channels: ('slack' | 'email' | 'pagerduty')[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    cooldown: number; // minutes between alerts
  };
}

const alertRules: AlertRule[] = [
  {
    name: 'Critical Crash Spike',
    enabled: true,
    conditions: {
      thresholds: [
        { metric: 'count', threshold: 100, window: 5 },
        { metric: 'percentage', threshold: 5, window: 15 },
      ],
    },
    notifications: {
      channels: ['slack', 'pagerduty'],
      priority: 'critical',
      cooldown: 15,
    },
  },
  {
    name: 'New Error Type',
    enabled: true,
    conditions: {
      thresholds: [
        { metric: 'unique_users', threshold: 10, window: 60 },
      ],
    },
    notifications: {
      channels: ['slack'],
      priority: 'medium',
      cooldown: 60,
    },
  },
  {
    name: 'iOS-specific Crash',
    enabled: true,
    conditions: {
      platforms: ['ios'],
      thresholds: [
        { metric: 'count', threshold: 50, window: 30 },
      ],
    },
    notifications: {
      channels: ['slack', 'email'],
      priority: 'high',
      cooldown: 30,
    },
  },
];

export { alertRules, AlertRule, AlertThreshold };
```

## Integration with OneUptime

OneUptime provides comprehensive error monitoring capabilities. Here's how to integrate it with your React Native application.

### Installing the OneUptime SDK

```bash
npm install @oneuptime/react-native-sdk
```

### Configuring OneUptime

```typescript
// oneuptimeConfig.ts
import OneUptime from '@oneuptime/react-native-sdk';
import ContextCollector from './contextCollector';
import BreadcrumbLogger from './breadcrumbs';
import { processError, generateFingerprint } from './errorFiltering';

interface OneUptimeConfig {
  apiKey: string;
  appId: string;
  environment: 'development' | 'staging' | 'production';
  enableAutomaticSessionTracking: boolean;
  enableNetworkBreadcrumbs: boolean;
  sampleRate: number;
}

const config: OneUptimeConfig = {
  apiKey: process.env.ONEUPTIME_API_KEY || '',
  appId: process.env.ONEUPTIME_APP_ID || '',
  environment: __DEV__ ? 'development' : 'production',
  enableAutomaticSessionTracking: true,
  enableNetworkBreadcrumbs: true,
  sampleRate: 1.0, // Report 100% in production
};

async function initializeOneUptime(): Promise<void> {
  OneUptime.init({
    apiKey: config.apiKey,
    appId: config.appId,
    environment: config.environment,

    // Enable automatic features
    enableAutomaticSessionTracking: config.enableAutomaticSessionTracking,
    enableNetworkBreadcrumbs: config.enableNetworkBreadcrumbs,

    // Sampling configuration
    sampleRate: config.sampleRate,

    // Before send hook for filtering and enrichment
    beforeSend: async (event) => {
      const processedError = processError(event.error);

      if (!processedError.shouldReport) {
        return null; // Don't send this error
      }

      // Enrich with context
      const context = await ContextCollector.getAllContext();

      return {
        ...event,
        fingerprint: generateFingerprint(event.error, context.app),
        groupKey: processedError.groupKey,
        context: {
          device: context.device,
          network: context.network,
          user: context.user,
          app: context.app,
        },
        breadcrumbs: BreadcrumbLogger.getBreadcrumbs(),
      };
    },
  });

  // Set initial user context if available
  const storedUser = await getStoredUser();
  if (storedUser) {
    OneUptime.setUser({
      id: storedUser.id,
      email: storedUser.email,
      username: storedUser.username,
    });
  }
}

// Capture exception with full context
async function captureException(
  error: Error,
  additionalContext?: Record<string, any>
): Promise<string> {
  const context = await ContextCollector.getAllContext();

  const eventId = OneUptime.captureException(error, {
    context: {
      ...context,
      ...additionalContext,
    },
    breadcrumbs: BreadcrumbLogger.getBreadcrumbs(),
  });

  return eventId;
}

// Capture message for non-error events
function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): string {
  return OneUptime.captureMessage(message, { level });
}

// Add custom breadcrumb
function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  data?: Record<string, any>;
}): void {
  BreadcrumbLogger.log({
    category: breadcrumb.category as any,
    message: breadcrumb.message,
    data: breadcrumb.data,
  });
}

export {
  initializeOneUptime,
  captureException,
  captureMessage,
  addBreadcrumb,
};
```

### App Integration

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { initializeOneUptime } from './oneuptimeConfig';
import GlobalErrorHandler from './errorHandling';
import NavigationTracker from './NavigationTracker';
import ErrorBoundary from './components/ErrorBoundary';
import MainNavigator from './navigation/MainNavigator';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize error tracking
    GlobalErrorHandler.initialize();
    initializeOneUptime().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <NavigationTracker>
        <MainNavigator />
      </NavigationTracker>
    </ErrorBoundary>
  );
};

export default App;
```

## Best Practices for Error Handling

### 1. Fail Gracefully

Always provide fallback behavior when errors occur:

```typescript
// Instead of crashing
const UserAvatar: React.FC<{ userId: string }> = ({ userId }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = `https://api.example.com/avatars/${userId}`;

  return (
    <Image
      source={imageError ? require('./default-avatar.png') : { uri: imageUrl }}
      onError={() => setImageError(true)}
      style={styles.avatar}
    />
  );
};
```

### 2. Validate Data at Boundaries

Never trust data from external sources:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchUser(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const json: ApiResponse<User> = await response.json();

    if (!json.success || !json.data) {
      BreadcrumbLogger.log({
        category: 'network',
        message: 'Failed to fetch user',
        level: 'warning',
        data: { userId, error: json.error },
      });
      return null;
    }

    // Validate required fields
    if (!json.data.id || !json.data.email) {
      captureMessage('Invalid user data received from API', 'warning');
      return null;
    }

    return json.data;
  } catch (error) {
    captureException(error as Error, { userId });
    return null;
  }
}
```

### 3. Use TypeScript Strictly

Enable strict TypeScript configuration to catch potential errors at compile time:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 4. Implement Retry Logic with Exponential Backoff

For transient failures, implement smart retry logic:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      BreadcrumbLogger.log({
        category: 'custom',
        message: `Retry attempt ${attempt + 1}/${maxRetries}`,
        level: 'warning',
        data: { error: lastError.message },
      });

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### 5. Clean Up Resources

Always clean up resources to prevent memory leaks that could lead to crashes:

```typescript
const DataSubscriber: React.FC = () => {
  useEffect(() => {
    const subscription = dataService.subscribe((data) => {
      // Handle data
    });

    return () => {
      // Clean up subscription
      subscription.unsubscribe();
    };
  }, []);

  return <View />;
};
```

### 6. Monitor Release Health

After each release, actively monitor crash rates:

```typescript
// releaseHealth.ts
interface ReleaseMetrics {
  version: string;
  crashFreeUsers: number;
  crashFreeSessions: number;
  totalSessions: number;
  newIssues: number;
}

async function checkReleaseHealth(version: string): Promise<ReleaseMetrics> {
  // Implementation would call your monitoring API
  const metrics = await OneUptime.getReleaseMetrics(version);

  // Alert if crash-free rate drops below threshold
  if (metrics.crashFreeSessions < 99.5) {
    captureMessage(
      `Release ${version} has low crash-free rate: ${metrics.crashFreeSessions}%`,
      'warning'
    );
  }

  return metrics;
}
```

## Conclusion

Setting up comprehensive crash reporting and error tracking in React Native requires a multi-layered approach. By implementing error boundaries, global error handlers, context collection, breadcrumbs, and integrating with a robust monitoring solution like OneUptime, you'll have complete visibility into your application's health.

Remember these key takeaways:

1. **Catch errors at every level**: Use error boundaries for component errors and global handlers for uncaught exceptions
2. **Collect context**: Device info, user actions, and navigation history make debugging much faster
3. **Use breadcrumbs**: The sequence of events leading to a crash is often more valuable than the crash itself
4. **Upload sourcemaps**: Symbolicated stack traces are essential for debugging production issues
5. **Filter intelligently**: Not every error needs immediate attention; prioritize based on impact
6. **Alert appropriately**: Configure alerts to notify the right people at the right time

With these practices in place, you'll be able to identify, understand, and fix crashes faster than ever, leading to happier users and a more stable application.

---

*Ready to implement robust error tracking in your React Native app? [Get started with OneUptime](https://oneuptime.com) for comprehensive crash reporting and monitoring.*
