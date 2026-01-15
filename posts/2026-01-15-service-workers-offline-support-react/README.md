# How to Implement Service Workers for Offline Support in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Service Worker, Offline, PWA, Caching, Frontend

Description: Learn how to implement service workers in React applications to enable offline support, improve performance, and create progressive web apps using Workbox and various caching strategies.

---

In today's mobile-first world, users expect applications to work seamlessly regardless of network conditions. Whether they're commuting through a tunnel, traveling by plane, or simply dealing with spotty Wi-Fi, your React application should remain functional. This is where service workers come in, they act as a proxy between your application and the network, enabling offline functionality, background sync, and intelligent caching strategies.

In this comprehensive guide, we'll explore how to implement service workers in React applications, covering everything from basic setup to advanced caching strategies using Workbox.

## Table of Contents

1. [Understanding Service Workers](#understanding-service-workers)
2. [Service Worker Lifecycle](#service-worker-lifecycle)
3. [Setting Up Your React Project](#setting-up-your-react-project)
4. [Basic Service Worker Implementation](#basic-service-worker-implementation)
5. [Introduction to Workbox](#introduction-to-workbox)
6. [Caching Strategies](#caching-strategies)
7. [Implementing Workbox in React](#implementing-workbox-in-react)
8. [Handling Dynamic Content](#handling-dynamic-content)
9. [Background Sync](#background-sync)
10. [Push Notifications](#push-notifications)
11. [Testing and Debugging](#testing-and-debugging)
12. [Best Practices](#best-practices)
13. [Summary](#summary)

## Understanding Service Workers

A service worker is a JavaScript file that runs separately from the main browser thread, intercepting network requests, caching resources, and enabling offline functionality. Unlike regular JavaScript, service workers:

- Run in the background, independent of the web page
- Cannot directly access the DOM
- Can intercept and modify network requests
- Can cache responses for offline use
- Support push notifications and background sync

### Key Characteristics

```javascript
// Service workers are event-driven
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

self.addEventListener('fetch', (event) => {
  console.log('Intercepting fetch request:', event.request.url);
});
```

### Browser Support

Service workers are supported in all modern browsers, including Chrome, Firefox, Safari, Edge, and Opera. For older browsers, your application will gracefully fall back to standard network behavior.

```javascript
// Check for service worker support
if ('serviceWorker' in navigator) {
  console.log('Service workers are supported');
} else {
  console.log('Service workers are not supported');
}
```

## Service Worker Lifecycle

Understanding the service worker lifecycle is crucial for implementing reliable offline support. The lifecycle consists of three main phases:

### 1. Registration

The registration phase occurs when your application first loads and registers the service worker.

```javascript
// Registering a service worker in your React app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
```

### 2. Installation

During installation, the service worker downloads and caches essential resources.

```javascript
const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});
```

### 3. Activation

The activation phase is where the service worker takes control and cleans up old caches.

```javascript
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Lifecycle Diagram

```
Registration -> Installation -> Waiting -> Activation -> Idle <-> Fetch/Message
                    |              |           |
                    v              v           v
                 Error         Redundant   Terminated
```

## Setting Up Your React Project

Let's set up a new React project with service worker support. If you're using Create React App (CRA), you already have a basic service worker setup.

### Creating a New Project

```bash
# Using Create React App with TypeScript
npx create-react-app my-offline-app --template typescript

# Navigate to the project
cd my-offline-app

# Install Workbox
npm install workbox-webpack-plugin workbox-window workbox-precaching workbox-routing workbox-strategies workbox-expiration
```

### Project Structure

```
my-offline-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── offline.html
├── src/
│   ├── components/
│   ├── service-worker/
│   │   ├── sw.ts
│   │   └── registerSW.ts
│   ├── App.tsx
│   └── index.tsx
├── config-overrides.js
└── package.json
```

### Configuring the Web App Manifest

The web app manifest is essential for PWA functionality.

```json
{
  "short_name": "OfflineApp",
  "name": "My Offline React Application",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

## Basic Service Worker Implementation

Let's implement a basic service worker from scratch before moving to Workbox.

### Creating the Service Worker File

Create a new file at `public/service-worker.js`:

```javascript
// Cache version - increment this when you update your app
const CACHE_VERSION = 'v1';
const CACHE_NAME = `offline-cache-${CACHE_VERSION}`;

// Resources to cache immediately during installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone the response - one for cache, one for browser
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Network failed, serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});
```

### Registering the Service Worker

Create a registration module at `src/serviceWorkerRegistration.ts`:

```typescript
interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function register(config?: Config): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/service-worker.js';

      registerValidSW(swUrl, config);

      // Listen for online/offline events
      window.addEventListener('online', () => {
        console.log('App is online');
        config?.onOnline?.();
      });

      window.addEventListener('offline', () => {
        console.log('App is offline');
        config?.onOffline?.();
      });
    });
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              console.log('New content available; please refresh.');
              config?.onUpdate?.(registration);
            } else {
              // Content cached for offline use
              console.log('Content cached for offline use.');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
```

### Using the Registration in Your App

Update your `src/index.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker with callbacks
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('App is ready for offline use!');
  },
  onUpdate: (registration) => {
    // Show notification to user about available update
    const shouldUpdate = window.confirm(
      'New version available! Would you like to update?'
    );

    if (shouldUpdate && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
  onOffline: () => {
    console.log('App is running in offline mode');
  },
  onOnline: () => {
    console.log('App is back online');
  }
});
```

## Introduction to Workbox

Workbox is a set of libraries from Google that simplifies service worker development. It provides production-ready caching strategies, precaching, and runtime caching with minimal configuration.

### Why Use Workbox?

1. **Pre-built caching strategies**: Cache-first, network-first, stale-while-revalidate, and more
2. **Precaching**: Automatically cache your app shell during build
3. **Runtime caching**: Cache API responses and external resources
4. **Background sync**: Retry failed requests when back online
5. **Debugging tools**: Built-in logging and debugging support

### Installing Workbox

```bash
# Core Workbox packages
npm install workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-cacheable-response workbox-window

# Webpack plugin for build integration
npm install workbox-webpack-plugin --save-dev
```

### Workbox Core Modules

| Module | Purpose |
|--------|---------|
| `workbox-precaching` | Cache assets during service worker installation |
| `workbox-routing` | Route requests to different handlers |
| `workbox-strategies` | Implement caching strategies |
| `workbox-expiration` | Manage cache expiration |
| `workbox-cacheable-response` | Define what responses to cache |
| `workbox-background-sync` | Queue failed requests for retry |
| `workbox-window` | Client-side service worker management |

## Caching Strategies

Workbox provides several built-in caching strategies. Understanding when to use each is crucial for optimal performance.

### 1. Cache First (Cache Falling Back to Network)

Best for: Static assets that don't change often (fonts, images, CSS)

```typescript
import { CacheFirst } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Cache images with a Cache First strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);
```

### 2. Network First (Network Falling Back to Cache)

Best for: Frequently updated content (API responses, news articles)

```typescript
import { NetworkFirst } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

// Cache API responses with Network First strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);
```

### 3. Stale While Revalidate

Best for: Resources that can tolerate staleness (avatars, non-critical assets)

```typescript
import { StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

// Serve stale content while fetching updates
registerRoute(
  ({ url }) => url.pathname.startsWith('/user-content/'),
  new StaleWhileRevalidate({
    cacheName: 'user-content-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);
```

### 4. Network Only

Best for: Non-cacheable requests (POST requests, real-time data)

```typescript
import { NetworkOnly } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

// Never cache certain requests
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/realtime/'),
  new NetworkOnly()
);
```

### 5. Cache Only

Best for: Precached assets that should never hit the network

```typescript
import { CacheOnly } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

// Only serve from cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/static/critical/'),
  new CacheOnly({
    cacheName: 'critical-assets',
  })
);
```

### Strategy Comparison

| Strategy | Network | Cache | Use Case |
|----------|---------|-------|----------|
| Cache First | Fallback | Primary | Static assets, fonts, images |
| Network First | Primary | Fallback | Dynamic content, API data |
| Stale While Revalidate | Background | Primary | Semi-dynamic content |
| Network Only | Primary | Never | Real-time data, authentication |
| Cache Only | Never | Primary | Precached critical assets |

## Implementing Workbox in React

Let's implement a complete Workbox-powered service worker in a React application.

### Step 1: Create the Service Worker Source

Create `src/service-worker.ts`:

```typescript
/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Take control immediately
clientsClaim();

// Precache all assets generated by the build process
precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell-style routing
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  // Return false to exempt requests from being fulfilled by index.html
  ({ request, url }: { request: Request; url: URL }) => {
    // If this isn't a navigation, skip
    if (request.mode !== 'navigate') {
      return false;
    }

    // If this is a URL that starts with /_, skip
    if (url.pathname.startsWith('/_')) {
      return false;
    }

    // If this looks like a URL for a resource, skip
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    // Return true to signal that we want to use the handler
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache Google Fonts stylesheets with Stale While Revalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts webfont files with Cache First (long-term)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  })
);

// Cache images with Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache CSS and JavaScript with Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// Cache API requests with Network First
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
);

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Custom offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') || new Response(
          'You are offline and this page is not cached.',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});
```

### Step 2: Configure Webpack for Workbox

If you're using Create React App, you'll need to customize the build configuration. Create `config-overrides.js`:

```javascript
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = function override(config, env) {
  // Remove the default GenerateSW plugin if present
  config.plugins = config.plugins.filter(
    (plugin) => plugin.constructor.name !== 'GenerateSW'
  );

  // Add InjectManifest plugin
  if (env === 'production') {
    config.plugins.push(
      new InjectManifest({
        swSrc: './src/service-worker.ts',
        swDest: 'service-worker.js',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      })
    );
  }

  return config;
};
```

Update `package.json` to use react-app-rewired:

```json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "test": "react-app-rewired test"
  }
}
```

### Step 3: Create the Workbox Window Registration

Create `src/sw-registration.ts`:

```typescript
import { Workbox } from 'workbox-window';

export interface SWRegistrationCallbacks {
  onInstalled?: () => void;
  onUpdated?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onWaiting?: (wb: Workbox) => void;
}

let wb: Workbox | null = null;

export function registerServiceWorker(
  callbacks: SWRegistrationCallbacks = {}
): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    wb = new Workbox('/service-worker.js');

    // Installed event - first time installation
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker installed for the first time!');
        callbacks.onInstalled?.();
      }
    });

    // Waiting event - new version waiting to activate
    wb.addEventListener('waiting', () => {
      console.log('New service worker waiting to activate');
      callbacks.onWaiting?.(wb!);
    });

    // Controlling event - new version has taken control
    wb.addEventListener('controlling', () => {
      console.log('New service worker has taken control');
      window.location.reload();
    });

    // Activated event - service worker activated
    wb.addEventListener('activated', (event) => {
      if (event.isUpdate) {
        console.log('Service worker updated!');
        callbacks.onUpdated?.();
      }
    });

    // Register the service worker
    wb.register()
      .then((registration) => {
        console.log('Service worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });

    // Online/offline event listeners
    window.addEventListener('online', () => {
      console.log('Connection restored');
      callbacks.onOnline?.();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      callbacks.onOffline?.();
    });
  }
}

export function promptForUpdate(): void {
  if (wb) {
    wb.messageSkipWaiting();
  }
}

export function getWorkboxInstance(): Workbox | null {
  return wb;
}
```

### Step 4: Create an Update Notification Component

Create `src/components/UpdateNotification.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Workbox } from 'workbox-window';
import { registerServiceWorker, promptForUpdate } from '../sw-registration';

interface UpdateNotificationProps {
  onOffline?: () => void;
  onOnline?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  onOffline,
  onOnline,
}) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    registerServiceWorker({
      onWaiting: () => {
        setShowUpdate(true);
      },
      onOffline: () => {
        setIsOffline(true);
        onOffline?.();
      },
      onOnline: () => {
        setIsOffline(false);
        onOnline?.();
      },
    });
  }, [onOffline, onOnline]);

  const handleUpdate = () => {
    promptForUpdate();
    setShowUpdate(false);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            backgroundColor: '#f44336',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          You are currently offline
        </div>
      )}

      {/* Update notification */}
      {showUpdate && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#2196f3',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: '300px',
          }}
        >
          <p style={{ margin: '0 0 12px 0' }}>
            A new version of this app is available!
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleUpdate}
              style={{
                backgroundColor: 'white',
                color: '#2196f3',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateNotification;
```

### Step 5: Integrate into Your App

Update `src/App.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import UpdateNotification from './components/UpdateNotification';
import './App.css';

const App: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    navigator.onLine ? 'online' : 'offline'
  );

  const handleOffline = useCallback(() => {
    setNetworkStatus('offline');
    // Optionally show a toast or update UI
  }, []);

  const handleOnline = useCallback(() => {
    setNetworkStatus('online');
    // Optionally sync data or refresh
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Offline-Ready React App</h1>
        <p>
          Network Status:{' '}
          <span
            style={{
              color: networkStatus === 'online' ? '#4caf50' : '#f44336',
              fontWeight: 'bold',
            }}
          >
            {networkStatus.toUpperCase()}
          </span>
        </p>
      </header>

      <main>
        {/* Your app content here */}
      </main>

      <UpdateNotification
        onOffline={handleOffline}
        onOnline={handleOnline}
      />
    </div>
  );
};

export default App;
```

## Handling Dynamic Content

For applications with dynamic content, you need to implement more sophisticated caching strategies.

### Caching API Responses

```typescript
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Cache critical API endpoints with Network First
registerRoute(
  ({ url }) => {
    return url.pathname.startsWith('/api/') &&
           (url.pathname.includes('/user') || url.pathname.includes('/auth'));
  },
  new NetworkFirst({
    cacheName: 'critical-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 2, // 2 minutes
      }),
    ],
  })
);

// Cache less critical API data with Stale While Revalidate
registerRoute(
  ({ url }) => {
    return url.pathname.startsWith('/api/') &&
           (url.pathname.includes('/products') || url.pathname.includes('/content'));
  },
  new StaleWhileRevalidate({
    cacheName: 'content-api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);
```

### Custom Cache Handler

Create a custom handler for complex caching logic:

```typescript
import { Strategy, StrategyHandler } from 'workbox-strategies';
import { Request, Response } from 'workbox-routing';

class CustomApiStrategy extends Strategy {
  async _handle(
    request: Request,
    handler: StrategyHandler
  ): Promise<Response> {
    try {
      // Try to get from network first
      const networkResponse = await handler.fetch(request);

      // If successful, cache and return
      if (networkResponse.ok) {
        const cache = await handler.cacheWrapper.open();
        await cache.put(request, networkResponse.clone());
        return networkResponse;
      }

      // If network fails, try cache
      throw new Error('Network response not ok');
    } catch (error) {
      // Fallback to cache
      const cachedResponse = await handler.cacheMatch(request);

      if (cachedResponse) {
        console.log('Serving from cache:', request.url);
        return cachedResponse;
      }

      // Return offline fallback
      return new Response(
        JSON.stringify({
          error: 'offline',
          message: 'You are offline and this data is not cached',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

// Use the custom strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/custom/'),
  new CustomApiStrategy({
    cacheName: 'custom-api-cache',
  })
);
```

### Handling Pagination

For paginated content, cache pages individually:

```typescript
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/posts'),
  new StaleWhileRevalidate({
    cacheName: 'posts-api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50, // Cache up to 50 pages
        maxAgeSeconds: 60 * 30, // 30 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);
```

## Background Sync

Background sync allows you to defer actions until the user has stable connectivity.

### Setting Up Background Sync

```typescript
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

// Create a background sync queue
const bgSyncPlugin = new BackgroundSyncPlugin('formSubmissionQueue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('Background sync successful for:', entry.request.url);
      } catch (error) {
        console.error('Background sync failed:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Use background sync for form submissions
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/submit'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);
```

### Creating a Sync Manager in React

```typescript
// src/hooks/useBackgroundSync.ts
import { useState, useCallback } from 'react';

interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
}

export function useBackgroundSync() {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: false,
    lastSync: null,
  });

  const queueRequest = useCallback(async (url: string, data: any) => {
    try {
      // Try to send immediately
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus((prev) => ({
          ...prev,
          lastSync: new Date(),
        }));
        return { success: true, queued: false };
      }
    } catch (error) {
      // Request will be queued by service worker
      console.log('Request queued for background sync');
      setStatus((prev) => ({
        ...prev,
        pending: prev.pending + 1,
      }));
      return { success: false, queued: true };
    }
  }, []);

  return { status, queueRequest };
}
```

## Push Notifications

Push notifications can enhance user engagement for offline-capable apps.

### Requesting Permission

```typescript
// src/utils/notifications.ts
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications are blocked');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.REACT_APP_VAPID_PUBLIC_KEY!
      ),
    });

    // Send subscription to your server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
```

### Handling Push Events in Service Worker

```typescript
// In your service worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options: NotificationOptions = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }

      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
```

## Testing and Debugging

### Chrome DevTools

Use Chrome DevTools to debug service workers:

1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Check "Update on reload" during development
4. Use "Unregister" to remove old workers
5. Check "Offline" to simulate offline mode

### Lighthouse Audit

Run Lighthouse to check PWA compliance:

```bash
# Using Chrome DevTools
1. Open DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"
```

### Writing Tests

```typescript
// src/__tests__/serviceWorker.test.ts
import { register, unregister } from '../serviceWorkerRegistration';

describe('Service Worker Registration', () => {
  beforeEach(() => {
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue({
          scope: '/',
          installing: null,
          waiting: null,
          active: { state: 'activated' },
        }),
        ready: Promise.resolve({
          unregister: jest.fn().mockResolvedValue(true),
        }),
      },
      writable: true,
    });
  });

  test('should register service worker', async () => {
    const onSuccess = jest.fn();

    register({ onSuccess });

    // Wait for registration
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      expect.stringContaining('service-worker.js')
    );
  });

  test('should unregister service worker', async () => {
    await unregister();

    const registration = await navigator.serviceWorker.ready;
    expect(registration.unregister).toHaveBeenCalled();
  });
});
```

### Cache Inspector

Create a utility to inspect cached items:

```typescript
// src/utils/cacheInspector.ts
export async function inspectCaches(): Promise<void> {
  const cacheNames = await caches.keys();

  console.log('Available caches:', cacheNames);

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    console.log(`\nCache: ${cacheName}`);
    console.log(`Entries: ${requests.length}`);

    requests.forEach((request) => {
      console.log(`  - ${request.url}`);
    });
  }
}

export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();

  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );

  console.log('All caches cleared');
}
```

## Best Practices

### 1. Version Your Caches

Always version your caches to prevent stale data issues:

```typescript
const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
};
```

### 2. Implement Graceful Degradation

Always provide fallbacks for offline scenarios:

```typescript
// Offline fallback page
const OFFLINE_FALLBACK = '/offline.html';

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 5,
      }).handle({ event, request: event.request });
    } catch (error) {
      const cache = await caches.open('pages');
      return cache.match(OFFLINE_FALLBACK) || Response.error();
    }
  }
);
```

### 3. Handle Cache Expiration

Set appropriate expiration for different content types:

```typescript
const CACHE_EXPIRATION = {
  images: 30 * 24 * 60 * 60, // 30 days
  styles: 7 * 24 * 60 * 60,  // 7 days
  api: 5 * 60,               // 5 minutes
  static: 365 * 24 * 60 * 60 // 1 year
};
```

### 4. Limit Cache Size

Prevent cache from growing indefinitely:

```typescript
new ExpirationPlugin({
  maxEntries: 50,
  maxAgeSeconds: 30 * 24 * 60 * 60,
  purgeOnQuotaError: true, // Automatically purge when quota exceeded
})
```

### 5. Handle Update Flow Properly

Communicate updates clearly to users:

```typescript
// Don't force updates - let users decide
wb.addEventListener('waiting', () => {
  // Show a non-intrusive notification
  showUpdateBanner({
    message: 'Update available',
    action: 'Refresh',
    onAction: () => wb.messageSkipWaiting(),
  });
});
```

### 6. Monitor Cache Storage

Keep track of storage usage:

```typescript
async function checkStorageQuota(): Promise<void> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();

    const percentUsed = ((usage! / quota!) * 100).toFixed(2);
    console.log(`Storage: ${percentUsed}% used (${usage} of ${quota} bytes)`);

    if (usage! / quota! > 0.9) {
      console.warn('Storage quota is almost full!');
      // Consider clearing old caches
    }
  }
}
```

### 7. Use Appropriate Cache Strategies

Match strategies to content type:

| Content Type | Strategy | Reason |
|-------------|----------|--------|
| App Shell (HTML) | Network First | Always get latest content |
| Static JS/CSS | Cache First | Rarely changes, performance-critical |
| Images | Cache First | Large files, slow to download |
| API Data (user-specific) | Network First | Must be current |
| API Data (public) | Stale While Revalidate | Can tolerate brief staleness |
| Fonts | Cache First | Very stable, large files |

## Summary

Implementing service workers for offline support in React applications provides significant benefits for user experience and application resilience. Here's a quick reference of what we've covered:

### Key Takeaways

1. **Service workers** run in the background and can intercept network requests
2. **Workbox** simplifies service worker development with pre-built strategies
3. **Caching strategies** should be chosen based on content type and freshness requirements
4. **Background sync** enables reliable form submissions even when offline
5. **Push notifications** keep users engaged with your application

### Strategy Summary Table

| Strategy | When to Use | Cache Priority | Network Priority | Best For |
|----------|-------------|----------------|------------------|----------|
| Cache First | Static assets rarely change | High | Low | Fonts, images, libraries |
| Network First | Content must be fresh | Low | High | User data, real-time content |
| Stale While Revalidate | Freshness nice but not critical | Medium | Medium | Avatars, semi-static content |
| Network Only | Never cache | None | Exclusive | Auth requests, analytics |
| Cache Only | Pre-cached critical assets | Exclusive | None | Offline fallback pages |

### Implementation Checklist

- [ ] Set up service worker registration
- [ ] Configure Workbox with appropriate strategies
- [ ] Implement precaching for critical assets
- [ ] Set up runtime caching for API responses
- [ ] Create offline fallback pages
- [ ] Implement update notification flow
- [ ] Add background sync for form submissions
- [ ] Configure push notifications (optional)
- [ ] Test offline functionality thoroughly
- [ ] Monitor cache storage usage
- [ ] Run Lighthouse PWA audit

### Workbox Plugins Reference

| Plugin | Purpose |
|--------|---------|
| `ExpirationPlugin` | Control cache size and age |
| `CacheableResponsePlugin` | Define cacheable responses |
| `BackgroundSyncPlugin` | Queue failed requests |
| `BroadcastUpdatePlugin` | Notify clients of cache updates |
| `RangeRequestsPlugin` | Handle partial content requests |

By following this guide, you've learned how to transform your React application into a robust, offline-capable progressive web app. Service workers provide the foundation for reliable, fast, and engaging web experiences that work regardless of network conditions.

Remember that offline support is not just about caching. It's about providing a seamless experience that gracefully handles network uncertainty while keeping your users informed and in control.

## Further Resources

- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Progressive Web Apps - web.dev](https://web.dev/progressive-web-apps/)
