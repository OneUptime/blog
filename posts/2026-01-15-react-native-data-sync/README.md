# How to Implement Data Sync Between Local and Remote in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Data Sync, Offline, Mobile Development, API, Synchronization

Description: Learn how to implement robust data synchronization between local storage and remote servers in React Native.

---

Data synchronization is one of the most challenging aspects of mobile development. Users expect their apps to work seamlessly offline and sync automatically when connectivity is restored. In this comprehensive guide, we'll explore how to implement robust data synchronization between local storage and remote servers in React Native applications.

## Understanding Sync Architecture

Before diving into implementation, let's understand the fundamental architecture of a data sync system.

### Core Components

A typical sync architecture consists of several key components:

```typescript
// types/SyncTypes.ts
interface SyncConfig {
  localStore: LocalStorage;
  remoteAPI: RemoteAPI;
  conflictResolver: ConflictResolver;
  syncInterval: number;
  batchSize: number;
}

interface SyncState {
  lastSyncTimestamp: number;
  pendingChanges: Change[];
  syncInProgress: boolean;
  syncErrors: SyncError[];
}

interface Change {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  version: number;
  clientId: string;
}

interface SyncError {
  changeId: string;
  errorCode: string;
  message: string;
  retryCount: number;
  lastRetryTimestamp: number;
}
```

### Architecture Overview

```typescript
// sync/SyncManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class SyncManager {
  private config: SyncConfig;
  private state: SyncState;
  private syncQueue: Change[] = [];
  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor(config: SyncConfig) {
    this.config = config;
    this.state = {
      lastSyncTimestamp: 0,
      pendingChanges: [],
      syncInProgress: false,
      syncErrors: [],
    };
    this.initializeSync();
  }

  private async initializeSync(): Promise<void> {
    // Load persisted sync state
    const savedState = await AsyncStorage.getItem('syncState');
    if (savedState) {
      this.state = JSON.parse(savedState);
    }

    // Set up network listener
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.state.syncInProgress) {
        this.triggerSync();
      }
    });

    // Set up periodic sync
    setInterval(() => {
      this.triggerSync();
    }, this.config.syncInterval);
  }

  public async triggerSync(): Promise<void> {
    if (this.state.syncInProgress) {
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    await this.performSync();
  }

  private async performSync(): Promise<void> {
    this.updateState({ syncInProgress: true });

    try {
      // Push local changes first
      await this.pushChanges();

      // Then pull remote changes
      await this.pullChanges();

      this.updateState({
        lastSyncTimestamp: Date.now(),
        syncErrors: [],
      });
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.updateState({ syncInProgress: false });
    }
  }

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.persistState();
    this.notifyListeners();
  }

  private async persistState(): Promise<void> {
    await AsyncStorage.setItem('syncState', JSON.stringify(this.state));
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  public subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

## Sync Strategies

There are three primary sync strategies, each suited to different use cases.

### Push Sync (Client to Server)

Push sync sends local changes to the server. This is useful when the client is the primary data source.

```typescript
// sync/PushSync.ts
class PushSyncStrategy {
  private api: RemoteAPI;
  private changeTracker: ChangeTracker;

  constructor(api: RemoteAPI, changeTracker: ChangeTracker) {
    this.api = api;
    this.changeTracker = changeTracker;
  }

  async pushChanges(): Promise<PushResult> {
    const pendingChanges = await this.changeTracker.getPendingChanges();
    const results: ChangeResult[] = [];

    for (const change of pendingChanges) {
      try {
        const result = await this.pushSingleChange(change);
        results.push({ changeId: change.id, success: true, result });
        await this.changeTracker.markAsSynced(change.id);
      } catch (error) {
        results.push({
          changeId: change.id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      totalChanges: pendingChanges.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  private async pushSingleChange(change: Change): Promise<any> {
    switch (change.operation) {
      case 'CREATE':
        return this.api.create(change.entityType, change.data);
      case 'UPDATE':
        return this.api.update(
          change.entityType,
          change.entityId,
          change.data
        );
      case 'DELETE':
        return this.api.delete(change.entityType, change.entityId);
      default:
        throw new Error(`Unknown operation: ${change.operation}`);
    }
  }
}
```

### Pull Sync (Server to Client)

Pull sync fetches changes from the server. This is useful when the server is the authoritative data source.

```typescript
// sync/PullSync.ts
class PullSyncStrategy {
  private api: RemoteAPI;
  private localStore: LocalStorage;
  private lastSyncTimestamp: number;

  constructor(api: RemoteAPI, localStore: LocalStorage) {
    this.api = api;
    this.localStore = localStore;
    this.lastSyncTimestamp = 0;
  }

  async pullChanges(): Promise<PullResult> {
    const serverChanges = await this.api.getChangesSince(
      this.lastSyncTimestamp
    );

    const results: ChangeResult[] = [];

    for (const change of serverChanges) {
      try {
        await this.applyServerChange(change);
        results.push({ changeId: change.id, success: true });
      } catch (error) {
        results.push({
          changeId: change.id,
          success: false,
          error: error.message,
        });
      }
    }

    if (serverChanges.length > 0) {
      this.lastSyncTimestamp = Math.max(
        ...serverChanges.map((c) => c.timestamp)
      );
    }

    return {
      totalChanges: serverChanges.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  private async applyServerChange(change: Change): Promise<void> {
    switch (change.operation) {
      case 'CREATE':
      case 'UPDATE':
        await this.localStore.upsert(
          change.entityType,
          change.entityId,
          change.data
        );
        break;
      case 'DELETE':
        await this.localStore.delete(change.entityType, change.entityId);
        break;
    }
  }
}
```

### Two-Way Sync (Bidirectional)

Two-way sync combines both push and pull, handling conflicts when the same data is modified on both ends.

```typescript
// sync/TwoWaySync.ts
class TwoWaySyncStrategy {
  private pushSync: PushSyncStrategy;
  private pullSync: PullSyncStrategy;
  private conflictResolver: ConflictResolver;

  constructor(
    pushSync: PushSyncStrategy,
    pullSync: PullSyncStrategy,
    conflictResolver: ConflictResolver
  ) {
    this.pushSync = pushSync;
    this.pullSync = pullSync;
    this.conflictResolver = conflictResolver;
  }

  async sync(): Promise<TwoWaySyncResult> {
    // Step 1: Detect conflicts before syncing
    const conflicts = await this.detectConflicts();

    // Step 2: Resolve conflicts
    const resolvedConflicts = await this.resolveConflicts(conflicts);

    // Step 3: Push local changes (including resolved conflicts)
    const pushResult = await this.pushSync.pushChanges();

    // Step 4: Pull remote changes
    const pullResult = await this.pullSync.pullChanges();

    return {
      pushResult,
      pullResult,
      conflictsResolved: resolvedConflicts.length,
    };
  }

  private async detectConflicts(): Promise<Conflict[]> {
    const localChanges = await this.getLocalChanges();
    const serverChanges = await this.getServerChangesSinceLastSync();

    const conflicts: Conflict[] = [];

    for (const localChange of localChanges) {
      const serverChange = serverChanges.find(
        (s) =>
          s.entityType === localChange.entityType &&
          s.entityId === localChange.entityId
      );

      if (serverChange) {
        conflicts.push({
          localChange,
          serverChange,
          entityType: localChange.entityType,
          entityId: localChange.entityId,
        });
      }
    }

    return conflicts;
  }

  private async resolveConflicts(
    conflicts: Conflict[]
  ): Promise<ResolvedConflict[]> {
    const resolved: ResolvedConflict[] = [];

    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(conflict);
      resolved.push({
        conflict,
        resolution,
        winner: resolution.winner,
      });
    }

    return resolved;
  }
}
```

## Change Tracking Methods

Effective change tracking is crucial for reliable synchronization.

### Local Change Tracker

```typescript
// sync/ChangeTracker.ts
class ChangeTracker {
  private db: LocalDatabase;
  private clientId: string;

  constructor(db: LocalDatabase, clientId: string) {
    this.db = db;
    this.clientId = clientId;
  }

  async trackChange(
    entityType: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<Change> {
    const change: Change = {
      id: this.generateChangeId(),
      entityType,
      entityId,
      operation,
      data,
      timestamp: Date.now(),
      version: await this.getNextVersion(entityType, entityId),
      clientId: this.clientId,
    };

    await this.db.insert('pending_changes', change);
    return change;
  }

  async getPendingChanges(): Promise<Change[]> {
    return this.db.query('pending_changes', {
      orderBy: 'timestamp',
      order: 'asc',
    });
  }

  async markAsSynced(changeId: string): Promise<void> {
    await this.db.delete('pending_changes', { id: changeId });

    // Also store in synced changes for conflict detection
    await this.db.insert('synced_changes', {
      changeId,
      syncedAt: Date.now(),
    });
  }

  async getChangesSince(timestamp: number): Promise<Change[]> {
    return this.db.query('pending_changes', {
      where: { timestamp: { $gt: timestamp } },
      orderBy: 'timestamp',
    });
  }

  private async getNextVersion(
    entityType: string,
    entityId: string
  ): Promise<number> {
    const entity = await this.db.get(entityType, entityId);
    return (entity?.version || 0) + 1;
  }

  private generateChangeId(): string {
    return `${this.clientId}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
```

### Dirty Flag Tracking

```typescript
// sync/DirtyFlagTracker.ts
interface DirtyEntity {
  entityType: string;
  entityId: string;
  isDirty: boolean;
  dirtyFields: string[];
  modifiedAt: number;
}

class DirtyFlagTracker {
  private dirtyEntities: Map<string, DirtyEntity> = new Map();

  markDirty(
    entityType: string,
    entityId: string,
    modifiedFields: string[]
  ): void {
    const key = `${entityType}:${entityId}`;
    const existing = this.dirtyEntities.get(key);

    if (existing) {
      existing.dirtyFields = [
        ...new Set([...existing.dirtyFields, ...modifiedFields]),
      ];
      existing.modifiedAt = Date.now();
    } else {
      this.dirtyEntities.set(key, {
        entityType,
        entityId,
        isDirty: true,
        dirtyFields: modifiedFields,
        modifiedAt: Date.now(),
      });
    }
  }

  markClean(entityType: string, entityId: string): void {
    const key = `${entityType}:${entityId}`;
    this.dirtyEntities.delete(key);
  }

  getDirtyEntities(): DirtyEntity[] {
    return Array.from(this.dirtyEntities.values()).filter((e) => e.isDirty);
  }

  isDirty(entityType: string, entityId: string): boolean {
    const key = `${entityType}:${entityId}`;
    return this.dirtyEntities.get(key)?.isDirty || false;
  }
}
```

## Timestamp-Based Sync

Timestamp-based synchronization uses timestamps to determine which changes are newer.

```typescript
// sync/TimestampSync.ts
interface TimestampedEntity {
  id: string;
  data: any;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

class TimestampBasedSync {
  private localStore: LocalStorage;
  private api: RemoteAPI;
  private lastPullTimestamp: number = 0;

  constructor(localStore: LocalStorage, api: RemoteAPI) {
    this.localStore = localStore;
    this.api = api;
  }

  async sync(entityType: string): Promise<SyncResult> {
    const localChanges = await this.getLocalChangesSince(
      entityType,
      this.lastPullTimestamp
    );

    const serverChanges = await this.api.getChangesSince(
      entityType,
      this.lastPullTimestamp
    );

    const { toUpload, toDownload, conflicts } = this.categorizeChanges(
      localChanges,
      serverChanges
    );

    // Handle uploads
    for (const change of toUpload) {
      await this.uploadChange(entityType, change);
    }

    // Handle downloads
    for (const change of toDownload) {
      await this.downloadChange(entityType, change);
    }

    // Handle conflicts using Last-Write-Wins
    for (const conflict of conflicts) {
      await this.resolveByTimestamp(entityType, conflict);
    }

    this.lastPullTimestamp = Date.now();

    return {
      uploaded: toUpload.length,
      downloaded: toDownload.length,
      conflictsResolved: conflicts.length,
    };
  }

  private categorizeChanges(
    localChanges: TimestampedEntity[],
    serverChanges: TimestampedEntity[]
  ): {
    toUpload: TimestampedEntity[];
    toDownload: TimestampedEntity[];
    conflicts: ConflictPair[];
  } {
    const toUpload: TimestampedEntity[] = [];
    const toDownload: TimestampedEntity[] = [];
    const conflicts: ConflictPair[] = [];

    const serverMap = new Map(serverChanges.map((c) => [c.id, c]));
    const localMap = new Map(localChanges.map((c) => [c.id, c]));

    // Check local changes
    for (const local of localChanges) {
      const server = serverMap.get(local.id);
      if (!server) {
        toUpload.push(local);
      } else if (local.updatedAt !== server.updatedAt) {
        conflicts.push({ local, server });
      }
    }

    // Check server changes not in local
    for (const server of serverChanges) {
      if (!localMap.has(server.id)) {
        toDownload.push(server);
      }
    }

    return { toUpload, toDownload, conflicts };
  }

  private async resolveByTimestamp(
    entityType: string,
    conflict: ConflictPair
  ): Promise<void> {
    // Last-Write-Wins strategy
    if (conflict.local.updatedAt > conflict.server.updatedAt) {
      await this.uploadChange(entityType, conflict.local);
    } else {
      await this.downloadChange(entityType, conflict.server);
    }
  }
}
```

## Version Vector Sync

Version vectors provide a more sophisticated approach to tracking causality and detecting conflicts.

```typescript
// sync/VersionVectorSync.ts
type VersionVector = Map<string, number>;

interface VersionedEntity {
  id: string;
  data: any;
  versionVector: Record<string, number>;
}

class VersionVectorSync {
  private clientId: string;
  private localStore: LocalStorage;
  private api: RemoteAPI;

  constructor(
    clientId: string,
    localStore: LocalStorage,
    api: RemoteAPI
  ) {
    this.clientId = clientId;
    this.localStore = localStore;
    this.api = api;
  }

  incrementVersion(
    entity: VersionedEntity
  ): VersionedEntity {
    const newVector = { ...entity.versionVector };
    newVector[this.clientId] = (newVector[this.clientId] || 0) + 1;

    return {
      ...entity,
      versionVector: newVector,
    };
  }

  compareVersions(
    v1: Record<string, number>,
    v2: Record<string, number>
  ): 'equal' | 'v1_newer' | 'v2_newer' | 'concurrent' {
    const allClients = new Set([
      ...Object.keys(v1),
      ...Object.keys(v2),
    ]);

    let v1Greater = false;
    let v2Greater = false;

    for (const client of allClients) {
      const val1 = v1[client] || 0;
      const val2 = v2[client] || 0;

      if (val1 > val2) v1Greater = true;
      if (val2 > val1) v2Greater = true;
    }

    if (!v1Greater && !v2Greater) return 'equal';
    if (v1Greater && !v2Greater) return 'v1_newer';
    if (!v1Greater && v2Greater) return 'v2_newer';
    return 'concurrent'; // Both have changes the other doesn't know about
  }

  mergeVersionVectors(
    v1: Record<string, number>,
    v2: Record<string, number>
  ): Record<string, number> {
    const merged: Record<string, number> = { ...v1 };

    for (const [client, version] of Object.entries(v2)) {
      merged[client] = Math.max(merged[client] || 0, version);
    }

    return merged;
  }

  async sync(entityType: string): Promise<SyncResult> {
    const localEntities = await this.localStore.getAll(entityType);
    const serverEntities = await this.api.getAll(entityType);

    for (const local of localEntities) {
      const server = serverEntities.find((s) => s.id === local.id);

      if (!server) {
        // New local entity, push to server
        await this.api.create(entityType, local);
        continue;
      }

      const comparison = this.compareVersions(
        local.versionVector,
        server.versionVector
      );

      switch (comparison) {
        case 'equal':
          // No changes needed
          break;
        case 'v1_newer':
          // Local is newer, push to server
          await this.api.update(entityType, local.id, local);
          break;
        case 'v2_newer':
          // Server is newer, pull to local
          await this.localStore.upsert(entityType, server.id, server);
          break;
        case 'concurrent':
          // Conflict! Need to merge
          await this.handleConcurrentModification(
            entityType,
            local,
            server
          );
          break;
      }
    }

    // Handle server-only entities
    for (const server of serverEntities) {
      const local = localEntities.find((l) => l.id === server.id);
      if (!local) {
        await this.localStore.upsert(entityType, server.id, server);
      }
    }

    return { success: true };
  }

  private async handleConcurrentModification(
    entityType: string,
    local: VersionedEntity,
    server: VersionedEntity
  ): Promise<void> {
    // Merge the data (implementation depends on data structure)
    const mergedData = this.mergeData(local.data, server.data);
    const mergedVector = this.mergeVersionVectors(
      local.versionVector,
      server.versionVector
    );

    const merged: VersionedEntity = {
      id: local.id,
      data: mergedData,
      versionVector: mergedVector,
    };

    // Update both local and server
    await this.localStore.upsert(entityType, merged.id, merged);
    await this.api.update(entityType, merged.id, merged);
  }

  private mergeData(local: any, server: any): any {
    // Simple field-level merge - take most recent for each field
    // In practice, you'd want more sophisticated merging
    return { ...server, ...local };
  }
}
```

## Conflict Detection

Detecting conflicts early prevents data loss and ensures consistency.

```typescript
// sync/ConflictDetector.ts
interface ConflictInfo {
  entityType: string;
  entityId: string;
  localVersion: VersionedEntity;
  serverVersion: VersionedEntity;
  conflictType: 'update-update' | 'update-delete' | 'delete-update';
  conflictingFields: string[];
}

class ConflictDetector {
  detectConflicts(
    localChanges: Change[],
    serverChanges: Change[]
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (const localChange of localChanges) {
      const serverChange = serverChanges.find(
        (s) =>
          s.entityType === localChange.entityType &&
          s.entityId === localChange.entityId
      );

      if (serverChange) {
        const conflict = this.analyzeConflict(localChange, serverChange);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private analyzeConflict(
    local: Change,
    server: Change
  ): ConflictInfo | null {
    // Determine conflict type
    let conflictType: ConflictInfo['conflictType'];

    if (local.operation === 'DELETE' && server.operation !== 'DELETE') {
      conflictType = 'delete-update';
    } else if (local.operation !== 'DELETE' && server.operation === 'DELETE') {
      conflictType = 'update-delete';
    } else if (local.operation !== 'DELETE' && server.operation !== 'DELETE') {
      conflictType = 'update-update';
    } else {
      // Both are deletes - not really a conflict
      return null;
    }

    // Find conflicting fields for update-update conflicts
    const conflictingFields =
      conflictType === 'update-update'
        ? this.findConflictingFields(local.data, server.data)
        : [];

    return {
      entityType: local.entityType,
      entityId: local.entityId,
      localVersion: local,
      serverVersion: server,
      conflictType,
      conflictingFields,
    };
  }

  private findConflictingFields(
    localData: any,
    serverData: any
  ): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(serverData || {}),
    ]);

    for (const key of allKeys) {
      if (
        JSON.stringify(localData?.[key]) !==
        JSON.stringify(serverData?.[key])
      ) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }
}
```

## Conflict Resolution Strategies

Different applications require different conflict resolution approaches.

```typescript
// sync/ConflictResolver.ts
type ResolutionStrategy =
  | 'last-write-wins'
  | 'first-write-wins'
  | 'server-wins'
  | 'client-wins'
  | 'manual'
  | 'merge';

interface Resolution {
  winner: 'local' | 'server' | 'merged';
  resolvedData: any;
  strategy: ResolutionStrategy;
}

class ConflictResolver {
  private defaultStrategy: ResolutionStrategy;
  private strategyOverrides: Map<string, ResolutionStrategy> = new Map();
  private manualResolutionCallback?: (
    conflict: ConflictInfo
  ) => Promise<Resolution>;

  constructor(defaultStrategy: ResolutionStrategy = 'last-write-wins') {
    this.defaultStrategy = defaultStrategy;
  }

  setStrategyForEntity(
    entityType: string,
    strategy: ResolutionStrategy
  ): void {
    this.strategyOverrides.set(entityType, strategy);
  }

  setManualResolutionCallback(
    callback: (conflict: ConflictInfo) => Promise<Resolution>
  ): void {
    this.manualResolutionCallback = callback;
  }

  async resolve(conflict: ConflictInfo): Promise<Resolution> {
    const strategy =
      this.strategyOverrides.get(conflict.entityType) ||
      this.defaultStrategy;

    switch (strategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict);
      case 'first-write-wins':
        return this.resolveFirstWriteWins(conflict);
      case 'server-wins':
        return this.resolveServerWins(conflict);
      case 'client-wins':
        return this.resolveClientWins(conflict);
      case 'merge':
        return this.resolveMerge(conflict);
      case 'manual':
        return this.resolveManual(conflict);
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  private resolveLastWriteWins(conflict: ConflictInfo): Resolution {
    const localTimestamp = conflict.localVersion.timestamp;
    const serverTimestamp = conflict.serverVersion.timestamp;

    if (localTimestamp >= serverTimestamp) {
      return {
        winner: 'local',
        resolvedData: conflict.localVersion.data,
        strategy: 'last-write-wins',
      };
    } else {
      return {
        winner: 'server',
        resolvedData: conflict.serverVersion.data,
        strategy: 'last-write-wins',
      };
    }
  }

  private resolveFirstWriteWins(conflict: ConflictInfo): Resolution {
    const localTimestamp = conflict.localVersion.timestamp;
    const serverTimestamp = conflict.serverVersion.timestamp;

    if (localTimestamp <= serverTimestamp) {
      return {
        winner: 'local',
        resolvedData: conflict.localVersion.data,
        strategy: 'first-write-wins',
      };
    } else {
      return {
        winner: 'server',
        resolvedData: conflict.serverVersion.data,
        strategy: 'first-write-wins',
      };
    }
  }

  private resolveServerWins(conflict: ConflictInfo): Resolution {
    return {
      winner: 'server',
      resolvedData: conflict.serverVersion.data,
      strategy: 'server-wins',
    };
  }

  private resolveClientWins(conflict: ConflictInfo): Resolution {
    return {
      winner: 'local',
      resolvedData: conflict.localVersion.data,
      strategy: 'client-wins',
    };
  }

  private resolveMerge(conflict: ConflictInfo): Resolution {
    const localData = conflict.localVersion.data || {};
    const serverData = conflict.serverVersion.data || {};

    // Field-level merge with server as base
    const mergedData = { ...serverData };

    for (const field of conflict.conflictingFields) {
      // For conflicting fields, use the most recently modified value
      const localTimestamp = conflict.localVersion.timestamp;
      const serverTimestamp = conflict.serverVersion.timestamp;

      if (localTimestamp > serverTimestamp) {
        mergedData[field] = localData[field];
      }
    }

    return {
      winner: 'merged',
      resolvedData: mergedData,
      strategy: 'merge',
    };
  }

  private async resolveManual(conflict: ConflictInfo): Promise<Resolution> {
    if (!this.manualResolutionCallback) {
      throw new Error(
        'Manual resolution strategy requires a callback to be set'
      );
    }
    return this.manualResolutionCallback(conflict);
  }
}
```

## Batch Sync Operations

Batch operations improve performance when syncing large amounts of data.

```typescript
// sync/BatchSync.ts
interface BatchSyncOptions {
  batchSize: number;
  parallelBatches: number;
  retryFailedBatches: boolean;
  maxRetries: number;
}

class BatchSync {
  private options: BatchSyncOptions;
  private api: RemoteAPI;
  private localStore: LocalStorage;

  constructor(
    api: RemoteAPI,
    localStore: LocalStorage,
    options: Partial<BatchSyncOptions> = {}
  ) {
    this.api = api;
    this.localStore = localStore;
    this.options = {
      batchSize: 50,
      parallelBatches: 3,
      retryFailedBatches: true,
      maxRetries: 3,
      ...options,
    };
  }

  async syncInBatches(
    changes: Change[],
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchSyncResult> {
    const batches = this.createBatches(changes);
    const results: BatchResult[] = [];
    let processedCount = 0;

    // Process batches in parallel groups
    for (let i = 0; i < batches.length; i += this.options.parallelBatches) {
      const batchGroup = batches.slice(i, i + this.options.parallelBatches);

      const groupResults = await Promise.all(
        batchGroup.map((batch, index) =>
          this.processBatch(batch, i + index)
        )
      );

      results.push(...groupResults);
      processedCount += batchGroup.reduce((sum, b) => sum + b.length, 0);

      if (onProgress) {
        onProgress({
          totalBatches: batches.length,
          processedBatches: Math.min(i + this.options.parallelBatches, batches.length),
          totalChanges: changes.length,
          processedChanges: processedCount,
          percentage: (processedCount / changes.length) * 100,
        });
      }
    }

    // Retry failed batches
    if (this.options.retryFailedBatches) {
      await this.retryFailedBatches(results);
    }

    return this.aggregateResults(results);
  }

  private createBatches(changes: Change[]): Change[][] {
    const batches: Change[][] = [];

    for (let i = 0; i < changes.length; i += this.options.batchSize) {
      batches.push(changes.slice(i, i + this.options.batchSize));
    }

    return batches;
  }

  private async processBatch(
    batch: Change[],
    batchIndex: number
  ): Promise<BatchResult> {
    try {
      const response = await this.api.batchSync(batch);

      return {
        batchIndex,
        success: true,
        processedCount: batch.length,
        failedChanges: response.failed || [],
      };
    } catch (error) {
      return {
        batchIndex,
        success: false,
        processedCount: 0,
        failedChanges: batch.map((c) => ({
          changeId: c.id,
          error: error.message,
        })),
        error: error.message,
      };
    }
  }

  private async retryFailedBatches(results: BatchResult[]): Promise<void> {
    const failedBatches = results.filter((r) => !r.success);

    for (const failed of failedBatches) {
      let retryCount = 0;

      while (retryCount < this.options.maxRetries) {
        retryCount++;

        try {
          // Exponential backoff
          await this.delay(Math.pow(2, retryCount) * 1000);

          const failedChanges = failed.failedChanges.map((f) =>
            this.getChangeById(f.changeId)
          );

          const retryResult = await this.api.batchSync(
            failedChanges.filter(Boolean) as Change[]
          );

          if (retryResult.success) {
            failed.success = true;
            failed.processedCount = failedChanges.length;
            failed.failedChanges = [];
            break;
          }
        } catch (error) {
          console.error(
            `Retry ${retryCount} failed for batch ${failed.batchIndex}:`,
            error
          );
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private aggregateResults(results: BatchResult[]): BatchSyncResult {
    return {
      totalBatches: results.length,
      successfulBatches: results.filter((r) => r.success).length,
      failedBatches: results.filter((r) => !r.success).length,
      totalProcessed: results.reduce((sum, r) => sum + r.processedCount, 0),
      totalFailed: results.reduce(
        (sum, r) => sum + r.failedChanges.length,
        0
      ),
      results,
    };
  }
}
```

## Background Sync Handling

Background sync ensures data stays synchronized even when the app is not in the foreground.

```typescript
// sync/BackgroundSync.ts
import BackgroundFetch from 'react-native-background-fetch';
import { AppState, AppStateStatus } from 'react-native';

class BackgroundSyncManager {
  private syncManager: SyncManager;
  private isBackgroundSyncEnabled: boolean = false;
  private minimumSyncInterval: number = 15; // minutes

  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;
    this.setupAppStateListener();
  }

  async enableBackgroundSync(): Promise<void> {
    try {
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: this.minimumSyncInterval,
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
        },
        async (taskId) => {
          console.log('[BackgroundFetch] Task started:', taskId);
          await this.performBackgroundSync();
          BackgroundFetch.finish(taskId);
        },
        async (taskId) => {
          console.log('[BackgroundFetch] Task timeout:', taskId);
          BackgroundFetch.finish(taskId);
        }
      );

      this.isBackgroundSyncEnabled = status === BackgroundFetch.STATUS_AVAILABLE;
      console.log('[BackgroundFetch] Status:', status);
    } catch (error) {
      console.error('[BackgroundFetch] Configuration failed:', error);
    }
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (
    nextAppState: AppStateStatus
  ): Promise<void> => {
    if (nextAppState === 'active') {
      // App came to foreground - sync immediately
      console.log('App active - triggering sync');
      await this.syncManager.triggerSync();
    } else if (nextAppState === 'background') {
      // App going to background - schedule sync
      console.log('App backgrounded - sync will continue in background');
      this.scheduleBackgroundTask();
    }
  };

  private scheduleBackgroundTask(): void {
    BackgroundFetch.scheduleTask({
      taskId: 'com.app.datasync',
      delay: 0,
      periodic: false,
      forceAlarmManager: true,
      stopOnTerminate: false,
      enableHeadless: true,
    });
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      console.log('[BackgroundSync] Starting background sync...');
      await this.syncManager.triggerSync();
      console.log('[BackgroundSync] Background sync completed');
    } catch (error) {
      console.error('[BackgroundSync] Background sync failed:', error);
    }
  }

  // Headless task for when app is terminated
  static async headlessTask(event: { taskId: string }): Promise<void> {
    console.log('[HeadlessTask] Starting:', event.taskId);

    // Initialize minimal sync manager for headless execution
    const headlessSyncManager = await BackgroundSyncManager.createHeadlessSync();
    await headlessSyncManager.triggerSync();

    BackgroundFetch.finish(event.taskId);
  }

  private static async createHeadlessSync(): Promise<SyncManager> {
    // Create minimal sync manager for headless execution
    // This should be lightweight and avoid heavy initialization
    const config: SyncConfig = {
      // Minimal configuration for headless sync
    };
    return new SyncManager(config);
  }
}

// Register headless task
BackgroundFetch.registerHeadlessTask(BackgroundSyncManager.headlessTask);
```

## Progress Indicators

Keeping users informed about sync progress improves the user experience.

```typescript
// sync/SyncProgress.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';

interface SyncProgressState {
  phase: 'idle' | 'preparing' | 'uploading' | 'downloading' | 'complete' | 'error';
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  error?: string;
}

interface SyncProgressProps {
  syncManager: SyncManager;
  showDetails?: boolean;
}

const SyncProgress: React.FC<SyncProgressProps> = ({
  syncManager,
  showDetails = true,
}) => {
  const [progress, setProgress] = useState<SyncProgressState>({
    phase: 'idle',
    totalItems: 0,
    processedItems: 0,
  });
  const [animatedProgress] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = syncManager.subscribeToProgress(
      (newProgress: SyncProgressState) => {
        setProgress(newProgress);

        // Animate progress bar
        const percentage =
          newProgress.totalItems > 0
            ? newProgress.processedItems / newProgress.totalItems
            : 0;

        Animated.timing(animatedProgress, {
          toValue: percentage,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    );

    return unsubscribe;
  }, [syncManager]);

  const getStatusText = (): string => {
    switch (progress.phase) {
      case 'idle':
        return 'Ready to sync';
      case 'preparing':
        return 'Preparing sync...';
      case 'uploading':
        return `Uploading (${progress.processedItems}/${progress.totalItems})`;
      case 'downloading':
        return `Downloading (${progress.processedItems}/${progress.totalItems})`;
      case 'complete':
        return 'Sync complete';
      case 'error':
        return `Sync failed: ${progress.error}`;
      default:
        return '';
    }
  };

  const getStatusColor = (): string => {
    switch (progress.phase) {
      case 'complete':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  if (progress.phase === 'idle') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {progress.phase !== 'complete' && progress.phase !== 'error' && (
          <ActivityIndicator size="small" color={getStatusColor()} />
        )}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {showDetails && progress.totalItems > 0 && (
        <>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: animatedProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getStatusColor(),
                },
              ]}
            />
          </View>

          {progress.currentItem && (
            <Text style={styles.currentItem} numberOfLines={1}>
              {progress.currentItem}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  currentItem: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});

export default SyncProgress;
```

## Error Handling and Retry

Robust error handling ensures sync operations are resilient.

```typescript
// sync/SyncErrorHandler.ts
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface SyncError {
  code: string;
  message: string;
  retryable: boolean;
  originalError?: Error;
}

class SyncErrorHandler {
  private retryConfig: RetryConfig;
  private errorQueue: Map<string, { error: SyncError; retryCount: number }> =
    new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      ...config,
    };
  }

  categorizeError(error: Error): SyncError {
    // Network errors
    if (
      error.message.includes('Network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        retryable: true,
        originalError: error,
      };
    }

    // Server errors (5xx)
    if (error.message.includes('500') || error.message.includes('503')) {
      return {
        code: 'SERVER_ERROR',
        message: 'Server temporarily unavailable',
        retryable: true,
        originalError: error,
      };
    }

    // Authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        retryable: false, // Requires user action
        originalError: error,
      };
    }

    // Conflict errors
    if (error.message.includes('409')) {
      return {
        code: 'CONFLICT_ERROR',
        message: 'Data conflict detected',
        retryable: false, // Requires conflict resolution
        originalError: error,
      };
    }

    // Validation errors
    if (error.message.includes('400') || error.message.includes('422')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        retryable: false, // Data needs to be fixed
        originalError: error,
      };
    }

    // Unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: true, // Retry unknown errors cautiously
      originalError: error,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    let lastError: SyncError | null = null;
    let retryCount = 0;

    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        const result = await operation();
        // Success - clear from error queue
        this.errorQueue.delete(operationId);
        return result;
      } catch (error) {
        lastError = this.categorizeError(error as Error);

        if (!lastError.retryable) {
          this.errorQueue.set(operationId, { error: lastError, retryCount });
          throw lastError;
        }

        retryCount++;

        if (retryCount <= this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(retryCount);
          console.log(
            `Retry ${retryCount}/${this.retryConfig.maxRetries} ` +
              `for ${operationId} after ${delay}ms`
          );
          await this.delay(delay);
        }
      }
    }

    // Max retries exceeded
    this.errorQueue.set(operationId, {
      error: lastError!,
      retryCount,
    });
    throw lastError;
  }

  private calculateDelay(retryCount: number): number {
    const delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getFailedOperations(): Array<{
    operationId: string;
    error: SyncError;
    retryCount: number;
  }> {
    return Array.from(this.errorQueue.entries()).map(
      ([operationId, { error, retryCount }]) => ({
        operationId,
        error,
        retryCount,
      })
    );
  }

  clearError(operationId: string): void {
    this.errorQueue.delete(operationId);
  }

  clearAllErrors(): void {
    this.errorQueue.clear();
  }
}
```

## Testing Sync Logic

Comprehensive testing ensures your sync implementation is reliable.

```typescript
// __tests__/sync/SyncManager.test.ts
import { SyncManager } from '../sync/SyncManager';
import { ChangeTracker } from '../sync/ChangeTracker';
import { ConflictResolver } from '../sync/ConflictResolver';

// Mock dependencies
const mockLocalStore = {
  get: jest.fn(),
  getAll: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

const mockApi = {
  getChangesSince: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  batchSync: jest.fn(),
};

const mockNetInfo = {
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
};

jest.mock('@react-native-community/netinfo', () => mockNetInfo);

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new SyncManager({
      localStore: mockLocalStore,
      remoteAPI: mockApi,
      conflictResolver: new ConflictResolver('last-write-wins'),
      syncInterval: 60000,
      batchSize: 50,
    });
  });

  describe('Push Sync', () => {
    it('should push pending local changes to server', async () => {
      const pendingChanges = [
        {
          id: 'change-1',
          entityType: 'todos',
          entityId: 'todo-1',
          operation: 'CREATE',
          data: { title: 'Test todo' },
          timestamp: Date.now(),
          version: 1,
          clientId: 'client-1',
        },
      ];

      mockLocalStore.query = jest
        .fn()
        .mockResolvedValue(pendingChanges);
      mockApi.create.mockResolvedValue({ id: 'todo-1' });

      await syncManager.pushChanges();

      expect(mockApi.create).toHaveBeenCalledWith('todos', {
        title: 'Test todo',
      });
    });

    it('should handle push errors gracefully', async () => {
      const pendingChanges = [
        {
          id: 'change-1',
          entityType: 'todos',
          entityId: 'todo-1',
          operation: 'CREATE',
          data: { title: 'Test todo' },
          timestamp: Date.now(),
          version: 1,
          clientId: 'client-1',
        },
      ];

      mockLocalStore.query = jest
        .fn()
        .mockResolvedValue(pendingChanges);
      mockApi.create.mockRejectedValue(new Error('Network error'));

      const result = await syncManager.pushChanges();

      expect(result.failed).toBe(1);
    });
  });

  describe('Pull Sync', () => {
    it('should pull remote changes and apply locally', async () => {
      const serverChanges = [
        {
          id: 'change-1',
          entityType: 'todos',
          entityId: 'todo-1',
          operation: 'UPDATE',
          data: { title: 'Updated todo' },
          timestamp: Date.now(),
        },
      ];

      mockApi.getChangesSince.mockResolvedValue(serverChanges);
      mockLocalStore.upsert.mockResolvedValue(undefined);

      await syncManager.pullChanges();

      expect(mockLocalStore.upsert).toHaveBeenCalledWith(
        'todos',
        'todo-1',
        { title: 'Updated todo' }
      );
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using last-write-wins', async () => {
      const localChange = {
        id: 'change-1',
        entityType: 'todos',
        entityId: 'todo-1',
        operation: 'UPDATE',
        data: { title: 'Local update' },
        timestamp: 1000,
        version: 2,
        clientId: 'client-1',
      };

      const serverChange = {
        id: 'change-2',
        entityType: 'todos',
        entityId: 'todo-1',
        operation: 'UPDATE',
        data: { title: 'Server update' },
        timestamp: 2000,
        version: 2,
      };

      const resolver = new ConflictResolver('last-write-wins');
      const resolution = await resolver.resolve({
        localVersion: localChange,
        serverVersion: serverChange,
        entityType: 'todos',
        entityId: 'todo-1',
        conflictType: 'update-update',
        conflictingFields: ['title'],
      });

      expect(resolution.winner).toBe('server');
      expect(resolution.resolvedData.title).toBe('Server update');
    });
  });
});

describe('ChangeTracker', () => {
  let changeTracker: ChangeTracker;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
      query: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
    };
    changeTracker = new ChangeTracker(mockDb, 'test-client');
  });

  it('should track new changes', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.insert.mockResolvedValue(undefined);

    const change = await changeTracker.trackChange(
      'todos',
      'todo-1',
      'CREATE',
      { title: 'New todo' }
    );

    expect(change.entityType).toBe('todos');
    expect(change.operation).toBe('CREATE');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should increment version for existing entities', async () => {
    mockDb.get.mockResolvedValue({ version: 5 });
    mockDb.insert.mockResolvedValue(undefined);

    const change = await changeTracker.trackChange(
      'todos',
      'todo-1',
      'UPDATE',
      { title: 'Updated todo' }
    );

    expect(change.version).toBe(6);
  });
});

describe('Version Vector Sync', () => {
  let versionVectorSync: VersionVectorSync;

  beforeEach(() => {
    versionVectorSync = new VersionVectorSync(
      'client-1',
      mockLocalStore,
      mockApi
    );
  });

  it('should detect concurrent modifications', () => {
    const v1 = { 'client-1': 2, 'client-2': 1 };
    const v2 = { 'client-1': 1, 'client-2': 2 };

    const result = versionVectorSync.compareVersions(v1, v2);

    expect(result).toBe('concurrent');
  });

  it('should correctly identify newer versions', () => {
    const v1 = { 'client-1': 3, 'client-2': 2 };
    const v2 = { 'client-1': 2, 'client-2': 1 };

    const result = versionVectorSync.compareVersions(v1, v2);

    expect(result).toBe('v1_newer');
  });

  it('should merge version vectors correctly', () => {
    const v1 = { 'client-1': 3, 'client-2': 1 };
    const v2 = { 'client-1': 2, 'client-2': 4, 'client-3': 1 };

    const merged = versionVectorSync.mergeVersionVectors(v1, v2);

    expect(merged).toEqual({
      'client-1': 3,
      'client-2': 4,
      'client-3': 1,
    });
  });
});

describe('Batch Sync', () => {
  let batchSync: BatchSync;

  beforeEach(() => {
    batchSync = new BatchSync(mockApi, mockLocalStore, {
      batchSize: 2,
      parallelBatches: 2,
    });
  });

  it('should create correct number of batches', async () => {
    const changes = Array(5)
      .fill(null)
      .map((_, i) => ({
        id: `change-${i}`,
        entityType: 'todos',
        entityId: `todo-${i}`,
        operation: 'CREATE' as const,
        data: { title: `Todo ${i}` },
        timestamp: Date.now(),
        version: 1,
        clientId: 'test-client',
      }));

    mockApi.batchSync.mockResolvedValue({ success: true, failed: [] });

    const progressUpdates: any[] = [];
    await batchSync.syncInBatches(changes, (progress) => {
      progressUpdates.push(progress);
    });

    // Should have 3 batches for 5 items with batch size 2
    expect(mockApi.batchSync).toHaveBeenCalledTimes(3);
  });
});

describe('Error Handler', () => {
  let errorHandler: SyncErrorHandler;

  beforeEach(() => {
    errorHandler = new SyncErrorHandler({
      maxRetries: 3,
      baseDelay: 100,
    });
  });

  it('should categorize network errors as retryable', () => {
    const error = new Error('Network request failed');
    const categorized = errorHandler.categorizeError(error);

    expect(categorized.code).toBe('NETWORK_ERROR');
    expect(categorized.retryable).toBe(true);
  });

  it('should categorize auth errors as non-retryable', () => {
    const error = new Error('401 Unauthorized');
    const categorized = errorHandler.categorizeError(error);

    expect(categorized.code).toBe('AUTH_ERROR');
    expect(categorized.retryable).toBe(false);
  });

  it('should retry failed operations with backoff', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return Promise.resolve('success');
    });

    const result = await errorHandler.executeWithRetry(
      operation,
      'test-op'
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

## Complete Implementation Example

Here's how to tie everything together in a complete implementation.

```typescript
// sync/index.ts
import { SyncManager } from './SyncManager';
import { ChangeTracker } from './ChangeTracker';
import { ConflictResolver } from './ConflictResolver';
import { BatchSync } from './BatchSync';
import { BackgroundSyncManager } from './BackgroundSync';
import { SyncErrorHandler } from './SyncErrorHandler';

export function createSyncSystem(config: {
  apiBaseUrl: string;
  clientId: string;
  conflictStrategy: ResolutionStrategy;
}): SyncSystem {
  // Initialize local storage
  const localStore = new LocalStorage();

  // Initialize API client
  const api = new RemoteAPI(config.apiBaseUrl);

  // Initialize change tracker
  const changeTracker = new ChangeTracker(localStore.db, config.clientId);

  // Initialize conflict resolver
  const conflictResolver = new ConflictResolver(config.conflictStrategy);

  // Initialize error handler
  const errorHandler = new SyncErrorHandler();

  // Initialize sync manager
  const syncManager = new SyncManager({
    localStore,
    remoteAPI: api,
    conflictResolver,
    syncInterval: 60000,
    batchSize: 50,
  });

  // Initialize background sync
  const backgroundSync = new BackgroundSyncManager(syncManager);
  backgroundSync.enableBackgroundSync();

  return {
    syncManager,
    changeTracker,
    conflictResolver,
    errorHandler,
    backgroundSync,

    // Convenience methods
    async trackAndSync(
      entityType: string,
      entityId: string,
      operation: Change['operation'],
      data: any
    ): Promise<void> {
      await changeTracker.trackChange(entityType, entityId, operation, data);
      await syncManager.triggerSync();
    },

    async forceSync(): Promise<SyncResult> {
      return syncManager.performFullSync();
    },
  };
}

// Usage in your app
const syncSystem = createSyncSystem({
  apiBaseUrl: 'https://api.example.com',
  clientId: 'device-uuid',
  conflictStrategy: 'last-write-wins',
});

// Track a change
await syncSystem.trackAndSync('todos', 'todo-123', 'UPDATE', {
  title: 'Updated title',
  completed: true,
});
```

## Best Practices Summary

1. **Always track changes locally first**: Never rely solely on network connectivity. Queue all changes locally before attempting to sync.

2. **Use appropriate conflict resolution**: Choose a strategy that matches your use case. Last-write-wins is simple but may lose data. Consider merge strategies for collaborative apps.

3. **Implement exponential backoff**: Don't hammer the server with retries. Use exponential backoff with jitter to spread out retry attempts.

4. **Batch operations for efficiency**: Syncing items one by one is inefficient. Batch operations reduce network overhead and improve performance.

5. **Provide user feedback**: Users should always know when sync is happening and if it fails. Implement clear progress indicators and error messages.

6. **Test thoroughly**: Sync logic is complex and error-prone. Write comprehensive tests covering all scenarios including offline states, conflicts, and failures.

7. **Handle edge cases**: Consider scenarios like the app being killed during sync, device restarts, and prolonged offline periods.

8. **Version your sync protocol**: As your app evolves, you may need to change the sync format. Include version information to handle migrations.

## Conclusion

Implementing robust data synchronization in React Native requires careful consideration of many factors: sync strategies, conflict resolution, error handling, and user experience. By following the patterns and practices outlined in this guide, you can build a reliable sync system that provides a seamless experience for your users, whether they're online or offline.

The key is to start simple with a strategy that fits your use case, then iterate and add complexity as needed. Remember that the best sync system is one that users never have to think about - data just works, wherever they are.
