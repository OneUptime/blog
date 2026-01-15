# How to Implement Background Sync in React PWAs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Background Sync, PWA, Offline, Service Worker, Frontend

Description: Learn how to implement the Background Sync API in React Progressive Web Apps to handle offline operations, queue management, and ensure reliable data synchronization when connectivity is restored.

---

Progressive Web Apps bring native-like capabilities to the web, and one of the most powerful features for offline-first applications is the Background Sync API. This API allows your React application to defer actions until the user has stable connectivity, ensuring that user actions are never lost due to network issues.

For more context on why PWAs are the future of web development, see our post on [why PWAs have caught up with native apps](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view).

## What is Background Sync?

Background Sync is a Web API that allows you to defer tasks to be run in a service worker until the user has stable network connectivity. When a user performs an action offline (like submitting a form or saving data), instead of failing immediately, the request is queued and automatically retried when connectivity is restored.

### Key Benefits

- **Reliability**: User actions are never lost due to network issues
- **User Experience**: No need for users to manually retry failed operations
- **Battery Efficiency**: Retries are batched and optimized by the browser
- **Offline-First**: Enables true offline functionality in web applications

## Project Setup

### Create a React PWA

Start by creating a new React application with PWA support:

```bash
npx create-react-app my-pwa-app --template cra-template-pwa-typescript
cd my-pwa-app
```

If you have an existing React app, you can add PWA support:

```bash
npm install workbox-window workbox-background-sync workbox-core workbox-routing workbox-strategies
```

### Project Structure

Your project should have the following structure for background sync:

```
src/
  components/
    OfflineIndicator.tsx
    SyncStatus.tsx
  hooks/
    useBackgroundSync.ts
    useOfflineStatus.ts
  services/
    syncManager.ts
    indexedDBService.ts
  workers/
    service-worker.ts
public/
  manifest.json
```

## Service Worker Configuration

### Basic Service Worker Setup

Create your service worker with background sync capabilities:

```typescript
// src/workers/service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync queue for API requests
const bgSyncPlugin = new BackgroundSyncPlugin('apiSyncQueue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        const response = await fetch(entry.request.clone());

        // Notify the main thread of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            url: entry.request.url,
            timestamp: Date.now(),
          });
        });

        console.log('Background sync successful for:', entry.request.url);
      } catch (error) {
        // Put the request back in the queue if it fails
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Register route for API calls that should be synced
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),
  'POST'
);

// Cache API GET requests with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-get-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  }),
  'GET'
);

// Cache static assets with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Handle background sync events
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'apiSyncQueue') {
    console.log('Background sync triggered for apiSyncQueue');
  }
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Register the Service Worker

Update your service worker registration to handle background sync:

```typescript
// src/serviceWorkerRegistration.ts
export function register(config?: {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSync?: (event: MessageEvent) => void;
}): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (config?.onSync) {
              config.onSync(event);
            }
          });

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  config?.onUpdate?.(registration);
                } else {
                  config?.onSuccess?.(registration);
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
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

## IndexedDB for Queue Management

### Setting Up IndexedDB

Create a robust IndexedDB service for managing offline data:

```typescript
// src/services/indexedDBService.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  metadata?: Record<string, unknown>;
}

interface OfflineData {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  synced: boolean;
}

interface SyncDBSchema extends DBSchema {
  'sync-queue': {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
    };
  };
  'offline-data': {
    key: string;
    value: OfflineData;
    indexes: {
      'by-type': string;
      'by-synced': number;
    };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<SyncDBSchema> | null = null;
  private dbName = 'pwa-sync-db';
  private version = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<SyncDBSchema>(this.dbName, this.version, {
      upgrade(db) {
        // Create sync queue store
        if (!db.objectStoreNames.contains('sync-queue')) {
          const syncStore = db.createObjectStore('sync-queue', {
            keyPath: 'id',
          });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-timestamp', 'timestamp');
        }

        // Create offline data store
        if (!db.objectStoreNames.contains('offline-data')) {
          const dataStore = db.createObjectStore('offline-data', {
            keyPath: 'id',
          });
          dataStore.createIndex('by-type', 'type');
          dataStore.createIndex('by-synced', 'synced');
        }
      },
    });
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) await this.initialize();

    const id = crypto.randomUUID();
    const queueItem: SyncQueueItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await this.db!.put('sync-queue', queueItem);
    return id;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize();
    return this.db!.getAllFromIndex('sync-queue', 'by-timestamp');
  }

  async getPendingItems(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize();
    return this.db!.getAllFromIndex('sync-queue', 'by-status', 'pending');
  }

  async updateSyncItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    if (!this.db) await this.initialize();

    const item = await this.db!.get('sync-queue', id);
    if (item) {
      await this.db!.put('sync-queue', { ...item, ...updates });
    }
  }

  async removeSyncItem(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('sync-queue', id);
  }

  async clearCompletedItems(): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction('sync-queue', 'readwrite');
    const index = tx.store.index('by-status');

    let cursor = await index.openCursor('completed');
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  async saveOfflineData(type: string, data: unknown): Promise<string> {
    if (!this.db) await this.initialize();

    const id = crypto.randomUUID();
    await this.db!.put('offline-data', {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: false,
    });

    return id;
  }

  async getOfflineData(type: string): Promise<OfflineData[]> {
    if (!this.db) await this.initialize();
    return this.db!.getAllFromIndex('offline-data', 'by-type', type);
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    const item = await this.db!.get('offline-data', id);
    if (item) {
      await this.db!.put('offline-data', { ...item, synced: true });
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
    total: number;
  }> {
    if (!this.db) await this.initialize();

    const all = await this.db!.getAll('sync-queue');

    return {
      pending: all.filter(i => i.status === 'pending').length,
      syncing: all.filter(i => i.status === 'syncing').length,
      failed: all.filter(i => i.status === 'failed').length,
      completed: all.filter(i => i.status === 'completed').length,
      total: all.length,
    };
  }
}

export const indexedDBService = new IndexedDBService();
```

## Sync Manager Implementation

### Creating the Sync Manager

Build a comprehensive sync manager that handles all synchronization logic:

```typescript
// src/services/syncManager.ts
import { indexedDBService } from './indexedDBService';

interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: SyncProgress) => void;
  onComplete?: (results: SyncResult[]) => void;
  onError?: (error: Error, item: QueueItem) => void;
}

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
}

interface SyncResult {
  id: string;
  success: boolean;
  response?: unknown;
  error?: string;
}

interface QueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  metadata?: Record<string, unknown>;
}

class SyncManager {
  private isProcessing = false;
  private listeners: Set<(event: SyncEvent) => void> = new Set();

  async queueRequest(
    url: string,
    options: RequestInit,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const headers: Record<string, string> = {};

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const id = await indexedDBService.addToSyncQueue({
      url,
      method: options.method || 'GET',
      headers,
      body: options.body as string | null,
      metadata,
    });

    this.emit({ type: 'queued', id, url });

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  async processQueue(options: SyncOptions = {}): Promise<SyncResult[]> {
    if (this.isProcessing) {
      console.log('Sync already in progress');
      return [];
    }

    if (!navigator.onLine) {
      console.log('Offline - skipping sync');
      return [];
    }

    this.isProcessing = true;
    const results: SyncResult[] = [];
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    try {
      const pendingItems = await indexedDBService.getPendingItems();
      const total = pendingItems.length;
      let completed = 0;
      let failed = 0;

      for (const item of pendingItems) {
        options.onProgress?.({
          total,
          completed,
          failed,
          current: item.url,
        });

        await indexedDBService.updateSyncItem(item.id, { status: 'syncing' });
        this.emit({ type: 'syncing', id: item.id, url: item.url });

        let success = false;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(item.url, {
              method: item.method,
              headers: item.headers,
              body: item.body,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json().catch(() => null);

            await indexedDBService.updateSyncItem(item.id, { status: 'completed' });
            this.emit({ type: 'completed', id: item.id, url: item.url, response: data });

            results.push({ id: item.id, success: true, response: data });
            success = true;
            completed++;
            break;
          } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries) {
              console.log(`Retry ${attempt + 1}/${maxRetries} for ${item.url}`);
              await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
            }
          }
        }

        if (!success) {
          await indexedDBService.updateSyncItem(item.id, {
            status: 'failed',
            retryCount: maxRetries,
          });

          this.emit({ type: 'failed', id: item.id, url: item.url, error: lastError });
          options.onError?.(lastError!, item);

          results.push({ id: item.id, success: false, error: lastError?.message });
          failed++;
        }
      }

      options.onProgress?.({ total, completed, failed, current: null });
      options.onComplete?.(results);

    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  async retryFailed(): Promise<SyncResult[]> {
    const queue = await indexedDBService.getSyncQueue();
    const failedItems = queue.filter(item => item.status === 'failed');

    for (const item of failedItems) {
      await indexedDBService.updateSyncItem(item.id, {
        status: 'pending',
        retryCount: 0,
      });
    }

    return this.processQueue();
  }

  async clearQueue(): Promise<void> {
    await indexedDBService.clearCompletedItems();
    this.emit({ type: 'cleared' });
  }

  async getQueueStatus(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
    total: number;
  }> {
    return indexedDBService.getQueueStats();
  }

  subscribe(listener: (event: SyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const periodicSync = (registration as any).periodicSync;

        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });

        if (status.state === 'granted') {
          await periodicSync.register(tag, { minInterval });
          console.log(`Periodic sync registered: ${tag}`);
          return true;
        }
      } catch (error) {
        console.error('Periodic sync registration failed:', error);
      }
    }
    return false;
  }
}

type SyncEvent =
  | { type: 'queued'; id: string; url: string }
  | { type: 'syncing'; id: string; url: string }
  | { type: 'completed'; id: string; url: string; response: unknown }
  | { type: 'failed'; id: string; url: string; error: Error | null }
  | { type: 'cleared' };

export const syncManager = new SyncManager();
```

## React Hooks for Background Sync

### useBackgroundSync Hook

Create a custom hook for easy integration with React components:

```typescript
// src/hooks/useBackgroundSync.ts
import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '../services/syncManager';

interface SyncStatus {
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
  total: number;
}

interface UseBackgroundSyncReturn {
  queueRequest: (url: string, options: RequestInit, metadata?: Record<string, unknown>) => Promise<string>;
  processQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;
  status: SyncStatus;
  isProcessing: boolean;
  lastSyncEvent: SyncEvent | null;
}

type SyncEvent = {
  type: string;
  id?: string;
  url?: string;
  timestamp: number;
};

export function useBackgroundSync(): UseBackgroundSyncReturn {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: 0,
    failed: 0,
    completed: 0,
    total: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncEvent, setLastSyncEvent] = useState<SyncEvent | null>(null);

  useEffect(() => {
    // Initial status fetch
    syncManager.getQueueStatus().then(setStatus);

    // Subscribe to sync events
    const unsubscribe = syncManager.subscribe((event) => {
      setLastSyncEvent({ ...event, timestamp: Date.now() } as SyncEvent);

      if (event.type === 'syncing') {
        setIsProcessing(true);
      } else if (event.type === 'completed' || event.type === 'failed') {
        syncManager.getQueueStatus().then(setStatus);
      }
    });

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Back online - processing queue');
      syncManager.processQueue().then(() => {
        syncManager.getQueueStatus().then(setStatus);
        setIsProcessing(false);
      });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const queueRequest = useCallback(async (
    url: string,
    options: RequestInit,
    metadata?: Record<string, unknown>
  ) => {
    const id = await syncManager.queueRequest(url, options, metadata);
    const newStatus = await syncManager.getQueueStatus();
    setStatus(newStatus);
    return id;
  }, []);

  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    await syncManager.processQueue();
    const newStatus = await syncManager.getQueueStatus();
    setStatus(newStatus);
    setIsProcessing(false);
  }, []);

  const retryFailed = useCallback(async () => {
    setIsProcessing(true);
    await syncManager.retryFailed();
    const newStatus = await syncManager.getQueueStatus();
    setStatus(newStatus);
    setIsProcessing(false);
  }, []);

  const clearQueue = useCallback(async () => {
    await syncManager.clearQueue();
    const newStatus = await syncManager.getQueueStatus();
    setStatus(newStatus);
  }, []);

  return {
    queueRequest,
    processQueue,
    retryFailed,
    clearQueue,
    status,
    isProcessing,
    lastSyncEvent,
  };
}
```

### useOfflineStatus Hook

Create a hook to track online/offline status:

```typescript
// src/hooks/useOfflineStatus.ts
import { useState, useEffect, useCallback } from 'react';

interface UseOfflineStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
}

export function useOfflineStatus(): UseOfflineStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(
    navigator.onLine ? null : new Date()
  );
  const [connectionInfo, setConnectionInfo] = useState<{
    type: string | null;
    effectiveType: string | null;
  }>({ type: null, effectiveType: null });

  const updateConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionInfo({
        type: connection.type || null,
        effectiveType: connection.effectiveType || null,
      });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOfflineTime(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [updateConnectionInfo]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineTime,
    lastOfflineTime,
    connectionType: connectionInfo.type,
    effectiveType: connectionInfo.effectiveType,
  };
}
```

## React Components

### Offline Indicator Component

```typescript
// src/components/OfflineIndicator.tsx
import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface OfflineIndicatorProps {
  showOnlineMessage?: boolean;
  onlineTimeout?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showOnlineMessage = true,
  onlineTimeout = 3000,
}) => {
  const { isOnline, isOffline, lastOfflineTime } = useOfflineStatus();
  const [showOnline, setShowOnline] = React.useState(false);

  React.useEffect(() => {
    if (isOnline && showOnlineMessage) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), onlineTimeout);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOnlineMessage, onlineTimeout]);

  if (isOffline) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f44336',
          color: 'white',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 9999,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>!</span>
          <div>
            <strong>You are offline</strong>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Changes will be synced when you reconnect
              {lastOfflineTime && (
                <span> (since {lastOfflineTime.toLocaleTimeString()})</span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showOnline) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
        }}
      >
        <span style={{ fontSize: '20px' }}>OK</span>
        <strong>Back online - syncing changes...</strong>
      </div>
    );
  }

  return null;
};
```

### Sync Status Component

```typescript
// src/components/SyncStatus.tsx
import React from 'react';
import { useBackgroundSync } from '../hooks/useBackgroundSync';

interface SyncStatusProps {
  showDetails?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ showDetails = false }) => {
  const { status, isProcessing, retryFailed, clearQueue } = useBackgroundSync();

  const hasItems = status.total > 0;
  const hasFailed = status.failed > 0;

  if (!hasItems && !isProcessing) {
    return null;
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        margin: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Sync Status</h3>
        {isProcessing && (
          <span
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '2px solid #ccc',
              borderTopColor: '#333',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
      </div>

      {showDetails && (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
              {status.pending}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>
              {status.syncing}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Syncing</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
              {status.failed}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
              {status.completed}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Completed</div>
          </div>
        </div>
      )}

      {hasFailed && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={retryFailed}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Retry Failed ({status.failed})
          </button>
          <button
            onClick={clearQueue}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear Completed
          </button>
        </div>
      )}
    </div>
  );
};
```

## Practical Implementation Examples

### Form with Background Sync

```typescript
// src/components/SyncedForm.tsx
import React, { useState } from 'react';
import { useBackgroundSync } from '../hooks/useBackgroundSync';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface FormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export const SyncedForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const { queueRequest, status } = useBackgroundSync();
  const { isOffline } = useOfflineStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (isOffline) {
        // Queue the request for later
        await queueRequest(
          '/api/tasks',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          },
          { formType: 'task', submittedAt: Date.now() }
        );

        setMessage({
          type: 'info',
          text: 'You are offline. Your task has been saved and will sync when you reconnect.',
        });
      } else {
        // Try to submit directly
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to submit');
        }

        setMessage({
          type: 'success',
          text: 'Task created successfully!',
        });
      }

      // Reset form
      setFormData({ title: '', description: '', priority: 'medium' });
    } catch (error) {
      // Network error - queue for background sync
      await queueRequest(
        '/api/tasks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
        { formType: 'task', submittedAt: Date.now() }
      );

      setMessage({
        type: 'info',
        text: 'Network error. Your task has been queued and will sync automatically.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>Create Task</h2>

      {message && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#e8f5e9' : '#e3f2fd',
            color: message.type === 'success' ? '#2e7d32' : '#1565c0',
          }}
        >
          {message.text}
        </div>
      )}

      {status.pending > 0 && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '16px',
            borderRadius: '4px',
            backgroundColor: '#fff3e0',
            color: '#e65100',
            fontSize: '14px',
          }}
        >
          {status.pending} item(s) waiting to sync
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as FormData['priority'] })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isOffline ? '#ff9800' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        {submitting ? 'Saving...' : isOffline ? 'Save Offline' : 'Create Task'}
      </button>
    </form>
  );
};
```

### Data Fetching with Offline Cache

```typescript
// src/hooks/useOfflineData.ts
import { useState, useEffect, useCallback } from 'react';
import { indexedDBService } from '../services/indexedDBService';

interface UseOfflineDataOptions<T> {
  url: string;
  cacheKey: string;
  staleTime?: number;
  onError?: (error: Error) => void;
}

interface UseOfflineDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isOffline: boolean;
}

export function useOfflineData<T>({
  url,
  cacheKey,
  staleTime = 5 * 60 * 1000, // 5 minutes
  onError,
}: UseOfflineDataOptions<T>): UseOfflineDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from network first
      if (navigator.onLine) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const freshData = await response.json();
        setData(freshData);
        setIsStale(false);

        // Cache the data
        await indexedDBService.saveOfflineData(cacheKey, {
          data: freshData,
          timestamp: Date.now(),
        });
      } else {
        // Fall back to cached data
        const cached = await indexedDBService.getOfflineData(cacheKey);
        if (cached.length > 0) {
          const latestCache = cached.sort((a, b) => b.timestamp - a.timestamp)[0];
          setData(latestCache.data as T);
          setIsStale(Date.now() - latestCache.timestamp > staleTime);
        } else {
          throw new Error('No cached data available');
        }
      }
    } catch (err) {
      // Try to use cached data on error
      const cached = await indexedDBService.getOfflineData(cacheKey);
      if (cached.length > 0) {
        const latestCache = cached.sort((a, b) => b.timestamp - a.timestamp)[0];
        setData(latestCache.data as T);
        setIsStale(true);
      } else {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, cacheKey, staleTime, onError]);

  useEffect(() => {
    fetchData();

    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    isStale,
    error,
    refetch: fetchData,
    isOffline,
  };
}
```

## Testing Background Sync

### Testing Service Worker

```typescript
// src/tests/syncManager.test.ts
import { syncManager } from '../services/syncManager';
import { indexedDBService } from '../services/indexedDBService';

describe('SyncManager', () => {
  beforeEach(async () => {
    await indexedDBService.initialize();
  });

  afterEach(async () => {
    await indexedDBService.clearCompletedItems();
  });

  test('queues request when offline', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const id = await syncManager.queueRequest(
      '/api/test',
      { method: 'POST', body: JSON.stringify({ test: true }) }
    );

    expect(id).toBeDefined();

    const status = await syncManager.getQueueStatus();
    expect(status.pending).toBe(1);
  });

  test('processes queue when online', async () => {
    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await syncManager.queueRequest(
      '/api/test',
      { method: 'POST', body: JSON.stringify({ test: true }) }
    );

    const results = await syncManager.processQueue();

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  test('retries failed requests with exponential backoff', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    let attempts = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    await syncManager.queueRequest('/api/test', { method: 'POST' });
    const results = await syncManager.processQueue({ maxRetries: 3 });

    expect(attempts).toBe(3);
    expect(results[0].success).toBe(true);
  });
});
```

### Testing with Chrome DevTools

To test background sync during development:

1. Open Chrome DevTools (F12)
2. Go to Application > Service Workers
3. Check "Offline" to simulate offline mode
4. Perform actions in your app (form submissions, etc.)
5. Uncheck "Offline" to trigger sync

You can also manually trigger sync events:

```javascript
// In Chrome DevTools Console
navigator.serviceWorker.ready.then((registration) => {
  registration.sync.register('apiSyncQueue');
});
```

## Browser Support and Fallbacks

### Feature Detection

```typescript
// src/utils/featureDetection.ts
export const features = {
  serviceWorker: 'serviceWorker' in navigator,
  backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
  periodicBackgroundSync: 'serviceWorker' in navigator && 'PeriodicSyncManager' in window,
  indexedDB: 'indexedDB' in window,
  cacheAPI: 'caches' in window,
};

export function getBackgroundSyncSupport(): {
  supported: boolean;
  method: 'native' | 'polyfill' | 'none';
} {
  if (features.backgroundSync) {
    return { supported: true, method: 'native' };
  }

  if (features.serviceWorker && features.indexedDB) {
    return { supported: true, method: 'polyfill' };
  }

  return { supported: false, method: 'none' };
}
```

### Graceful Degradation

```typescript
// src/services/syncService.ts
import { syncManager } from './syncManager';
import { getBackgroundSyncSupport } from '../utils/featureDetection';

export async function submitWithSync(
  url: string,
  options: RequestInit,
  metadata?: Record<string, unknown>
): Promise<{ queued: boolean; immediate: boolean; response?: unknown }> {
  const support = getBackgroundSyncSupport();

  // If background sync is supported, use it
  if (support.supported) {
    const id = await syncManager.queueRequest(url, options, metadata);
    return { queued: true, immediate: false };
  }

  // Fallback: try immediate request
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return { queued: false, immediate: true, response: data };
  } catch (error) {
    // Last resort: store in localStorage for manual retry
    const pendingRequests = JSON.parse(
      localStorage.getItem('pendingRequests') || '[]'
    );
    pendingRequests.push({
      url,
      options,
      metadata,
      timestamp: Date.now(),
    });
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));

    return { queued: true, immediate: false };
  }
}
```

## Summary

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Service Worker** | Workbox with BackgroundSyncPlugin | Intercepts and queues failed requests |
| **IndexedDB** | idb library wrapper | Persistent storage for queue and offline data |
| **Sync Manager** | Custom TypeScript class | Manages queue processing with retries |
| **useBackgroundSync** | React hook | Component integration for sync operations |
| **useOfflineStatus** | React hook | Real-time online/offline detection |
| **OfflineIndicator** | React component | Visual feedback for connectivity status |
| **SyncStatus** | React component | Queue status dashboard |
| **Feature Detection** | Utility functions | Graceful degradation for unsupported browsers |
| **Exponential Backoff** | Retry strategy | Prevents server overload during retries |
| **Periodic Sync** | Optional API | Regular background data refresh |

Background Sync transforms your React PWA from a simple web application into a robust, offline-capable platform. Users can confidently perform actions regardless of their network connectivity, knowing that their data will be synchronized when conditions improve. This reliability is essential for building trust with users and creating truly native-like experiences on the web.

The combination of service workers, IndexedDB, and thoughtful React integration creates a seamless experience where network failures become invisible to users. As connectivity continues to be unpredictable (mobile networks, travel, etc.), Background Sync becomes an essential capability for any serious PWA.

---

**Related Reading:**

- [Native Apps Had a Good Run, But PWA Has Caught Up](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
