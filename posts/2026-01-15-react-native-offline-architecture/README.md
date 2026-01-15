# How to Implement Offline-First Architecture in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Offline-First, Architecture, Mobile Development, Data Sync, Storage

Description: Learn how to design and implement offline-first architecture in React Native for apps that work seamlessly without connectivity.

---

Mobile users expect applications to work reliably regardless of network conditions. Whether they're in a subway tunnel, on an airplane, or in an area with spotty coverage, your app should remain functional. This is where offline-first architecture becomes essential.

In this comprehensive guide, we'll explore how to implement a robust offline-first architecture in React Native that provides a seamless user experience even without network connectivity.

## Understanding Offline-First Principles

Offline-first is a design philosophy where the application is built to function without a network connection as its primary mode of operation. Network connectivity is treated as an enhancement rather than a requirement.

### Core Principles

1. **Local-First Data**: All data operations happen locally first, then sync to the server when possible
2. **Optimistic Updates**: UI reflects changes immediately without waiting for server confirmation
3. **Conflict Resolution**: Clear strategies for handling data conflicts when syncing
4. **Graceful Degradation**: Features degrade gracefully when certain operations require connectivity
5. **Transparent Sync**: Users understand the sync status of their data

### Benefits of Offline-First

```typescript
// Traditional approach - fails without network
const fetchData = async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  } catch (error) {
    // User sees error, app becomes unusable
    throw new Error('Network unavailable');
  }
};

// Offline-first approach - always works
const fetchDataOfflineFirst = async () => {
  // Always read from local storage first
  const localData = await LocalDatabase.getData();

  // Try to sync in background if online
  if (await NetInfo.isConnected()) {
    syncInBackground();
  }

  return localData; // User always gets data
};
```

## Architecture Patterns for Offline-First

### The Three-Layer Architecture

A well-designed offline-first architecture typically consists of three layers:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (React Components, Hooks)        │
├─────────────────────────────────────┤
│         Data Access Layer           │
│  (Repositories, Sync Manager)       │
├─────────────────────────────────────┤
│         Persistence Layer           │
│  (SQLite, AsyncStorage, MMKV)       │
└─────────────────────────────────────┘
```

### Repository Pattern Implementation

```typescript
// types/Task.ts
interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  version: number;
}

// repositories/TaskRepository.ts
class TaskRepository {
  private localDb: LocalDatabase;
  private syncQueue: SyncQueue;
  private api: ApiClient;

  constructor() {
    this.localDb = new LocalDatabase();
    this.syncQueue = new SyncQueue();
    this.api = new ApiClient();
  }

  async getAll(): Promise<Task[]> {
    return this.localDb.tasks.getAll();
  }

  async getById(id: string): Promise<Task | null> {
    return this.localDb.tasks.getById(id);
  }

  async create(task: Omit<Task, 'id' | 'syncStatus' | 'version'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: generateUUID(),
      syncStatus: 'pending',
      version: 1,
    };

    // Save locally first
    await this.localDb.tasks.insert(newTask);

    // Queue for sync
    await this.syncQueue.enqueue({
      type: 'CREATE',
      entity: 'task',
      data: newTask,
      timestamp: Date.now(),
    });

    return newTask;
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Task not found');

    const updatedTask: Task = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      syncStatus: 'pending',
      version: existing.version + 1,
    };

    await this.localDb.tasks.update(id, updatedTask);

    await this.syncQueue.enqueue({
      type: 'UPDATE',
      entity: 'task',
      data: updatedTask,
      timestamp: Date.now(),
    });

    return updatedTask;
  }

  async delete(id: string): Promise<void> {
    // Soft delete locally
    await this.localDb.tasks.markDeleted(id);

    await this.syncQueue.enqueue({
      type: 'DELETE',
      entity: 'task',
      data: { id },
      timestamp: Date.now(),
    });
  }
}
```

## Selecting the Right Local Database

Choosing the appropriate local storage solution is crucial for offline-first apps. Here's a comparison of popular options:

### SQLite with TypeORM or WatermelonDB

Best for: Complex queries, relational data, large datasets

```typescript
// Using WatermelonDB for reactive offline-first database
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { Task, Project, User } from './models';

const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations: migrations,
  jsi: true, // Enable JSI for better performance
  onSetUpError: error => {
    console.error('Database setup failed:', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [Task, Project, User],
});

// Define your model
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

class TaskModel extends Model {
  static table = 'tasks';
  static associations = {
    projects: { type: 'belongs_to', key: 'project_id' },
  };

  @field('title') title!: string;
  @field('completed') completed!: boolean;
  @field('sync_status') syncStatus!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @readonly @date('server_created_at') serverCreatedAt!: Date;
  @relation('projects', 'project_id') project!: Project;
}
```

### MMKV for Simple Key-Value Storage

Best for: User preferences, session data, small datasets

```typescript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'app-storage',
  encryptionKey: 'your-encryption-key', // Optional encryption
});

// Create a typed storage wrapper
class TypedStorage<T> {
  constructor(private key: string, private storage: MMKV) {}

  get(): T | null {
    const value = this.storage.getString(this.key);
    return value ? JSON.parse(value) : null;
  }

  set(value: T): void {
    this.storage.set(this.key, JSON.stringify(value));
  }

  delete(): void {
    this.storage.delete(this.key);
  }
}

// Usage
const userPreferences = new TypedStorage<UserPreferences>('userPrefs', storage);
userPreferences.set({ theme: 'dark', notifications: true });
```

### Realm for Complex Object Graphs

Best for: Complex object relationships, real-time sync needs

```typescript
import Realm from 'realm';

const TaskSchema: Realm.ObjectSchema = {
  name: 'Task',
  primaryKey: 'id',
  properties: {
    id: 'string',
    title: 'string',
    completed: { type: 'bool', default: false },
    syncStatus: { type: 'string', default: 'pending' },
    version: { type: 'int', default: 1 },
    createdAt: 'date',
    updatedAt: 'date',
    project: 'Project?',
  },
};

const realm = await Realm.open({
  schema: [TaskSchema, ProjectSchema],
  schemaVersion: 1,
  migration: (oldRealm, newRealm) => {
    // Handle schema migrations
  },
});
```

## Data Model Design for Offline-First

### Essential Fields for Sync

Every entity in an offline-first app should include metadata for synchronization:

```typescript
interface SyncableEntity {
  // Unique identifier (use UUID for offline creation)
  id: string;

  // Track when the entity was created and modified
  createdAt: number;
  updatedAt: number;

  // Server-side timestamps for conflict detection
  serverCreatedAt?: number;
  serverUpdatedAt?: number;

  // Sync status tracking
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';

  // Version number for optimistic locking
  version: number;

  // Soft delete flag
  isDeleted: boolean;
  deletedAt?: number;

  // Track the device that made the last change
  lastModifiedBy?: string;
}

// Extended task entity with sync support
interface Task extends SyncableEntity {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: number;
  projectId?: string;
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}
```

### UUID Generation for Offline Creation

```typescript
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Generate collision-resistant UUIDs
const generateId = (): string => {
  return uuidv4();
};

// Alternative: Use a combination of timestamp and random values
const generateTimeBasedId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
};
```

## Implementing Optimistic UI Updates

Optimistic updates make your app feel instant by updating the UI before the server confirms the change.

### Optimistic Update Hook

```typescript
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OptimisticUpdateOptions<T, TVariables> {
  queryKey: string[];
  mutationFn: (variables: TVariables) => Promise<T>;
  updateFn: (oldData: T[], variables: TVariables) => T[];
  rollbackFn?: (error: Error, variables: TVariables, context: any) => void;
}

function useOptimisticUpdate<T, TVariables>({
  queryKey,
  mutationFn,
  updateFn,
  rollbackFn,
}: OptimisticUpdateOptions<T, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<T[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        return old ? updateFn(old, variables) : [];
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      rollbackFn?.(error, variables, context);
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage example
function useCreateTask() {
  return useOptimisticUpdate<Task, CreateTaskInput>({
    queryKey: ['tasks'],
    mutationFn: async (input) => {
      const task = await taskRepository.create(input);
      return task;
    },
    updateFn: (oldTasks, input) => {
      const optimisticTask: Task = {
        id: generateId(),
        ...input,
        syncStatus: 'pending',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      };
      return [...oldTasks, optimisticTask];
    },
    rollbackFn: (error) => {
      showToast(`Failed to create task: ${error.message}`);
    },
  });
}
```

### Task List Component with Optimistic Updates

```typescript
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

const TaskList: React.FC = () => {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskRepository.getAll(),
  });

  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity
        onPress={() => toggleTask.mutate({ id: item.id, completed: !item.completed })}
        style={styles.checkbox}
      >
        {item.completed && <View style={styles.checkmark} />}
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.completed && styles.completedTask]}>
          {item.title}
        </Text>
        <SyncStatusBadge status={item.syncStatus} />
      </View>

      <TouchableOpacity onPress={() => deleteTask.mutate(item.id)}>
        <Text style={styles.deleteButton}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={tasks}
      renderItem={renderTask}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text>No tasks yet</Text>}
    />
  );
};

const SyncStatusBadge: React.FC<{ status: Task['syncStatus'] }> = ({ status }) => {
  const statusConfig = {
    synced: { color: '#4CAF50', label: 'Synced' },
    pending: { color: '#FF9800', label: 'Pending' },
    conflict: { color: '#F44336', label: 'Conflict' },
    error: { color: '#F44336', label: 'Error' },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.badgeText}>{config.label}</Text>
    </View>
  );
};
```

## Conflict Resolution Strategies

When multiple devices modify the same data offline, conflicts are inevitable. Here are strategies to handle them:

### Last-Write-Wins (LWW)

The simplest strategy where the most recent change wins:

```typescript
class LastWriteWinsResolver {
  resolve<T extends SyncableEntity>(local: T, remote: T): T {
    if (local.updatedAt > remote.serverUpdatedAt!) {
      return local;
    }
    return remote;
  }
}
```

### Version Vector / Optimistic Locking

Detect conflicts using version numbers:

```typescript
interface ConflictResult<T> {
  resolved: boolean;
  winner?: T;
  conflict?: {
    local: T;
    remote: T;
  };
}

class VersionBasedResolver {
  resolve<T extends SyncableEntity>(
    local: T,
    remote: T,
    baseVersion: number
  ): ConflictResult<T> {
    // No conflict if versions match expected
    if (local.version === baseVersion + 1 && remote.version === baseVersion) {
      return { resolved: true, winner: local };
    }

    // Conflict detected - both modified from same base
    if (local.version > baseVersion && remote.version > baseVersion) {
      return {
        resolved: false,
        conflict: { local, remote },
      };
    }

    // Remote is newer
    if (remote.version > local.version) {
      return { resolved: true, winner: remote };
    }

    return { resolved: true, winner: local };
  }
}
```

### Field-Level Merge

Merge changes at the field level for fine-grained resolution:

```typescript
class FieldLevelMergeResolver {
  resolve<T extends Record<string, any>>(
    base: T,
    local: T,
    remote: T
  ): T {
    const merged: Partial<T> = { ...base };

    for (const key of Object.keys(base)) {
      const localChanged = base[key] !== local[key];
      const remoteChanged = base[key] !== remote[key];

      if (localChanged && !remoteChanged) {
        merged[key as keyof T] = local[key];
      } else if (!localChanged && remoteChanged) {
        merged[key as keyof T] = remote[key];
      } else if (localChanged && remoteChanged) {
        // Both changed - use timestamp-based resolution for this field
        // Or mark as conflict for user resolution
        if (local.updatedAt > remote.serverUpdatedAt) {
          merged[key as keyof T] = local[key];
        } else {
          merged[key as keyof T] = remote[key];
        }
      }
    }

    return merged as T;
  }
}
```

### User-Driven Conflict Resolution

Let users decide how to resolve conflicts:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface ConflictResolutionModalProps<T> {
  visible: boolean;
  localVersion: T;
  remoteVersion: T;
  onResolve: (resolution: 'local' | 'remote' | 'merge', merged?: T) => void;
  onCancel: () => void;
  renderDiff: (local: T, remote: T) => React.ReactNode;
}

function ConflictResolutionModal<T extends SyncableEntity>({
  visible,
  localVersion,
  remoteVersion,
  onResolve,
  onCancel,
  renderDiff,
}: ConflictResolutionModalProps<T>) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Sync Conflict Detected</Text>
        <Text style={styles.subtitle}>
          This item was modified on another device while you were offline.
          Choose which version to keep:
        </Text>

        <View style={styles.diffContainer}>
          {renderDiff(localVersion, remoteVersion)}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.localButton]}
            onPress={() => onResolve('local')}
          >
            <Text style={styles.buttonText}>Keep My Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.remoteButton]}
            onPress={() => onResolve('remote')}
          >
            <Text style={styles.buttonText}>Use Server Version</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Decide Later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

## Sync Queue Implementation

A robust sync queue ensures operations are persisted and processed in order:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed';
}

class SyncQueue {
  private readonly QUEUE_KEY = '@sync_queue';
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;

  async enqueue(operation: Omit<SyncOperation, 'id' | 'retryCount' | 'status'>): Promise<void> {
    const queue = await this.getQueue();

    const newOperation: SyncOperation = {
      ...operation,
      id: generateId(),
      retryCount: 0,
      status: 'pending',
    };

    queue.push(newOperation);
    await this.saveQueue(queue);

    // Trigger processing if not already running
    this.processQueue();
  }

  private async getQueue(): Promise<SyncOperation[]> {
    const data = await AsyncStorage.getItem(this.QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private async saveQueue(queue: SyncOperation[]): Promise<void> {
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const isOnline = await NetInfo.fetch().then(state => state.isConnected);
    if (!isOnline) return;

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      const pendingOperations = queue.filter(op => op.status === 'pending');

      for (const operation of pendingOperations) {
        try {
          await this.processOperation(operation);
          await this.removeOperation(operation.id);
        } catch (error) {
          await this.handleOperationError(operation, error as Error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    const endpoint = this.getEndpoint(operation.entity);

    switch (operation.type) {
      case 'CREATE':
        await api.post(endpoint, operation.data);
        break;
      case 'UPDATE':
        await api.put(`${endpoint}/${operation.data.id}`, operation.data);
        break;
      case 'DELETE':
        await api.delete(`${endpoint}/${operation.data.id}`);
        break;
    }

    // Update local sync status
    await this.updateLocalSyncStatus(operation.entity, operation.data.id, 'synced');
  }

  private async handleOperationError(
    operation: SyncOperation,
    error: Error
  ): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(op => op.id === operation.id);

    if (index === -1) return;

    if (operation.retryCount >= this.MAX_RETRIES) {
      queue[index].status = 'failed';
      queue[index].lastError = error.message;
      await this.updateLocalSyncStatus(operation.entity, operation.data.id, 'error');
    } else {
      queue[index].retryCount++;
      queue[index].lastError = error.message;
    }

    await this.saveQueue(queue);
  }

  private async removeOperation(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(op => op.id !== id);
    await this.saveQueue(filtered);
  }

  async getQueueStatus(): Promise<{
    pending: number;
    failed: number;
    total: number;
  }> {
    const queue = await this.getQueue();
    return {
      pending: queue.filter(op => op.status === 'pending').length,
      failed: queue.filter(op => op.status === 'failed').length,
      total: queue.length,
    };
  }

  async retryFailed(): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.map(op => {
      if (op.status === 'failed') {
        return { ...op, status: 'pending' as const, retryCount: 0 };
      }
      return op;
    });
    await this.saveQueue(updated);
    this.processQueue();
  }
}
```

## Network State Detection

Properly detecting and responding to network state changes is essential:

```typescript
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';

interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  connectionQuality: 'good' | 'poor' | 'offline';
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: 'unknown',
  connectionQuality: 'good',
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkContextValue>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
    connectionQuality: 'good',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const quality = determineConnectionQuality(state);

      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        connectionQuality: quality,
      });

      // Trigger sync when coming back online
      if (state.isConnected && state.isInternetReachable) {
        syncManager.triggerSync();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};

function determineConnectionQuality(state: NetInfoState): 'good' | 'poor' | 'offline' {
  if (!state.isConnected) return 'offline';

  if (state.type === 'cellular') {
    const details = state.details as any;
    if (details?.cellularGeneration === '2g') return 'poor';
  }

  return 'good';
}

export const useNetwork = () => useContext(NetworkContext);

// Hook for checking connectivity before operations
export const useOnlineAction = () => {
  const { isConnected, isInternetReachable } = useNetwork();

  const executeWhenOnline = useCallback(
    async <T>(action: () => Promise<T>, fallback?: () => T): Promise<T | undefined> => {
      if (isConnected && isInternetReachable) {
        return action();
      }

      if (fallback) {
        return fallback();
      }

      throw new Error('No internet connection');
    },
    [isConnected, isInternetReachable]
  );

  return { executeWhenOnline, isOnline: isConnected && isInternetReachable };
};
```

## Implementing Retry Mechanisms

Robust retry logic with exponential backoff ensures reliable synchronization:

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

class RetryableOperation {
  constructor(private config: RetryConfig = defaultRetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!shouldRetry(lastError) || attempt === this.config.maxRetries) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
    return Math.min(delay + jitter, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retryable = new RetryableOperation();

const syncWithRetry = async () => {
  return retryable.execute(
    async () => {
      const response = await fetch('https://api.example.com/sync', {
        method: 'POST',
        body: JSON.stringify(pendingChanges),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      return response.json();
    },
    (error) => {
      // Don't retry on client errors (4xx)
      const status = (error as any).status;
      return !status || status >= 500;
    }
  );
};
```

## User Feedback for Sync Status

Keeping users informed about sync status builds trust:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface SyncStatusBarProps {
  status: 'synced' | 'syncing' | 'pending' | 'offline' | 'error';
  pendingCount: number;
  onRetry?: () => void;
}

const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  status,
  pendingCount,
  onRetry,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (status === 'syncing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          backgroundColor: '#4CAF50',
          icon: 'checkmark-circle',
          message: 'All changes synced',
        };
      case 'syncing':
        return {
          backgroundColor: '#2196F3',
          icon: 'sync',
          message: 'Syncing changes...',
        };
      case 'pending':
        return {
          backgroundColor: '#FF9800',
          icon: 'cloud-upload',
          message: `${pendingCount} changes pending`,
        };
      case 'offline':
        return {
          backgroundColor: '#9E9E9E',
          icon: 'cloud-offline',
          message: 'Offline - changes saved locally',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          icon: 'alert-circle',
          message: 'Sync error - tap to retry',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TouchableOpacity
      onPress={status === 'error' ? onRetry : undefined}
      activeOpacity={status === 'error' ? 0.7 : 1}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: config.backgroundColor, opacity: pulseAnim },
        ]}
      >
        <Text style={styles.message}>{config.message}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Hook for managing sync status
export const useSyncStatus = () => {
  const { isConnected } = useNetwork();
  const [syncState, setSyncState] = useState<{
    status: SyncStatusBarProps['status'];
    pendingCount: number;
  }>({
    status: 'synced',
    pendingCount: 0,
  });

  useEffect(() => {
    const checkStatus = async () => {
      const queueStatus = await syncQueue.getQueueStatus();

      if (!isConnected) {
        setSyncState({ status: 'offline', pendingCount: queueStatus.pending });
      } else if (queueStatus.failed > 0) {
        setSyncState({ status: 'error', pendingCount: queueStatus.failed });
      } else if (queueStatus.pending > 0) {
        setSyncState({ status: 'pending', pendingCount: queueStatus.pending });
      } else {
        setSyncState({ status: 'synced', pendingCount: 0 });
      }
    };

    const interval = setInterval(checkStatus, 2000);
    checkStatus();

    return () => clearInterval(interval);
  }, [isConnected]);

  return syncState;
};
```

## Testing Offline Scenarios

Thorough testing of offline functionality is crucial:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('Offline-First Task Management', () => {
  let mockNetInfoState: { isConnected: boolean; isInternetReachable: boolean };
  let netInfoCallback: (state: any) => void;

  beforeEach(() => {
    mockNetInfoState = { isConnected: true, isInternetReachable: true };

    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      netInfoCallback = callback;
      callback(mockNetInfoState);
      return jest.fn();
    });

    (NetInfo.fetch as jest.Mock).mockResolvedValue(mockNetInfoState);
  });

  const simulateOffline = () => {
    mockNetInfoState = { isConnected: false, isInternetReachable: false };
    netInfoCallback(mockNetInfoState);
  };

  const simulateOnline = () => {
    mockNetInfoState = { isConnected: true, isInternetReachable: true };
    netInfoCallback(mockNetInfoState);
  };

  describe('Task Creation', () => {
    it('should create task locally when offline', async () => {
      const { result } = renderHook(() => useCreateTask());

      simulateOffline();

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Test Task',
          completed: false,
        });
      });

      const tasks = await taskRepository.getAll();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Task');
      expect(tasks[0].syncStatus).toBe('pending');
    });

    it('should queue sync operation when offline', async () => {
      const { result } = renderHook(() => useCreateTask());

      simulateOffline();

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Test Task',
          completed: false,
        });
      });

      const queueStatus = await syncQueue.getQueueStatus();
      expect(queueStatus.pending).toBe(1);
    });

    it('should sync when coming back online', async () => {
      const { result } = renderHook(() => useCreateTask());

      simulateOffline();

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Test Task',
          completed: false,
        });
      });

      simulateOnline();

      await waitFor(async () => {
        const tasks = await taskRepository.getAll();
        expect(tasks[0].syncStatus).toBe('synced');
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts when server has newer version', async () => {
      // Create local task
      const localTask = await taskRepository.create({
        title: 'Original Task',
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Simulate server returning modified version
      const serverTask = {
        ...localTask,
        title: 'Modified on Server',
        version: localTask.version + 1,
        serverUpdatedAt: Date.now() + 1000,
      };

      const resolver = new VersionBasedResolver();
      const result = resolver.resolve(localTask, serverTask, localTask.version - 1);

      expect(result.resolved).toBe(false);
      expect(result.conflict).toBeDefined();
    });
  });
});

// E2E test example using Detox
describe('Offline Mode E2E', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should work offline and sync when back online', async () => {
    // Create task while online
    await element(by.id('add-task-button')).tap();
    await element(by.id('task-title-input')).typeText('Online Task');
    await element(by.id('save-task-button')).tap();

    // Verify sync status
    await expect(element(by.id('sync-status'))).toHaveText('All changes synced');

    // Simulate offline mode
    await device.setURLBlacklist(['.*api.example.com.*']);

    // Create task while offline
    await element(by.id('add-task-button')).tap();
    await element(by.id('task-title-input')).typeText('Offline Task');
    await element(by.id('save-task-button')).tap();

    // Verify pending status
    await expect(element(by.id('sync-status'))).toHaveText('1 changes pending');

    // Go back online
    await device.setURLBlacklist([]);

    // Wait for sync
    await waitFor(element(by.id('sync-status')))
      .toHaveText('All changes synced')
      .withTimeout(10000);
  });
});
```

## Real-World Implementation Example

Here's a complete example bringing everything together:

```typescript
// App.tsx - Complete offline-first setup
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from './contexts/NetworkContext';
import { SyncProvider } from './contexts/SyncContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { TaskScreen } from './screens/TaskScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Data is always fresh from local DB
      cacheTime: Infinity,
      retry: false, // We handle retries in our sync layer
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <NetworkProvider>
          <SyncProvider>
            <TaskScreen />
          </SyncProvider>
        </NetworkProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

// contexts/SyncContext.tsx
import React, { createContext, useContext, useEffect, useCallback } from 'react';

interface SyncContextValue {
  triggerSync: () => Promise<void>;
  syncStatus: SyncStatus;
  retryFailedOperations: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected } = useNetwork();
  const syncQueue = useSyncQueue();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const triggerSync = useCallback(async () => {
    if (!isConnected || syncStatus === 'syncing') return;

    setSyncStatus('syncing');

    try {
      await syncQueue.processQueue();
      await pullRemoteChanges();
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    }
  }, [isConnected, syncStatus]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isConnected) {
      triggerSync();
    }
  }, [isConnected]);

  // Periodic sync while online
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(triggerSync, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected, triggerSync]);

  const retryFailedOperations = useCallback(async () => {
    await syncQueue.retryFailed();
    triggerSync();
  }, [triggerSync]);

  return (
    <SyncContext.Provider value={{ triggerSync, syncStatus, retryFailedOperations }}>
      {children}
    </SyncContext.Provider>
  );
};

// screens/TaskScreen.tsx
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { TaskList } from '../components/TaskList';
import { TaskInput } from '../components/TaskInput';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useSyncStatus, useSync } from '../contexts/SyncContext';

export const TaskScreen: React.FC = () => {
  const syncStatus = useSyncStatus();
  const { retryFailedOperations } = useSync();

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar
        status={syncStatus.status}
        pendingCount={syncStatus.pendingCount}
        onRetry={retryFailedOperations}
      />
      <TaskList />
      <TaskInput />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

## Best Practices Summary

1. **Always read from local storage first** - Network requests should update local storage, not be the primary data source

2. **Use UUIDs for offline entity creation** - Avoid relying on server-generated IDs

3. **Implement proper version tracking** - Track versions for conflict detection and resolution

4. **Queue all write operations** - Persist operations to survive app restarts

5. **Handle conflicts gracefully** - Provide clear UI for conflict resolution when needed

6. **Test offline scenarios thoroughly** - Include offline testing in your CI/CD pipeline

7. **Provide clear sync status feedback** - Users should always know the state of their data

8. **Implement exponential backoff** - Avoid overwhelming the server with retries

9. **Consider data size and storage limits** - Implement data pruning strategies for large datasets

10. **Monitor sync queue health** - Alert on persistent sync failures

## Conclusion

Implementing offline-first architecture in React Native requires careful planning and consideration of many edge cases. By following the patterns and practices outlined in this guide, you can build mobile applications that provide a seamless experience regardless of network conditions.

The key is to treat local storage as the source of truth and synchronization as an enhancement. This mental model shift leads to applications that are more reliable, faster to respond, and more pleasant to use.

Start with simple offline-first patterns and gradually add complexity as needed. Not every app needs sophisticated conflict resolution - begin with last-write-wins and iterate based on real user feedback.

Remember that the best offline-first implementation is one that users don't notice - the app simply works, whether they're connected or not.
