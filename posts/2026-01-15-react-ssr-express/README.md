# How to Implement Server-Side Rendering in React with Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, SSR, Express, Server-Side Rendering, TypeScript, Performance, Node.js

Description: Learn how to implement server-side rendering (SSR) in React applications using Express.js for improved SEO, faster initial page loads, and better user experience.

---

## Introduction

Server-Side Rendering (SSR) has become an essential technique in modern web development, particularly for React applications that need excellent SEO, fast initial page loads, and improved user experience. While client-side rendering (CSR) has its place, SSR offers significant advantages that make it worth the additional complexity.

In this comprehensive guide, we will walk through implementing SSR in a React application using Express.js as our server framework. We will cover everything from basic setup to advanced optimization techniques, using TypeScript throughout for type safety and better developer experience.

## What is Server-Side Rendering?

Server-Side Rendering is the process of rendering your React components on the server and sending the fully rendered HTML to the client. This contrasts with Client-Side Rendering, where the browser downloads a minimal HTML file, loads JavaScript, and then renders the content.

### The Rendering Timeline

**Client-Side Rendering:**
1. Browser requests page
2. Server sends minimal HTML with script tags
3. Browser downloads JavaScript bundles
4. JavaScript executes and renders content
5. User sees the page

**Server-Side Rendering:**
1. Browser requests page
2. Server renders React components to HTML
3. Server sends fully rendered HTML
4. User sees the page immediately
5. Browser downloads JavaScript bundles
6. React "hydrates" the page, making it interactive

### Why SSR Matters

**SEO Benefits:**
Search engine crawlers can see your content immediately without executing JavaScript. While Google has improved its JavaScript rendering capabilities, other search engines may not be as capable, and even Google may not wait for all your content to render.

**Performance Benefits:**
- Faster Time to First Contentful Paint (FCP)
- Improved Largest Contentful Paint (LCP)
- Better Core Web Vitals scores
- Reduced Time to Interactive (TTI) on slow networks

**User Experience Benefits:**
- Users see content faster
- Better experience on slow devices
- Works better on unreliable networks
- No flash of unstyled content or loading spinners

## Project Setup

Let us start by setting up a new project with all the necessary dependencies.

### Directory Structure

```
react-ssr-express/
├── src/
│   ├── client/
│   │   ├── index.tsx
│   │   └── App.tsx
│   ├── server/
│   │   ├── index.ts
│   │   ├── render.tsx
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── shared/
│   │   ├── components/
│   │   ├── routes/
│   │   └── types/
│   └── index.html
├── webpack/
│   ├── webpack.client.ts
│   └── webpack.server.ts
├── package.json
├── tsconfig.json
└── tsconfig.server.json
```

### Installing Dependencies

```bash
# Initialize project
npm init -y

# Core dependencies
npm install react react-dom express

# TypeScript and types
npm install -D typescript @types/react @types/react-dom @types/express @types/node

# Build tools
npm install -D webpack webpack-cli webpack-node-externals ts-loader css-loader style-loader

# Additional utilities
npm install -D nodemon concurrently cross-env
```

### TypeScript Configuration

Create `tsconfig.json` for shared and client code:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@shared/*": ["shared/*"],
      "@client/*": ["client/*"],
      "@server/*": ["server/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `tsconfig.server.json` for server-specific compilation:

```typescript
// tsconfig.server.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "outDir": "./dist/server"
  },
  "include": ["src/server/**/*", "src/shared/**/*"]
}
```

## Configuring Webpack for SSR

SSR requires two separate Webpack configurations: one for the client bundle and one for the server bundle.

### Client Webpack Configuration

```typescript
// webpack/webpack.client.ts
import path from 'path';
import webpack from 'webpack';

const clientConfig: webpack.Configuration = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'web',
  entry: {
    client: path.resolve(__dirname, '../src/client/index.tsx'),
  },
  output: {
    path: path.resolve(__dirname, '../dist/public'),
    filename: '[name].[contenthash].js',
    publicPath: '/static/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@client': path.resolve(__dirname, '../src/client'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __CLIENT__: true,
      __SERVER__: false,
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
};

export default clientConfig;
```

### Server Webpack Configuration

```typescript
// webpack/webpack.server.ts
import path from 'path';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

const serverConfig: webpack.Configuration = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'node',
  entry: {
    server: path.resolve(__dirname, '../src/server/index.ts'),
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@server': path.resolve(__dirname, '../src/server'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: 'null-loader', // Ignore CSS on server
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __CLIENT__: false,
      __SERVER__: true,
    }),
  ],
  externals: [nodeExternals()],
  devtool: 'source-map',
};

export default serverConfig;
```

## Creating the Express Server

Now let us create the Express server that will handle SSR.

### Main Server Entry Point

```typescript
// src/server/index.ts
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { renderApp } from './render';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true,
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes (before SSR catch-all)
app.use('/api', (req: Request, res: Response) => {
  // Your API routes here
  res.json({ message: 'API endpoint' });
});

// SSR handler for all other routes
app.get('*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await renderApp(req);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
```

### The Render Function

This is where the magic happens. We will create a render function that converts our React components to HTML.

```typescript
// src/server/render.tsx
import React from 'react';
import { renderToString, renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import App from '../client/App';
import { DataProvider } from '../shared/context/DataContext';

// Read the client manifest to get the correct bundle filenames
const getClientAssets = (): { js: string[]; css: string[] } => {
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return {
      js: Object.values(manifest).filter((f: string) => f.endsWith('.js')),
      css: Object.values(manifest).filter((f: string) => f.endsWith('.css')),
    };
  }

  // Fallback for development
  return {
    js: ['/static/client.js', '/static/vendors.js'],
    css: [],
  };
};

interface RenderOptions {
  initialData?: Record<string, unknown>;
}

export const renderApp = async (
  req: Request,
  options: RenderOptions = {}
): Promise<string> => {
  const { initialData = {} } = options;
  const assets = getClientAssets();

  // Fetch any necessary data for the current route
  const routeData = await fetchRouteData(req.path);
  const combinedData = { ...initialData, ...routeData };

  // Render the app to string
  const appHtml = renderToString(
    <DataProvider initialData={combinedData}>
      <StaticRouter location={req.url}>
        <App />
      </StaticRouter>
    </DataProvider>
  );

  // Generate the full HTML document
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="React SSR Application">
        <title>React SSR with Express</title>
        ${assets.css.map(href => `<link rel="stylesheet" href="${href}">`).join('\n')}
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(combinedData).replace(/</g, '\\u003c')};
        </script>
      </head>
      <body>
        <div id="root">${appHtml}</div>
        ${assets.js.map(src => `<script src="${src}" defer></script>`).join('\n')}
      </body>
    </html>
  `;

  return html;
};

// Fetch data based on the current route
async function fetchRouteData(pathname: string): Promise<Record<string, unknown>> {
  // Implement your data fetching logic here
  // This could involve calling APIs, databases, etc.

  const routeDataFetchers: Record<string, () => Promise<unknown>> = {
    '/': async () => ({ title: 'Home Page', items: [] }),
    '/about': async () => ({ title: 'About Us' }),
    '/products': async () => {
      // Example: Fetch products from an API
      // const response = await fetch('https://api.example.com/products');
      // return response.json();
      return { products: [] };
    },
  };

  const fetcher = routeDataFetchers[pathname];
  if (fetcher) {
    return { pageData: await fetcher() };
  }

  return {};
}
```

## renderToString vs renderToPipeableStream

React provides two main APIs for server-side rendering. Let us explore both.

### Using renderToString

`renderToString` is the simpler, synchronous approach:

```typescript
// src/server/render-string.tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from '../client/App';

export function renderWithString(url: string, data: unknown): string {
  const html = renderToString(
    <StaticRouter location={url}>
      <App initialData={data} />
    </StaticRouter>
  );

  return html;
}
```

**Pros:**
- Simple to implement
- Synchronous, easy to reason about
- Works well for smaller applications

**Cons:**
- Blocks the server until rendering is complete
- No streaming support
- Suspense boundaries are not supported

### Using renderToPipeableStream

`renderToPipeableStream` is the modern, streaming approach introduced in React 18:

```typescript
// src/server/render-stream.tsx
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Request, Response } from 'express';
import App from '../client/App';
import { DataProvider } from '../shared/context/DataContext';

interface StreamRenderOptions {
  onShellReady?: () => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
}

export function renderWithStream(
  req: Request,
  res: Response,
  initialData: Record<string, unknown>,
  options: StreamRenderOptions = {}
): void {
  const { onShellReady, onAllReady, onError } = options;

  let didError = false;

  const { pipe, abort } = renderToPipeableStream(
    <DataProvider initialData={initialData}>
      <StaticRouter location={req.url}>
        <App />
      </StaticRouter>
    </DataProvider>,
    {
      bootstrapScripts: ['/static/client.js'],
      onShellReady() {
        // The shell is ready, start streaming
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-Type', 'text/html');

        // Write the HTML document start
        res.write('<!DOCTYPE html><html lang="en"><head>');
        res.write('<meta charset="UTF-8">');
        res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        res.write('<title>React SSR with Express</title>');
        res.write(`<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData).replace(/</g, '\\u003c')};</script>`);
        res.write('</head><body><div id="root">');

        // Pipe the React content
        pipe(res);

        onShellReady?.();
      },
      onShellError(error: Error) {
        console.error('Shell error:', error);
        res.statusCode = 500;
        res.send('<!DOCTYPE html><html><body><h1>Server Error</h1></body></html>');
      },
      onAllReady() {
        // All Suspense boundaries have resolved
        onAllReady?.();
      },
      onError(error: Error) {
        didError = true;
        console.error('Render error:', error);
        onError?.(error);
      },
    }
  );

  // Set a timeout to abort the render if it takes too long
  setTimeout(() => {
    abort();
  }, 10000);
}

// Express route handler using streaming
export function streamingHandler(req: Request, res: Response): void {
  const initialData = {}; // Fetch your data here

  renderWithStream(req, res, initialData, {
    onShellReady: () => console.log('Shell ready for:', req.url),
    onAllReady: () => console.log('All ready for:', req.url),
    onError: (error) => console.error('Error rendering:', req.url, error),
  });
}
```

**Pros of Streaming:**
- Non-blocking render
- Progressive HTML delivery
- Supports Suspense boundaries
- Better Time to First Byte (TTFB)
- Allows content to be shown as it becomes ready

**Cons:**
- More complex to implement
- Requires careful error handling
- Headers must be sent before content

## Client-Side Hydration

Hydration is the process of attaching event listeners and making the server-rendered HTML interactive.

### Client Entry Point

```typescript
// src/client/index.tsx
import React, { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from '../shared/context/DataContext';

// Get initial data from the server
const initialData = (window as unknown as { __INITIAL_DATA__: Record<string, unknown> }).__INITIAL_DATA__ || {};

const container = document.getElementById('root');

if (container) {
  if (container.innerHTML.trim()) {
    // Server-rendered content exists, hydrate it
    hydrateRoot(
      container,
      <StrictMode>
        <DataProvider initialData={initialData}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DataProvider>
      </StrictMode>
    );
    console.log('Hydrated server-rendered content');
  } else {
    // No server content, do a full client render
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <DataProvider initialData={initialData}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DataProvider>
      </StrictMode>
    );
    console.log('Client-rendered content');
  }
}
```

### Handling Hydration Mismatches

Hydration mismatches occur when the server-rendered HTML differs from what React expects on the client. Here is how to handle them:

```typescript
// src/shared/components/ClientOnly.tsx
import React, { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ClientOnly: React.FC<ClientOnlyProps> = ({
  children,
  fallback = null
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Usage example
export const DateDisplay: React.FC = () => {
  return (
    <ClientOnly fallback={<span>Loading...</span>}>
      <span>{new Date().toLocaleString()}</span>
    </ClientOnly>
  );
};
```

```typescript
// src/shared/hooks/useIsomorphicEffect.ts
import { useEffect, useLayoutEffect } from 'react';

// Use useLayoutEffect on client, useEffect on server
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
```

## Data Fetching Strategies

Effective data fetching is crucial for SSR performance. Here are several strategies.

### Route-Based Data Fetching

```typescript
// src/shared/routes/routes.ts
import { ComponentType } from 'react';

interface RouteConfig {
  path: string;
  component: ComponentType;
  fetchData?: (params: Record<string, string>) => Promise<unknown>;
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('../components/Home').then(m => m.default),
    fetchData: async () => {
      const response = await fetch('https://api.example.com/home');
      return response.json();
    },
  },
  {
    path: '/products/:id',
    component: () => import('../components/ProductDetail').then(m => m.default),
    fetchData: async (params) => {
      const response = await fetch(`https://api.example.com/products/${params.id}`);
      return response.json();
    },
  },
];

// Server-side data fetching utility
export async function fetchDataForRoute(
  pathname: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const route = routes.find(r => matchPath(pathname, r.path));

  if (route?.fetchData) {
    try {
      const data = await route.fetchData(params);
      return { routeData: data, error: null };
    } catch (error) {
      return { routeData: null, error: (error as Error).message };
    }
  }

  return { routeData: null, error: null };
}

function matchPath(pathname: string, pattern: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      return true; // Parameter match
    }
    return part === pathParts[index];
  });
}
```

### Data Context for State Management

```typescript
// src/shared/context/DataContext.tsx
import React, { createContext, useContext, ReactNode, useState } from 'react';

interface DataContextValue {
  data: Record<string, unknown>;
  setData: (key: string, value: unknown) => void;
  getData: <T>(key: string) => T | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

interface DataProviderProps {
  children: ReactNode;
  initialData?: Record<string, unknown>;
}

export const DataProvider: React.FC<DataProviderProps> = ({
  children,
  initialData = {}
}) => {
  const [data, setDataState] = useState<Record<string, unknown>>(initialData);

  const setData = (key: string, value: unknown) => {
    setDataState(prev => ({ ...prev, [key]: value }));
  };

  const getData = <T,>(key: string): T | undefined => {
    return data[key] as T | undefined;
  };

  return (
    <DataContext.Provider value={{ data, setData, getData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextValue => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Custom hook for route data
export function useRouteData<T>(): T | undefined {
  const { getData } = useData();
  return getData<T>('routeData');
}
```

### Async Data Fetching with Suspense

```typescript
// src/shared/utils/createResource.ts
type Status = 'pending' | 'success' | 'error';

interface Resource<T> {
  read(): T;
}

export function createResource<T>(promise: Promise<T>): Resource<T> {
  let status: Status = 'pending';
  let result: T;
  let error: Error;

  const suspender = promise.then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      error = err;
    }
  );

  return {
    read() {
      switch (status) {
        case 'pending':
          throw suspender;
        case 'error':
          throw error;
        case 'success':
          return result;
      }
    },
  };
}

// Usage in a component
// src/shared/components/ProductList.tsx
import React, { Suspense } from 'react';
import { createResource } from '../utils/createResource';

interface Product {
  id: string;
  name: string;
  price: number;
}

const productsResource = createResource<Product[]>(
  fetch('/api/products').then(res => res.json())
);

const ProductListContent: React.FC = () => {
  const products = productsResource.read();

  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>
          {product.name} - ${product.price}
        </li>
      ))}
    </ul>
  );
};

export const ProductList: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading products...</div>}>
      <ProductListContent />
    </Suspense>
  );
};
```

## Handling Routing with React Router

React Router requires different components for server and client rendering.

### Shared Routes Configuration

```typescript
// src/shared/routes/AppRoutes.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load components for code splitting
const Home = lazy(() => import('../components/Home'));
const About = lazy(() => import('../components/About'));
const Products = lazy(() => import('../components/Products'));
const ProductDetail = lazy(() => import('../components/ProductDetail'));
const NotFound = lazy(() => import('../components/NotFound'));

const LoadingFallback: React.FC = () => (
  <div className="loading-container">
    <div className="loading-spinner">Loading...</div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};
```

### Main App Component

```typescript
// src/client/App.tsx
import React from 'react';
import { AppRoutes } from '../shared/routes/AppRoutes';
import { Header } from '../shared/components/Header';
import { Footer } from '../shared/components/Footer';

const App: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
};

export default App;
```

## State Serialization and Rehydration

Properly serializing and rehydrating state is critical for SSR.

### Safe JSON Serialization

```typescript
// src/shared/utils/serialization.ts
export function safeSerialize(data: unknown): string {
  return JSON.stringify(data)
    // Prevent XSS attacks by escaping script tags
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    // Prevent breaking out of the script context
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function safeDeserialize<T>(serialized: string): T {
  try {
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error('Failed to deserialize data:', error);
    return {} as T;
  }
}

// HTML template with safe serialization
export function createHtmlTemplate(
  appHtml: string,
  initialData: Record<string, unknown>,
  assets: { js: string[]; css: string[] }
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>React SSR App</title>
        ${assets.css.map(href => `<link rel="stylesheet" href="${href}">`).join('\n')}
      </head>
      <body>
        <div id="root">${appHtml}</div>
        <script id="__INITIAL_DATA__" type="application/json">
          ${safeSerialize(initialData)}
        </script>
        ${assets.js.map(src => `<script src="${src}" defer></script>`).join('\n')}
      </body>
    </html>
  `;
}
```

### Rehydrating State on the Client

```typescript
// src/client/hydrateState.ts
import { safeDeserialize } from '../shared/utils/serialization';

export function getInitialState<T>(): T {
  if (typeof window === 'undefined') {
    return {} as T;
  }

  const dataElement = document.getElementById('__INITIAL_DATA__');

  if (dataElement?.textContent) {
    return safeDeserialize<T>(dataElement.textContent);
  }

  // Fallback to window variable
  const windowData = (window as unknown as { __INITIAL_DATA__?: T }).__INITIAL_DATA__;
  return windowData || ({} as T);
}
```

## Error Handling in SSR

Robust error handling is essential for a production-ready SSR application.

### Error Boundary Component

```typescript
// src/shared/components/ErrorBoundary.tsx
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
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>We apologize for the inconvenience. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre>{this.state.error?.stack}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Server-Side Error Handling Middleware

```typescript
// src/server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Send error response
  res.status(statusCode);

  // Check if request expects JSON
  if (req.accepts('json')) {
    res.json({
      error: {
        message,
        status: statusCode,
      },
    });
    return;
  }

  // Send HTML error page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Error ${statusCode}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .error-container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #e53935; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Error ${statusCode}</h1>
          <p>${message}</p>
        </div>
      </body>
    </html>
  `);
}
```

### Graceful Degradation

```typescript
// src/server/render-with-fallback.tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Request } from 'express';

export async function renderWithFallback(req: Request): Promise<string> {
  try {
    // Attempt full SSR
    const html = await renderFullApp(req);
    return html;
  } catch (error) {
    console.error('SSR failed, falling back to shell:', error);

    // Return a minimal shell for client-side rendering
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Loading...</title>
        </head>
        <body>
          <div id="root">
            <div class="loading-shell">
              <p>Loading application...</p>
            </div>
          </div>
          <script src="/static/client.js" defer></script>
        </body>
      </html>
    `;
  }
}

async function renderFullApp(req: Request): Promise<string> {
  // Your full SSR implementation
  return '';
}
```

## Performance Optimization Tips

Optimizing SSR performance is crucial for production applications.

### Caching Strategies

```typescript
// src/server/cache/renderCache.ts
import { LRUCache } from 'lru-cache';

interface CacheEntry {
  html: string;
  timestamp: number;
  headers: Record<string, string>;
}

const cache = new LRUCache<string, CacheEntry>({
  max: 100, // Maximum 100 entries
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

export function getCachedRender(key: string): CacheEntry | undefined {
  return cache.get(key);
}

export function setCachedRender(
  key: string,
  html: string,
  headers: Record<string, string> = {}
): void {
  cache.set(key, {
    html,
    timestamp: Date.now(),
    headers,
  });
}

export function invalidateCache(pattern?: string): void {
  if (pattern) {
    // Invalidate entries matching pattern
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    cache.clear();
  }
}

// Middleware for caching SSR responses
import { Request, Response, NextFunction } from 'express';

export function ssrCacheMiddleware(
  ttl: number = 300000 // 5 minutes default
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching for authenticated users or POST requests
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    const cacheKey = req.url;
    const cached = getCachedRender(cacheKey);

    if (cached) {
      // Serve from cache
      res.setHeader('X-Cache', 'HIT');
      Object.entries(cached.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.send(cached.html);
      return;
    }

    // Capture the response
    const originalSend = res.send.bind(res);
    res.send = function(html: string): Response {
      setCachedRender(cacheKey, html, {
        'Content-Type': 'text/html',
      });
      res.setHeader('X-Cache', 'MISS');
      return originalSend(html);
    };

    next();
  };
}
```

### Component-Level Caching

```typescript
// src/server/cache/componentCache.ts
import React, { ComponentType, ReactElement } from 'react';
import { renderToString } from 'react-dom/server';

const componentCache = new Map<string, string>();

export function withServerCache<P extends object>(
  Component: ComponentType<P>,
  getCacheKey: (props: P) => string,
  ttl: number = 60000
): ComponentType<P> {
  return function CachedComponent(props: P): ReactElement {
    if (typeof window !== 'undefined') {
      // Client-side, render normally
      return <Component {...props} />;
    }

    const cacheKey = getCacheKey(props);
    const cached = componentCache.get(cacheKey);

    if (cached) {
      // Return cached HTML as dangerouslySetInnerHTML
      return <div dangerouslySetInnerHTML={{ __html: cached }} />;
    }

    // Render and cache
    const html = renderToString(<Component {...props} />);
    componentCache.set(cacheKey, html);

    // Set up TTL
    setTimeout(() => {
      componentCache.delete(cacheKey);
    }, ttl);

    return <Component {...props} />;
  };
}
```

### Code Splitting for SSR

```typescript
// src/shared/utils/loadable.tsx
import React, { ComponentType, Suspense, lazy } from 'react';

interface LoadableOptions<P> {
  loader: () => Promise<{ default: ComponentType<P> }>;
  loading?: ComponentType;
  ssr?: boolean;
}

export function loadable<P extends object>(
  options: LoadableOptions<P>
): ComponentType<P> {
  const { loader, loading: LoadingComponent, ssr = true } = options;

  const LazyComponent = lazy(loader);

  return function LoadableComponent(props: P) {
    // Check if we're on the server
    const isServer = typeof window === 'undefined';

    if (isServer && !ssr) {
      // Don't render on server if SSR is disabled
      return LoadingComponent ? <LoadingComponent /> : null;
    }

    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : <div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Usage
const ProductDetail = loadable({
  loader: () => import('../components/ProductDetail'),
  loading: () => <div className="skeleton">Loading product...</div>,
  ssr: true,
});
```

## Common Pitfalls and Solutions

### Pitfall 1: Window/Document Not Defined

```typescript
// Problem: Accessing window or document on the server
// Solution: Use isomorphic checks

// src/shared/utils/isomorphic.ts
export const isServer = typeof window === 'undefined';
export const isClient = !isServer;

export function safeWindow(): Window | undefined {
  if (isClient) {
    return window;
  }
  return undefined;
}

export function safeDocument(): Document | undefined {
  if (isClient) {
    return document;
  }
  return undefined;
}

// Usage in components
import { isClient } from '../utils/isomorphic';

const MyComponent: React.FC = () => {
  useEffect(() => {
    if (isClient) {
      // Safe to use window/document here
      window.scrollTo(0, 0);
    }
  }, []);

  return <div>Content</div>;
};
```

### Pitfall 2: Memory Leaks from Globals

```typescript
// Problem: Using module-level variables that persist between requests
// Solution: Use request-scoped state

// Bad - shared between all requests
let requestCount = 0; // Don't do this!

// Good - request-scoped via Express locals
import { Request, Response, NextFunction } from 'express';

export function requestScopeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.locals.requestState = {
    startTime: Date.now(),
    requestId: generateRequestId(),
  };
  next();
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

### Pitfall 3: CSS-in-JS SSR Issues

```typescript
// src/server/styles.tsx
import React, { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export function renderWithStyles(app: ReactElement): {
  html: string;
  styles: string;
} {
  const sheet = new ServerStyleSheet();

  try {
    const html = renderToString(
      <StyleSheetManager sheet={sheet.instance}>
        {app}
      </StyleSheetManager>
    );

    const styles = sheet.getStyleTags();

    return { html, styles };
  } finally {
    sheet.seal();
  }
}

// Usage in render function
export function renderPage(req: Request): string {
  const app = (
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>
  );

  const { html, styles } = renderWithStyles(app);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        ${styles}
      </head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `;
}
```

### Pitfall 4: Async Data and Race Conditions

```typescript
// src/server/dataFetcher.ts
import { Request } from 'express';

interface FetchResult<T> {
  data: T | null;
  error: string | null;
  timing: number;
}

export async function fetchWithTimeout<T>(
  fetcher: () => Promise<T>,
  timeout: number = 5000
): Promise<FetchResult<T>> {
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      }),
    ]);

    return {
      data: result,
      error: null,
      timing: Date.now() - startTime,
    };
  } catch (error) {
    return {
      data: null,
      error: (error as Error).message,
      timing: Date.now() - startTime,
    };
  }
}

// Parallel data fetching with individual timeouts
export async function fetchAllData(
  req: Request
): Promise<Record<string, unknown>> {
  const results = await Promise.allSettled([
    fetchWithTimeout(() => fetchUserData(req), 3000),
    fetchWithTimeout(() => fetchProductData(req), 3000),
    fetchWithTimeout(() => fetchConfigData(req), 2000),
  ]);

  return {
    user: results[0].status === 'fulfilled' ? results[0].value.data : null,
    products: results[1].status === 'fulfilled' ? results[1].value.data : null,
    config: results[2].status === 'fulfilled' ? results[2].value.data : null,
  };
}

async function fetchUserData(req: Request): Promise<unknown> {
  // Implementation
  return {};
}

async function fetchProductData(req: Request): Promise<unknown> {
  // Implementation
  return {};
}

async function fetchConfigData(req: Request): Promise<unknown> {
  // Implementation
  return {};
}
```

## Production Deployment Considerations

### Environment Configuration

```typescript
// src/server/config.ts
interface Config {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  apiBaseUrl: string;
  cacheEnabled: boolean;
  cacheTtl: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10),
};
```

### Health Checks and Monitoring

```typescript
// src/server/health.ts
import { Request, Response, Router } from 'express';

const healthRouter = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
}

healthRouter.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  res.json(status);
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  // Check if all dependencies are ready
  const isReady = checkDependencies();

  if (isReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

function checkDependencies(): boolean {
  // Check database connection, cache, etc.
  return true;
}

export { healthRouter };
```

## Conclusion

Server-Side Rendering with React and Express provides significant benefits for SEO, performance, and user experience. While it adds complexity to your application architecture, the advantages often outweigh the costs, especially for content-heavy applications or those requiring excellent search engine visibility.

Key takeaways from this guide:

1. **Choose the right rendering API**: Use `renderToString` for simpler applications and `renderToPipeableStream` for better performance with streaming and Suspense support.

2. **Handle hydration carefully**: Ensure your server and client render identical content to avoid hydration mismatches.

3. **Implement robust error handling**: Always have fallback strategies for when SSR fails.

4. **Optimize performance**: Use caching, code splitting, and efficient data fetching to minimize server response times.

5. **Avoid common pitfalls**: Be mindful of server-side limitations like no access to browser APIs and memory management across requests.

6. **Test thoroughly**: SSR introduces unique testing challenges. Test both server and client rendering paths.

With these fundamentals in place, you are well-equipped to build production-ready SSR applications with React and Express. The investment in SSR infrastructure pays dividends in improved user experience and search engine rankings.

## Additional Resources

- [React Documentation on Server Rendering](https://react.dev/reference/react-dom/server)
- [React Router Server Rendering](https://reactrouter.com/en/main/guides/ssr)
- [Express.js Documentation](https://expressjs.com/)
- [Web Vitals](https://web.dev/vitals/)

Happy coding!
