# How to Persist State with AsyncStorage and MMKV in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, AsyncStorage, MMKV, Storage, Persistence, Mobile Development

Description: Learn how to persist application state in React Native using AsyncStorage and MMKV for better performance.

---

Mobile applications often need to persist data locally to provide a seamless user experience. Whether it's user preferences, authentication tokens, cached data, or offline content, having a reliable storage solution is crucial. In React Native, two popular options stand out: AsyncStorage and MMKV. This comprehensive guide will walk you through both solutions, their use cases, and best practices for implementing persistent storage in your React Native applications.

## Table of Contents

1. [AsyncStorage Overview](#asyncstorage-overview)
2. [MMKV Introduction](#mmkv-introduction)
3. [Performance Comparison](#performance-comparison)
4. [Basic CRUD Operations](#basic-crud-operations)
5. [Storing Complex Objects](#storing-complex-objects)
6. [Encryption with MMKV](#encryption-with-mmkv)
7. [Integration with State Management](#integration-with-state-management)
8. [Migration from AsyncStorage to MMKV](#migration-from-asyncstorage-to-mmkv)
9. [Handling Storage Limits](#handling-storage-limits)
10. [Clearing and Resetting Storage](#clearing-and-resetting-storage)
11. [Best Practices](#best-practices)
12. [Testing Storage Operations](#testing-storage-operations)

## AsyncStorage Overview

AsyncStorage is an unencrypted, asynchronous, persistent key-value storage system that is global to the app. It was originally part of React Native core but has since been moved to the community package `@react-native-async-storage/async-storage`.

### Installation

```bash
# Using npm
npm install @react-native-async-storage/async-storage

# Using yarn
yarn add @react-native-async-storage/async-storage

# For iOS (React Native 0.60+)
cd ios && pod install
```

### Key Features of AsyncStorage

- **Simple API**: Easy-to-use key-value storage with a straightforward API
- **Asynchronous**: All operations return Promises, preventing UI blocking
- **Cross-platform**: Works on both iOS and Android
- **Community maintained**: Active maintenance and regular updates

### Basic AsyncStorage Usage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store a value
const storeData = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
    console.log('Data stored successfully');
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

// Retrieve a value
const getData = async (key: string): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch (error) {
    console.error('Error retrieving data:', error);
    return null;
  }
};

// Remove a value
const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log('Data removed successfully');
  } catch (error) {
    console.error('Error removing data:', error);
  }
};
```

### AsyncStorage Limitations

While AsyncStorage is a solid choice for simple use cases, it has some limitations:

1. **Performance**: Operations can be slow, especially with large datasets
2. **No encryption**: Data is stored in plain text
3. **Size limits**: 6MB limit on Android (can be increased)
4. **Serialization**: Only stores strings, requiring JSON serialization for objects

## MMKV Introduction

MMKV is an efficient, small, and easy-to-use mobile key-value storage framework developed by WeChat. The React Native binding `react-native-mmkv` provides a high-performance alternative to AsyncStorage.

### Installation

```bash
# Using npm
npm install react-native-mmkv

# Using yarn
yarn add react-native-mmkv

# For iOS
cd ios && pod install
```

### Key Features of MMKV

- **Exceptional performance**: Up to 30x faster than AsyncStorage
- **Synchronous API**: No need for async/await in most cases
- **Encryption support**: Built-in AES-256 encryption
- **Small footprint**: Minimal impact on app size
- **Memory-mapped files**: Efficient I/O operations
- **Multi-process access**: Safe for apps with multiple processes

### Basic MMKV Setup

```typescript
import { MMKV } from 'react-native-mmkv';

// Create a new MMKV instance
const storage = new MMKV();

// Create a named instance for different storage contexts
const userStorage = new MMKV({
  id: 'user-storage',
});

// Create an encrypted instance
const secureStorage = new MMKV({
  id: 'secure-storage',
  encryptionKey: 'your-encryption-key',
});
```

## Performance Comparison

Understanding the performance differences between AsyncStorage and MMKV is crucial for making the right choice for your application.

### Benchmark Results

Here's a typical comparison of 1000 read/write operations:

| Operation | AsyncStorage | MMKV | Improvement |
|-----------|-------------|------|-------------|
| Write (string) | 350ms | 12ms | ~29x faster |
| Read (string) | 280ms | 8ms | ~35x faster |
| Write (object) | 420ms | 15ms | ~28x faster |
| Read (object) | 310ms | 10ms | ~31x faster |
| Delete | 180ms | 5ms | ~36x faster |

### When to Use Each

**Use AsyncStorage when:**
- Building simple applications with minimal storage needs
- You need maximum compatibility with older React Native versions
- Your app doesn't require high-frequency storage operations

**Use MMKV when:**
- Performance is critical
- You need encryption
- Your app performs frequent read/write operations
- You're building a large-scale application

## Basic CRUD Operations

Let's explore how to perform Create, Read, Update, and Delete operations with both storage solutions.

### AsyncStorage CRUD Operations

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class AsyncStorageService {
  // Create or Update
  async set(key: string, value: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('AsyncStorage set error:', error);
      return false;
    }
  }

  // Read
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage get error:', error);
      return null;
    }
  }

  // Delete
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('AsyncStorage remove error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // Get all keys
  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
      return [];
    }
  }

  // Multi-get
  async multiGet(keys: string[]): Promise<Map<string, string | null>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      return new Map(pairs);
    } catch (error) {
      console.error('AsyncStorage multiGet error:', error);
      return new Map();
    }
  }

  // Multi-set
  async multiSet(pairs: [string, string][]): Promise<boolean> {
    try {
      await AsyncStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('AsyncStorage multiSet error:', error);
      return false;
    }
  }
}

export const asyncStorageService = new AsyncStorageService();
```

### MMKV CRUD Operations

```typescript
import { MMKV } from 'react-native-mmkv';

class MMKVStorageService {
  private storage: MMKV;

  constructor(id?: string, encryptionKey?: string) {
    this.storage = new MMKV({
      id: id || 'default',
      encryptionKey,
    });
  }

  // Create or Update - String
  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }

  // Create or Update - Number
  setNumber(key: string, value: number): void {
    this.storage.set(key, value);
  }

  // Create or Update - Boolean
  setBoolean(key: string, value: boolean): void {
    this.storage.set(key, value);
  }

  // Read - String
  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }

  // Read - Number
  getNumber(key: string): number | undefined {
    return this.storage.getNumber(key);
  }

  // Read - Boolean
  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }

  // Delete
  remove(key: string): void {
    this.storage.delete(key);
  }

  // Check if key exists
  exists(key: string): boolean {
    return this.storage.contains(key);
  }

  // Get all keys
  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }

  // Clear all data
  clearAll(): void {
    this.storage.clearAll();
  }
}

export const mmkvStorage = new MMKVStorageService();
```

## Storing Complex Objects

Both storage solutions require special handling for complex objects like arrays and nested structures.

### AsyncStorage Object Storage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class AsyncStorageObjectService {
  // Store an object
  async setObject<T>(key: string, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Error storing object:', error);
      return false;
    }
  }

  // Retrieve an object
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving object:', error);
      return null;
    }
  }

  // Merge object (partial update)
  async mergeObject<T extends object>(key: string, value: Partial<T>): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.mergeItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Error merging object:', error);
      return false;
    }
  }
}

// Usage example
const objectStorage = new AsyncStorageObjectService();

const user: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
};

// Store user
await objectStorage.setObject('currentUser', user);

// Retrieve user
const storedUser = await objectStorage.getObject<User>('currentUser');

// Update user preferences
await objectStorage.mergeObject('currentUser', {
  preferences: {
    theme: 'light',
    notifications: false,
  },
});
```

### MMKV Object Storage

```typescript
import { MMKV } from 'react-native-mmkv';

interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class MMKVObjectService {
  private storage: MMKV;

  constructor(storage: MMKV) {
    this.storage = storage;
  }

  // Store an object
  setObject<T>(key: string, value: T): void {
    const jsonValue = JSON.stringify(value);
    this.storage.set(key, jsonValue);
  }

  // Retrieve an object
  getObject<T>(key: string): T | null {
    const jsonValue = this.storage.getString(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  }

  // Update object (merge)
  updateObject<T extends object>(key: string, updates: Partial<T>): void {
    const existing = this.getObject<T>(key);
    if (existing) {
      const merged = { ...existing, ...updates };
      this.setObject(key, merged);
    }
  }

  // Store an array
  setArray<T>(key: string, value: T[]): void {
    this.setObject(key, value);
  }

  // Retrieve an array
  getArray<T>(key: string): T[] {
    return this.getObject<T[]>(key) || [];
  }

  // Append to array
  appendToArray<T>(key: string, item: T): void {
    const array = this.getArray<T>(key);
    array.push(item);
    this.setArray(key, array);
  }

  // Remove from array by predicate
  removeFromArray<T>(key: string, predicate: (item: T) => boolean): void {
    const array = this.getArray<T>(key);
    const filtered = array.filter((item) => !predicate(item));
    this.setArray(key, filtered);
  }
}

// Usage example
const storage = new MMKV();
const objectService = new MMKVObjectService(storage);

const user: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
};

// Store user
objectService.setObject('currentUser', user);

// Retrieve user
const storedUser = objectService.getObject<User>('currentUser');

// Update user
objectService.updateObject<User>('currentUser', { name: 'Jane Doe' });
```

## Encryption with MMKV

One of MMKV's standout features is built-in encryption support, making it ideal for storing sensitive data.

### Setting Up Encrypted Storage

```typescript
import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';

class SecureStorageService {
  private storage: MMKV | null = null;
  private static KEYCHAIN_SERVICE = 'mmkv-encryption-key';

  // Initialize secure storage with a generated or retrieved key
  async initialize(): Promise<void> {
    const encryptionKey = await this.getOrCreateEncryptionKey();

    this.storage = new MMKV({
      id: 'secure-storage',
      encryptionKey,
    });
  }

  // Get existing key or create new one
  private async getOrCreateEncryptionKey(): Promise<string> {
    try {
      // Try to retrieve existing key
      const credentials = await Keychain.getGenericPassword({
        service: SecureStorageService.KEYCHAIN_SERVICE,
      });

      if (credentials) {
        return credentials.password;
      }

      // Generate new key
      const newKey = this.generateSecureKey();

      // Store in keychain
      await Keychain.setGenericPassword('mmkv', newKey, {
        service: SecureStorageService.KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      return newKey;
    } catch (error) {
      console.error('Error managing encryption key:', error);
      throw error;
    }
  }

  // Generate a secure random key
  private generateSecureKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // Store sensitive data
  setSecure(key: string, value: string): void {
    if (!this.storage) {
      throw new Error('Secure storage not initialized');
    }
    this.storage.set(key, value);
  }

  // Retrieve sensitive data
  getSecure(key: string): string | undefined {
    if (!this.storage) {
      throw new Error('Secure storage not initialized');
    }
    return this.storage.getString(key);
  }

  // Remove sensitive data
  removeSecure(key: string): void {
    if (!this.storage) {
      throw new Error('Secure storage not initialized');
    }
    this.storage.delete(key);
  }

  // Re-encrypt storage with new key
  async reEncrypt(): Promise<void> {
    if (!this.storage) {
      throw new Error('Secure storage not initialized');
    }

    // Get all existing data
    const keys = this.storage.getAllKeys();
    const data: Map<string, string> = new Map();

    keys.forEach((key) => {
      const value = this.storage!.getString(key);
      if (value) {
        data.set(key, value);
      }
    });

    // Clear existing storage
    this.storage.clearAll();

    // Generate new encryption key
    const newKey = this.generateSecureKey();

    // Update keychain
    await Keychain.setGenericPassword('mmkv', newKey, {
      service: SecureStorageService.KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    // Re-initialize with new key
    this.storage = new MMKV({
      id: 'secure-storage',
      encryptionKey: newKey,
    });

    // Restore data
    data.forEach((value, key) => {
      this.storage!.set(key, value);
    });
  }
}

export const secureStorage = new SecureStorageService();
```

### Usage Example for Encrypted Storage

```typescript
// Initialize on app startup
await secureStorage.initialize();

// Store sensitive data
secureStorage.setSecure('authToken', 'eyJhbGciOiJIUzI1NiIs...');
secureStorage.setSecure('refreshToken', 'dGhpcyBpcyBhIHJlZnJl...');

// Retrieve sensitive data
const authToken = secureStorage.getSecure('authToken');

// Remove sensitive data on logout
secureStorage.removeSecure('authToken');
secureStorage.removeSecure('refreshToken');
```

## Integration with State Management

Integrating storage with state management libraries creates a seamless persistence layer.

### Integration with Zustand

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Custom storage adapter for Zustand
const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};

interface UserState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: UserState['user']) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

// Usage in component
function ProfileScreen() {
  const { user, isAuthenticated, setUser, logout } = useUserStore();

  return (
    <View>
      {isAuthenticated ? (
        <>
          <Text>Welcome, {user?.name}</Text>
          <Button title="Logout" onPress={logout} />
        </>
      ) : (
        <Text>Please log in</Text>
      )}
    </View>
  );
}
```

### Integration with Redux

```typescript
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Custom storage adapter for Redux Persist
const reduxStorage = {
  setItem: (key: string, value: string): Promise<boolean> => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key: string): Promise<string | undefined> => {
    const value = storage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: (key: string): Promise<void> => {
    storage.delete(key);
    return Promise.resolve();
  },
};

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const initialState: SettingsState = {
  theme: 'light',
  language: 'en',
  notifications: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setNotifications: (state, action: PayloadAction<boolean>) => {
      state.notifications = action.payload;
    },
  },
});

const persistConfig = {
  key: 'settings',
  storage: reduxStorage,
};

const persistedReducer = persistReducer(persistConfig, settingsSlice.reducer);

export const store = configureStore({
  reducer: {
    settings: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
export const { setTheme, setLanguage, setNotifications } = settingsSlice.actions;
```

## Migration from AsyncStorage to MMKV

If you're upgrading an existing app from AsyncStorage to MMKV, here's a safe migration strategy.

### Migration Utility

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  failedKeys: string[];
  errors: Error[];
}

class StorageMigration {
  private mmkv: MMKV;
  private migrationKey = '__migration_completed__';

  constructor(mmkvInstance: MMKV) {
    this.mmkv = mmkvInstance;
  }

  // Check if migration has already been completed
  isMigrationCompleted(): boolean {
    return this.mmkv.getBoolean(this.migrationKey) === true;
  }

  // Perform migration from AsyncStorage to MMKV
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedKeys: [],
      failedKeys: [],
      errors: [],
    };

    // Skip if already migrated
    if (this.isMigrationCompleted()) {
      console.log('Migration already completed');
      return result;
    }

    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log(`Found ${keys.length} keys to migrate`);

      // Migrate each key
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);

          if (value !== null) {
            this.mmkv.set(key, value);
            result.migratedKeys.push(key);
          }
        } catch (error) {
          result.failedKeys.push(key);
          result.errors.push(error as Error);
          result.success = false;
        }
      }

      // Mark migration as completed if successful
      if (result.success) {
        this.mmkv.set(this.migrationKey, true);

        // Optionally clear AsyncStorage after successful migration
        // await AsyncStorage.clear();
      }

      console.log(`Migration completed: ${result.migratedKeys.length} keys migrated`);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error as Error);
      return result;
    }
  }

  // Migrate specific keys only
  async migrateKeys(keysToMigrate: string[]): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedKeys: [],
      failedKeys: [],
      errors: [],
    };

    for (const key of keysToMigrate) {
      try {
        const value = await AsyncStorage.getItem(key);

        if (value !== null) {
          this.mmkv.set(key, value);
          result.migratedKeys.push(key);

          // Remove from AsyncStorage after successful migration
          await AsyncStorage.removeItem(key);
        }
      } catch (error) {
        result.failedKeys.push(key);
        result.errors.push(error as Error);
        result.success = false;
      }
    }

    return result;
  }

  // Rollback migration
  async rollback(): Promise<void> {
    const keys = this.mmkv.getAllKeys();

    for (const key of keys) {
      if (key === this.migrationKey) continue;

      const value = this.mmkv.getString(key);
      if (value !== undefined) {
        await AsyncStorage.setItem(key, value);
      }
    }

    this.mmkv.clearAll();
    console.log('Rollback completed');
  }
}

// Usage in app initialization
const mmkv = new MMKV();
const migration = new StorageMigration(mmkv);

async function initializeStorage(): Promise<void> {
  if (!migration.isMigrationCompleted()) {
    const result = await migration.migrate();

    if (!result.success) {
      console.error('Migration failed:', result.errors);
      // Handle migration failure
    }
  }
}
```

## Handling Storage Limits

Understanding and managing storage limits is essential for building robust applications.

### AsyncStorage Limits

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageLimitManager {
  private maxStorageSize: number;

  constructor(maxSizeMB: number = 6) {
    this.maxStorageSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  // Calculate current storage usage
  async getCurrentUsage(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Calculate size in bytes (key + value)
          totalSize += key.length * 2 + value.length * 2;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return 0;
    }
  }

  // Check if storage is near limit
  async isNearLimit(threshold: number = 0.8): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    return usage >= this.maxStorageSize * threshold;
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    usedBytes: number;
    usedMB: string;
    maxMB: number;
    percentUsed: string;
    keyCount: number;
  }> {
    const usedBytes = await this.getCurrentUsage();
    const keys = await AsyncStorage.getAllKeys();

    return {
      usedBytes,
      usedMB: (usedBytes / (1024 * 1024)).toFixed(2),
      maxMB: this.maxStorageSize / (1024 * 1024),
      percentUsed: ((usedBytes / this.maxStorageSize) * 100).toFixed(1),
      keyCount: keys.length,
    };
  }

  // Clean up old or expired data
  async cleanup(
    isExpired: (key: string, value: string) => boolean
  ): Promise<string[]> {
    const removedKeys: string[] = [];
    const keys = await AsyncStorage.getAllKeys();

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value && isExpired(key, value)) {
        await AsyncStorage.removeItem(key);
        removedKeys.push(key);
      }
    }

    return removedKeys;
  }
}

// Usage
const limitManager = new StorageLimitManager(6); // 6MB limit

async function checkStorage(): Promise<void> {
  const stats = await limitManager.getStorageStats();
  console.log(`Storage: ${stats.usedMB}MB / ${stats.maxMB}MB (${stats.percentUsed}%)`);

  if (await limitManager.isNearLimit()) {
    // Trigger cleanup
    const removed = await limitManager.cleanup((key, value) => {
      // Example: Remove cached data older than 7 days
      try {
        const data = JSON.parse(value);
        const age = Date.now() - (data.timestamp || 0);
        return age > 7 * 24 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    });
    console.log(`Cleaned up ${removed.length} expired items`);
  }
}
```

### MMKV Size Management

```typescript
import { MMKV } from 'react-native-mmkv';

class MMKVSizeManager {
  private storage: MMKV;

  constructor(storage: MMKV) {
    this.storage = storage;
  }

  // Get storage size (MMKV provides this natively)
  getStorageSize(): number {
    // Returns size in bytes
    return this.storage.size;
  }

  // Trim storage to reduce file size
  trim(): void {
    this.storage.trim();
  }

  // Get key count
  getKeyCount(): number {
    return this.storage.getAllKeys().length;
  }

  // Get storage statistics
  getStats(): {
    sizeBytes: number;
    sizeMB: string;
    keyCount: number;
  } {
    return {
      sizeBytes: this.getStorageSize(),
      sizeMB: (this.getStorageSize() / (1024 * 1024)).toFixed(2),
      keyCount: this.getKeyCount(),
    };
  }
}
```

## Clearing and Resetting Storage

Properly clearing storage is important for features like logout or app reset.

### AsyncStorage Clear Operations

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class AsyncStorageCleaner {
  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('All storage cleared');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Clear specific keys
  async clearKeys(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
      console.log(`Cleared ${keys.length} keys`);
    } catch (error) {
      console.error('Error clearing keys:', error);
    }
  }

  // Clear by prefix
  async clearByPrefix(prefix: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((key) => key.startsWith(prefix));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      return keysToRemove;
    } catch (error) {
      console.error('Error clearing by prefix:', error);
      return [];
    }
  }

  // Clear user data but keep app settings
  async clearUserData(): Promise<void> {
    const protectedKeys = ['settings', 'appVersion', 'onboardingComplete'];

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((key) => !protectedKeys.includes(key));

      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Cleared user data: ${keysToRemove.length} keys removed`);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }
}
```

### MMKV Clear Operations

```typescript
import { MMKV } from 'react-native-mmkv';

class MMKVCleaner {
  private storage: MMKV;

  constructor(storage: MMKV) {
    this.storage = storage;
  }

  // Clear all data
  clearAll(): void {
    this.storage.clearAll();
    console.log('All MMKV storage cleared');
  }

  // Clear specific keys
  clearKeys(keys: string[]): void {
    keys.forEach((key) => this.storage.delete(key));
    console.log(`Cleared ${keys.length} keys`);
  }

  // Clear by prefix
  clearByPrefix(prefix: string): string[] {
    const allKeys = this.storage.getAllKeys();
    const keysToRemove = allKeys.filter((key) => key.startsWith(prefix));

    keysToRemove.forEach((key) => this.storage.delete(key));

    return keysToRemove;
  }

  // Clear user data but keep app settings
  clearUserData(protectedKeys: string[] = ['settings', 'appVersion']): void {
    const allKeys = this.storage.getAllKeys();

    allKeys.forEach((key) => {
      if (!protectedKeys.includes(key)) {
        this.storage.delete(key);
      }
    });
  }

  // Secure clear (overwrite before delete)
  secureClear(): void {
    const keys = this.storage.getAllKeys();

    // Overwrite all values with empty strings
    keys.forEach((key) => this.storage.set(key, ''));

    // Then clear
    this.storage.clearAll();

    // Trim to reclaim space
    this.storage.trim();
  }
}
```

## Best Practices

Follow these best practices to ensure reliable and efficient storage operations.

### 1. Use Type-Safe Wrappers

```typescript
import { MMKV } from 'react-native-mmkv';

// Define storage keys as constants
const STORAGE_KEYS = {
  USER: 'user',
  SETTINGS: 'settings',
  AUTH_TOKEN: 'authToken',
  CACHE_PREFIX: 'cache_',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Type-safe storage wrapper
class TypedStorage {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV();
  }

  // Type-safe getter with default value
  get<T>(key: StorageKey, defaultValue: T): T {
    const value = this.storage.getString(key);
    if (value === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  // Type-safe setter
  set<T>(key: StorageKey, value: T): void {
    this.storage.set(key, JSON.stringify(value));
  }

  // Type-safe removal
  remove(key: StorageKey): void {
    this.storage.delete(key);
  }
}
```

### 2. Implement Error Boundaries

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class SafeStorage {
  async safeGet<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return fallback;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Storage error for key "${key}":`, error);
      // Log to analytics
      // analytics.logError('storage_read_error', { key, error });
      return fallback;
    }
  }

  async safeSet<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Storage write error for key "${key}":`, error);
      // Log to analytics
      return false;
    }
  }
}
```

### 3. Implement Data Versioning

```typescript
interface VersionedData<T> {
  version: number;
  data: T;
  timestamp: number;
}

class VersionedStorage {
  private storage: MMKV;
  private currentVersion: number;

  constructor(storage: MMKV, version: number) {
    this.storage = storage;
    this.currentVersion = version;
  }

  set<T>(key: string, data: T): void {
    const versionedData: VersionedData<T> = {
      version: this.currentVersion,
      data,
      timestamp: Date.now(),
    };
    this.storage.set(key, JSON.stringify(versionedData));
  }

  get<T>(key: string, migrate?: (oldData: unknown, oldVersion: number) => T): T | null {
    const raw = this.storage.getString(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as VersionedData<T>;

      if (parsed.version < this.currentVersion && migrate) {
        // Migrate old data format
        const migratedData = migrate(parsed.data, parsed.version);
        this.set(key, migratedData);
        return migratedData;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }
}
```

### 4. Use Namespaced Storage

```typescript
import { MMKV } from 'react-native-mmkv';

class NamespacedStorage {
  private storage: MMKV;
  private namespace: string;

  constructor(namespace: string, storage?: MMKV) {
    this.namespace = namespace;
    this.storage = storage || new MMKV({ id: namespace });
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  set(key: string, value: string): void {
    this.storage.set(this.getKey(key), value);
  }

  get(key: string): string | undefined {
    return this.storage.getString(this.getKey(key));
  }

  delete(key: string): void {
    this.storage.delete(this.getKey(key));
  }

  clearNamespace(): void {
    const prefix = `${this.namespace}:`;
    const keys = this.storage.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
      }
    });
  }
}

// Usage
const userStorage = new NamespacedStorage('user');
const cacheStorage = new NamespacedStorage('cache');
const settingsStorage = new NamespacedStorage('settings');
```

## Testing Storage Operations

Comprehensive testing ensures your storage layer works correctly.

### Mock AsyncStorage for Testing

```typescript
// __mocks__/@react-native-async-storage/async-storage.ts
const mockStorage: Map<string, string> = new Map();

const AsyncStorageMock = {
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),

  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockStorage.get(key) || null);
  }),

  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(() => {
    return Promise.resolve(Array.from(mockStorage.keys()));
  }),

  multiGet: jest.fn((keys: string[]) => {
    const pairs = keys.map((key) => [key, mockStorage.get(key) || null]);
    return Promise.resolve(pairs);
  }),

  multiSet: jest.fn((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => mockStorage.set(key, value));
    return Promise.resolve();
  }),

  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => mockStorage.delete(key));
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    mockStorage.clear();
    return Promise.resolve();
  }),

  // Helper for tests
  __resetMock: () => {
    mockStorage.clear();
    jest.clearAllMocks();
  },
};

export default AsyncStorageMock;
```

### Mock MMKV for Testing

```typescript
// __mocks__/react-native-mmkv.ts
class MMKVMock {
  private storage: Map<string, string | number | boolean> = new Map();

  set(key: string, value: string | number | boolean): void {
    this.storage.set(key, value);
  }

  getString(key: string): string | undefined {
    const value = this.storage.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.storage.get(key);
    return typeof value === 'number' ? value : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.storage.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  contains(key: string): boolean {
    return this.storage.has(key);
  }

  clearAll(): void {
    this.storage.clear();
  }

  get size(): number {
    return this.storage.size;
  }

  trim(): void {
    // No-op for mock
  }
}

export { MMKVMock as MMKV };
```

### Unit Tests Example

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { asyncStorageService } from './asyncStorageService';
import { mmkvStorage } from './mmkvStorage';

// AsyncStorage tests
describe('AsyncStorageService', () => {
  beforeEach(() => {
    (AsyncStorage as any).__resetMock();
  });

  test('should store and retrieve a string value', async () => {
    await asyncStorageService.set('testKey', 'testValue');
    const result = await asyncStorageService.get('testKey');

    expect(result).toBe('testValue');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
  });

  test('should return null for non-existent key', async () => {
    const result = await asyncStorageService.get('nonExistent');
    expect(result).toBeNull();
  });

  test('should remove a value', async () => {
    await asyncStorageService.set('testKey', 'testValue');
    await asyncStorageService.remove('testKey');

    const result = await asyncStorageService.get('testKey');
    expect(result).toBeNull();
  });

  test('should check if key exists', async () => {
    await asyncStorageService.set('existingKey', 'value');

    expect(await asyncStorageService.exists('existingKey')).toBe(true);
    expect(await asyncStorageService.exists('nonExistent')).toBe(false);
  });

  test('should perform multi-set operation', async () => {
    const pairs: [string, string][] = [
      ['key1', 'value1'],
      ['key2', 'value2'],
    ];

    await asyncStorageService.multiSet(pairs);

    expect(AsyncStorage.multiSet).toHaveBeenCalledWith(pairs);
  });
});

// MMKV tests
describe('MMKVStorageService', () => {
  let storage: MMKV;

  beforeEach(() => {
    storage = new MMKV();
    storage.clearAll();
  });

  test('should store and retrieve a string value', () => {
    mmkvStorage.setString('testKey', 'testValue');
    const result = mmkvStorage.getString('testKey');

    expect(result).toBe('testValue');
  });

  test('should store and retrieve a number value', () => {
    mmkvStorage.setNumber('count', 42);
    const result = mmkvStorage.getNumber('count');

    expect(result).toBe(42);
  });

  test('should store and retrieve a boolean value', () => {
    mmkvStorage.setBoolean('isEnabled', true);
    const result = mmkvStorage.getBoolean('isEnabled');

    expect(result).toBe(true);
  });

  test('should return undefined for non-existent key', () => {
    const result = mmkvStorage.getString('nonExistent');
    expect(result).toBeUndefined();
  });

  test('should check if key exists', () => {
    mmkvStorage.setString('existingKey', 'value');

    expect(mmkvStorage.exists('existingKey')).toBe(true);
    expect(mmkvStorage.exists('nonExistent')).toBe(false);
  });

  test('should clear all data', () => {
    mmkvStorage.setString('key1', 'value1');
    mmkvStorage.setString('key2', 'value2');

    mmkvStorage.clearAll();

    expect(mmkvStorage.getAllKeys()).toHaveLength(0);
  });
});
```

### Integration Test Example

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useUserStore } from './userStore';

describe('User Store with MMKV Persistence', () => {
  beforeEach(() => {
    // Clear persisted state
    useUserStore.persist.clearStorage();
  });

  test('should persist user data across store reinitializations', async () => {
    const { result, rerender } = renderHook(() => useUserStore());

    // Set user
    act(() => {
      result.current.setUser({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    // Wait for persistence
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Simulate app restart by rehydrating
    await act(async () => {
      await useUserStore.persist.rehydrate();
    });

    rerender();

    // Verify data persisted
    expect(result.current.user).toEqual({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('should clear persisted data on logout', async () => {
    const { result } = renderHook(() => useUserStore());

    // Set user then logout
    act(() => {
      result.current.setUser({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    act(() => {
      result.current.logout();
    });

    // Verify state cleared
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

## Conclusion

Choosing the right storage solution for your React Native application depends on your specific needs. AsyncStorage provides a simple, widely-compatible solution for basic storage requirements, while MMKV offers superior performance and encryption capabilities for more demanding applications.

Key takeaways:

1. **Start with AsyncStorage** if you need simple key-value storage and don't have performance-critical requirements
2. **Use MMKV** when you need high-performance storage, encryption, or synchronous operations
3. **Always implement error handling** to gracefully handle storage failures
4. **Use type-safe wrappers** to prevent runtime errors and improve code maintainability
5. **Plan for migration** if you're upgrading from AsyncStorage to MMKV
6. **Monitor storage usage** to prevent hitting size limits
7. **Implement proper cleanup** for logout and app reset functionality
8. **Write comprehensive tests** to ensure storage reliability

By following the patterns and practices outlined in this guide, you can build a robust and efficient storage layer for your React Native applications that provides a great user experience while maintaining data integrity and security.
