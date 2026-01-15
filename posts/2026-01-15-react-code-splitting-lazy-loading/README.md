# How to Implement Code Splitting and Lazy Loading in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Performance, Code Splitting, Lazy Loading, Optimization, Frontend

Description: Learn how to dramatically improve your React application's performance by implementing code splitting and lazy loading techniques using React.lazy, Suspense, and route-based splitting strategies.

---

Modern web applications are growing increasingly complex, with bundle sizes that can significantly impact initial load times and user experience. Code splitting and lazy loading are essential optimization techniques that allow you to break your application into smaller chunks and load them on demand, rather than forcing users to download the entire application upfront.

In this comprehensive guide, we will explore how to implement code splitting and lazy loading in React applications. We will cover everything from basic concepts to advanced patterns, complete with practical examples you can use in your projects.

## Table of Contents

1. [Understanding Code Splitting and Lazy Loading](#understanding-code-splitting-and-lazy-loading)
2. [Why Code Splitting Matters](#why-code-splitting-matters)
3. [React.lazy and Suspense Basics](#reactlazy-and-suspense-basics)
4. [Route-Based Code Splitting](#route-based-code-splitting)
5. [Component-Level Code Splitting](#component-level-code-splitting)
6. [Error Boundaries for Lazy Components](#error-boundaries-for-lazy-components)
7. [Preloading Components](#preloading-components)
8. [Named Exports with React.lazy](#named-exports-with-reactlazy)
9. [Server-Side Rendering Considerations](#server-side-rendering-considerations)
10. [Best Practices and Patterns](#best-practices-and-patterns)
11. [Performance Monitoring](#performance-monitoring)
12. [Summary](#summary)

---

## Understanding Code Splitting and Lazy Loading

### What is Code Splitting?

Code splitting is a technique that allows you to split your JavaScript bundle into multiple smaller chunks. Instead of shipping a single large bundle containing all your application code, you create multiple bundles that can be loaded on demand.

When you build a React application using tools like Webpack, Vite, or Parcel, all your JavaScript code typically gets bundled into one or a few large files. As your application grows, these bundles can become quite large, leading to slower initial page loads.

### What is Lazy Loading?

Lazy loading is the practice of deferring the loading of resources until they are actually needed. In the context of React applications, this means loading components only when they are about to be rendered, rather than including them in the initial bundle.

The combination of code splitting and lazy loading allows you to:

- Reduce initial bundle size
- Improve Time to First Byte (TTFB)
- Decrease Time to Interactive (TTI)
- Optimize bandwidth usage
- Provide better user experience

---

## Why Code Splitting Matters

Before diving into implementation details, let us understand why code splitting is crucial for modern web applications.

### The Problem with Large Bundles

Consider a typical React application structure:

```
src/
  components/
    Dashboard/
    Analytics/
    Settings/
    UserProfile/
    AdminPanel/
  pages/
    Home/
    About/
    Products/
    Contact/
  utils/
  services/
```

Without code splitting, all these components and their dependencies are bundled together. When a user visits your home page, they download code for the Dashboard, Analytics, AdminPanel, and every other component, even if they never navigate to those sections.

### Real-World Impact

Let us look at some numbers:

- A typical React application can easily reach 500KB to 2MB of JavaScript
- On a 3G connection, downloading 1MB takes approximately 3-4 seconds
- JavaScript must be parsed and executed, adding more delay
- Users on mobile devices experience even longer wait times

With code splitting:

- Initial bundle can be reduced to 50-100KB
- Additional chunks load only when needed
- Users see meaningful content faster
- Overall perceived performance improves significantly

---

## React.lazy and Suspense Basics

React provides built-in support for code splitting through `React.lazy` and `Suspense`. These APIs make it straightforward to implement lazy loading in your applications.

### Basic React.lazy Usage

The `React.lazy` function allows you to render a dynamic import as a regular component:

```jsx
import React, { lazy, Suspense } from 'react';

// Instead of:
// import HeavyComponent from './HeavyComponent';

// Use lazy loading:
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
}

export default App;
```

### Understanding the Syntax

Let us break down what is happening:

1. `lazy()` takes a function that returns a dynamic import
2. The dynamic import `import('./HeavyComponent')` returns a Promise
3. React waits for the Promise to resolve before rendering the component
4. `Suspense` provides a fallback UI while the component loads

### The Suspense Component

`Suspense` is essential when using `React.lazy`. It defines what to show while waiting for the lazy component to load:

```jsx
import React, { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LazyComponent />
    </Suspense>
  );
}

// Custom loading spinner component
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading content...</p>
    </div>
  );
}
```

### Multiple Lazy Components

You can wrap multiple lazy components with a single `Suspense` boundary:

```jsx
import React, { lazy, Suspense } from 'react';

const Header = lazy(() => import('./Header'));
const Sidebar = lazy(() => import('./Sidebar'));
const MainContent = lazy(() => import('./MainContent'));
const Footer = lazy(() => import('./Footer'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <div className="layout">
        <Sidebar />
        <MainContent />
      </div>
      <Footer />
    </Suspense>
  );
}
```

### Nested Suspense Boundaries

For more granular control over loading states, you can nest `Suspense` components:

```jsx
import React, { lazy, Suspense } from 'react';

const Header = lazy(() => import('./Header'));
const Dashboard = lazy(() => import('./Dashboard'));
const Analytics = lazy(() => import('./Analytics'));

function App() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main>
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>

        <Suspense fallback={<AnalyticsSkeleton />}>
          <Analytics />
        </Suspense>
      </main>
    </div>
  );
}
```

This approach allows different parts of your UI to load independently, providing a more responsive experience.

---

## Route-Based Code Splitting

Route-based code splitting is one of the most effective ways to implement lazy loading. Since users navigate between routes, it makes sense to load only the code for the current route.

### Basic Route Splitting with React Router

Here is how to implement route-based code splitting with React Router:

```jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load route components
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-content">
        <div className="spinner"></div>
        <p>Loading page...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

### Advanced Route Configuration

For larger applications, you might want to organize your routes more systematically:

```jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Route configuration with lazy components
const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/Home')),
    exact: true,
  },
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard')),
    children: [
      {
        path: 'overview',
        component: lazy(() => import('./pages/Dashboard/Overview')),
      },
      {
        path: 'analytics',
        component: lazy(() => import('./pages/Dashboard/Analytics')),
      },
      {
        path: 'reports',
        component: lazy(() => import('./pages/Dashboard/Reports')),
      },
    ],
  },
  {
    path: '/admin',
    component: lazy(() => import('./pages/Admin')),
    children: [
      {
        path: 'users',
        component: lazy(() => import('./pages/Admin/Users')),
      },
      {
        path: 'settings',
        component: lazy(() => import('./pages/Admin/Settings')),
      },
    ],
  },
];

// Recursive route renderer
function renderRoutes(routes) {
  return routes.map((route, index) => {
    const Component = route.component;

    return (
      <Route
        key={index}
        path={route.path}
        element={
          <Suspense fallback={<PageLoader />}>
            <Component />
          </Suspense>
        }
      >
        {route.children && renderRoutes(route.children)}
      </Route>
    );
  });
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {renderRoutes(routes)}
      </Routes>
    </BrowserRouter>
  );
}
```

### Layout-Based Code Splitting

You can also split code based on layouts, keeping common elements like navigation always loaded:

```jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';

// Always loaded - part of main bundle
import Navigation from './components/Navigation';
import Footer from './components/Footer';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

// Main layout with navigation
function MainLayout() {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// Dashboard layout with sidebar
const DashboardSidebar = lazy(() => import('./components/DashboardSidebar'));

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Suspense fallback={<SidebarLoader />}>
        <DashboardSidebar />
      </Suspense>
      <div className="dashboard-content">
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<ContentLoader />}>
                  {lazy(() => import('./pages/Analytics'))}
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Component-Level Code Splitting

Beyond route-based splitting, you can apply lazy loading at the component level for features that are not immediately visible or needed.

### Conditional Component Loading

Load components only when certain conditions are met:

```jsx
import React, { lazy, Suspense, useState } from 'react';

// Heavy components loaded on demand
const DataVisualization = lazy(() => import('./DataVisualization'));
const ExportModal = lazy(() => import('./ExportModal'));
const AdvancedFilters = lazy(() => import('./AdvancedFilters'));

function Dashboard() {
  const [showVisualization, setShowVisualization] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="actions">
          <button onClick={() => setShowFilters(true)}>
            Advanced Filters
          </button>
          <button onClick={() => setShowVisualization(true)}>
            Show Charts
          </button>
          <button onClick={() => setShowExportModal(true)}>
            Export Data
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Basic dashboard content always loaded */}
        <DashboardSummary />
        <RecentActivity />

        {/* Lazy loaded visualization */}
        {showVisualization && (
          <Suspense fallback={<ChartSkeleton />}>
            <DataVisualization />
          </Suspense>
        )}
      </main>

      {/* Lazy loaded modals */}
      {showFilters && (
        <Suspense fallback={<ModalLoader />}>
          <AdvancedFilters onClose={() => setShowFilters(false)} />
        </Suspense>
      )}

      {showExportModal && (
        <Suspense fallback={<ModalLoader />}>
          <ExportModal onClose={() => setShowExportModal(false)} />
        </Suspense>
      )}
    </div>
  );
}
```

### Tab-Based Loading

Load tab content only when the tab is selected:

```jsx
import React, { lazy, Suspense, useState } from 'react';

const tabs = {
  overview: lazy(() => import('./tabs/Overview')),
  analytics: lazy(() => import('./tabs/Analytics')),
  reports: lazy(() => import('./tabs/Reports')),
  settings: lazy(() => import('./tabs/Settings')),
};

function TabContainer() {
  const [activeTab, setActiveTab] = useState('overview');

  const TabContent = tabs[activeTab];

  return (
    <div className="tab-container">
      <nav className="tab-navigation">
        {Object.keys(tabs).map((tabKey) => (
          <button
            key={tabKey}
            className={`tab-button ${activeTab === tabKey ? 'active' : ''}`}
            onClick={() => setActiveTab(tabKey)}
          >
            {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        <Suspense fallback={<TabLoader />}>
          <TabContent />
        </Suspense>
      </div>
    </div>
  );
}
```

### Intersection Observer for Viewport-Based Loading

Load components when they enter the viewport:

```jsx
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

// Custom hook for intersection observer
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect(); // Stop observing once in view
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return [ref, isInView];
}

// Lazy loaded heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const DataTable = lazy(() => import('./DataTable'));
const CommentSection = lazy(() => import('./CommentSection'));

function Article() {
  const [chartRef, chartInView] = useInView({ threshold: 0.1 });
  const [tableRef, tableInView] = useInView({ threshold: 0.1 });
  const [commentsRef, commentsInView] = useInView({ threshold: 0.1 });

  return (
    <article className="article">
      <header>
        <h1>Performance Analysis Report</h1>
      </header>

      <section className="introduction">
        <p>Introduction content that loads immediately...</p>
      </section>

      {/* Chart loads when scrolled into view */}
      <section ref={chartRef} className="chart-section">
        {chartInView ? (
          <Suspense fallback={<ChartPlaceholder />}>
            <HeavyChart />
          </Suspense>
        ) : (
          <ChartPlaceholder />
        )}
      </section>

      <section className="analysis">
        <p>More content...</p>
      </section>

      {/* Table loads when scrolled into view */}
      <section ref={tableRef} className="table-section">
        {tableInView ? (
          <Suspense fallback={<TablePlaceholder />}>
            <DataTable />
          </Suspense>
        ) : (
          <TablePlaceholder />
        )}
      </section>

      {/* Comments load when scrolled into view */}
      <section ref={commentsRef} className="comments-section">
        {commentsInView ? (
          <Suspense fallback={<CommentsSkeleton />}>
            <CommentSection />
          </Suspense>
        ) : (
          <CommentsSkeleton />
        )}
      </section>
    </article>
  );
}
```

---

## Error Boundaries for Lazy Components

When lazy loading components, network errors or chunk loading failures can occur. Error boundaries help handle these gracefully.

### Creating an Error Boundary

```jsx
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Lazy loading error:', error, errorInfo);

    // You could send this to your error tracking service
    // errorTrackingService.log(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>Failed to load this section. Please try again.</p>
          <button onClick={this.handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Using Error Boundaries with Lazy Components

```jsx
import React, { lazy, Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

const Dashboard = lazy(() => import('./Dashboard'));
const Analytics = lazy(() => import('./Analytics'));

function App() {
  return (
    <div className="app">
      <ErrorBoundary>
        <Suspense fallback={<DashboardLoader />}>
          <Dashboard />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<AnalyticsLoader />}>
          <Analytics />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

### Advanced Error Boundary with Retry Logic

```jsx
import React, { Component } from 'react';

class LazyLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Check if it is a chunk loading error
    const isChunkError = error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch');

    if (isChunkError) {
      console.warn('Chunk loading failed, may retry...', error);
    }

    // Log to monitoring
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        retryCount: retryCount + 1,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { maxRetries = 3, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback({
          error,
          retry: this.handleRetry,
          reload: this.handleReload,
          canRetry: retryCount < maxRetries,
        });
      }

      return (
        <div className="lazy-error">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
          </div>
          <h3>Failed to load content</h3>
          <p>{error?.message || 'An unexpected error occurred'}</p>

          {retryCount < maxRetries ? (
            <button onClick={this.handleRetry} className="btn-retry">
              Try Again ({maxRetries - retryCount} attempts remaining)
            </button>
          ) : (
            <button onClick={this.handleReload} className="btn-reload">
              Reload Page
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
```

---

## Preloading Components

Preloading allows you to start loading a component before it is actually needed, improving perceived performance.

### Basic Preloading

```jsx
import React, { lazy, Suspense } from 'react';

// Define lazy components
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

// Preload function
function preloadComponent(importFn) {
  return importFn();
}

// Preload on hover
function Navigation() {
  const handleMouseEnter = (component) => {
    switch (component) {
      case 'dashboard':
        preloadComponent(() => import('./Dashboard'));
        break;
      case 'settings':
        preloadComponent(() => import('./Settings'));
        break;
      default:
        break;
    }
  };

  return (
    <nav>
      <a
        href="/dashboard"
        onMouseEnter={() => handleMouseEnter('dashboard')}
      >
        Dashboard
      </a>
      <a
        href="/settings"
        onMouseEnter={() => handleMouseEnter('settings')}
      >
        Settings
      </a>
    </nav>
  );
}
```

### Advanced Preloading with Custom Hook

```jsx
import { useCallback, useEffect, useRef } from 'react';

// Create a preloadable lazy component
function lazyWithPreload(importFn) {
  const Component = React.lazy(importFn);
  Component.preload = importFn;
  return Component;
}

// Usage
const Dashboard = lazyWithPreload(() => import('./Dashboard'));
const Analytics = lazyWithPreload(() => import('./Analytics'));
const Reports = lazyWithPreload(() => import('./Reports'));

// Custom hook for preloading
function usePreload(components) {
  const preloadedRef = useRef(new Set());

  const preload = useCallback((componentName) => {
    const component = components[componentName];
    if (component?.preload && !preloadedRef.current.has(componentName)) {
      preloadedRef.current.add(componentName);
      component.preload();
    }
  }, [components]);

  const preloadAll = useCallback(() => {
    Object.keys(components).forEach(preload);
  }, [components, preload]);

  return { preload, preloadAll };
}

// Component using the hook
function Navigation() {
  const components = { Dashboard, Analytics, Reports };
  const { preload, preloadAll } = usePreload(components);

  // Preload all on idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadAll);
    } else {
      setTimeout(preloadAll, 2000);
    }
  }, [preloadAll]);

  return (
    <nav>
      <a
        href="/dashboard"
        onMouseEnter={() => preload('Dashboard')}
        onFocus={() => preload('Dashboard')}
      >
        Dashboard
      </a>
      <a
        href="/analytics"
        onMouseEnter={() => preload('Analytics')}
        onFocus={() => preload('Analytics')}
      >
        Analytics
      </a>
      <a
        href="/reports"
        onMouseEnter={() => preload('Reports')}
        onFocus={() => preload('Reports')}
      >
        Reports
      </a>
    </nav>
  );
}
```

### Prefetching with Webpack Magic Comments

Webpack provides special comments to control how chunks are loaded:

```jsx
import React, { lazy } from 'react';

// Prefetch - loads in browser idle time
const Dashboard = lazy(() =>
  import(/* webpackPrefetch: true */ './Dashboard')
);

// Preload - loads in parallel with parent chunk
const CriticalFeature = lazy(() =>
  import(/* webpackPreload: true */ './CriticalFeature')
);

// Named chunks for better debugging
const Analytics = lazy(() =>
  import(/* webpackChunkName: "analytics" */ './Analytics')
);

// Combining magic comments
const Reports = lazy(() =>
  import(
    /* webpackChunkName: "reports" */
    /* webpackPrefetch: true */
    './Reports'
  )
);
```

---

## Named Exports with React.lazy

By default, `React.lazy` only supports default exports. Here is how to work with named exports.

### Helper Function for Named Exports

```jsx
import React, { lazy } from 'react';

// Helper function to handle named exports
function lazyNamed(importFn, exportName) {
  return lazy(() =>
    importFn().then((module) => ({ default: module[exportName] }))
  );
}

// Usage with named exports
const UserProfile = lazyNamed(
  () => import('./components'),
  'UserProfile'
);

const UserSettings = lazyNamed(
  () => import('./components'),
  'UserSettings'
);

const UserActivity = lazyNamed(
  () => import('./components'),
  'UserActivity'
);

// Using the components
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile />
      <UserSettings />
      <UserActivity />
    </Suspense>
  );
}
```

### Generic Lazy Named Export Hook

```jsx
import React, { lazy, useMemo } from 'react';

// Factory function for creating lazy named exports
function createLazyNamedExport(moduleImport) {
  const cache = {};

  return function getLazyComponent(exportName) {
    if (!cache[exportName]) {
      cache[exportName] = lazy(() =>
        moduleImport().then((module) => ({
          default: module[exportName],
        }))
      );
    }
    return cache[exportName];
  };
}

// Usage
const getUIComponent = createLazyNamedExport(() => import('./ui-components'));

const Button = getUIComponent('Button');
const Modal = getUIComponent('Modal');
const Dropdown = getUIComponent('Dropdown');
const Tooltip = getUIComponent('Tooltip');

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Button>Click me</Button>
      <Modal title="Hello">Content</Modal>
      <Dropdown options={options} />
      <Tooltip content="Help text">Hover me</Tooltip>
    </Suspense>
  );
}
```

---

## Server-Side Rendering Considerations

When implementing code splitting with SSR, additional considerations are necessary.

### Using Loadable Components for SSR

For SSR applications, consider using `@loadable/component`:

```jsx
import loadable from '@loadable/component';

// Basic usage
const Dashboard = loadable(() => import('./Dashboard'), {
  fallback: <Loading />,
});

// With SSR support
const Analytics = loadable(() => import('./Analytics'), {
  fallback: <Loading />,
  ssr: true,
});

// Server-side setup (in your server entry)
import { ChunkExtractor } from '@loadable/server';

const statsFile = path.resolve('./build/loadable-stats.json');

function renderApp(req, res) {
  const extractor = new ChunkExtractor({ statsFile });
  const jsx = extractor.collectChunks(<App />);

  const html = renderToString(jsx);
  const scriptTags = extractor.getScriptTags();
  const linkTags = extractor.getLinkTags();
  const styleTags = extractor.getStyleTags();

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        ${linkTags}
        ${styleTags}
      </head>
      <body>
        <div id="root">${html}</div>
        ${scriptTags}
      </body>
    </html>
  `);
}
```

### React 18 Streaming SSR with Suspense

React 18 introduces streaming SSR which works naturally with Suspense:

```jsx
// server.js
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

function handleRequest(req, res) {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');
      pipe(res);
    },
    onShellError(error) {
      res.statusCode = 500;
      res.send('<!DOCTYPE html><html><body>Error</body></html>');
    },
    onError(error) {
      console.error(error);
    },
  });

  setTimeout(abort, 10000);
}
```

---

## Best Practices and Patterns

### 1. Strategic Splitting Points

Choose your splitting points wisely:

```jsx
// Good: Route-level splitting
const routes = [
  { path: '/', component: lazy(() => import('./Home')) },
  { path: '/dashboard', component: lazy(() => import('./Dashboard')) },
];

// Good: Feature-level splitting
const AdvancedEditor = lazy(() => import('./AdvancedEditor'));
const DataExport = lazy(() => import('./DataExport'));

// Avoid: Over-splitting small components
// Bad - too granular
const Button = lazy(() => import('./Button')); // Don't do this
const Icon = lazy(() => import('./Icon')); // Don't do this
```

### 2. Bundle Analysis

Regularly analyze your bundle to identify optimization opportunities:

```bash
# Using webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Add to webpack config
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

### 3. Loading State Design

Create meaningful loading states:

```jsx
// Generic skeleton component
function Skeleton({ width, height, variant = 'rectangular' }) {
  const styles = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: variant === 'circular' ? '50%' : '4px',
    backgroundColor: '#e0e0e0',
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return <div style={styles} className="skeleton" />;
}

// Page-specific skeleton
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="header-skeleton">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="120px" height="40px" />
      </div>
      <div className="cards-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-skeleton">
            <Skeleton height="100px" />
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="16px" />
          </div>
        ))}
      </div>
      <div className="chart-skeleton">
        <Skeleton height="300px" />
      </div>
    </div>
  );
}
```

### 4. Chunk Naming Strategy

Use consistent chunk naming for better debugging:

```jsx
// Organized chunk naming
const Dashboard = lazy(() =>
  import(/* webpackChunkName: "pages/dashboard" */ './pages/Dashboard')
);

const Analytics = lazy(() =>
  import(/* webpackChunkName: "pages/analytics" */ './pages/Analytics')
);

const ChartComponent = lazy(() =>
  import(/* webpackChunkName: "components/chart" */ './components/Chart')
);

const DataTable = lazy(() =>
  import(/* webpackChunkName: "components/data-table" */ './components/DataTable')
);
```

### 5. Performance Budgets

Set and enforce performance budgets:

```javascript
// webpack.config.js
module.exports = {
  performance: {
    maxAssetSize: 244000, // 244 KB
    maxEntrypointSize: 244000,
    hints: 'error',
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    },
  },
};
```

---

## Performance Monitoring

### Measuring Lazy Load Performance

```jsx
import React, { lazy, Suspense, useEffect, useState } from 'react';

// Performance-tracked lazy loading
function lazyWithMetrics(importFn, componentName) {
  return lazy(() => {
    const startTime = performance.now();

    return importFn().then((module) => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Log metrics
      console.log(`${componentName} loaded in ${loadTime.toFixed(2)}ms`);

      // Send to analytics
      if (window.analytics) {
        window.analytics.track('Component Loaded', {
          component: componentName,
          loadTime,
          timestamp: new Date().toISOString(),
        });
      }

      return module;
    });
  });
}

// Usage
const Dashboard = lazyWithMetrics(
  () => import('./Dashboard'),
  'Dashboard'
);
```

### Web Vitals Integration

```jsx
import { getLCP, getFID, getCLS, getFCP, getTTFB } from 'web-vitals';

function reportWebVitals(metric) {
  console.log(metric);

  // Send to analytics
  if (window.analytics) {
    window.analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
    });
  }
}

// Initialize monitoring
getCLS(reportWebVitals);
getFID(reportWebVitals);
getLCP(reportWebVitals);
getFCP(reportWebVitals);
getTTFB(reportWebVitals);
```

---

## Summary

Code splitting and lazy loading are essential techniques for building performant React applications. Here is a summary of the key concepts and when to use each approach:

### Summary Table

| Technique | Use Case | Implementation | Benefits |
|-----------|----------|----------------|----------|
| **React.lazy** | Basic component lazy loading | `const Comp = lazy(() => import('./Comp'))` | Simple, built-in React solution |
| **Suspense** | Loading state management | `<Suspense fallback={<Loading />}>` | Declarative loading states |
| **Route-based splitting** | Page-level code splitting | Lazy load route components | Reduces initial bundle significantly |
| **Component-level splitting** | Heavy features, modals, tabs | Lazy load on user interaction | Loads only when needed |
| **Preloading** | Anticipated user navigation | `import()` on hover/focus | Improves perceived performance |
| **Prefetching** | Low-priority future chunks | `/* webpackPrefetch: true */` | Loads during browser idle time |
| **Error Boundaries** | Graceful error handling | Class component with `getDerivedStateFromError` | Prevents app crashes |
| **Intersection Observer** | Below-fold content | Load when scrolled into view | Prioritizes visible content |
| **Named exports** | Modules with multiple exports | Helper function wrapping import | Flexibility in module structure |
| **SSR considerations** | Server-rendered apps | @loadable/component or React 18 streaming | Consistent server/client rendering |

### Key Takeaways

1. **Start with route-based splitting** - This provides the biggest impact with minimal effort.

2. **Use meaningful loading states** - Skeleton screens and progressive loading improve perceived performance.

3. **Implement error boundaries** - Network failures happen; handle them gracefully.

4. **Consider preloading** - Anticipate user actions and preload likely next pages.

5. **Monitor performance** - Use bundle analyzers and web vitals to track improvements.

6. **Avoid over-splitting** - Not every component needs to be lazy loaded. Focus on large features and routes.

7. **Test on slow networks** - Use browser dev tools to simulate slow connections and verify your loading states work well.

By implementing these techniques thoughtfully, you can significantly improve your React application's performance, providing users with a faster, more responsive experience while keeping your codebase maintainable and scalable.

---

## Additional Resources

- [React Documentation on Code Splitting](https://react.dev/reference/react/lazy)
- [Webpack Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [React Router Documentation](https://reactrouter.com/)

---

*This article was written for the OneUptime blog. OneUptime is a complete open-source observability platform that helps you monitor your applications, track performance, and respond to incidents faster.*
