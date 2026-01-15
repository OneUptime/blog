# How to Implement Offline-First State Management in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Offline-First, State Management, Mobile Development, Sync

Description: Learn how to implement offline-first state management in React Native for apps that work seamlessly without network connectivity.

---

Mobile users expect apps to work regardless of network conditions. Whether they are in a subway tunnel, on a flight, or in an area with spotty coverage, your React Native app should continue functioning smoothly. This is where offline-first architecture becomes essential.

In this comprehensive guide, we will explore how to implement robust offline-first state management in React Native, covering everything from basic principles to advanced sync strategies.

## Understanding Offline-First Architecture

Offline-first is a design philosophy where applications are built to work without an internet connection as the default state, treating network connectivity as an enhancement rather than a requirement.

### Core Principles

1. **Local-First Data**: All data operations happen locally first
2. **Eventual Consistency**: Changes sync to the server when connectivity is available
3. **Optimistic Updates**: UI reflects changes immediately without waiting for server confirmation
4. **Conflict Resolution**: Clear strategies for handling data conflicts
5. **Transparent Sync**: Users understand the sync state of their data

### Benefits of Offline-First

- **Better User Experience**: No loading spinners or failed requests
- **Improved Performance**: Local operations are instant
- **Reliability**: App works regardless of network conditions
- **Battery Efficiency**: Reduced network requests save battery
- **Data Integrity**: Local storage ensures no data loss

## Network State Detection

The foundation of any offline-first app is accurate network state detection. React Native provides several ways to monitor connectivity.

### Using NetInfo

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState, useCallback } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkStatus;
};
```

### Network Quality Assessment

Beyond simple connectivity, assessing network quality helps optimize sync strategies:

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkQuality {
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  shouldSync: boolean;
  syncStrategy: 'immediate' | 'batched' | 'deferred';
}

export const assessNetworkQuality = async (): Promise<NetworkQuality> => {
  const state: NetInfoState = await NetInfo.fetch();

  if (!state.isConnected) {
    return {
      quality: 'offline',
      shouldSync: false,
      syncStrategy: 'deferred',
    };
  }

  // Check connection type for quality assessment
  const connectionType = state.type;
  const details = state.details;

  if (connectionType === 'wifi') {
    return {
      quality: 'excellent',
      shouldSync: true,
      syncStrategy: 'immediate',
    };
  }

  if (connectionType === 'cellular') {
    const cellularGeneration = (details as any)?.cellularGeneration;

    if (cellularGeneration === '4g' || cellularGeneration === '5g') {
      return {
        quality: 'good',
        shouldSync: true,
        syncStrategy: 'batched',
      };
    }

    return {
      quality: 'poor',
      shouldSync: true,
      syncStrategy: 'deferred',
    };
  }

  return {
    quality: 'poor',
    shouldSync: false,
    syncStrategy: 'deferred',
  };
};
```

## Optimistic UI Updates

Optimistic updates create the perception of instant responses by updating the UI before server confirmation.

### Implementing Optimistic Updates

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  localTimestamp: number;
  serverTimestamp?: number;
}

interface TasksState {
  items: Task[];
  pendingActions: PendingAction[];
}

interface PendingAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const initialState: TasksState = {
  items: [],
  pendingActions: [],
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Optimistic create
    createTaskOptimistic: (state, action: PayloadAction<{ title: string }>) => {
      const tempId = `temp_${uuidv4()}`;
      const newTask: Task = {
        id: tempId,
        title: action.payload.title,
        completed: false,
        syncStatus: 'pending',
        localTimestamp: Date.now(),
      };

      state.items.push(newTask);
      state.pendingActions.push({
        id: uuidv4(),
        type: 'CREATE',
        payload: { tempId, title: action.payload.title },
        timestamp: Date.now(),
        retryCount: 0,
      });
    },

    // Confirm server sync
    confirmTaskCreated: (
      state,
      action: PayloadAction<{ tempId: string; serverId: string; serverTimestamp: number }>
    ) => {
      const task = state.items.find((t) => t.id === action.payload.tempId);
      if (task) {
        task.id = action.payload.serverId;
        task.syncStatus = 'synced';
        task.serverTimestamp = action.payload.serverTimestamp;
      }

      // Remove pending action
      state.pendingActions = state.pendingActions.filter(
        (a) => a.payload.tempId !== action.payload.tempId
      );
    },

    // Handle sync failure
    markTaskSyncFailed: (state, action: PayloadAction<{ tempId: string }>) => {
      const task = state.items.find((t) => t.id === action.payload.tempId);
      if (task) {
        task.syncStatus = 'failed';
      }
    },

    // Optimistic update
    updateTaskOptimistic: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<Task> }>
    ) => {
      const task = state.items.find((t) => t.id === action.payload.id);
      if (task) {
        const previousState = { ...task };
        Object.assign(task, action.payload.changes);
        task.syncStatus = 'pending';
        task.localTimestamp = Date.now();

        state.pendingActions.push({
          id: uuidv4(),
          type: 'UPDATE',
          payload: {
            id: action.payload.id,
            changes: action.payload.changes,
            previousState,
          },
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
    },

    // Rollback failed update
    rollbackTaskUpdate: (state, action: PayloadAction<{ actionId: string }>) => {
      const pendingAction = state.pendingActions.find(
        (a) => a.id === action.payload.actionId
      );

      if (pendingAction && pendingAction.type === 'UPDATE') {
        const task = state.items.find((t) => t.id === pendingAction.payload.id);
        if (task) {
          Object.assign(task, pendingAction.payload.previousState);
        }
      }

      state.pendingActions = state.pendingActions.filter(
        (a) => a.id !== action.payload.actionId
      );
    },
  },
});

export const {
  createTaskOptimistic,
  confirmTaskCreated,
  markTaskSyncFailed,
  updateTaskOptimistic,
  rollbackTaskUpdate,
} = tasksSlice.actions;

export default tasksSlice.reducer;
```

## Queue System for Pending Actions

A robust queue system ensures all local changes eventually sync to the server.

### Action Queue Implementation

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

interface ProcessResult {
  success: boolean;
  data?: any;
  error?: Error;
}

type ActionProcessor = (action: QueuedAction) => Promise<ProcessResult>;

class ActionQueue {
  private queue: QueuedAction[] = [];
  private isProcessing: boolean = false;
  private storageKey: string = '@action_queue';
  private processors: Map<string, ActionProcessor> = new Map();

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load action queue:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist action queue:', error);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  registerProcessor(actionType: string, processor: ActionProcessor): void {
    this.processors.set(actionType, processor);
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queuedAction.priority);
    this.queue.splice(insertIndex, 0, queuedAction);

    await this.persistQueue();

    // Try to process immediately if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable) {
      this.processQueue();
    }

    return queuedAction.id;
  }

  private findInsertIndex(priority: 'high' | 'normal' | 'low'): number {
    if (priority === 'high') {
      // Find first non-high priority item
      return this.queue.findIndex((a) => a.priority !== 'high');
    }

    if (priority === 'low') {
      return this.queue.length;
    }

    // Normal priority: after high, before low
    const lastHighIndex = this.queue.reduce(
      (acc, a, i) => (a.priority === 'high' ? i : acc),
      -1
    );
    return lastHighIndex + 1;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) {
        break;
      }

      const action = this.queue[0];
      const processor = this.processors.get(action.type);

      if (!processor) {
        console.warn(`No processor registered for action type: ${action.type}`);
        this.queue.shift();
        continue;
      }

      try {
        const result = await processor(action);

        if (result.success) {
          this.queue.shift();
          await this.persistQueue();
        } else {
          await this.handleFailure(action, result.error);
        }
      } catch (error) {
        await this.handleFailure(action, error as Error);
      }
    }

    this.isProcessing = false;
  }

  private async handleFailure(action: QueuedAction, error?: Error): Promise<void> {
    action.retryCount += 1;

    if (action.retryCount >= action.maxRetries) {
      // Move to dead letter queue
      await this.moveToDeadLetter(action, error);
      this.queue.shift();
    } else {
      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, action.retryCount), 30000);
      await this.delay(backoffMs);
    }

    await this.persistQueue();
  }

  private async moveToDeadLetter(action: QueuedAction, error?: Error): Promise<void> {
    const deadLetterKey = '@dead_letter_queue';
    try {
      const stored = await AsyncStorage.getItem(deadLetterKey);
      const deadLetter = stored ? JSON.parse(stored) : [];
      deadLetter.push({
        ...action,
        failedAt: Date.now(),
        error: error?.message,
      });
      await AsyncStorage.setItem(deadLetterKey, JSON.stringify(deadLetter));
    } catch (e) {
      console.error('Failed to move action to dead letter queue:', e);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getPendingActions(): QueuedAction[] {
    return [...this.queue];
  }
}

export const actionQueue = new ActionQueue();
```

## Conflict Resolution Strategies

When the same data is modified both locally and on the server, conflicts must be resolved intelligently.

### Conflict Detection and Resolution

```typescript
interface DataRecord {
  id: string;
  data: any;
  localVersion: number;
  serverVersion: number;
  localTimestamp: number;
  serverTimestamp: number;
  conflictStatus: 'none' | 'detected' | 'resolved';
}

interface ConflictInfo {
  recordId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
}

type ConflictStrategy = 'server-wins' | 'client-wins' | 'last-write-wins' | 'merge' | 'manual';

type MergeFunction = (local: any, server: any) => any;
type ManualResolutionCallback = (conflict: ConflictInfo) => Promise<any>;

class ConflictResolver {
  private strategy: ConflictStrategy;
  private mergeFunction?: MergeFunction;
  private manualResolutionCallback?: ManualResolutionCallback;

  constructor(strategy: ConflictStrategy = 'last-write-wins') {
    this.strategy = strategy;
  }

  setMergeFunction(fn: MergeFunction): void {
    this.mergeFunction = fn;
  }

  setManualResolutionCallback(callback: ManualResolutionCallback): void {
    this.manualResolutionCallback = callback;
  }

  detectConflict(local: DataRecord, server: DataRecord): boolean {
    // Conflict exists if both have changed since last sync
    return (
      local.localVersion > local.serverVersion &&
      server.serverVersion > local.serverVersion
    );
  }

  async resolve(local: DataRecord, server: DataRecord): Promise<any> {
    if (!this.detectConflict(local, server)) {
      // No conflict - return newer version
      return local.localTimestamp > server.serverTimestamp ? local.data : server.data;
    }

    switch (this.strategy) {
      case 'server-wins':
        return server.data;

      case 'client-wins':
        return local.data;

      case 'last-write-wins':
        return local.localTimestamp > server.serverTimestamp
          ? local.data
          : server.data;

      case 'merge':
        if (!this.mergeFunction) {
          throw new Error('Merge function not defined');
        }
        return this.mergeFunction(local.data, server.data);

      case 'manual':
        if (!this.manualResolutionCallback) {
          throw new Error('Manual resolution callback not defined');
        }
        return this.manualResolutionCallback({
          recordId: local.id,
          localData: local.data,
          serverData: server.data,
          localTimestamp: local.localTimestamp,
          serverTimestamp: server.serverTimestamp,
        });

      default:
        return server.data;
    }
  }
}

// Example merge function for task objects
const taskMergeFunction: MergeFunction = (local, server) => {
  return {
    ...server,
    // Keep local title if modified more recently
    title: local.titleModifiedAt > server.titleModifiedAt ? local.title : server.title,
    // Keep local completion status if modified more recently
    completed:
      local.completedModifiedAt > server.completedModifiedAt
        ? local.completed
        : server.completed,
    // Merge tags from both
    tags: [...new Set([...local.tags, ...server.tags])],
  };
};

export const conflictResolver = new ConflictResolver('merge');
conflictResolver.setMergeFunction(taskMergeFunction);
```

## Local-First Data Patterns

Local-first means treating the local database as the source of truth.

### Local Database with Sync Status

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocalRecord<T> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
  deleted: boolean;
  version: number;
}

interface SyncMetadata {
  lastSyncTimestamp: number;
  syncInProgress: boolean;
  pendingChanges: number;
}

class LocalFirstStore<T> {
  private collectionName: string;
  private cache: Map<string, LocalRecord<T>> = new Map();
  private syncMetadata: SyncMetadata = {
    lastSyncTimestamp: 0,
    syncInProgress: false,
    pendingChanges: 0,
  };

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.loadFromStorage();
  }

  private getStorageKey(): string {
    return `@localfirst_${this.collectionName}`;
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getStorageKey());
      if (stored) {
        const records: LocalRecord<T>[] = JSON.parse(stored);
        records.forEach((record) => {
          this.cache.set(record.id, record);
        });
        this.updatePendingCount();
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const records = Array.from(this.cache.values());
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(records));
    } catch (error) {
      console.error('Failed to persist to storage:', error);
    }
  }

  private updatePendingCount(): void {
    this.syncMetadata.pendingChanges = Array.from(this.cache.values()).filter(
      (record) =>
        record.syncedAt === null || record.updatedAt > (record.syncedAt || 0)
    ).length;
  }

  async create(id: string, data: T): Promise<LocalRecord<T>> {
    const now = Date.now();
    const record: LocalRecord<T> = {
      id,
      data,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deleted: false,
      version: 1,
    };

    this.cache.set(id, record);
    await this.persistToStorage();
    this.updatePendingCount();

    return record;
  }

  async update(id: string, data: Partial<T>): Promise<LocalRecord<T> | null> {
    const existing = this.cache.get(id);
    if (!existing || existing.deleted) {
      return null;
    }

    const updated: LocalRecord<T> = {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.cache.set(id, updated);
    await this.persistToStorage();
    this.updatePendingCount();

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = this.cache.get(id);
    if (!existing) {
      return false;
    }

    // Soft delete for sync purposes
    const deleted: LocalRecord<T> = {
      ...existing,
      deleted: true,
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.cache.set(id, deleted);
    await this.persistToStorage();
    this.updatePendingCount();

    return true;
  }

  get(id: string): LocalRecord<T> | null {
    const record = this.cache.get(id);
    return record && !record.deleted ? record : null;
  }

  getAll(): LocalRecord<T>[] {
    return Array.from(this.cache.values()).filter((record) => !record.deleted);
  }

  getPendingChanges(): LocalRecord<T>[] {
    return Array.from(this.cache.values()).filter(
      (record) =>
        record.syncedAt === null || record.updatedAt > (record.syncedAt || 0)
    );
  }

  async markSynced(id: string, serverTimestamp: number): Promise<void> {
    const record = this.cache.get(id);
    if (record) {
      record.syncedAt = serverTimestamp;
      await this.persistToStorage();
      this.updatePendingCount();
    }
  }

  async hardDelete(id: string): Promise<void> {
    this.cache.delete(id);
    await this.persistToStorage();
    this.updatePendingCount();
  }

  getSyncMetadata(): SyncMetadata {
    return { ...this.syncMetadata };
  }
}

export { LocalFirstStore, LocalRecord, SyncMetadata };
```

## Syncing When Back Online

Implementing a robust sync service that handles reconnection gracefully.

### Sync Service Implementation

```typescript
import NetInfo from '@react-native-community/netinfo';
import { LocalFirstStore, LocalRecord } from './LocalFirstStore';

interface SyncResult<T> {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictRecord<T>[];
}

interface ConflictRecord<T> {
  localRecord: LocalRecord<T>;
  serverRecord: T;
}

interface ServerResponse<T> {
  id: string;
  data: T;
  serverTimestamp: number;
  version: number;
}

interface SyncServiceConfig {
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

class SyncService<T> {
  private store: LocalFirstStore<T>;
  private apiEndpoint: string;
  private config: SyncServiceConfig;
  private syncInProgress: boolean = false;
  private listeners: Set<(result: SyncResult<T>) => void> = new Set();

  constructor(
    store: LocalFirstStore<T>,
    apiEndpoint: string,
    config: Partial<SyncServiceConfig> = {}
  ) {
    this.store = store;
    this.apiEndpoint = apiEndpoint;
    this.config = {
      batchSize: config.batchSize || 50,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.sync();
      }
    });
  }

  addSyncListener(listener: (result: SyncResult<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(result: SyncResult<T>): void {
    this.listeners.forEach((listener) => listener(result));
  }

  async sync(): Promise<SyncResult<T>> {
    if (this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }

    this.syncInProgress = true;

    const result: SyncResult<T> = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
    };

    try {
      // Push local changes
      const pushResult = await this.pushChanges();
      result.synced += pushResult.synced;
      result.failed += pushResult.failed;
      result.conflicts.push(...pushResult.conflicts);

      // Pull server changes
      const pullResult = await this.pullChanges();
      result.synced += pullResult.synced;
      result.conflicts.push(...pullResult.conflicts);

      result.success = result.failed === 0;
    } catch (error) {
      result.success = false;
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners(result);
    }

    return result;
  }

  private async pushChanges(): Promise<{
    synced: number;
    failed: number;
    conflicts: ConflictRecord<T>[];
  }> {
    const pendingChanges = this.store.getPendingChanges();
    let synced = 0;
    let failed = 0;
    const conflicts: ConflictRecord<T>[] = [];

    // Process in batches
    for (let i = 0; i < pendingChanges.length; i += this.config.batchSize) {
      const batch = pendingChanges.slice(i, i + this.config.batchSize);

      for (const record of batch) {
        try {
          const response = await this.pushRecord(record);

          if (response.conflict) {
            conflicts.push({
              localRecord: record,
              serverRecord: response.serverData,
            });
          } else {
            await this.store.markSynced(record.id, response.serverTimestamp);
            synced++;
          }
        } catch (error) {
          failed++;
          console.error(`Failed to push record ${record.id}:`, error);
        }
      }
    }

    return { synced, failed, conflicts };
  }

  private async pushRecord(
    record: LocalRecord<T>
  ): Promise<{
    conflict: boolean;
    serverData?: T;
    serverTimestamp: number;
  }> {
    const endpoint = record.deleted
      ? `${this.apiEndpoint}/${record.id}`
      : record.syncedAt === null
        ? this.apiEndpoint
        : `${this.apiEndpoint}/${record.id}`;

    const method = record.deleted ? 'DELETE' : record.syncedAt === null ? 'POST' : 'PUT';

    const response = await this.fetchWithRetry(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'If-Match': record.version.toString(),
      },
      body: !record.deleted ? JSON.stringify(record.data) : undefined,
    });

    if (response.status === 409) {
      // Conflict detected
      const serverData = await response.json();
      return {
        conflict: true,
        serverData: serverData.data,
        serverTimestamp: serverData.serverTimestamp,
      };
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    return {
      conflict: false,
      serverTimestamp: result.serverTimestamp,
    };
  }

  private async pullChanges(): Promise<{
    synced: number;
    conflicts: ConflictRecord<T>[];
  }> {
    const metadata = this.store.getSyncMetadata();
    let synced = 0;
    const conflicts: ConflictRecord<T>[] = [];

    try {
      const response = await this.fetchWithRetry(
        `${this.apiEndpoint}?since=${metadata.lastSyncTimestamp}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const serverRecords: ServerResponse<T>[] = await response.json();

      for (const serverRecord of serverRecords) {
        const localRecord = this.store.get(serverRecord.id);

        if (localRecord) {
          // Check for conflicts
          if (
            localRecord.updatedAt > (localRecord.syncedAt || 0) &&
            serverRecord.version > localRecord.version
          ) {
            conflicts.push({
              localRecord,
              serverRecord: serverRecord.data,
            });
          } else if (serverRecord.version > localRecord.version) {
            await this.store.update(serverRecord.id, serverRecord.data as Partial<T>);
            await this.store.markSynced(serverRecord.id, serverRecord.serverTimestamp);
            synced++;
          }
        } else {
          await this.store.create(serverRecord.id, serverRecord.data);
          await this.store.markSynced(serverRecord.id, serverRecord.serverTimestamp);
          synced++;
        }
      }
    } catch (error) {
      console.error('Failed to pull changes:', error);
    }

    return { synced, conflicts };
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { SyncService, SyncResult };
```

## Redux Offline Integration

Integrating with Redux Offline for a comprehensive offline-first Redux solution.

### Redux Offline Configuration

```typescript
import { createStore, applyMiddleware, combineReducers, Store, AnyAction } from 'redux';
import { offline } from '@redux-offline/redux-offline';
import offlineConfig from '@redux-offline/redux-offline/lib/defaults';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineAction extends AnyAction {
  meta?: {
    offline?: {
      effect: {
        url: string;
        method: string;
        body?: string;
        headers?: Record<string, string>;
      };
      commit: {
        type: string;
        meta?: any;
      };
      rollback: {
        type: string;
        meta?: any;
      };
    };
  };
}

interface OfflineState {
  online: boolean;
  busy: boolean;
  lastTransaction: number;
  outbox: OfflineAction[];
}

// Custom effect handler
const customEffect = async (
  effect: { url: string; method: string; body?: string; headers?: Record<string, string> },
  _action: OfflineAction
): Promise<any> => {
  const response = await fetch(effect.url, {
    method: effect.method,
    headers: {
      'Content-Type': 'application/json',
      ...effect.headers,
    },
    body: effect.body,
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

// Custom discard handler
const customDiscard = (
  error: any,
  _action: OfflineAction,
  _retries: number
): boolean => {
  // Don't retry on client errors (4xx)
  if (error.status >= 400 && error.status < 500) {
    return true;
  }

  // Retry on server errors (5xx)
  return false;
};

// Custom persist handler using AsyncStorage
const customPersistOptions = {
  key: 'offline',
  storage: {
    getItem: async (key: string) => {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    },
    setItem: async (key: string, value: any) => {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: async (key: string) => {
      await AsyncStorage.removeItem(key);
    },
  },
};

const customOfflineConfig = {
  ...offlineConfig,
  effect: customEffect,
  discard: customDiscard,
  persistOptions: customPersistOptions,
  retry: (_action: OfflineAction, retries: number): number | null => {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, retries), 30000);
    return delay;
  },
};

// Example reducer
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TasksState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

const initialTasksState: TasksState = {
  items: [],
  loading: false,
  error: null,
};

const tasksReducer = (
  state: TasksState = initialTasksState,
  action: AnyAction
): TasksState => {
  switch (action.type) {
    case 'CREATE_TASK':
      return {
        ...state,
        items: [...state.items, action.payload],
      };

    case 'CREATE_TASK_COMMIT':
      // Update temp ID with server ID
      return {
        ...state,
        items: state.items.map((task) =>
          task.id === action.meta.tempId ? { ...task, id: action.payload.id } : task
        ),
      };

    case 'CREATE_TASK_ROLLBACK':
      // Remove the optimistically added task
      return {
        ...state,
        items: state.items.filter((task) => task.id !== action.meta.tempId),
        error: 'Failed to create task',
      };

    default:
      return state;
  }
};

const rootReducer = combineReducers({
  tasks: tasksReducer,
});

// Create store with offline middleware
const store: Store = createStore(
  rootReducer,
  offline(customOfflineConfig) as any
);

// Action creators
export const createTaskOffline = (title: string): OfflineAction => {
  const tempId = `temp_${Date.now()}`;

  return {
    type: 'CREATE_TASK',
    payload: { id: tempId, title, completed: false },
    meta: {
      offline: {
        effect: {
          url: '/api/tasks',
          method: 'POST',
          body: JSON.stringify({ title, completed: false }),
        },
        commit: { type: 'CREATE_TASK_COMMIT', meta: { tempId } },
        rollback: { type: 'CREATE_TASK_ROLLBACK', meta: { tempId } },
      },
    },
  };
};

export { store };
```

## WatermelonDB for Offline Data

WatermelonDB provides a powerful solution for complex offline-first data management.

### WatermelonDB Setup

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Model, tableSchema, appSchema } from '@nozbe/watermelondb';
import { field, date, readonly, children, relation } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';

// Schema definition
const taskSchema = tableSchema({
  name: 'tasks',
  columns: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', isOptional: true },
    { name: 'completed', type: 'boolean' },
    { name: 'priority', type: 'string' },
    { name: 'due_date', type: 'number', isOptional: true },
    { name: 'project_id', type: 'string', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

const projectSchema = tableSchema({
  name: 'projects',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

const schema = appSchema({
  version: 1,
  tables: [taskSchema, projectSchema],
});

// Model definitions
class Task extends Model {
  static table = 'tasks';
  static associations = {
    projects: { type: 'belongs_to' as const, key: 'project_id' },
  };

  @field('title') title!: string;
  @field('description') description?: string;
  @field('completed') completed!: boolean;
  @field('priority') priority!: string;
  @date('due_date') dueDate?: Date;
  @relation('projects', 'project_id') project!: any;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  async markComplete(): Promise<void> {
    await this.update((task) => {
      task.completed = true;
    });
  }
}

class Project extends Model {
  static table = 'projects';
  static associations = {
    tasks: { type: 'has_many' as const, foreignKey: 'project_id' },
  };

  @field('name') name!: string;
  @field('color') color!: string;
  @children('tasks') tasks!: any;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

// Database setup
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'myapp',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [Task, Project],
});

// Sync implementation
interface SyncPullResult {
  changes: {
    tasks: {
      created: any[];
      updated: any[];
      deleted: string[];
    };
    projects: {
      created: any[];
      updated: any[];
      deleted: string[];
    };
  };
  timestamp: number;
}

interface SyncPushChanges {
  tasks: {
    created: any[];
    updated: any[];
    deleted: string[];
  };
  projects: {
    created: any[];
    updated: any[];
    deleted: string[];
  };
}

async function syncDatabase(): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }): Promise<SyncPullResult> => {
      const response = await fetch(
        `/api/sync/pull?lastPulledAt=${lastPulledAt || 0}`
      );
      const { changes, timestamp }: SyncPullResult = await response.json();

      return { changes, timestamp };
    },
    pushChanges: async ({ changes }: { changes: SyncPushChanges }): Promise<void> => {
      await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
    },
    migrationsEnabledAtVersion: 1,
  });
}

// Repository pattern for data access
class TaskRepository {
  private collection = database.get<Task>('tasks');

  async getAll(): Promise<Task[]> {
    return this.collection.query().fetch();
  }

  async getByProject(projectId: string): Promise<Task[]> {
    return this.collection
      .query(Q.where('project_id', projectId))
      .fetch();
  }

  async getPending(): Promise<Task[]> {
    return this.collection
      .query(Q.where('completed', false))
      .fetch();
  }

  async create(data: {
    title: string;
    description?: string;
    priority: string;
    projectId: string;
    dueDate?: Date;
  }): Promise<Task> {
    return database.write(async () => {
      return this.collection.create((task) => {
        task.title = data.title;
        task.description = data.description;
        task.priority = data.priority;
        task._raw.project_id = data.projectId;
        if (data.dueDate) {
          task._raw.due_date = data.dueDate.getTime();
        }
        task.completed = false;
      });
    });
  }

  async update(
    id: string,
    data: Partial<{ title: string; description: string; completed: boolean; priority: string }>
  ): Promise<void> {
    const task = await this.collection.find(id);
    await database.write(async () => {
      await task.update((t) => {
        if (data.title !== undefined) t.title = data.title;
        if (data.description !== undefined) t.description = data.description;
        if (data.completed !== undefined) t.completed = data.completed;
        if (data.priority !== undefined) t.priority = data.priority;
      });
    });
  }

  async delete(id: string): Promise<void> {
    const task = await this.collection.find(id);
    await database.write(async () => {
      await task.markAsDeleted();
    });
  }
}

export { database, syncDatabase, TaskRepository, Task, Project };
```

## Error Handling for Sync Failures

Robust error handling ensures a smooth user experience even when sync fails.

### Comprehensive Error Handler

```typescript
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SyncErrorType =
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'CONFLICT_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

interface SyncError {
  type: SyncErrorType;
  message: string;
  originalError?: Error;
  recordId?: string;
  recoverable: boolean;
  retryable: boolean;
}

interface ErrorLog {
  timestamp: number;
  error: SyncError;
  context: Record<string, any>;
}

type RecoveryStrategy = (error: SyncError) => Promise<boolean>;
type ErrorCallback = (error: SyncError) => void;

class SyncErrorHandler {
  private errorLog: ErrorLog[] = [];
  private recoveryStrategies: Map<SyncErrorType, RecoveryStrategy> = new Map();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private maxLogSize: number = 100;

  constructor() {
    this.setupDefaultRecoveryStrategies();
    this.loadErrorLog();
  }

  private async loadErrorLog(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@sync_error_log');
      if (stored) {
        this.errorLog = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load error log:', error);
    }
  }

  private async persistErrorLog(): Promise<void> {
    try {
      // Keep only recent errors
      const recentErrors = this.errorLog.slice(-this.maxLogSize);
      await AsyncStorage.setItem('@sync_error_log', JSON.stringify(recentErrors));
    } catch (error) {
      console.error('Failed to persist error log:', error);
    }
  }

  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set('NETWORK_ERROR', async () => {
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.isInternetReachable === true;
    });

    // Auth error recovery
    this.recoveryStrategies.set('AUTH_ERROR', async () => {
      // Trigger re-authentication
      // This would typically dispatch to your auth system
      return false;
    });

    // Timeout error recovery
    this.recoveryStrategies.set('TIMEOUT_ERROR', async () => {
      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const state = await NetInfo.fetch();
      return state.isConnected === true;
    });
  }

  classifyError(error: Error, context?: Record<string, any>): SyncError {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        originalError: error,
        recoverable: true,
        retryable: true,
      };
    }

    if (message.includes('timeout')) {
      return {
        type: 'TIMEOUT_ERROR',
        message: 'Request timed out',
        originalError: error,
        recoverable: true,
        retryable: true,
      };
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return {
        type: 'AUTH_ERROR',
        message: 'Authentication failed',
        originalError: error,
        recoverable: true,
        retryable: false,
      };
    }

    if (message.includes('409') || message.includes('conflict')) {
      return {
        type: 'CONFLICT_ERROR',
        message: 'Data conflict detected',
        originalError: error,
        recordId: context?.recordId,
        recoverable: true,
        retryable: false,
      };
    }

    if (message.includes('400') || message.includes('validation')) {
      return {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        originalError: error,
        recordId: context?.recordId,
        recoverable: false,
        retryable: false,
      };
    }

    if (message.includes('5')) {
      return {
        type: 'SERVER_ERROR',
        message: 'Server error occurred',
        originalError: error,
        recoverable: true,
        retryable: true,
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      originalError: error,
      recoverable: false,
      retryable: false,
    };
  }

  async handleError(
    error: Error,
    context: Record<string, any> = {}
  ): Promise<{ handled: boolean; shouldRetry: boolean }> {
    const syncError = this.classifyError(error, context);

    // Log the error
    this.errorLog.push({
      timestamp: Date.now(),
      error: syncError,
      context,
    });
    await this.persistErrorLog();

    // Notify callbacks
    this.errorCallbacks.forEach((callback) => callback(syncError));

    // Attempt recovery
    const recoveryStrategy = this.recoveryStrategies.get(syncError.type);
    if (recoveryStrategy && syncError.recoverable) {
      try {
        const recovered = await recoveryStrategy(syncError);
        return { handled: true, shouldRetry: recovered && syncError.retryable };
      } catch {
        return { handled: false, shouldRetry: false };
      }
    }

    return { handled: false, shouldRetry: syncError.retryable };
  }

  addErrorCallback(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  setRecoveryStrategy(errorType: SyncErrorType, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errorLog.slice(-count);
  }

  async clearErrorLog(): Promise<void> {
    this.errorLog = [];
    await AsyncStorage.removeItem('@sync_error_log');
  }
}

export const syncErrorHandler = new SyncErrorHandler();
```

## UX Patterns for Offline States

Creating intuitive UI feedback for offline states improves user confidence.

### Offline UI Components

```tsx
import React, { useEffect, useState, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Network Status Banner
interface NetworkBannerProps {
  style?: ViewStyle;
}

export const NetworkStatusBanner: React.FC<NetworkBannerProps> = ({ style }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);

      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [slideAnim]);

  return (
    <Animated.View
      style={[
        styles.banner,
        style,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.bannerContent}>
        <View style={styles.offlineIndicator} />
        <Text style={styles.bannerText}>
          You are offline. Changes will sync when connected.
        </Text>
      </View>
    </Animated.View>
  );
};

// Sync Status Indicator
interface SyncStatusProps {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

export const SyncStatusIndicator: React.FC<SyncStatusProps> = ({
  pendingCount,
  isSyncing,
  lastSyncTime,
}) => {
  const [spinAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusText = (): string => {
    if (isSyncing) return 'Syncing...';
    if (pendingCount > 0) return `${pendingCount} pending changes`;
    if (lastSyncTime) {
      const minutes = Math.floor((Date.now() - lastSyncTime.getTime()) / 60000);
      if (minutes < 1) return 'Just synced';
      if (minutes < 60) return `Synced ${minutes}m ago`;
      return `Synced ${Math.floor(minutes / 60)}h ago`;
    }
    return 'Not synced';
  };

  return (
    <View style={styles.syncStatus}>
      <Animated.View
        style={[
          styles.syncIcon,
          isSyncing && { transform: [{ rotate: spin }] },
        ]}
      >
        <Text>{isSyncing ? '↻' : pendingCount > 0 ? '⬆' : '✓'}</Text>
      </Animated.View>
      <Text style={styles.syncText}>{getStatusText()}</Text>
    </View>
  );
};

// Offline Wrapper Component
interface OfflineWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  showWarning?: boolean;
}

export const OfflineWrapper: React.FC<OfflineWrapperProps> = ({
  children,
  fallback,
  showWarning = true,
}) => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  if (isOffline && fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.wrapper}>
      {showWarning && isOffline && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>Working offline</Text>
        </View>
      )}
      {children}
    </View>
  );
};

// Retry Button Component
interface RetryButtonProps {
  onRetry: () => void;
  isRetrying: boolean;
  errorMessage?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  isRetrying,
  errorMessage,
}) => {
  return (
    <View style={styles.retryContainer}>
      {errorMessage && (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      )}
      <TouchableOpacity
        style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
        onPress={onRetry}
        disabled={isRetrying}
      >
        <Text style={styles.retryButtonText}>
          {isRetrying ? 'Retrying...' : 'Retry Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Pending Changes Badge
interface PendingBadgeProps {
  count: number;
}

export const PendingChangesBadge: React.FC<PendingBadgeProps> = ({ count }) => {
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f44336',
    padding: 8,
    zIndex: 1000,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  syncIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  syncText: {
    fontSize: 12,
    color: '#666',
  },
  wrapper: {
    flex: 1,
  },
  warning: {
    backgroundColor: '#ff9800',
    padding: 4,
    alignItems: 'center',
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
  },
  retryContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorMessage: {
    color: '#f44336',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
```

## Testing Offline Scenarios

Comprehensive testing ensures your offline-first implementation works reliably.

### Test Utilities and Examples

```typescript
import { render, waitFor, act, RenderResult } from '@testing-library/react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Test utilities
class NetworkSimulator {
  private listeners: Set<(state: NetInfoState) => void> = new Set();
  private currentState: NetInfoState;

  constructor() {
    this.currentState = this.createOnlineState();

    (NetInfo.addEventListener as jest.Mock).mockImplementation(
      (callback: (state: NetInfoState) => void) => {
        this.listeners.add(callback);
        callback(this.currentState);
        return () => this.listeners.delete(callback);
      }
    );

    (NetInfo.fetch as jest.Mock).mockImplementation(
      () => Promise.resolve(this.currentState)
    );
  }

  private createOnlineState(): NetInfoState {
    return {
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        ssid: 'TestNetwork',
        bssid: '00:00:00:00:00:00',
        strength: 100,
        ipAddress: '192.168.1.1',
        subnet: '255.255.255.0',
        frequency: 2400,
        linkSpeed: 100,
        rxLinkSpeed: 100,
        txLinkSpeed: 100,
      },
    } as NetInfoState;
  }

  private createOfflineState(): NetInfoState {
    return {
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    } as NetInfoState;
  }

  goOnline(): void {
    this.currentState = this.createOnlineState();
    this.notifyListeners();
  }

  goOffline(): void {
    this.currentState = this.createOfflineState();
    this.notifyListeners();
  }

  setUnstableConnection(): void {
    this.currentState = {
      type: 'cellular',
      isConnected: true,
      isInternetReachable: false,
      details: {
        isConnectionExpensive: true,
        cellularGeneration: '3g',
        carrier: 'Test Carrier',
      },
    } as NetInfoState;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentState));
  }

  getCurrentState(): NetInfoState {
    return this.currentState;
  }
}

// Mock API for testing
class MockAPI {
  private latency: number = 100;
  private shouldFail: boolean = false;
  private failureType: 'network' | 'server' | 'conflict' = 'network';
  private data: Map<string, any> = new Map();

  setLatency(ms: number): void {
    this.latency = ms;
  }

  setFailure(shouldFail: boolean, type: 'network' | 'server' | 'conflict' = 'network'): void {
    this.shouldFail = shouldFail;
    this.failureType = type;
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    await new Promise((resolve) => setTimeout(resolve, this.latency));

    if (this.shouldFail) {
      switch (this.failureType) {
        case 'network':
          throw new Error('Network request failed');
        case 'server':
          return new Response(JSON.stringify({ error: 'Server error' }), {
            status: 500,
          });
        case 'conflict':
          return new Response(
            JSON.stringify({ error: 'Conflict', serverData: {} }),
            { status: 409 }
          );
      }
    }

    // Handle different methods
    const method = options?.method || 'GET';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 1];

    switch (method) {
      case 'GET':
        const data = this.data.get(id) || { id, data: {} };
        return new Response(JSON.stringify(data), { status: 200 });

      case 'POST':
        const newId = `server_${Date.now()}`;
        const newData = { id: newId, ...JSON.parse(options?.body as string) };
        this.data.set(newId, newData);
        return new Response(
          JSON.stringify({ ...newData, serverTimestamp: Date.now() }),
          { status: 201 }
        );

      case 'PUT':
        const updateData = { ...this.data.get(id), ...JSON.parse(options?.body as string) };
        this.data.set(id, updateData);
        return new Response(
          JSON.stringify({ ...updateData, serverTimestamp: Date.now() }),
          { status: 200 }
        );

      case 'DELETE':
        this.data.delete(id);
        return new Response(null, { status: 204 });

      default:
        return new Response(null, { status: 405 });
    }
  }

  seedData(id: string, data: any): void {
    this.data.set(id, data);
  }

  getData(id: string): any {
    return this.data.get(id);
  }

  clearData(): void {
    this.data.clear();
  }
}

// Example tests
describe('Offline-First State Management', () => {
  let networkSimulator: NetworkSimulator;
  let mockAPI: MockAPI;

  beforeEach(() => {
    networkSimulator = new NetworkSimulator();
    mockAPI = new MockAPI();
    global.fetch = mockAPI.fetch.bind(mockAPI) as typeof fetch;
  });

  describe('Network State Detection', () => {
    it('should detect when going offline', async () => {
      const { getByText }: RenderResult = render(<NetworkStatusBanner />);

      await act(async () => {
        networkSimulator.goOffline();
      });

      await waitFor(() => {
        expect(getByText(/offline/i)).toBeTruthy();
      });
    });

    it('should detect when coming back online', async () => {
      networkSimulator.goOffline();
      const { queryByText }: RenderResult = render(<NetworkStatusBanner />);

      await act(async () => {
        networkSimulator.goOnline();
      });

      await waitFor(() => {
        expect(queryByText(/offline/i)).toBeNull();
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should update UI immediately before server response', async () => {
      mockAPI.setLatency(1000); // Slow response

      // Test that UI updates immediately
      // Implementation depends on your specific store setup
    });

    it('should rollback on server failure', async () => {
      mockAPI.setFailure(true, 'server');

      // Test rollback behavior
    });
  });

  describe('Action Queue', () => {
    it('should queue actions when offline', async () => {
      networkSimulator.goOffline();

      // Test queueing behavior
    });

    it('should process queue when coming online', async () => {
      networkSimulator.goOffline();
      // Add actions to queue

      await act(async () => {
        networkSimulator.goOnline();
      });

      // Verify queue processing
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts correctly', async () => {
      mockAPI.setFailure(true, 'conflict');

      // Test conflict detection
    });

    it('should resolve conflicts using configured strategy', async () => {
      // Test conflict resolution
    });
  });

  describe('Sync Service', () => {
    it('should sync pending changes when online', async () => {
      // Test sync service
    });

    it('should handle partial sync failures', async () => {
      // Test partial failure handling
    });
  });
});

export { NetworkSimulator, MockAPI };
```

## Conclusion

Implementing offline-first state management in React Native requires careful consideration of multiple aspects: network detection, optimistic updates, action queueing, conflict resolution, and sync strategies. The key principles to remember are:

1. **Design for offline first**: Treat offline as the default state, not an exception
2. **Use local storage as the source of truth**: All operations should work locally first
3. **Implement robust sync mechanisms**: Handle conflicts, failures, and retries gracefully
4. **Provide clear UI feedback**: Users should always understand the sync state of their data
5. **Test thoroughly**: Simulate various network conditions and edge cases

By following the patterns and implementations outlined in this guide, you can build React Native applications that provide a seamless experience regardless of network conditions. Your users will appreciate an app that works reliably in subways, airplanes, and areas with poor connectivity.

Remember that offline-first is not just a technical implementation but a mindset. Every feature you build should consider how it will behave without network access. This approach leads to more resilient applications and happier users.

## Further Reading

- [Redux Offline Documentation](https://github.com/redux-offline/redux-offline)
- [WatermelonDB Documentation](https://nozbe.github.io/WatermelonDB/)
- [React Native NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)
- [Offline-First Web Development](https://offlinefirst.org/)
- [CRDTs for Conflict Resolution](https://crdt.tech/)
