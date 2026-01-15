# How to Debug Hydration Errors in React SSR Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, SSR, Hydration, Debugging, TypeScript, Server-Side Rendering, Troubleshooting

Description: Learn how to identify, debug, and fix hydration mismatches in React server-side rendered applications with practical examples and debugging techniques.

---

## Introduction

Hydration errors are among the most frustrating issues developers encounter when building server-side rendered (SSR) React applications. These errors occur when the HTML rendered on the server doesn't match what React expects to render on the client. In this comprehensive guide, we'll explore what hydration is, why mismatches occur, and how to effectively debug and prevent these issues.

## What Is Hydration?

Hydration is the process by which React attaches event listeners and state to server-rendered HTML. When you use SSR frameworks like Next.js, Remix, or custom Express setups, the server generates static HTML that gets sent to the browser. Once JavaScript loads, React "hydrates" this HTML by:

1. Comparing the server-rendered DOM with what React would render on the client
2. Attaching event handlers to existing DOM elements
3. Making the application interactive

```typescript
// Server-side rendering
import { renderToString } from 'react-dom/server';
import App from './App';

const html = renderToString(<App />);

// Client-side hydration
import { hydrateRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root')!;
hydrateRoot(container, <App />);
```

The key insight is that React expects the client render to produce **identical** output to what the server rendered. When they differ, hydration errors occur.

## Why Hydration Mismatches Occur

Hydration mismatches happen when there's a difference between server and client rendered content. This can occur for several reasons:

### 1. Environment Differences

The server and client are fundamentally different environments:

```typescript
// This will cause a hydration error
const UserAgent: React.FC = () => {
  // window doesn't exist on the server!
  const userAgent = window.navigator.userAgent;

  return <div>Your browser: {userAgent}</div>;
};
```

### 2. Non-Deterministic Rendering

Code that produces different results each time it runs:

```typescript
// This generates a new ID on each render
const RandomComponent: React.FC = () => {
  const id = Math.random().toString(36).substring(7);

  return <div id={id}>Random ID element</div>;
};
```

### 3. Time-Based Content

Dates and times differ between server and client:

```typescript
// Server renders at one time, client hydrates at another
const Timestamp: React.FC = () => {
  return <span>{new Date().toLocaleString()}</span>;
};
```

## React 18 Hydration Error Messages

React 18 introduced more descriptive hydration error messages. Understanding these messages is crucial for debugging:

### Text Content Mismatch

```
Warning: Text content did not match. Server: "Hello World" Client: "Hello world"
```

This error shows exactly what differed between server and client text nodes.

### Extra Nodes on Server

```
Warning: Expected server HTML to contain a matching <div> in <div>.
```

This indicates the server rendered something the client didn't expect.

### Extra Nodes on Client

```
Warning: Did not expect server HTML to contain a <span> in <div>.
```

The client rendered extra elements not present in server HTML.

### Full Hydration Error Example

```typescript
// In development, React 18+ provides detailed error info
interface HydrationErrorInfo {
  componentStack: string;
  digest?: string;
}

// Error boundary to catch hydration errors
class HydrationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Hydration error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong during hydration.</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## Using React DevTools for Debugging

React DevTools is invaluable for debugging hydration issues:

### Enable Highlighting Updates

```typescript
// In your development setup, enable strict mode for better detection
const root = document.getElementById('root')!;

hydrateRoot(
  root,
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Inspecting Component State

```typescript
// Add debugging hooks to identify mismatches
import { useEffect, useRef } from 'react';

function useHydrationDebug<T>(value: T, componentName: string): void {
  const serverValue = useRef<T | undefined>(undefined);
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    serverValue.current = value;
    isFirstRender.current = false;
  }

  useEffect(() => {
    if (serverValue.current !== value) {
      console.warn(
        `Hydration mismatch in ${componentName}:`,
        `Server: ${JSON.stringify(serverValue.current)}`,
        `Client: ${JSON.stringify(value)}`
      );
    }
  }, [value, componentName]);
}

// Usage
const MyComponent: React.FC = () => {
  const timestamp = new Date().toISOString();
  useHydrationDebug(timestamp, 'MyComponent');

  return <div>{timestamp}</div>;
};
```

## Client-Server Content Differences

One of the most common sources of hydration errors is content that differs between server and client.

### Detecting Environment

```typescript
// Utility to detect environment
const isServer = typeof window === 'undefined';
const isClient = !isServer;

// Safe environment check hook
function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
```

### Safe Client-Only Rendering

```typescript
import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const ClientOnly: React.FC<ClientOnlyProps> = ({
  children,
  fallback = null
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <>{mounted ? children : fallback}</>;
};

// Usage
const BrowserInfo: React.FC = () => {
  return (
    <ClientOnly fallback={<span>Loading browser info...</span>}>
      <span>User Agent: {navigator.userAgent}</span>
    </ClientOnly>
  );
};
```

### Shared State Management

```typescript
// Create a context for shared server/client state
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  locale: string;
}

interface SSRContextValue {
  initialState: AppState;
}

const SSRContext = createContext<SSRContextValue | null>(null);

// Server-side
const ServerApp: React.FC<{ initialState: AppState }> = ({ initialState }) => {
  return (
    <SSRContext.Provider value={{ initialState }}>
      <App />
    </SSRContext.Provider>
  );
};

// Inject state into HTML
const serverHtml = `
  <script>
    window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
  </script>
  ${renderToString(<ServerApp initialState={initialState} />)}
`;

// Client-side
declare global {
  interface Window {
    __INITIAL_STATE__?: AppState;
  }
}

const ClientApp: React.FC = () => {
  const initialState = window.__INITIAL_STATE__ || defaultState;

  return (
    <SSRContext.Provider value={{ initialState }}>
      <App />
    </SSRContext.Provider>
  );
};
```

## Date/Time Formatting Issues

Dates are a notorious source of hydration mismatches due to timezone differences.

### The Problem

```typescript
// This will almost always cause hydration errors
const BadTimestamp: React.FC = () => {
  // Server might be in UTC, client in user's timezone
  return <span>{new Date().toLocaleString()}</span>;
};
```

### Solutions

```typescript
import { useState, useEffect } from 'react';

// Solution 1: Use UTC consistently
const UTCTimestamp: React.FC<{ date: Date }> = ({ date }) => {
  return <span>{date.toISOString()}</span>;
};

// Solution 2: Render client-side only
const LocalTimestamp: React.FC<{ date: Date }> = ({ date }) => {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    setFormattedDate(date.toLocaleString());
  }, [date]);

  // Return empty or placeholder during SSR
  if (!formattedDate) {
    return <span suppressHydrationWarning>{date.toISOString()}</span>;
  }

  return <span>{formattedDate}</span>;
};

// Solution 3: Pass timezone from server
interface TimestampProps {
  date: Date;
  timezone: string;
}

const TimezoneAwareTimestamp: React.FC<TimestampProps> = ({
  date,
  timezone
}) => {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date);

  return <span>{formatted}</span>;
};

// Solution 4: Use a library with SSR support
import { formatInTimeZone } from 'date-fns-tz';

const SafeTimestamp: React.FC<{ date: Date; timezone: string }> = ({
  date,
  timezone,
}) => {
  const formatted = formatInTimeZone(
    date,
    timezone,
    'yyyy-MM-dd HH:mm:ss zzz'
  );

  return <time dateTime={date.toISOString()}>{formatted}</time>;
};
```

### Relative Time Display

```typescript
// Relative times need special handling
import { useState, useEffect, useCallback } from 'react';

interface RelativeTimeProps {
  date: Date;
  updateInterval?: number;
}

const RelativeTime: React.FC<RelativeTimeProps> = ({
  date,
  updateInterval = 60000
}) => {
  const [mounted, setMounted] = useState(false);
  const [, forceUpdate] = useState({});

  const getRelativeTime = useCallback(() => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = date.getTime() - Date.now();
    const diffMinutes = Math.round(diff / 60000);
    const diffHours = Math.round(diff / 3600000);
    const diffDays = Math.round(diff / 86400000);

    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }
    return rtf.format(diffDays, 'day');
  }, [date]);

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      forceUpdate({});
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Show absolute time during SSR, relative time after hydration
  if (!mounted) {
    return (
      <time dateTime={date.toISOString()} suppressHydrationWarning>
        {date.toISOString()}
      </time>
    );
  }

  return (
    <time dateTime={date.toISOString()}>
      {getRelativeTime()}
    </time>
  );
};
```

## Browser-Specific API Issues

Browser APIs don't exist on the server, requiring careful handling.

### Common Browser APIs That Cause Issues

```typescript
// These all cause hydration errors if used during render
const problematicCode = {
  localStorage: localStorage.getItem('key'),
  sessionStorage: sessionStorage.getItem('key'),
  window: window.innerWidth,
  document: document.cookie,
  navigator: navigator.userAgent,
  location: location.pathname,
};
```

### Safe Browser API Patterns

```typescript
// Pattern 1: Lazy initialization with useState
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Initialize with the same value on both server and client
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Sync with localStorage after mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = (value: T): void => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Pattern 2: Window dimensions hook
interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize(): void {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Pattern 3: Media query hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Usage
const ResponsiveComponent: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { width } = useWindowSize();

  // During SSR, isMobile is false and width is undefined
  // After hydration, values are accurate

  return (
    <div>
      {width !== undefined && (
        <p>Window width: {width}px</p>
      )}
      <p>Layout: {isMobile ? 'Mobile' : 'Desktop'}</p>
    </div>
  );
};
```

## Conditional Rendering Problems

Conditional rendering based on client-specific data causes hydration errors.

### The Problem

```typescript
// This causes hydration mismatch
const BadConditional: React.FC = () => {
  const isLoggedIn = localStorage.getItem('token') !== null;

  return (
    <nav>
      {isLoggedIn ? (
        <button>Logout</button>
      ) : (
        <button>Login</button>
      )}
    </nav>
  );
};
```

### Solutions

```typescript
// Solution 1: Use initial server state
interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}

const AuthProvider: React.FC<{
  children: ReactNode;
  initialState: AuthState
}> = ({ children, initialState }) => {
  const [auth, setAuth] = useState<AuthState>(initialState);

  // Update auth state client-side if needed
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !auth.isLoggedIn) {
      // Fetch user data and update state
      fetchUser(token).then(user => {
        setAuth({ isLoggedIn: true, user });
      });
    }
  }, [auth.isLoggedIn]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Solution 2: Defer client-specific rendering
const DeferredAuth: React.FC = () => {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setAuthState(token ? 'authenticated' : 'anonymous');
  }, []);

  // Render the same thing during SSR and initial client render
  if (authState === 'loading') {
    return <nav><button disabled>Loading...</button></nav>;
  }

  return (
    <nav>
      {authState === 'authenticated' ? (
        <button>Logout</button>
      ) : (
        <button>Login</button>
      )}
    </nav>
  );
};

// Solution 3: Two-pass rendering
const TwoPassAuth: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // First pass: render server-safe content
  if (!isClient) {
    return (
      <nav>
        <button>Account</button>
      </nav>
    );
  }

  // Second pass: render client-specific content
  const isLoggedIn = localStorage.getItem('token') !== null;

  return (
    <nav>
      {isLoggedIn ? (
        <button>Logout</button>
      ) : (
        <button>Login</button>
      )}
    </nav>
  );
};
```

## Third-Party Library Conflicts

Many libraries aren't designed with SSR in mind.

### Identifying Problematic Libraries

```typescript
// Common problematic patterns in third-party libraries
// 1. Direct window/document access at module level
import problematicLib from 'problematic-lib'; // Error during SSR!

// 2. Components that use browser APIs in render
import { BrowserOnlyComponent } from 'some-ui-lib';
```

### Solutions

```typescript
// Solution 1: Dynamic imports with Next.js
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  {
    ssr: false,
    loading: () => <div>Loading map...</div>
  }
);

// Solution 2: Manual dynamic import
import { lazy, Suspense, useState, useEffect, ComponentType } from 'react';

function ClientOnlyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): React.FC<P> {
  return function WrappedComponent(props: P) {
    const [Component, setComponent] = useState<ComponentType<P> | null>(null);

    useEffect(() => {
      importFn().then(mod => {
        setComponent(() => mod.default);
      });
    }, []);

    if (!Component) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };
}

const Chart = ClientOnlyComponent(() => import('chart-library'));

// Solution 3: Conditional import pattern
let BrowserOnlyLib: typeof import('browser-only-lib') | null = null;

if (typeof window !== 'undefined') {
  BrowserOnlyLib = require('browser-only-lib');
}

const LibWrapper: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (BrowserOnlyLib) {
      setReady(true);
    }
  }, []);

  if (!ready || !BrowserOnlyLib) {
    return <div>Loading...</div>;
  }

  return <BrowserOnlyLib.Component />;
};
```

### Handling Library-Specific Issues

```typescript
// Example: Handling chart libraries
import { useEffect, useRef, useState } from 'react';

interface ChartData {
  labels: string[];
  values: number[];
}

const SSRSafeChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);

  useEffect(() => {
    // Only import and initialize on client
    let mounted = true;

    import('chart.js').then(({ Chart, registerables }) => {
      if (!mounted || !chartRef.current) return;

      Chart.register(...registerables);

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      const instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.values,
          }],
        },
      });

      setChartInstance(instance);
    });

    return () => {
      mounted = false;
      chartInstance?.destroy();
    };
  }, [data]);

  return (
    <div>
      <canvas ref={chartRef} />
      {!chartInstance && <p>Loading chart...</p>}
    </div>
  );
};
```

## Suppressing Hydration Warnings Safely

Sometimes you need to intentionally allow hydration mismatches.

### When to Suppress Warnings

```typescript
// Acceptable use cases:
// 1. Timestamps that must show current time
// 2. Random IDs for accessibility (with stable references)
// 3. Content that will immediately update anyway

// Use suppressHydrationWarning sparingly
const CurrentTime: React.FC = () => {
  return (
    <time suppressHydrationWarning>
      {new Date().toLocaleTimeString()}
    </time>
  );
};
```

### Proper Suppression Patterns

```typescript
// Pattern 1: Single element suppression
const SafeCurrentTime: React.FC = () => {
  const [time, setTime] = useState(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <time dateTime={time} suppressHydrationWarning>
      {new Date(time).toLocaleTimeString()}
    </time>
  );
};

// Pattern 2: Wrapper component for client-specific content
interface SuppressedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const SuppressHydrationMismatch: React.FC<SuppressedProps> = ({
  children,
  fallback = null,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span suppressHydrationWarning>
      {mounted ? children : fallback}
    </span>
  );
};

// Usage
const UserGreeting: React.FC = () => {
  return (
    <SuppressHydrationMismatch fallback="Hello!">
      Hello, {localStorage.getItem('userName') || 'Guest'}!
    </SuppressHydrationMismatch>
  );
};
```

### Important Caveats

```typescript
// WARNING: suppressHydrationWarning only works on the direct element
// It does NOT suppress warnings for child elements

// This WILL still cause hydration warnings for children:
const BadSuppression: React.FC = () => {
  return (
    <div suppressHydrationWarning>
      <span>{Date.now()}</span> {/* Still causes warning! */}
    </div>
  );
};

// Each element needs its own suppression:
const CorrectSuppression: React.FC = () => {
  return (
    <div>
      <span suppressHydrationWarning>{Date.now()}</span>
    </div>
  );
};
```

## Best Practices to Prevent Mismatches

### 1. Use Consistent Data Sources

```typescript
// Bad: Reading from different sources
const getUserId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || 'anonymous';
  }
  return 'anonymous';
};

// Good: Use a consistent initial value, update after mount
const useUserId = (): string => {
  const [userId, setUserId] = useState('anonymous');

  useEffect(() => {
    const stored = localStorage.getItem('userId');
    if (stored) {
      setUserId(stored);
    }
  }, []);

  return userId;
};
```

### 2. Avoid Side Effects During Render

```typescript
// Bad: Side effect during render
const Counter: React.FC = () => {
  let count = 0;
  count++; // Different on each render!

  return <span>{count}</span>;
};

// Good: Use state and effects
const Counter: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(c => c + 1);
  }, []);

  return <span>{count}</span>;
};
```

### 3. Deterministic ID Generation

```typescript
import { useId } from 'react';

// Bad: Random IDs
const BadForm: React.FC = () => {
  const id = Math.random().toString(36);

  return (
    <div>
      <label htmlFor={id}>Name</label>
      <input id={id} />
    </div>
  );
};

// Good: React's useId hook
const GoodForm: React.FC = () => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>Name</label>
      <input id={id} />
    </div>
  );
};
```

### 4. Serialize Complex State

```typescript
interface AppProps {
  initialData: SerializedData;
}

// Ensure complex data is serializable
interface SerializedData {
  users: Array<{
    id: string;
    name: string;
    createdAt: string; // ISO string, not Date object
  }>;
  metadata: {
    fetchedAt: string;
    version: number;
  };
}

// Server side
const getServerSideProps = async (): Promise<{ props: AppProps }> => {
  const data = await fetchData();

  // Serialize dates and complex objects
  const serialized: SerializedData = {
    users: data.users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
    metadata: {
      fetchedAt: new Date().toISOString(),
      version: data.version,
    },
  };

  return { props: { initialData: serialized } };
};

// Client side - deserialize as needed
const App: React.FC<AppProps> = ({ initialData }) => {
  const users = initialData.users.map(user => ({
    ...user,
    createdAt: new Date(user.createdAt),
  }));

  return <UserList users={users} />;
};
```

## Testing for Hydration Consistency

### Unit Testing Hydration

```typescript
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';

interface TestResult {
  serverHtml: string;
  clientHtml: string;
  matches: boolean;
}

async function testHydrationConsistency(
  Component: React.FC,
  props: Record<string, unknown> = {}
): Promise<TestResult> {
  // Server render
  const serverHtml = renderToString(<Component {...props} />);

  // Create container with server HTML
  const container = document.createElement('div');
  container.innerHTML = serverHtml;
  document.body.appendChild(container);

  // Client render
  const { container: clientContainer } = render(<Component {...props} />);
  const clientHtml = clientContainer.innerHTML;

  // Clean up
  document.body.removeChild(container);

  return {
    serverHtml,
    clientHtml,
    matches: serverHtml === clientHtml,
  };
}

// Test example
describe('Hydration Tests', () => {
  it('should render consistently on server and client', async () => {
    const result = await testHydrationConsistency(MyComponent, {
      data: testData,
    });

    expect(result.matches).toBe(true);
  });

  it('should not use browser APIs during initial render', () => {
    // Mock window as undefined
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(() => {
      renderToString(<MyComponent />);
    }).not.toThrow();

    global.window = originalWindow;
  });
});
```

### Integration Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Hydration', () => {
  test('should hydrate without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Hydration')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('should maintain interactivity after hydration', async ({ page }) => {
    await page.goto('/');

    // Wait for hydration
    await page.waitForFunction(() => {
      return document.querySelector('[data-hydrated="true"]');
    });

    // Test interactive elements
    const button = page.getByRole('button', { name: 'Click me' });
    await button.click();

    await expect(page.getByText('Clicked!')).toBeVisible();
  });
});
```

### Custom Hydration Test Utility

```typescript
import { JSDOM } from 'jsdom';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

interface HydrationTestConfig {
  Component: React.FC<any>;
  props?: Record<string, unknown>;
  timeout?: number;
}

interface HydrationTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

async function testHydration(
  config: HydrationTestConfig
): Promise<HydrationTestResult> {
  const { Component, props = {}, timeout = 5000 } = config;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Server render
  const serverHtml = renderToString(<Component {...props} />);

  // Set up JSDOM
  const dom = new JSDOM(`<!DOCTYPE html><div id="root">${serverHtml}</div>`, {
    runScripts: 'dangerously',
  });

  // Override console
  const originalConsole = dom.window.console;
  dom.window.console = {
    ...originalConsole,
    error: (msg: string, ...args: unknown[]) => {
      errors.push(msg);
      originalConsole.error(msg, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      warnings.push(msg);
      originalConsole.warn(msg, ...args);
    },
  };

  // Hydrate
  const root = dom.window.document.getElementById('root')!;

  return new Promise((resolve) => {
    try {
      hydrateRoot(root, <Component {...props} />);

      setTimeout(() => {
        resolve({
          success: errors.filter(e => e.includes('Hydration')).length === 0,
          errors,
          warnings,
        });
      }, timeout);
    } catch (error) {
      resolve({
        success: false,
        errors: [...errors, String(error)],
        warnings,
      });
    }
  });
}

// Usage in tests
describe('Component Hydration', () => {
  it('UserProfile hydrates correctly', async () => {
    const result = await testHydration({
      Component: UserProfile,
      props: { user: mockUser },
    });

    expect(result.success).toBe(true);
    expect(result.errors).not.toContain(
      expect.stringContaining('Hydration')
    );
  });
});
```

## Debugging Checklist

When you encounter hydration errors, follow this systematic approach:

```typescript
// Debugging checklist as code comments
/*
 * HYDRATION ERROR DEBUGGING CHECKLIST
 *
 * 1. Check the error message
 *    - What elements are mismatched?
 *    - What are the server vs client values?
 *
 * 2. Identify the component
 *    - Use React DevTools component stack
 *    - Add console.log to suspected components
 *
 * 3. Check for common causes:
 *    [ ] Browser API usage (window, document, localStorage)
 *    [ ] Date/time formatting
 *    [ ] Random values or IDs
 *    [ ] Conditional rendering based on client state
 *    [ ] Third-party library issues
 *
 * 4. Verify data consistency
 *    [ ] Is initial state the same on server and client?
 *    [ ] Are props serializable?
 *    [ ] Are dates handled as ISO strings?
 *
 * 5. Test fixes
 *    [ ] Use useEffect for client-only code
 *    [ ] Implement two-pass rendering if needed
 *    [ ] Use dynamic imports for problematic libraries
 *    [ ] Add suppressHydrationWarning only as last resort
 */
```

## Conclusion

Hydration errors in React SSR applications can be challenging to debug, but with a systematic approach and understanding of the underlying causes, they become manageable. Remember these key points:

1. **Hydration requires identical output** - Server and client must render the same initial HTML
2. **Environment differences matter** - Browser APIs don't exist on the server
3. **Time and randomness cause issues** - Use deterministic values during initial render
4. **Two-pass rendering is your friend** - Render consistent content first, then update client-side
5. **Test early and often** - Catch hydration issues before they reach production

By following the patterns and practices outlined in this guide, you can build robust SSR applications that hydrate smoothly and provide excellent user experiences.

## Additional Resources

- [React Documentation on Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Next.js SSR Documentation](https://nextjs.org/docs/basic-features/pages#server-side-rendering)
- [React 18 Hydration Improvements](https://react.dev/blog/2022/03/29/react-v18#new-suspense-features)

---

*This guide is part of our React SSR series. For more in-depth tutorials on server-side rendering, check out our other articles on performance optimization and caching strategies.*
