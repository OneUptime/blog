# How to Convert a React Application to a Progressive Web App

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, PWA, Progressive Web App, Offline, Service Worker, Frontend

Description: A comprehensive guide to transforming your existing React application into a fully-featured Progressive Web App with offline capabilities, installability, and native-like user experience.

---

Progressive Web Apps (PWAs) combine the best of web and native applications. They load like regular web pages but offer users functionality such as working offline, push notifications, and device hardware access. Converting your existing React application to a PWA can significantly improve user experience, engagement, and retention.

This guide walks you through every step of the conversion process, from setting up the web app manifest to implementing service workers and optimizing for offline functionality.

## Why Convert to a PWA?

Before diving into the implementation, let's understand the benefits:

- **Offline functionality**: Users can access your app even without an internet connection
- **Installability**: Users can add your app to their home screen
- **Faster load times**: Service workers cache assets for instant loading
- **Push notifications**: Engage users with timely updates
- **Improved SEO**: PWAs are indexed by search engines
- **Reduced development costs**: One codebase for web and mobile experiences

For more on why PWAs are becoming the preferred approach, see our post on [Native apps had a good run, but PWA has caught up and is the future](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view).

## Prerequisites

Before starting, ensure you have:

- A React application (Create React App, Vite, Next.js, or custom setup)
- Basic understanding of React and JavaScript
- Node.js and npm installed
- HTTPS enabled (required for service workers in production)

## Step 1: Create the Web App Manifest

The web app manifest is a JSON file that provides information about your application. It tells the browser how your app should behave when installed on a user's device.

### Creating manifest.json

Create a file named `manifest.json` in your `public` folder:

```json
{
  "name": "My React Application",
  "short_name": "MyApp",
  "description": "A powerful React application with PWA capabilities",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3498db",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-wide.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/screenshot-narrow.png",
      "sizes": "720x1280",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "Go to dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/dashboard-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Settings",
      "short_name": "Settings",
      "description": "Open settings",
      "url": "/settings",
      "icons": [{ "src": "/icons/settings-icon.png", "sizes": "96x96" }]
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
```

### Manifest Properties Explained

| Property | Description |
|----------|-------------|
| `name` | Full name of your application (shown during install) |
| `short_name` | Short name displayed on home screen (max 12 characters) |
| `start_url` | URL that loads when the app launches |
| `display` | How the app is displayed (`fullscreen`, `standalone`, `minimal-ui`, `browser`) |
| `background_color` | Splash screen background color |
| `theme_color` | Theme color for the browser UI |
| `orientation` | Preferred screen orientation |
| `scope` | Navigation scope of the PWA |
| `icons` | App icons for various sizes |
| `screenshots` | Screenshots for app store listings |
| `shortcuts` | Quick actions from app icon context menu |

### Linking the Manifest

Add the manifest link to your `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#3498db" />
    <meta name="description" content="A powerful React PWA application" />

    <!-- PWA manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Apple touch icon for iOS -->
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

    <!-- iOS specific meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="MyApp" />

    <title>My React PWA</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

## Step 2: Generate App Icons

PWAs require icons in multiple sizes. Here's a script to generate them using the `sharp` library:

### Install Sharp

```bash
npm install sharp --save-dev
```

### Icon Generation Script

Create a file `scripts/generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = path.join(__dirname, '../src/assets/app-icon.png');
const outputDir = path.join(__dirname, '../public/icons');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate maskable icon with padding for safe area
  const maskableSize = 512;
  const padding = Math.floor(maskableSize * 0.1); // 10% padding

  await sharp(sourceIcon)
    .resize(maskableSize - padding * 2, maskableSize - padding * 2, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 52, g: 152, b: 219, alpha: 1 } // theme color
    })
    .png()
    .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));

  console.log('Generated: maskable-icon-512x512.png');
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
```

Add the script to your `package.json`:

```json
{
  "scripts": {
    "generate-icons": "node scripts/generate-icons.js"
  }
}
```

Run the script:

```bash
npm run generate-icons
```

## Step 3: Implement the Service Worker

The service worker is the heart of your PWA. It runs in the background and handles caching, offline functionality, and push notifications.

### Basic Service Worker

Create `public/service-worker.js`:

```javascript
const CACHE_NAME = 'my-pwa-cache-v1';
const STATIC_CACHE_NAME = 'my-pwa-static-v1';
const DYNAMIC_CACHE_NAME = 'my-pwa-dynamic-v1';

// Assets to cache immediately during installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE_NAME &&
                     name !== DYNAMIC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy: check cache, then network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('[Service Worker] Serving from cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Fetch failed, serving offline page');

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

// Network-first strategy: try network, fallback to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, checking cache');

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);

  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  // Get queued form data from IndexedDB and submit
  const db = await openDB();
  const forms = await db.getAll('pending-forms');

  for (const form of forms) {
    try {
      await fetch(form.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data)
      });

      await db.delete('pending-forms', form.id);
      console.log('[Service Worker] Form synced:', form.id);
    } catch (error) {
      console.error('[Service Worker] Form sync failed:', form.id, error);
    }
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let data = { title: 'Notification', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});
```

### Create Offline Fallback Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - My PWA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }

    .offline-icon {
      width: 120px;
      height: 120px;
      margin-bottom: 30px;
      opacity: 0.9;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 15px;
      font-weight: 600;
    }

    p {
      font-size: 1.1rem;
      margin-bottom: 30px;
      opacity: 0.9;
      max-width: 400px;
      line-height: 1.6;
    }

    .retry-button {
      background: #ffffff;
      color: #667eea;
      border: none;
      padding: 15px 40px;
      font-size: 1rem;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .retry-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .retry-button:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <svg class="offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
  </svg>

  <h1>You're Offline</h1>

  <p>
    It seems you've lost your internet connection. Don't worry, some features
    are still available offline. Check your connection and try again.
  </p>

  <button class="retry-button" onclick="window.location.reload()">
    Try Again
  </button>

  <script>
    // Auto-retry when connection is restored
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>
```

## Step 4: Register the Service Worker in React

Create a service worker registration module in your React application.

### Create Registration Module

Create `src/serviceWorkerRegistration.js`:

```javascript
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      console.warn('Service worker registration skipped: different origin');
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service worker is ready (localhost)');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  } else {
    console.warn('Service workers are not supported in this browser');
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service worker registered:', registration.scope);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('Content is cached for offline use.');

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');

      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Error unregistering service worker:', error);
      });
  }
}

// Force update when new service worker is available
export function forceUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

// Skip waiting and activate new service worker
export function skipWaiting() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}
```

### Register in Your App

Update `src/index.js`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('PWA: Content cached for offline use');
  },
  onUpdate: (registration) => {
    console.log('PWA: New version available');
    // You can show a notification to the user here
    const shouldUpdate = window.confirm(
      'A new version is available. Would you like to update?'
    );

    if (shouldUpdate) {
      serviceWorkerRegistration.skipWaiting();
      window.location.reload();
    }
  }
});
```

## Step 5: Implement Install Prompt

Create a component to handle the PWA installation prompt.

### Install Prompt Hook

Create `src/hooks/useInstallPrompt.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';

export function useInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if installed via iOS
    if (window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setIsInstallable(true);
      console.log('PWA: Install prompt available');
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPromptEvent(null);
      console.log('PWA: App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) {
      console.log('PWA: No install prompt available');
      return false;
    }

    try {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;

      console.log('PWA: User choice:', outcome);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }

      setInstallPromptEvent(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA: Install prompt error:', error);
      return false;
    }
  }, [installPromptEvent]);

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
}
```

### Install Button Component

Create `src/components/InstallButton.jsx`:

```javascript
import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallButton() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isLoading, setIsLoading] = useState(false);

  if (isInstalled) {
    return null; // Don't show button if already installed
  }

  if (!isInstallable) {
    return null; // Don't show button if not installable
  }

  const handleInstall = async () => {
    setIsLoading(true);
    await promptInstall();
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleInstall}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#3498db',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? (
        'Installing...'
      ) : (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install App
        </>
      )}
    </button>
  );
}
```

### Install Banner Component

Create `src/components/InstallBanner.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show banner after a delay to not interrupt initial experience
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  if (!isVisible || isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsVisible(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '500px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#3498db',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img
          src="/icons/icon-48x48.png"
          alt="App Icon"
          style={{ width: '32px', height: '32px' }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Install Our App
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
          Add to your home screen for quick access
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Install
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
```

## Step 6: Implement Offline Data Storage

Use IndexedDB for offline data persistence.

### IndexedDB Wrapper

Create `src/utils/offlineStorage.js`:

```javascript
const DB_NAME = 'MyPWADatabase';
const DB_VERSION = 1;

let db = null;

export async function openDatabase() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create stores for different data types
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }

      if (!database.objectStoreNames.contains('pending-requests')) {
        const store = database.createObjectStore('pending-requests', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
      }

      if (!database.objectStoreNames.contains('user-data')) {
        database.createObjectStore('user-data', { keyPath: 'id' });
      }
    };
  });
}

export async function saveToCache(key, data, ttl = 3600000) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const item = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };

    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(item);
  });
}

export async function getFromCache(key) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;

      if (!result) {
        resolve(null);
        return;
      }

      // Check if expired
      if (result.expiry < Date.now()) {
        deleteFromCache(key);
        resolve(null);
        return;
      }

      resolve(result.data);
    };
  });
}

export async function deleteFromCache(key) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function queueRequest(url, method, data) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');

    const request = store.add({
      url,
      method,
      data,
      timestamp: Date.now(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Request background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-requests');
        });
      }
      resolve(request.result);
    };
  });
}

export async function getPendingRequests() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending-requests'], 'readonly');
    const store = transaction.objectStore('pending-requests');

    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function clearPendingRequest(id) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');

    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
```

### Offline-Aware API Hook

Create `src/hooks/useOfflineAPI.js`:

```javascript
import { useState, useCallback } from 'react';
import {
  getFromCache,
  saveToCache,
  queueRequest,
} from '../utils/offlineStorage';

export function useOfflineAPI() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchWithOfflineSupport = useCallback(
    async (url, options = {}) => {
      const cacheKey = `${options.method || 'GET'}-${url}`;

      // For GET requests, try cache first when offline
      if ((!options.method || options.method === 'GET') && !isOnline) {
        const cached = await getFromCache(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true };
        }
        throw new Error('No cached data available offline');
      }

      // For mutations when offline, queue the request
      if (!isOnline && options.method && options.method !== 'GET') {
        await queueRequest(url, options.method, options.body);
        return { queued: true, message: 'Request queued for when online' };
      }

      // Online: make the actual request
      try {
        const response = await fetch(url, options);
        const data = await response.json();

        // Cache successful GET requests
        if (!options.method || options.method === 'GET') {
          await saveToCache(cacheKey, data, options.cacheTTL);
        }

        return { data, fromCache: false };
      } catch (error) {
        // Fallback to cache on network error
        const cached = await getFromCache(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true, error: error.message };
        }
        throw error;
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    fetchWithOfflineSupport,
  };
}
```

## Step 7: Add Push Notifications

Implement push notification subscription and handling.

### Push Notification Hook

Create `src/hooks/usePushNotifications.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
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

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      // Get existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then(setSubscription);
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    const registration = await navigator.serviceWorker.ready;

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    setSubscription(sub);

    // Send subscription to your server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });

    return sub;
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    await subscription.unsubscribe();

    // Notify your server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    setSubscription(null);
  }, [subscription]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
```

## Step 8: Network Status Indicator

Create a component to show network status.

### Network Status Component

Create `src/components/NetworkStatus.jsx`:

```javascript
import React, { useState, useEffect } from 'react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        borderRadius: '8px',
        backgroundColor: isOnline ? '#27ae60' : '#e74c3c',
        color: '#ffffff',
        fontWeight: '600',
        fontSize: '14px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
        }}
      />
      {isOnline ? 'Back online' : 'You are offline'}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

## Step 9: Update Notification Component

Create a component to notify users of app updates.

### Update Notification Component

Create `src/components/UpdateNotification.jsx`:

```javascript
import React, { useState, useEffect } from 'react';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setRegistration(reg);
              setShowUpdate(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        maxWidth: '320px',
        zIndex: 1000,
      }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>
        Update Available
      </h4>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#666' }}>
        A new version of the app is available. Update now to get the latest
        features and improvements.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#f0f0f0',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Later
        </button>
        <button
          onClick={handleUpdate}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#3498db',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
}
```

## Step 10: Using Workbox for Advanced Caching

For production applications, consider using Workbox for more sophisticated caching strategies.

### Install Workbox

```bash
npm install workbox-webpack-plugin workbox-precaching workbox-routing workbox-strategies
```

### Workbox Service Worker

Create `src/service-worker.js`:

```javascript
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Clean up old caches
cleanupOutdatedCaches();

// Precache all assets generated by the build process
precacheAndRoute(self.__WB_MANIFEST);

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
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache CSS and JavaScript with Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache API requests with Network First
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache Google Fonts
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Handle navigation requests with a Network First strategy
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 3,
  }),
  {
    // Optionally, provide a allowlist/denylist
    // allowlist: [/^\/app\//],
    // denylist: [/^\/api\//],
  }
);

registerRoute(navigationRoute);

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Webpack Configuration for Workbox

Update your webpack config to use the InjectManifest plugin:

```javascript
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  // ... other config
  plugins: [
    new InjectManifest({
      swSrc: './src/service-worker.js',
      swDest: 'service-worker.js',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
    }),
  ],
};
```

## Step 11: Testing Your PWA

### Lighthouse Audit

Use Chrome DevTools Lighthouse to audit your PWA:

1. Open Chrome DevTools (F12)
2. Go to the Lighthouse tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"

### PWA Checklist

Verify these items are working:

```javascript
// Test helper for development
function testPWAFeatures() {
  const results = {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    indexedDB: 'indexedDB' in window,
    cacheAPI: 'caches' in window,
    backgroundSync: 'SyncManager' in window,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    https: location.protocol === 'https:' || location.hostname === 'localhost',
  };

  console.table(results);
  return results;
}

// Run in browser console
testPWAFeatures();
```

## Step 12: Deploy and Verify

### Deployment Checklist

Before deploying your PWA:

1. **HTTPS**: Ensure your site is served over HTTPS
2. **Service Worker Scope**: Verify service worker is at root level
3. **Manifest**: Validate manifest.json with Chrome DevTools
4. **Icons**: Test icons at various sizes
5. **Offline**: Test app behavior when offline
6. **Install**: Test installation on different devices

### Verifying Installation

```javascript
// Check if running as installed PWA
function isRunningAsPWA() {
  // Check display mode
  const isStandalone = window.matchMedia(
    '(display-mode: standalone)'
  ).matches;

  // iOS Safari
  const isIOSPWA = window.navigator.standalone === true;

  // Android TWA
  const isTWA = document.referrer.includes('android-app://');

  return isStandalone || isIOSPWA || isTWA;
}

console.log('Running as PWA:', isRunningAsPWA());
```

## Summary Table

| Component | Purpose | Key Files |
|-----------|---------|-----------|
| **Web App Manifest** | Defines app metadata, icons, and behavior | `public/manifest.json` |
| **Service Worker** | Handles caching, offline support, push notifications | `public/service-worker.js` |
| **Service Worker Registration** | Registers and manages service worker lifecycle | `src/serviceWorkerRegistration.js` |
| **Install Prompt** | Handles PWA installation UX | `src/hooks/useInstallPrompt.js` |
| **Offline Storage** | IndexedDB wrapper for offline data | `src/utils/offlineStorage.js` |
| **Push Notifications** | Manages push subscription and display | `src/hooks/usePushNotifications.js` |
| **Network Status** | Shows online/offline status to users | `src/components/NetworkStatus.jsx` |
| **Update Notification** | Notifies users of app updates | `src/components/UpdateNotification.jsx` |
| **Workbox** | Advanced caching strategies for production | `src/service-worker.js` (Workbox version) |
| **App Icons** | Multiple sizes for various devices | `public/icons/` |
| **Offline Page** | Fallback page when offline | `public/offline.html` |

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Service worker not updating | Clear cache, use `skipWaiting()` in activate event |
| Install prompt not showing | Ensure HTTPS, valid manifest, and service worker registered |
| Offline page not loading | Check service worker fetch event and cache |
| Push notifications not working | Verify VAPID keys and notification permissions |
| Icons not displaying | Verify icon paths and sizes in manifest |
| App not installable | Check Lighthouse audit for PWA criteria |

## Conclusion

Converting a React application to a Progressive Web App involves several steps, but the benefits are substantial. Users get a faster, more reliable experience that works offline and feels native. You get a single codebase that reaches users across all platforms without the overhead of app store submissions.

Start with the manifest and service worker basics, then progressively enhance with features like push notifications and advanced caching strategies. Test thoroughly using Lighthouse and on real devices to ensure a smooth experience for all users.

For monitoring your PWA in production and ensuring optimal performance, consider using [OneUptime](https://oneuptime.com) for comprehensive observability, uptime monitoring, and incident management.

**Related Reading:**

- [Native apps had a good run, but PWA has caught up and is the future](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
- [The Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Instrument Express.js with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view)
