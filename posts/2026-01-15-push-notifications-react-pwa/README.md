# How to Add Push Notifications to React PWAs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Push Notifications, PWA, Web Push, Service Worker, Frontend

Description: Learn how to implement push notifications in React Progressive Web Apps using the Web Push API, service workers, and VAPID keys for secure, real-time user engagement.

---

Push notifications have become an essential feature for modern web applications. They enable real-time communication with users even when they're not actively browsing your site. In this comprehensive guide, we'll walk through implementing push notifications in a React Progressive Web App (PWA) from scratch.

## Table of Contents

1. [Understanding Push Notifications](#understanding-push-notifications)
2. [Prerequisites](#prerequisites)
3. [Setting Up Your React PWA](#setting-up-your-react-pwa)
4. [Configuring the Service Worker](#configuring-the-service-worker)
5. [Generating VAPID Keys](#generating-vapid-keys)
6. [Building the Backend Server](#building-the-backend-server)
7. [Implementing the Frontend](#implementing-the-frontend)
8. [Requesting Notification Permission](#requesting-notification-permission)
9. [Subscribing to Push Notifications](#subscribing-to-push-notifications)
10. [Sending Push Notifications](#sending-push-notifications)
11. [Handling Push Events](#handling-push-events)
12. [Advanced Features](#advanced-features)
13. [Testing Your Implementation](#testing-your-implementation)
14. [Troubleshooting Common Issues](#troubleshooting-common-issues)
15. [Best Practices](#best-practices)
16. [Summary](#summary)

## Understanding Push Notifications

Push notifications are messages sent from a server to a user's device, even when the user isn't actively using your application. They consist of three main components:

1. **Push API**: Allows web applications to receive push messages from a server
2. **Notifications API**: Displays system notifications to the user
3. **Service Worker**: A background script that handles push events

### How Push Notifications Work

The push notification flow involves several steps:

1. User grants permission for notifications
2. Browser creates a unique subscription for the user
3. Subscription is sent to your backend server
4. Server stores the subscription
5. When needed, server sends a push message using the subscription
6. Service worker receives and displays the notification

## Prerequisites

Before we begin, ensure you have the following:

- Node.js (v16 or higher)
- npm or yarn
- Basic knowledge of React
- HTTPS enabled (required for service workers in production)
- A code editor (VS Code recommended)

## Setting Up Your React PWA

Let's start by creating a new React application with PWA support.

### Creating the React App

```bash
npx create-react-app push-notification-pwa --template cra-template-pwa
cd push-notification-pwa
```

### Project Structure

After creation, your project should have this structure:

```
push-notification-pwa/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── service-worker.js
├── src/
│   ├── App.js
│   ├── index.js
│   ├── serviceWorkerRegistration.js
│   └── service-worker.js
├── package.json
└── .env
```

### Enabling the Service Worker

In `src/index.js`, enable the service worker:

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

// Register the service worker for PWA functionality
serviceWorkerRegistration.register();
```

## Configuring the Service Worker

The service worker is crucial for handling push notifications. We'll customize it to handle push events.

### Custom Service Worker Setup

Create or modify `src/service-worker.js`:

```javascript
/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

// App shell-style routing
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }
    if (url.pathname.startsWith('/_')) {
      return false;
    }
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Push notification event listener
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new message!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/images/checkmark.png',
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/images/xmark.png',
      },
    ],
  };

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/notifications')
    );
  } else if (event.action === 'close') {
    // Notification dismissed
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Notification close event listener
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
  // Track analytics or perform cleanup
});

// Skip waiting and activate immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

## Generating VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to identify your server to the push service. They provide a secure way to send push notifications.

### What Are VAPID Keys?

VAPID keys consist of:

- **Public Key**: Shared with the browser for subscription
- **Private Key**: Kept secret on your server for authentication

### Generating Keys Using web-push

Install the `web-push` library:

```bash
npm install web-push -g
```

Generate VAPID keys:

```bash
web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BNxqKABT1Bqn_fJePhJk9J4L5A2OD_x4qLJLRs-KqYpQZu3sD8eKMl3YGq_L1_Ml_example_key

Private Key:
your_private_key_here_keep_this_secret

=======================================
```

### Storing VAPID Keys Securely

Create a `.env` file in your project root:

```env
REACT_APP_VAPID_PUBLIC_KEY=BNxqKABT1Bqn_fJePhJk9J4L5A2OD_x4qLJLRs-KqYpQZu3sD8eKMl3YGq_L1_Ml_example_key
VAPID_PRIVATE_KEY=your_private_key_here_keep_this_secret
VAPID_SUBJECT=mailto:your-email@example.com
```

**Important**: Never commit your private key to version control. Add `.env` to your `.gitignore` file.

## Building the Backend Server

We need a backend server to store subscriptions and send push notifications. We'll use Node.js with Express.

### Server Setup

Create a new directory for your server:

```bash
mkdir server
cd server
npm init -y
npm install express web-push cors body-parser dotenv
```

### Server Implementation

Create `server/index.js`:

```javascript
require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configure VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:example@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// In-memory subscription storage (use a database in production)
const subscriptions = new Map();

// Endpoint to save subscription
app.post('/api/subscribe', (req, res) => {
  const { subscription, userId } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  // Store subscription
  const subscriptionId = userId || subscription.endpoint;
  subscriptions.set(subscriptionId, subscription);

  console.log(`New subscription added: ${subscriptionId}`);
  console.log(`Total subscriptions: ${subscriptions.size}`);

  res.status(201).json({
    message: 'Subscription saved successfully',
    subscriptionId,
  });
});

// Endpoint to unsubscribe
app.post('/api/unsubscribe', (req, res) => {
  const { subscription, userId } = req.body;
  const subscriptionId = userId || subscription?.endpoint;

  if (subscriptions.has(subscriptionId)) {
    subscriptions.delete(subscriptionId);
    console.log(`Subscription removed: ${subscriptionId}`);
    res.json({ message: 'Unsubscribed successfully' });
  } else {
    res.status(404).json({ error: 'Subscription not found' });
  }
});

// Endpoint to send notification to a specific user
app.post('/api/send-notification', async (req, res) => {
  const { userId, title, body, icon, url, data } = req.body;

  const subscription = subscriptions.get(userId);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const payload = JSON.stringify({
    title: title || 'New Notification',
    body: body || 'You have a new message',
    icon: icon || '/logo192.png',
    url: url || '/',
    data: data || {},
  });

  try {
    await webpush.sendNotification(subscription, payload);
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);

    if (error.statusCode === 410) {
      // Subscription expired or invalid
      subscriptions.delete(userId);
      return res.status(410).json({ error: 'Subscription expired' });
    }

    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Endpoint to broadcast notification to all subscribers
app.post('/api/broadcast', async (req, res) => {
  const { title, body, icon, url, data } = req.body;

  const payload = JSON.stringify({
    title: title || 'Broadcast Notification',
    body: body || 'Important announcement!',
    icon: icon || '/logo192.png',
    url: url || '/',
    data: data || {},
  });

  const results = {
    success: 0,
    failed: 0,
    expired: [],
  };

  const sendPromises = Array.from(subscriptions.entries()).map(
    async ([id, subscription]) => {
      try {
        await webpush.sendNotification(subscription, payload);
        results.success++;
      } catch (error) {
        results.failed++;
        if (error.statusCode === 410) {
          results.expired.push(id);
          subscriptions.delete(id);
        }
        console.error(`Failed to send to ${id}:`, error.message);
      }
    }
  );

  await Promise.all(sendPromises);

  res.json({
    message: 'Broadcast completed',
    results,
  });
});

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    subscriptionCount: subscriptions.size,
  });
});

app.listen(PORT, () => {
  console.log(`Push notification server running on port ${PORT}`);
});
```

### Server Environment Configuration

Create `server/.env`:

```env
PORT=5000
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

## Implementing the Frontend

Now let's implement the frontend components to handle push notifications.

### Push Notification Hook

Create `src/hooks/usePushNotifications.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Convert VAPID key to Uint8Array
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registration, setRegistration] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (!supported) {
        setError('Push notifications are not supported in this browser');
      }
    };

    checkSupport();
  }, []);

  // Get existing subscription on mount
  useEffect(() => {
    const getExistingSubscription = async () => {
      if (!isSupported) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        const existingSubscription = await reg.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
        }
      } catch (err) {
        console.error('Error getting subscription:', err);
      }
    };

    getExistingSubscription();
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Notification permission denied');
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(
    async (userId) => {
      if (!isSupported || !registration) {
        throw new Error('Service worker not ready');
      }

      setIsLoading(true);
      setError(null);

      try {
        // Request permission if not granted
        if (Notification.permission !== 'granted') {
          await requestPermission();
        }

        // Check for existing subscription
        let pushSubscription = await registration.pushManager.getSubscription();

        if (!pushSubscription) {
          // Create new subscription
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Send subscription to server
        const response = await fetch(`${API_URL}/api/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: pushSubscription.toJSON(),
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save subscription on server');
        }

        setSubscription(pushSubscription);
        return pushSubscription;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, registration, requestPermission]
  );

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(
    async (userId) => {
      if (!subscription) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        await fetch(`${API_URL}/api/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            userId,
          }),
        });

        setSubscription(null);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [subscription]
  );

  return {
    permission,
    subscription,
    isSupported,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    isSubscribed: !!subscription,
  };
}
```

### Push Notification Context

Create `src/context/PushNotificationContext.js`:

```javascript
import React, { createContext, useContext, useCallback, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PushNotificationContext = createContext(null);

export function PushNotificationProvider({ children }) {
  const pushNotifications = usePushNotifications();
  const [notificationHistory, setNotificationHistory] = useState([]);

  const addToHistory = useCallback((notification) => {
    setNotificationHistory((prev) => [
      { ...notification, timestamp: new Date() },
      ...prev.slice(0, 49), // Keep last 50 notifications
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  const value = {
    ...pushNotifications,
    notificationHistory,
    addToHistory,
    clearHistory,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);

  if (!context) {
    throw new Error(
      'usePushNotificationContext must be used within PushNotificationProvider'
    );
  }

  return context;
}
```

### Notification Permission Component

Create `src/components/NotificationPermission.js`:

```javascript
import React from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';

export function NotificationPermission() {
  const {
    permission,
    isSupported,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isSubscribed,
  } = usePushNotificationContext();

  if (!isSupported) {
    return (
      <div className="notification-permission unsupported">
        <p>Push notifications are not supported in your browser.</p>
        <p>Try using a modern browser like Chrome, Firefox, or Edge.</p>
      </div>
    );
  }

  const handleSubscribe = async () => {
    try {
      await subscribe('user-123'); // Replace with actual user ID
      console.log('Successfully subscribed to push notifications');
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe('user-123'); // Replace with actual user ID
      console.log('Successfully unsubscribed from push notifications');
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  return (
    <div className="notification-permission">
      <h3>Push Notifications</h3>

      <div className="status">
        <p>
          <strong>Permission Status:</strong> {permission}
        </p>
        <p>
          <strong>Subscription Status:</strong>{' '}
          {isSubscribed ? 'Subscribed' : 'Not subscribed'}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        {!isSubscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="subscribe-btn"
          >
            {isLoading ? 'Subscribing...' : 'Enable Notifications'}
          </button>
        ) : (
          <button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="unsubscribe-btn"
          >
            {isLoading ? 'Unsubscribing...' : 'Disable Notifications'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Requesting Notification Permission

Requesting permission at the right time is crucial for user experience. Here are best practices:

### Timing Strategies

```javascript
// Strategy 1: On user action (recommended)
function NotificationPrompt() {
  const { requestPermission, permission } = usePushNotificationContext();

  if (permission === 'granted') {
    return null;
  }

  return (
    <div className="notification-prompt">
      <p>Stay updated with real-time notifications!</p>
      <button onClick={requestPermission}>Enable Notifications</button>
    </div>
  );
}

// Strategy 2: After key user engagement
function useDelayedPermissionPrompt(delay = 30000) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { permission } = usePushNotificationContext();

  useEffect(() => {
    if (permission !== 'default') {
      return;
    }

    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, permission]);

  return showPrompt;
}

// Strategy 3: After specific actions
function useActionBasedPermissionPrompt(actionCount = 3) {
  const [actions, setActions] = useState(0);
  const { permission } = usePushNotificationContext();

  const trackAction = useCallback(() => {
    setActions((prev) => prev + 1);
  }, []);

  const shouldPrompt = actions >= actionCount && permission === 'default';

  return { trackAction, shouldPrompt };
}
```

### Permission Request UI Component

```javascript
import React, { useState } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';

export function PermissionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { permission, requestPermission, isLoading } =
    usePushNotificationContext();

  if (permission !== 'default' || dismissed) {
    return null;
  }

  return (
    <div className="permission-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <BellIcon />
        </div>
        <div className="banner-text">
          <h4>Stay in the loop!</h4>
          <p>
            Get notified about important updates, messages, and alerts
            instantly.
          </p>
        </div>
        <div className="banner-actions">
          <button
            className="enable-btn"
            onClick={requestPermission}
            disabled={isLoading}
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </button>
          <button className="dismiss-btn" onClick={() => setDismissed(true)}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Subscribing to Push Notifications

Once permission is granted, you need to create a push subscription.

### Subscription Details

The subscription object contains:

```javascript
{
  endpoint: "https://fcm.googleapis.com/fcm/send/...",
  expirationTime: null,
  keys: {
    p256dh: "public_key_for_encryption",
    auth: "authentication_secret"
  }
}
```

### Complete Subscription Flow

```javascript
async function subscribeUserToPush(registration) {
  // Check existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    console.log('Existing subscription found');
    return subscription;
  }

  // Create new subscription
  const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Required - all pushes must show notification
      applicationServerKey: convertedKey,
    });

    console.log('New subscription created:', subscription);

    // Send to backend
    await saveSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('User denied notification permission');
    } else if (error.name === 'AbortError') {
      console.error('Subscription was aborted');
    } else {
      console.error('Subscription failed:', error);
    }
    throw error;
  }
}

async function saveSubscriptionToServer(subscription) {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userId: getCurrentUserId(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }

  return response.json();
}
```

## Sending Push Notifications

### Server-Side Notification Sending

```javascript
const webpush = require('web-push');

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send notification function
async function sendPushNotification(subscription, payload) {
  const options = {
    TTL: 60 * 60, // Time to live: 1 hour
    urgency: 'normal', // 'very-low', 'low', 'normal', 'high'
    topic: 'general', // For replacing notifications with same topic
  };

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      options
    );

    console.log('Push sent successfully:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Push failed:', error);

    // Handle specific errors
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription expired or invalid - remove from database
      await removeSubscription(subscription.endpoint);
      return { success: false, expired: true, error };
    }

    return { success: false, error };
  }
}

// Example notification payloads
const notificationPayloads = {
  welcome: {
    title: 'Welcome to Our App!',
    body: 'Thanks for enabling notifications. You\'ll receive important updates here.',
    icon: '/icons/welcome.png',
    badge: '/icons/badge.png',
    tag: 'welcome',
    data: {
      type: 'welcome',
      url: '/getting-started',
    },
  },

  newMessage: {
    title: 'New Message',
    body: 'You have a new message from John',
    icon: '/icons/message.png',
    badge: '/icons/badge.png',
    tag: 'message-123',
    renotify: true,
    data: {
      type: 'message',
      messageId: '123',
      url: '/messages/123',
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  },

  alert: {
    title: 'System Alert',
    body: 'Your server CPU usage is above 90%',
    icon: '/icons/alert.png',
    badge: '/icons/badge.png',
    tag: 'alert-cpu',
    requireInteraction: true,
    urgency: 'high',
    data: {
      type: 'alert',
      severity: 'high',
      url: '/dashboard/alerts',
    },
  },
};
```

### Batch Notification Sending

```javascript
async function sendBatchNotifications(subscriptions, payload) {
  const results = {
    total: subscriptions.length,
    successful: 0,
    failed: 0,
    expired: [],
  };

  // Process in batches to avoid overwhelming the server
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < subscriptions.length; i += batchSize) {
    batches.push(subscriptions.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (subscription) => {
      const result = await sendPushNotification(subscription, payload);

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        if (result.expired) {
          results.expired.push(subscription.endpoint);
        }
      }
    });

    await Promise.all(promises);

    // Add small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
```

## Handling Push Events

### Advanced Push Event Handler

```javascript
// In service-worker.js
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  const handlePush = async () => {
    let data = {};

    try {
      data = event.data ? event.data.json() : {};
    } catch (e) {
      data = { body: event.data ? event.data.text() : 'New notification' };
    }

    const {
      title = 'Notification',
      body = 'You have a new notification',
      icon = '/logo192.png',
      badge = '/badge.png',
      image,
      tag,
      renotify = false,
      requireInteraction = false,
      silent = false,
      vibrate = [200, 100, 200],
      actions = [],
      data: notificationData = {},
    } = data;

    const options = {
      body,
      icon,
      badge,
      image,
      tag,
      renotify,
      requireInteraction,
      silent,
      vibrate,
      actions,
      data: {
        ...notificationData,
        timestamp: Date.now(),
      },
    };

    // Show notification
    await self.registration.showNotification(title, options);

    // Track analytics
    await trackNotificationReceived(data);
  };

  event.waitUntil(handlePush());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const { data } = notification;

  notification.close();

  const handleClick = async () => {
    // Track click analytics
    await trackNotificationClick(data, action);

    // Handle different actions
    switch (action) {
      case 'reply':
        await handleReplyAction(data);
        break;
      case 'dismiss':
        // Just close, already done
        break;
      case 'snooze':
        await scheduleSnoozeNotification(data);
        break;
      default:
        // Default action - open URL
        const urlToOpen = data.url || '/';
        await openWindow(urlToOpen);
    }
  };

  event.waitUntil(handleClick());
});

// Helper function to open window
async function openWindow(url) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Check if there's already a window open
  for (const client of windowClients) {
    if (client.url.includes(self.location.origin)) {
      await client.focus();
      await client.navigate(url);
      return;
    }
  }

  // Open new window
  await clients.openWindow(url);
}
```

## Advanced Features

### Notification Channels/Topics

```javascript
// Subscribe to specific topics
class NotificationChannelManager {
  constructor() {
    this.channels = new Map();
  }

  async subscribeToChannel(channelId, userId) {
    const response = await fetch('/api/channels/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, userId }),
    });

    if (response.ok) {
      this.channels.set(channelId, true);
    }

    return response.json();
  }

  async unsubscribeFromChannel(channelId, userId) {
    const response = await fetch('/api/channels/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, userId }),
    });

    if (response.ok) {
      this.channels.delete(channelId);
    }

    return response.json();
  }

  getSubscribedChannels() {
    return Array.from(this.channels.keys());
  }
}

// Usage
const channelManager = new NotificationChannelManager();
await channelManager.subscribeToChannel('alerts', 'user-123');
await channelManager.subscribeToChannel('news', 'user-123');
```

### Notification Preferences Component

```javascript
import React, { useState, useEffect } from 'react';

export function NotificationPreferences({ userId }) {
  const [preferences, setPreferences] = useState({
    alerts: true,
    messages: true,
    updates: false,
    marketing: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursEnabled: false,
  });

  const handleToggle = async (key) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        preferences: { [key]: newValue },
      }),
    });
  };

  return (
    <div className="notification-preferences">
      <h3>Notification Preferences</h3>

      <div className="preference-group">
        <h4>Notification Types</h4>
        {['alerts', 'messages', 'updates', 'marketing'].map((type) => (
          <label key={type} className="preference-item">
            <input
              type="checkbox"
              checked={preferences[type]}
              onChange={() => handleToggle(type)}
            />
            <span className="preference-label">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </label>
        ))}
      </div>

      <div className="preference-group">
        <h4>Quiet Hours</h4>
        <label className="preference-item">
          <input
            type="checkbox"
            checked={preferences.quietHoursEnabled}
            onChange={() => handleToggle('quietHoursEnabled')}
          />
          <span>Enable Quiet Hours</span>
        </label>
        {preferences.quietHoursEnabled && (
          <div className="quiet-hours-times">
            <input
              type="time"
              value={preferences.quietHoursStart}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  quietHoursStart: e.target.value,
                }))
              }
            />
            <span>to</span>
            <input
              type="time"
              value={preferences.quietHoursEnd}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  quietHoursEnd: e.target.value,
                }))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Rich Notifications with Images

```javascript
// Notification with image
const richNotification = {
  title: 'New Photo Album',
  body: 'Check out the latest photos from your trip!',
  icon: '/icons/photo.png',
  image: '/images/album-preview.jpg', // Large image in notification
  badge: '/icons/badge.png',
  actions: [
    { action: 'view', title: 'View Album' },
    { action: 'share', title: 'Share' },
  ],
  data: {
    albumId: '456',
    url: '/albums/456',
  },
};

// Progressive notification content
function createProgressNotification(title, current, total) {
  const percentage = Math.round((current / total) * 100);
  return {
    title: title,
    body: `Progress: ${percentage}% (${current}/${total})`,
    icon: '/icons/progress.png',
    tag: 'upload-progress', // Same tag replaces previous notification
    renotify: false, // Don't vibrate/sound on update
    silent: true,
    data: {
      type: 'progress',
      current,
      total,
      percentage,
    },
  };
}
```

## Testing Your Implementation

### Local Testing Setup

```javascript
// Test notification button component
function TestNotification() {
  const sendTestNotification = async () => {
    // Check permission
    if (Notification.permission !== 'granted') {
      console.error('Notification permission not granted');
      return;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Show test notification directly (without push)
    await registration.showNotification('Test Notification', {
      body: 'This is a test notification from your PWA!',
      icon: '/logo192.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      actions: [
        { action: 'explore', title: 'Explore' },
        { action: 'close', title: 'Close' },
      ],
    });
  };

  return (
    <button onClick={sendTestNotification} className="test-notification-btn">
      Send Test Notification
    </button>
  );
}
```

### Testing with cURL

```bash
# Test sending notification via your API
curl -X POST http://localhost:5000/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "title": "Test from cURL",
    "body": "This is a test notification sent via cURL",
    "icon": "/logo192.png"
  }'

# Test broadcast
curl -X POST http://localhost:5000/api/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Broadcast Test",
    "body": "This notification was sent to all subscribers"
  }'
```

### Debugging Service Workers

```javascript
// In browser console
// Check service worker status
navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker ready:', registration);
  console.log('Active SW:', registration.active);
  console.log('Scope:', registration.scope);
});

// Check push subscription
navigator.serviceWorker.ready.then(async (registration) => {
  const subscription = await registration.pushManager.getSubscription();
  console.log('Current subscription:', subscription);
  if (subscription) {
    console.log('Endpoint:', subscription.endpoint);
    console.log('Keys:', subscription.toJSON().keys);
  }
});

// Force update service worker
navigator.serviceWorker.ready.then((registration) => {
  registration.update();
});
```

## Troubleshooting Common Issues

### Issue 1: "Registration failed - push service error"

```javascript
// Solution: Ensure VAPID keys are correct
function validateVapidKey(key) {
  try {
    const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded.length === 65; // VAPID public key should be 65 bytes
  } catch (e) {
    return false;
  }
}

if (!validateVapidKey(process.env.REACT_APP_VAPID_PUBLIC_KEY)) {
  console.error('Invalid VAPID public key format');
}
```

### Issue 2: "Notification permission denied"

```javascript
// Check and handle permission states
async function checkNotificationPermission() {
  const permission = Notification.permission;

  switch (permission) {
    case 'granted':
      return true;
    case 'denied':
      // User blocked notifications - show instructions to enable
      showEnableInstructionsModal();
      return false;
    case 'default':
      // Can request permission
      return await requestPermission();
    default:
      return false;
  }
}

function showEnableInstructionsModal() {
  // Show modal with browser-specific instructions
  // to re-enable notifications from site settings
}
```

### Issue 3: "Service worker not updating"

```javascript
// Force service worker update
async function forceServiceWorkerUpdate() {
  const registration = await navigator.serviceWorker.ready;

  // Unregister old service worker
  await registration.unregister();

  // Re-register
  const newRegistration = await navigator.serviceWorker.register(
    '/service-worker.js'
  );

  // Skip waiting
  if (newRegistration.waiting) {
    newRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
```

### Issue 4: "Push messages not received"

```javascript
// Debug push subscription
async function debugPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    console.log('No subscription found');
    return null;
  }

  // Check expiration
  if (subscription.expirationTime) {
    const now = Date.now();
    if (subscription.expirationTime < now) {
      console.log('Subscription expired');
      await subscription.unsubscribe();
      return null;
    }
  }

  // Verify subscription is still valid on server
  const response = await fetch('/api/verify-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  return response.json();
}
```

## Best Practices

### 1. Request Permission at the Right Time

```javascript
// Good: Request after user engagement
const userEngagementPrompt = () => {
  // Wait for meaningful interaction
  let interactions = 0;

  document.addEventListener('click', () => {
    interactions++;
    if (interactions >= 3 && Notification.permission === 'default') {
      showCustomPrompt();
    }
  });
};

// Bad: Request immediately on page load
// window.onload = () => Notification.requestPermission(); // Don't do this!
```

### 2. Provide Value in Notifications

```javascript
// Good: Actionable, relevant content
const goodNotification = {
  title: 'Your order has shipped!',
  body: 'Track your package - arrives Wednesday',
  actions: [
    { action: 'track', title: 'Track Package' },
    { action: 'details', title: 'Order Details' },
  ],
};

// Bad: Generic, unhelpful content
const badNotification = {
  title: 'Check out our app!',
  body: 'Open now for great deals',
};
```

### 3. Implement Notification Grouping

```javascript
// Group related notifications
const notification = {
  title: '3 new messages',
  body: 'From: Alice, Bob, Charlie',
  tag: 'messages', // Groups notifications with same tag
  renotify: true, // Still alert user
  data: {
    count: 3,
    messageIds: ['1', '2', '3'],
  },
};
```

### 4. Handle Offline/Online State

```javascript
// Queue notifications when offline
const notificationQueue = [];

window.addEventListener('online', async () => {
  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    await sendToServer(notification);
  }
});

function queueNotification(notification) {
  if (navigator.onLine) {
    sendToServer(notification);
  } else {
    notificationQueue.push(notification);
  }
}
```

### 5. Respect User Preferences

```javascript
// Check preferences before sending
async function shouldSendNotification(userId, type) {
  const preferences = await getUserPreferences(userId);

  // Check if this type is enabled
  if (!preferences[type]) {
    return false;
  }

  // Check quiet hours
  if (preferences.quietHoursEnabled) {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quietHoursStart.split(':')[0]);
    const endHour = parseInt(preferences.quietHoursEnd.split(':')[0]);

    if (currentHour >= startHour || currentHour < endHour) {
      return false; // In quiet hours
    }
  }

  return true;
}
```

## Summary

Implementing push notifications in a React PWA involves several key components working together. Here's a summary table of all the concepts covered:

| Component | Purpose | Key APIs/Libraries |
|-----------|---------|-------------------|
| Service Worker | Background process handling push events | `navigator.serviceWorker`, Workbox |
| Push API | Receiving push messages from server | `PushManager.subscribe()` |
| Notifications API | Displaying system notifications | `Notification.requestPermission()`, `registration.showNotification()` |
| VAPID Keys | Server authentication | `web-push` library |
| Subscription | Unique endpoint for each user/device | `PushSubscription` object |
| Backend Server | Storing subscriptions, sending pushes | Express.js, `web-push` |

### Key Implementation Steps

1. **Setup**: Create React PWA with service worker enabled
2. **VAPID Keys**: Generate and configure public/private key pair
3. **Permission**: Request notification permission at appropriate time
4. **Subscription**: Create push subscription with VAPID public key
5. **Backend**: Store subscriptions and implement send endpoints
6. **Service Worker**: Handle push and notificationclick events
7. **Testing**: Verify all components work together

### Key Takeaways

- Always request permission after user engagement, not on page load
- Use VAPID keys for secure server identification
- Handle subscription expiration and errors gracefully
- Respect user preferences and provide easy opt-out
- Test thoroughly across different browsers and devices
- Monitor delivery rates and clean up expired subscriptions

Push notifications, when implemented correctly, can significantly improve user engagement and provide real-time communication capabilities to your React PWA. By following the patterns and best practices outlined in this guide, you'll be able to create a robust notification system that respects user preferences while delivering timely, relevant content.

## Additional Resources

- [Web Push Protocol - RFC 8030](https://tools.ietf.org/html/rfc8030)
- [VAPID Specification - RFC 8292](https://tools.ietf.org/html/rfc8292)
- [Push API - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [Workbox - Google Developers](https://developers.google.com/web/tools/workbox)
