# How to Implement Streaming SSR in React 18

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, React 18, Streaming SSR, Server-Side Rendering, Suspense, TypeScript, Performance

Description: Learn how to implement streaming server-side rendering in React 18 using renderToPipeableStream and Suspense for progressive page loading.

---

## Introduction

Server-side rendering (SSR) has long been a cornerstone of web performance optimization, enabling faster initial page loads and improved SEO. With React 18, the introduction of streaming SSR represents a paradigm shift in how we think about server rendering. Instead of waiting for the entire HTML document to be generated before sending anything to the client, streaming SSR allows you to progressively send HTML chunks as they become ready.

This comprehensive guide will walk you through everything you need to know about implementing streaming SSR in React 18, from understanding the fundamentals to building production-ready streaming applications.

## What is Streaming SSR?

Traditional SSR works by rendering your entire React application to a string on the server, then sending that complete HTML document to the client. The browser receives the full HTML, displays it, and then React "hydrates" the page to make it interactive.

Streaming SSR fundamentally changes this approach. Instead of waiting for the entire page to render, the server begins sending HTML to the client immediately. As different parts of your application finish rendering, they are streamed to the browser in chunks.

### The Traditional SSR Flow

```typescript
// Traditional SSR with renderToString
import { renderToString } from 'react-dom/server';
import App from './App';

const html = renderToString(<App />);
// Server waits until entire HTML is generated
// Then sends complete response to client
res.send(`
  <!DOCTYPE html>
  <html>
    <head><title>My App</title></head>
    <body>
      <div id="root">${html}</div>
      <script src="/client.js"></script>
    </body>
  </html>
`);
```

### The Streaming SSR Flow

```typescript
// Streaming SSR with renderToPipeableStream
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

const { pipe } = renderToPipeableStream(<App />, {
  bootstrapScripts: ['/client.js'],
  onShellReady() {
    // Start streaming immediately when shell is ready
    res.setHeader('Content-Type', 'text/html');
    pipe(res);
  },
});
```

## Benefits of Streaming SSR

### 1. Faster Time to First Byte (TTFB)

With streaming, the browser receives the first bytes of HTML almost immediately. The server does not need to wait for slow data fetching or complex component rendering before starting to send the response.

```typescript
// Example: A page with multiple data sources
const Page: React.FC = () => {
  return (
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        {/* Shell renders immediately */}
        <Header />
        <Navigation />

        {/* These stream in as they complete */}
        <Suspense fallback={<UserProfileSkeleton />}>
          <UserProfile />
        </Suspense>

        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsWidget />
        </Suspense>

        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity />
        </Suspense>

        <Footer />
      </body>
    </html>
  );
};
```

### 2. Progressive Content Display

Users see meaningful content faster. The initial shell of your application appears immediately, and additional content fills in progressively.

### 3. Better Resource Utilization

The browser can begin parsing HTML, loading stylesheets, and fetching scripts while the server is still rendering additional content.

### 4. Improved User Experience

Instead of staring at a blank page, users see incremental progress as content loads, providing better perceived performance.

### 5. Selective Hydration

React 18's streaming architecture enables selective hydration, where interactive elements can become responsive before the entire page has hydrated.

## React 18 Streaming APIs Overview

React 18 introduces several new APIs specifically designed for streaming SSR:

### renderToPipeableStream

The primary API for Node.js streaming environments. It returns a stream that can be piped to the response.

```typescript
import { renderToPipeableStream } from 'react-dom/server';

interface RenderToPipeableStreamOptions {
  identifierPrefix?: string;
  namespaceURI?: string;
  nonce?: string;
  bootstrapScriptContent?: string;
  bootstrapScripts?: string[];
  bootstrapModules?: string[];
  progressiveChunkSize?: number;
  onShellReady?: () => void;
  onShellError?: (error: Error) => void;
  onAllReady?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => string | void;
}

interface PipeableStream {
  pipe: <Writable extends NodeJS.WritableStream>(destination: Writable) => Writable;
  abort: (reason?: Error) => void;
}

const stream: PipeableStream = renderToPipeableStream(
  reactNode,
  options
);
```

### renderToReadableStream

For web-standard streaming environments (like Deno, Cloudflare Workers, or edge runtimes).

```typescript
import { renderToReadableStream } from 'react-dom/server';

interface RenderToReadableStreamOptions {
  identifierPrefix?: string;
  namespaceURI?: string;
  nonce?: string;
  bootstrapScriptContent?: string;
  bootstrapScripts?: string[];
  bootstrapModules?: string[];
  progressiveChunkSize?: number;
  signal?: AbortSignal;
  onError?: (error: Error, errorInfo: ErrorInfo) => string | void;
}

const stream: ReadableStream = await renderToReadableStream(
  reactNode,
  options
);
```

## renderToPipeableStream vs renderToString

Understanding the differences between these two approaches is crucial for making the right architectural decisions.

### renderToString Characteristics

```typescript
import { renderToString } from 'react-dom/server';

// Synchronous, blocking operation
const html: string = renderToString(<App />);

// Pros:
// - Simple API
// - Easy to reason about
// - Full HTML available before sending

// Cons:
// - Blocks until complete
// - Higher TTFB
// - No Suspense support on server
// - All or nothing hydration
```

### renderToPipeableStream Characteristics

```typescript
import { renderToPipeableStream } from 'react-dom/server';

const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() {
    // Stream begins
    pipe(res);
  },
  onAllReady() {
    // Everything finished
  },
  onError(error) {
    console.error(error);
  },
});

// Pros:
// - Lower TTFB
// - Full Suspense support
// - Progressive rendering
// - Selective hydration
// - Better error boundaries

// Cons:
// - More complex setup
// - Requires streaming-aware infrastructure
// - Different caching strategies needed
```

### Performance Comparison

```typescript
// Benchmark comparison helper
interface BenchmarkResult {
  ttfb: number;
  fcp: number;
  lcp: number;
  tti: number;
}

async function benchmarkRenderToString(
  app: React.ReactElement
): Promise<BenchmarkResult> {
  const start = performance.now();
  const html = renderToString(app);
  const ttfb = performance.now() - start;

  // TTFB equals time to generate full HTML
  // FCP, LCP, TTI all happen after full HTML received
  return {
    ttfb,
    fcp: ttfb + 50, // After HTML parsing
    lcp: ttfb + 100, // After images/fonts
    tti: ttfb + 200, // After hydration
  };
}

// With streaming, TTFB is near-instant
// FCP happens as shell streams
// LCP may be faster due to progressive loading
// TTI benefits from selective hydration
```

## Setting Up Streaming with Express and Node.js

Let us build a complete streaming SSR setup from scratch.

### Project Structure

```
streaming-ssr-app/
  src/
    client/
      index.tsx
      App.tsx
      components/
        Header.tsx
        Footer.tsx
        UserProfile.tsx
        Dashboard.tsx
    server/
      index.ts
      render.ts
      routes.ts
    shared/
      types.ts
  public/
  webpack.config.js
  tsconfig.json
  package.json
```

### Server Setup

```typescript
// src/server/index.ts
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import path from 'path';
import { streamingRender } from './render';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname, '../../public')));

// API routes
app.use('/api', require('./routes'));

// SSR handler
app.get('*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await streamingRender(req, res);
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### Streaming Render Function

```typescript
// src/server/render.ts
import { Request, Response } from 'express';
import { renderToPipeableStream, RenderToPipeableStreamOptions } from 'react-dom/server';
import React from 'react';
import App from '../client/App';

interface RenderContext {
  url: string;
  statusCode: number;
  helmetContext: object;
}

export async function streamingRender(
  req: Request,
  res: Response
): Promise<void> {
  const context: RenderContext = {
    url: req.url,
    statusCode: 200,
    helmetContext: {},
  };

  let didError = false;
  let shellError: Error | null = null;

  const { pipe, abort } = renderToPipeableStream(
    <App context={context} />,
    {
      bootstrapScripts: ['/static/js/client.js'],
      bootstrapModules: ['/static/js/client.mjs'],

      onShellReady() {
        // Shell is ready - start streaming
        // This includes everything outside Suspense boundaries
        res.statusCode = didError ? 500 : context.statusCode;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        pipe(res);
      },

      onShellError(error: Error) {
        // Shell failed to render - send fallback
        shellError = error;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><title>Error</title></head>
            <body>
              <h1>Something went wrong</h1>
              <p>Please try again later.</p>
            </body>
          </html>
        `);
      },

      onAllReady() {
        // All content including Suspense boundaries has resolved
        // Useful for crawlers/bots that need complete HTML
        console.log('All content ready for:', req.url);
      },

      onError(error: Error) {
        didError = true;
        console.error('Streaming error:', error);
        // Return error message for client-side display
        return error.message;
      },
    }
  );

  // Set timeout for slow responses
  const ABORT_TIMEOUT = 10000; // 10 seconds
  setTimeout(() => {
    abort(new Error('Server render timeout'));
  }, ABORT_TIMEOUT);
}
```

### Client Entry Point

```typescript
// src/client/index.tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  hydrateRoot(
    container,
    <React.StrictMode>
      <App context={{ url: window.location.pathname }} />
    </React.StrictMode>
  );
}
```

## Using Suspense for Streaming Boundaries

Suspense is the key to unlocking streaming SSR. Each Suspense boundary defines a point where React can pause rendering and stream content later.

### Basic Suspense Usage

```typescript
// src/client/App.tsx
import React, { Suspense } from 'react';

// Lazy-loaded components
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Analytics = React.lazy(() => import('./components/Analytics'));

interface AppProps {
  context: {
    url: string;
  };
}

const App: React.FC<AppProps> = ({ context }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Streaming SSR App</title>
        <link rel="stylesheet" href="/static/css/main.css" />
      </head>
      <body>
        <div id="root">
          {/* Header renders immediately in shell */}
          <Header />

          <main>
            {/* Each Suspense boundary can stream independently */}
            <Suspense fallback={<ProfileSkeleton />}>
              <UserProfile />
            </Suspense>

            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>

            <Suspense fallback={<AnalyticsSkeleton />}>
              <Analytics />
            </Suspense>
          </main>

          {/* Footer renders in shell */}
          <Footer />
        </div>
      </body>
    </html>
  );
};

export default App;
```

### Nested Suspense Boundaries

```typescript
// src/client/components/Dashboard.tsx
import React, { Suspense } from 'react';

interface DashboardData {
  summary: SummaryData;
  charts: ChartData[];
  recentActivity: ActivityItem[];
}

const Dashboard: React.FC = () => {
  return (
    <section className="dashboard">
      <h2>Dashboard</h2>

      {/* First level - summary loads fast */}
      <Suspense fallback={<SummarySkeleton />}>
        <DashboardSummary />

        {/* Nested level - charts can take longer */}
        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardCharts />

          {/* Deepest level - activity might be slowest */}
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </Suspense>
      </Suspense>
    </section>
  );
};

// Data fetching component using use() hook (React 18.3+)
const DashboardSummary: React.FC = () => {
  const data = use(fetchDashboardSummary());

  return (
    <div className="summary-cards">
      <SummaryCard title="Users" value={data.users} />
      <SummaryCard title="Revenue" value={data.revenue} />
      <SummaryCard title="Orders" value={data.orders} />
    </div>
  );
};

export default Dashboard;
```

### Creating Streamable Data Fetching

```typescript
// src/shared/data.ts

// Cache for deduplication
const cache = new Map<string, Promise<any>>();

export function createStreamableResource<T>(
  key: string,
  fetcher: () => Promise<T>
): () => T {
  return function resource(): T {
    if (!cache.has(key)) {
      cache.set(key, fetcher());
    }

    const promise = cache.get(key)!;

    // Check if already resolved
    if ('_result' in promise) {
      return (promise as any)._result;
    }

    if ('_error' in promise) {
      throw (promise as any)._error;
    }

    // Throw promise for Suspense to catch
    throw promise.then(
      (result) => {
        (promise as any)._result = result;
      },
      (error) => {
        (promise as any)._error = error;
      }
    );
  };
}

// Usage
export const getUserProfile = createStreamableResource(
  'userProfile',
  async () => {
    const response = await fetch('/api/user/profile');
    return response.json();
  }
);

export const getDashboardData = createStreamableResource(
  'dashboard',
  async () => {
    const response = await fetch('/api/dashboard');
    return response.json();
  }
);
```

## Progressive HTML Delivery

Understanding how HTML is progressively delivered helps optimize your streaming setup.

### How Streaming Works Under the Hood

```typescript
// The server sends HTML in chunks like this:

// Chunk 1: Initial shell (onShellReady)
`<!DOCTYPE html>
<html>
<head>...</head>
<body>
<div id="root">
<header>...</header>
<main>
  <!--$?--><template id="B:0"></template><div class="skeleton">Loading profile...</div><!--/$-->
  <!--$?--><template id="B:1"></template><div class="skeleton">Loading dashboard...</div><!--/$-->
</main>
<footer>...</footer>
</div>`

// Chunk 2: First Suspense resolves
`<div hidden id="S:0">
  <div class="user-profile">
    <h2>John Doe</h2>
    <p>john@example.com</p>
  </div>
</div>
<script>$RC("B:0","S:0")</script>`

// Chunk 3: Second Suspense resolves
`<div hidden id="S:1">
  <div class="dashboard">
    <h2>Dashboard</h2>
    <!-- dashboard content -->
  </div>
</div>
<script>$RC("B:1","S:1")</script>`

// Final chunk: Close HTML
`</body>
</html>`
```

### Controlling Chunk Size

```typescript
// src/server/render.ts

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

const { pipe } = renderToPipeableStream(<App />, {
  progressiveChunkSize: CHUNK_SIZE,

  onShellReady() {
    // Enable streaming with chunked transfer
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe with transformation for monitoring
    const transform = new Transform({
      transform(chunk, encoding, callback) {
        console.log(`Streaming chunk: ${chunk.length} bytes`);
        callback(null, chunk);
      }
    });

    pipe(transform).pipe(res);
  },
});
```

## Selective Hydration

One of the most powerful features of streaming SSR is selective hydration. React 18 can hydrate different parts of your page independently.

### How Selective Hydration Works

```typescript
// src/client/components/InteractiveWidget.tsx
import React, { useState, useTransition } from 'react';

interface WidgetProps {
  initialData: WidgetData;
}

const InteractiveWidget: React.FC<WidgetProps> = ({ initialData }) => {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // This interaction works immediately after this
    // component hydrates, even if other parts of
    // the page are still hydrating
    startTransition(() => {
      setData(transformData(data));
    });
  };

  return (
    <div
      className={`widget ${isPending ? 'pending' : ''}`}
      onClick={handleClick}
    >
      <h3>{data.title}</h3>
      <p>{data.content}</p>
    </div>
  );
};

export default InteractiveWidget;
```

### Priority-Based Hydration

```typescript
// React automatically prioritizes hydration based on user interaction

// src/client/App.tsx
import React, { Suspense } from 'react';

const App: React.FC = () => {
  return (
    <div>
      {/* Navigation hydrates first due to likely interaction */}
      <Suspense fallback={<NavSkeleton />}>
        <Navigation />
      </Suspense>

      {/* Main content hydrates based on viewport */}
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>

      {/* Footer may hydrate last */}
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
};

// If user clicks on Navigation before it's hydrated,
// React will prioritize hydrating Navigation immediately
```

### Manual Hydration Control

```typescript
// For fine-grained control over hydration priority

import { createRoot, hydrateRoot } from 'react-dom/client';

// Option 1: Delayed hydration for below-fold content
const container = document.getElementById('root');
const root = hydrateRoot(container, <App />);

// Option 2: Intersection Observer for lazy hydration
function lazyHydrate(
  elementId: string,
  component: React.ReactElement
): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hydrateRoot(element, component);
          observer.disconnect();
        }
      });
    },
    { rootMargin: '100px' }
  );

  observer.observe(element);
}

// Usage
lazyHydrate('comments-section', <CommentsSection />);
```

## Error Handling in Streaming

Proper error handling is crucial for a robust streaming SSR implementation.

### Server-Side Error Handling

```typescript
// src/server/render.ts
import { renderToPipeableStream } from 'react-dom/server';
import { ErrorBoundary } from '../client/components/ErrorBoundary';

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export async function streamingRender(
  req: Request,
  res: Response
): Promise<void> {
  const errors: Error[] = [];
  let shellRendered = false;

  const { pipe, abort } = renderToPipeableStream(
    <ErrorBoundary>
      <App url={req.url} />
    </ErrorBoundary>,
    {
      bootstrapScripts: ['/client.js'],

      onShellReady() {
        shellRendered = true;

        // Set appropriate status based on errors
        if (errors.length > 0) {
          res.statusCode = 500;
        }

        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      },

      onShellError(error: Error) {
        // Critical error - shell couldn't render
        console.error('Shell render error:', error);

        res.statusCode = 500;
        res.send(renderErrorPage(error));
      },

      onError(error: Error, errorInfo: { componentStack?: string }) {
        errors.push(error);

        // Log detailed error information
        console.error('Streaming error:', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: req.url,
          timestamp: new Date().toISOString(),
        });

        // Return sanitized error message for client
        if (process.env.NODE_ENV === 'development') {
          return error.message;
        }
        return 'An error occurred';
      },
    }
  );

  // Timeout handling
  const timeout = setTimeout(() => {
    if (!shellRendered) {
      abort(new Error('Render timeout'));
      res.statusCode = 504;
      res.send(renderTimeoutPage());
    }
  }, 10000);

  res.on('close', () => {
    clearTimeout(timeout);
  });
}

function renderErrorPage(error: Error): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: system-ui; padding: 2rem; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>Something went wrong</h1>
        <p class="error">${escapeHtml(error.message)}</p>
        <a href="/">Go back home</a>
      </body>
    </html>
  `;
}
```

### Client-Side Error Boundary

```typescript
// src/client/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);

    this.props.onError?.(error, errorInfo);

    // Report to error tracking service
    if (typeof window !== 'undefined') {
      reportError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Streaming-aware error boundary wrapper
export const StreamingErrorBoundary: React.FC<{
  children: ReactNode;
  name: string;
}> = ({ children, name }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="streaming-error">
          <p>Failed to load {name}</p>
          <button onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      }
      onError={(error) => {
        console.error(`Streaming error in ${name}:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Shell Patterns for Streaming

The "shell" is the static part of your page that renders immediately. Designing effective shells is crucial for good streaming performance.

### Basic Shell Pattern

```typescript
// src/client/components/AppShell.tsx
import React, { Suspense, ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>My App</title>

        {/* Critical CSS inlined for immediate rendering */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />

        {/* Non-critical CSS loaded asynchronously */}
        <link
          rel="stylesheet"
          href="/styles/main.css"
          media="print"
          onLoad="this.media='all'"
        />
      </head>
      <body>
        <div id="root">
          {/* Shell components - render immediately */}
          <Header />
          <Navigation />

          {/* Dynamic content - streams in */}
          <main>
            {children}
          </main>

          {/* Shell footer */}
          <Footer />
        </div>

        {/* Scripts loaded at end */}
        <script src="/client.js" async />
      </body>
    </html>
  );
};

const criticalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; line-height: 1.5; }
  .skeleton { background: #e5e7eb; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
```

### Advanced Shell with Loading States

```typescript
// src/client/components/PageShell.tsx
import React, { Suspense } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  description
}) => {
  return (
    <>
      {/* Immediate visible content */}
      <div className="page-header">
        <h1>{title}</h1>
        {description && <p className="description">{description}</p>}
      </div>

      {/* Breadcrumbs - usually fast */}
      <Suspense fallback={<BreadcrumbSkeleton />}>
        <Breadcrumbs />
      </Suspense>

      {/* Primary content area */}
      <div className="page-content">
        <Suspense fallback={<ContentSkeleton />}>
          <PageContent />
        </Suspense>
      </div>

      {/* Sidebar - can load independently */}
      <aside className="sidebar">
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </aside>
    </>
  );
};

// Skeleton components for visual stability
const ContentSkeleton: React.FC = () => (
  <div className="content-skeleton">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-paragraph" />
    <div className="skeleton skeleton-paragraph" />
    <div className="skeleton skeleton-paragraph short" />
  </div>
);

const SidebarSkeleton: React.FC = () => (
  <div className="sidebar-skeleton">
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);
```

## Handling Loading States

Creating effective loading states improves perceived performance during streaming.

### Skeleton Components

```typescript
// src/client/components/skeletons/index.tsx
import React from 'react';
import './skeletons.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
}) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    }}
  />
);

export const CardSkeleton: React.FC = () => (
  <div className="card-skeleton">
    <Skeleton height={200} className="card-image" />
    <div className="card-content">
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} />
      <Skeleton height={16} />
      <Skeleton height={16} width="80%" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="table-skeleton">
    <div className="table-header">
      <Skeleton height={40} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="table-row">
        <Skeleton height={48} />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="profile-skeleton">
    <Skeleton
      width={80}
      height={80}
      borderRadius="50%"
      className="avatar"
    />
    <div className="profile-info">
      <Skeleton height={24} width={150} />
      <Skeleton height={16} width={200} />
    </div>
  </div>
);
```

### Progressive Loading with Transitions

```typescript
// src/client/hooks/useStreamingData.ts
import { useState, useEffect, useTransition } from 'react';

interface StreamingDataState<T> {
  data: T | null;
  isLoading: boolean;
  isPending: boolean;
  error: Error | null;
}

export function useStreamingData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
): StreamingDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchFn()
      .then((result) => {
        if (!cancelled) {
          startTransition(() => {
            setData(result);
            setIsLoading(false);
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, isLoading, isPending, error };
}

// Usage in component
const DataDisplay: React.FC = () => {
  const { data, isLoading, isPending } = useStreamingData(
    () => fetch('/api/data').then(r => r.json())
  );

  if (isLoading) return <Skeleton />;

  return (
    <div className={isPending ? 'opacity-50' : ''}>
      {data && <DisplayComponent data={data} />}
    </div>
  );
};
```

## Performance Comparisons

Let us examine real-world performance differences between traditional and streaming SSR.

### Benchmark Setup

```typescript
// benchmark/ssr-comparison.ts
import { performance } from 'perf_hooks';
import { renderToString } from 'react-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'stream';

interface BenchmarkMetrics {
  ttfb: number;
  totalTime: number;
  memoryUsed: number;
  chunksCount: number;
}

async function benchmarkRenderToString(
  app: React.ReactElement
): Promise<BenchmarkMetrics> {
  const startMemory = process.memoryUsage().heapUsed;
  const start = performance.now();

  const html = renderToString(app);

  const ttfb = performance.now() - start;
  const totalTime = ttfb; // Same for string rendering
  const memoryUsed = process.memoryUsage().heapUsed - startMemory;

  return {
    ttfb,
    totalTime,
    memoryUsed,
    chunksCount: 1,
  };
}

async function benchmarkStreaming(
  app: React.ReactElement
): Promise<BenchmarkMetrics> {
  return new Promise((resolve) => {
    const startMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    let ttfb = 0;
    let chunksCount = 0;

    const chunks: Buffer[] = [];

    const writable = new Writable({
      write(chunk, encoding, callback) {
        if (chunksCount === 0) {
          ttfb = performance.now() - start;
        }
        chunks.push(chunk);
        chunksCount++;
        callback();
      },
      final(callback) {
        const totalTime = performance.now() - start;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        resolve({
          ttfb,
          totalTime,
          memoryUsed,
          chunksCount,
        });
        callback();
      },
    });

    const { pipe } = renderToPipeableStream(app, {
      onShellReady() {
        pipe(writable);
      },
    });
  });
}

// Run comparison
async function runComparison(): Promise<void> {
  const iterations = 100;

  const stringResults: BenchmarkMetrics[] = [];
  const streamResults: BenchmarkMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    stringResults.push(await benchmarkRenderToString(<TestApp />));
    streamResults.push(await benchmarkStreaming(<TestApp />));
  }

  console.log('renderToString average:', {
    ttfb: average(stringResults.map(r => r.ttfb)),
    totalTime: average(stringResults.map(r => r.totalTime)),
    memory: average(stringResults.map(r => r.memoryUsed)),
  });

  console.log('renderToPipeableStream average:', {
    ttfb: average(streamResults.map(r => r.ttfb)),
    totalTime: average(streamResults.map(r => r.totalTime)),
    memory: average(streamResults.map(r => r.memoryUsed)),
    chunks: average(streamResults.map(r => r.chunksCount)),
  });
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}
```

### Real-World Performance Metrics

```typescript
// Typical results from benchmarks:

/*
Page with 3 slow data fetches (200ms each):

renderToString:
- TTFB: 650ms (waits for all data)
- Total: 650ms
- FCP: 700ms
- LCP: 750ms

renderToPipeableStream:
- TTFB: 15ms (shell ready)
- Total: 650ms (same total work)
- FCP: 65ms (shell painted)
- LCP: 450ms (progressive)

Improvement:
- 97% faster TTFB
- 90% faster FCP
- 40% faster LCP
*/

// Monitoring setup for production
interface PerformanceMonitor {
  recordTTFB(url: string, ttfb: number): void;
  recordStreamingMetrics(metrics: StreamingMetrics): void;
}

interface StreamingMetrics {
  url: string;
  shellTime: number;
  totalTime: number;
  chunksCount: number;
  suspenseBoundaries: number;
  errors: number;
}

const monitor: PerformanceMonitor = {
  recordTTFB(url, ttfb) {
    // Send to analytics
    console.log(`[PERF] ${url} TTFB: ${ttfb}ms`);
  },
  recordStreamingMetrics(metrics) {
    console.log(`[PERF] Streaming metrics:`, metrics);
  },
};
```

## Best Practices and Patterns

### 1. Strategic Suspense Placement

```typescript
// Good: Suspense around independent data fetching
const GoodPattern: React.FC = () => (
  <div>
    <Suspense fallback={<HeaderSkeleton />}>
      <Header /> {/* Fast, user data */}
    </Suspense>

    <Suspense fallback={<ContentSkeleton />}>
      <MainContent /> {/* Medium, main data */}
    </Suspense>

    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar /> {/* Slow, recommendations */}
    </Suspense>
  </div>
);

// Bad: Single Suspense blocking everything
const BadPattern: React.FC = () => (
  <Suspense fallback={<FullPageSkeleton />}>
    <Header />
    <MainContent />
    <Sidebar />
  </Suspense>
);
```

### 2. Optimize Shell Content

```typescript
// Include critical UI in shell
const OptimizedShell: React.FC = () => (
  <html>
    <head>
      {/* Inline critical CSS */}
      <style>{criticalCSS}</style>

      {/* Preload important resources */}
      <link rel="preload" href="/fonts/main.woff2" as="font" />
      <link rel="preload" href="/api/user" as="fetch" />
    </head>
    <body>
      {/* Static navigation - no Suspense needed */}
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>

      {/* User-specific content streams */}
      <Suspense fallback={<UserMenuSkeleton />}>
        <UserMenu />
      </Suspense>

      {/* Main content area */}
      <main>
        <Suspense fallback={<PageSkeleton />}>
          <PageContent />
        </Suspense>
      </main>
    </body>
  </html>
);
```

### 3. Error Recovery Patterns

```typescript
// Graceful degradation with error boundaries
const ResilientPage: React.FC = () => (
  <ErrorBoundary fallback={<StaticFallback />}>
    <Suspense fallback={<Loading />}>
      <DynamicContent />
    </Suspense>
  </ErrorBoundary>
);

// Retry logic for failed streams
const RetryableContent: React.FC = () => {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <ErrorBoundary
      key={retryCount}
      fallback={
        <div>
          <p>Failed to load content</p>
          <button onClick={() => setRetryCount(c => c + 1)}>
            Retry
          </button>
        </div>
      }
    >
      <Suspense fallback={<Skeleton />}>
        <Content />
      </Suspense>
    </ErrorBoundary>
  );
};
```

### 4. Cache-Friendly Streaming

```typescript
// src/server/cache.ts
import { LRUCache } from 'lru-cache';

interface CacheEntry {
  html: string;
  timestamp: number;
  headers: Record<string, string>;
}

const cache = new LRUCache<string, CacheEntry>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function cachedStreamingRender(
  req: Request,
  res: Response
): Promise<void> {
  const cacheKey = generateCacheKey(req);

  // Check for cached response
  const cached = cache.get(cacheKey);
  if (cached && !shouldBypassCache(req)) {
    res.setHeader('X-Cache', 'HIT');
    Object.entries(cached.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.send(cached.html);
    return;
  }

  // Stream and cache
  res.setHeader('X-Cache', 'MISS');

  const chunks: string[] = [];

  const { pipe } = renderToPipeableStream(<App />, {
    onAllReady() {
      // Cache complete HTML after streaming finishes
      const html = chunks.join('');
      cache.set(cacheKey, {
        html,
        timestamp: Date.now(),
        headers: { 'Content-Type': 'text/html' },
      });
    },
  });

  // Transform to capture chunks while streaming
  const transform = new Transform({
    transform(chunk, encoding, callback) {
      chunks.push(chunk.toString());
      callback(null, chunk);
    },
  });

  pipe(transform).pipe(res);
}
```

### 5. Monitoring and Debugging

```typescript
// src/server/streaming-monitor.ts

interface StreamEvent {
  type: 'shell_ready' | 'chunk' | 'suspense_resolved' | 'error' | 'complete';
  timestamp: number;
  data?: any;
}

export function createStreamingMonitor(requestId: string) {
  const events: StreamEvent[] = [];
  const startTime = Date.now();

  return {
    onShellReady() {
      events.push({
        type: 'shell_ready',
        timestamp: Date.now() - startTime,
      });
    },

    onChunk(size: number) {
      events.push({
        type: 'chunk',
        timestamp: Date.now() - startTime,
        data: { size },
      });
    },

    onSuspenseResolved(name: string) {
      events.push({
        type: 'suspense_resolved',
        timestamp: Date.now() - startTime,
        data: { name },
      });
    },

    onError(error: Error) {
      events.push({
        type: 'error',
        timestamp: Date.now() - startTime,
        data: { message: error.message },
      });
    },

    onComplete() {
      events.push({
        type: 'complete',
        timestamp: Date.now() - startTime,
      });

      // Log summary
      console.log(`[${requestId}] Streaming summary:`, {
        totalTime: Date.now() - startTime,
        shellTime: events.find(e => e.type === 'shell_ready')?.timestamp,
        chunksCount: events.filter(e => e.type === 'chunk').length,
        suspenseCount: events.filter(e => e.type === 'suspense_resolved').length,
        errors: events.filter(e => e.type === 'error').length,
      });
    },

    getEvents() {
      return events;
    },
  };
}
```

## Conclusion

Streaming SSR in React 18 represents a significant advancement in how we build performant web applications. By leveraging `renderToPipeableStream` and strategic Suspense boundaries, you can dramatically improve your application's perceived performance while maintaining the SEO benefits of server-side rendering.

Key takeaways:

1. **Start with the shell**: Design your application with a fast-rendering shell that provides immediate visual feedback.

2. **Strategic Suspense placement**: Place Suspense boundaries around independently-loading content sections to maximize parallelization.

3. **Progressive enhancement**: Build loading states that gracefully handle the streaming nature of content delivery.

4. **Error resilience**: Implement comprehensive error handling at both the shell and individual component levels.

5. **Monitor and optimize**: Use performance monitoring to identify bottlenecks and optimize your streaming boundaries.

6. **Cache wisely**: Implement caching strategies that work with streaming's progressive nature.

By following these patterns and best practices, you can build React applications that deliver exceptional user experiences through faster initial loads, progressive content display, and responsive interactions even during hydration.

## Further Reading

- [React 18 Server Components Documentation](https://react.dev/reference/react-dom/server)
- [Suspense for Data Fetching](https://react.dev/reference/react/Suspense)
- [Selective Hydration Architecture](https://github.com/reactwg/react-18/discussions/37)
- [Streaming SSR Performance Guide](https://web.dev/articles/rendering-on-the-web)
