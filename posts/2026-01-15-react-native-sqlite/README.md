# How to Use SQLite for Local Database in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, SQLite, Database, Local Storage, Mobile Development, Data Persistence

Description: Learn how to implement SQLite as a local database in React Native for complex data storage needs.

---

Mobile applications often require persistent local data storage that goes beyond simple key-value pairs. While AsyncStorage works well for storing small amounts of data, complex applications with relational data, advanced queries, or large datasets need a more robust solution. SQLite, a lightweight relational database engine, provides the perfect balance between simplicity and power for React Native applications.

In this comprehensive guide, we will explore how to implement SQLite in your React Native projects, covering everything from basic setup to advanced optimization techniques.

## When to Use SQLite

Before diving into implementation, it is important to understand when SQLite is the right choice for your application.

### Use SQLite When You Need:

- **Complex Data Relationships**: When your data has relationships (one-to-many, many-to-many) that benefit from relational database features
- **Large Datasets**: When storing thousands or millions of records that would be inefficient with key-value storage
- **Advanced Queries**: When you need filtering, sorting, joining, or aggregating data
- **Offline-First Applications**: When building apps that must function fully offline with complex data synchronization
- **Data Integrity**: When you need ACID compliance (Atomicity, Consistency, Isolation, Durability)
- **Full-Text Search**: When implementing search functionality across text content

### Consider Alternatives When:

- **Simple Key-Value Storage**: Use AsyncStorage or MMKV for preferences and settings
- **Real-Time Sync Required**: Consider Firebase or Realm for built-in cloud synchronization
- **Document-Based Data**: Consider WatermelonDB or Realm for document-oriented storage

## SQLite Libraries for React Native

React Native offers several libraries for SQLite integration, each with its own strengths.

### expo-sqlite

The official Expo SDK library for SQLite, providing a simple API that works seamlessly in Expo-managed projects.

**Pros:**
- Works out of the box with Expo
- Simple, promise-based API
- Good TypeScript support
- Regular updates with Expo SDK

**Cons:**
- Limited to Expo projects (or requires custom dev client)
- Fewer advanced features than alternatives

### react-native-sqlite-storage

A widely-used community library offering comprehensive SQLite functionality for bare React Native projects.

**Pros:**
- Works with bare React Native projects
- Full SQLite feature support
- Large community and extensive documentation
- Battle-tested in production applications

**Cons:**
- Requires native linking
- More complex setup process

### op-sqlite

A newer, performance-focused library using JSI (JavaScript Interface) for direct native communication.

**Pros:**
- Significantly faster than bridge-based alternatives
- Synchronous operations available
- Modern architecture using JSI

**Cons:**
- Requires React Native 0.68+
- Smaller community

For this guide, we will focus on both `expo-sqlite` and `react-native-sqlite-storage` as they cover the majority of use cases.

## expo-sqlite Setup

### Installation

For Expo-managed projects, installation is straightforward:

```bash
npx expo install expo-sqlite
```

### Basic Configuration

Create a database service file to centralize your database operations:

```typescript
// src/database/database.ts
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'myapp.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
```

### Using the New Async API (Expo SDK 51+)

Expo SDK 51 introduced a modernized async API. Here is how to use it:

```typescript
// src/database/database.ts
import * as SQLite from 'expo-sqlite';

export const initializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await SQLite.openDatabaseAsync('myapp.db');

  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  return db;
};
```

## react-native-sqlite-storage Setup

### Installation

For bare React Native projects:

```bash
npm install react-native-sqlite-storage
# or
yarn add react-native-sqlite-storage
```

### iOS Configuration

Add to your Podfile and run pod install:

```ruby
# ios/Podfile
pod 'react-native-sqlite-storage', :path => '../node_modules/react-native-sqlite-storage'
```

```bash
cd ios && pod install && cd ..
```

### Android Configuration

The library auto-links in React Native 0.60+. For older versions, manual linking is required.

### Basic Configuration

```typescript
// src/database/database.ts
import SQLite, {
  SQLiteDatabase,
  Transaction,
  ResultSet
} from 'react-native-sqlite-storage';

// Enable promise-based API
SQLite.enablePromise(true);

const DATABASE_NAME = 'myapp.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'MyApp Database';
const DATABASE_SIZE = 200000;

let database: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });

  return database;
};

export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.close();
    database = null;
  }
};
```

## Database Initialization

A robust initialization process ensures your database is properly set up before use.

### Creating an Initialization Service

```typescript
// src/database/init.ts
import { getDatabase } from './database';

export const initializeDatabase = async (): Promise<void> => {
  const db = await getDatabase();

  try {
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create tables
    await createTables(db);

    // Run migrations if needed
    await runMigrations(db);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const createTables = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createTagsTable = `
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `;

  const createPostTagsTable = `
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );
  `;

  await db.execAsync(createUsersTable);
  await db.execAsync(createPostsTable);
  await db.execAsync(createTagsTable);
  await db.execAsync(createPostTagsTable);
};
```

### Initializing in App Entry Point

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initializeDatabase } from './src/database/init';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await initializeDatabase();
        setIsReady(true);
      } catch (err) {
        setError('Failed to initialize database');
        console.error(err);
      }
    };

    setup();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Initializing database...</Text>
      </View>
    );
  }

  return <MainApp />;
}
```

## Creating Tables

Well-designed tables are the foundation of effective SQLite usage.

### Schema Design Best Practices

```typescript
// src/database/schema.ts
export const SCHEMA = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      preferences TEXT, -- JSON string for flexible data
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,

  posts: `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      status TEXT CHECK(status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
      view_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `,

  // Create indexes for frequently queried columns
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);',
    'CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);',
    'CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at);',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);',
  ]
};

export const createAllTables = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  // Create tables
  for (const [tableName, schema] of Object.entries(SCHEMA)) {
    if (tableName !== 'indexes') {
      await db.execAsync(schema as string);
    }
  }

  // Create indexes
  for (const indexQuery of SCHEMA.indexes) {
    await db.execAsync(indexQuery);
  }
};
```

## CRUD Operations

Implement clean, reusable CRUD operations with proper error handling.

### Creating a Generic Repository

```typescript
// src/database/repository.ts
import { getDatabase } from './database';

export interface BaseEntity {
  id?: number;
  created_at?: string;
  updated_at?: string;
}

export class Repository<T extends BaseEntity> {
  constructor(private tableName: string) {}

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const db = await getDatabase();

    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const result = await db.runAsync(query, values);

    return this.findById(result.lastInsertRowId) as Promise<T>;
  }

  async findById(id: number): Promise<T | null> {
    const db = await getDatabase();

    const result = await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );

    return result || null;
  }

  async findAll(options?: {
    where?: string;
    params?: any[];
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    const db = await getDatabase();

    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (options?.where) {
      query += ` WHERE ${options.where}`;
      if (options.params) {
        params.push(...options.params);
      }
    }

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    return db.getAllAsync<T>(query, params);
  }

  async update(id: number, data: Partial<T>): Promise<T | null> {
    const db = await getDatabase();

    const updates = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    const query = `
      UPDATE ${this.tableName}
      SET ${updates}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.runAsync(query, values);

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const db = await getDatabase();

    const result = await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );

    return result.changes > 0;
  }

  async count(where?: string, params?: any[]): Promise<number> {
    const db = await getDatabase();

    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    if (where) {
      query += ` WHERE ${where}`;
    }

    const result = await db.getFirstAsync<{ count: number }>(query, params || []);

    return result?.count || 0;
  }
}
```

### Implementing Specific Repositories

```typescript
// src/database/repositories/userRepository.ts
import { Repository, BaseEntity } from '../repository';

export interface User extends BaseEntity {
  uuid: string;
  email: string;
  name: string;
  avatar_url?: string;
  preferences?: string;
  is_active: number;
}

class UserRepository extends Repository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll({
      where: 'email = ?',
      params: [email],
      limit: 1,
    });

    return users[0] || null;
  }

  async findActiveUsers(): Promise<User[]> {
    return this.findAll({
      where: 'is_active = 1',
      orderBy: 'name ASC',
    });
  }

  async searchByName(searchTerm: string): Promise<User[]> {
    return this.findAll({
      where: 'name LIKE ?',
      params: [`%${searchTerm}%`],
      orderBy: 'name ASC',
    });
  }
}

export const userRepository = new UserRepository();
```

```typescript
// src/database/repositories/postRepository.ts
import { Repository, BaseEntity } from '../repository';
import { getDatabase } from '../database';

export interface Post extends BaseEntity {
  uuid: string;
  user_id: number;
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'archived';
  view_count: number;
  published_at?: string;
}

export interface PostWithAuthor extends Post {
  author_name: string;
  author_email: string;
}

class PostRepository extends Repository<Post> {
  constructor() {
    super('posts');
  }

  async findByUserId(userId: number): Promise<Post[]> {
    return this.findAll({
      where: 'user_id = ?',
      params: [userId],
      orderBy: 'created_at DESC',
    });
  }

  async findPublished(limit = 10, offset = 0): Promise<Post[]> {
    return this.findAll({
      where: "status = 'published'",
      orderBy: 'published_at DESC',
      limit,
      offset,
    });
  }

  async findWithAuthor(postId: number): Promise<PostWithAuthor | null> {
    const db = await getDatabase();

    const query = `
      SELECT
        p.*,
        u.name as author_name,
        u.email as author_email
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    return db.getFirstAsync<PostWithAuthor>(query, [postId]);
  }

  async publish(postId: number): Promise<Post | null> {
    return this.update(postId, {
      status: 'published',
      published_at: new Date().toISOString(),
    } as Partial<Post>);
  }

  async incrementViewCount(postId: number): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
      [postId]
    );
  }
}

export const postRepository = new PostRepository();
```

## Transactions Usage

Transactions ensure data integrity when performing multiple related operations.

### Basic Transaction Pattern

```typescript
// src/database/transactions.ts
import { getDatabase } from './database';

export const executeTransaction = async <T>(
  operations: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> => {
  const db = await getDatabase();

  try {
    await db.execAsync('BEGIN TRANSACTION');

    const result = await operations(db);

    await db.execAsync('COMMIT');

    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
};
```

### Practical Transaction Examples

```typescript
// src/database/repositories/postRepository.ts
import { executeTransaction } from '../transactions';

// Creating a post with tags in a transaction
export const createPostWithTags = async (
  postData: Omit<Post, 'id' | 'created_at' | 'updated_at'>,
  tagNames: string[]
): Promise<Post> => {
  return executeTransaction(async (db) => {
    // Insert the post
    const postResult = await db.runAsync(
      `INSERT INTO posts (uuid, user_id, title, content, excerpt, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        postData.uuid,
        postData.user_id,
        postData.title,
        postData.content,
        postData.excerpt || null,
        postData.status,
      ]
    );

    const postId = postResult.lastInsertRowId;

    // Insert or get tags and link them to the post
    for (const tagName of tagNames) {
      // Insert tag if it does not exist
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (name) VALUES (?)',
        [tagName]
      );

      // Get the tag ID
      const tag = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM tags WHERE name = ?',
        [tagName]
      );

      if (tag) {
        // Link tag to post
        await db.runAsync(
          'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
          [postId, tag.id]
        );
      }
    }

    // Return the created post
    const post = await db.getFirstAsync<Post>(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );

    return post!;
  });
};

// Transferring posts between users
export const transferPosts = async (
  fromUserId: number,
  toUserId: number
): Promise<number> => {
  return executeTransaction(async (db) => {
    // Verify both users exist
    const fromUser = await db.getFirstAsync(
      'SELECT id FROM users WHERE id = ?',
      [fromUserId]
    );

    const toUser = await db.getFirstAsync(
      'SELECT id FROM users WHERE id = ?',
      [toUserId]
    );

    if (!fromUser || !toUser) {
      throw new Error('One or both users not found');
    }

    // Transfer all posts
    const result = await db.runAsync(
      'UPDATE posts SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [toUserId, fromUserId]
    );

    return result.changes;
  });
};
```

## Query Optimization

Optimize your SQLite queries for better performance in mobile applications.

### Indexing Strategies

```typescript
// src/database/optimization.ts
import { getDatabase } from './database';

// Analyze query performance
export const analyzeQuery = async (query: string): Promise<void> => {
  const db = await getDatabase();

  const plan = await db.getAllAsync(`EXPLAIN QUERY PLAN ${query}`);
  console.log('Query Plan:', plan);
};

// Create indexes for common queries
export const createOptimizedIndexes = async (): Promise<void> => {
  const db = await getDatabase();

  const indexes = [
    // Composite index for common post queries
    `CREATE INDEX IF NOT EXISTS idx_posts_user_status
     ON posts (user_id, status)`,

    // Index for date range queries
    `CREATE INDEX IF NOT EXISTS idx_posts_published_at
     ON posts (published_at) WHERE status = 'published'`,

    // Full-text search index
    `CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts
     USING fts5(title, content, content='posts', content_rowid='id')`,
  ];

  for (const index of indexes) {
    await db.execAsync(index);
  }
};
```

### Batch Operations

```typescript
// src/database/batch.ts
import { getDatabase } from './database';

// Efficient batch insert
export const batchInsert = async <T extends Record<string, any>>(
  tableName: string,
  records: T[]
): Promise<void> => {
  if (records.length === 0) return;

  const db = await getDatabase();

  const columns = Object.keys(records[0]);
  const placeholders = columns.map(() => '?').join(', ');

  const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

  // Use a transaction for batch inserts
  await db.execAsync('BEGIN TRANSACTION');

  try {
    for (const record of records) {
      await db.runAsync(query, Object.values(record));
    }
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
};

// Pagination with cursor-based approach
export const fetchWithCursor = async <T>(
  tableName: string,
  lastId: number | null,
  limit: number,
  orderColumn = 'id'
): Promise<{ data: T[]; hasMore: boolean }> => {
  const db = await getDatabase();

  let query = `SELECT * FROM ${tableName}`;
  const params: any[] = [];

  if (lastId !== null) {
    query += ` WHERE ${orderColumn} > ?`;
    params.push(lastId);
  }

  query += ` ORDER BY ${orderColumn} ASC LIMIT ?`;
  params.push(limit + 1); // Fetch one extra to check if there are more

  const results = await db.getAllAsync<T>(query, params);

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;

  return { data, hasMore };
};
```

### Query Caching

```typescript
// src/database/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryCache = new QueryCache();

// Usage in repository
export const getCachedPosts = async (userId: number): Promise<Post[]> => {
  const cacheKey = `posts_user_${userId}`;

  const cached = queryCache.get<Post[]>(cacheKey);
  if (cached) return cached;

  const posts = await postRepository.findByUserId(userId);
  queryCache.set(cacheKey, posts, 30000); // Cache for 30 seconds

  return posts;
};
```

## Database Migrations

Implement a migration system to handle schema changes across app versions.

### Migration System

```typescript
// src/database/migrations/index.ts
import { getDatabase } from '../database';

interface Migration {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  down: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    },
    down: async (db) => {
      await db.execAsync('DROP TABLE IF EXISTS users');
    },
  },
  {
    version: 2,
    up: async (db) => {
      await db.execAsync('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    },
    down: async (db) => {
      // SQLite does not support DROP COLUMN directly
      // Need to recreate table
      await db.execAsync(`
        CREATE TABLE users_backup AS SELECT id, email, name, created_at FROM users
      `);
      await db.execAsync('DROP TABLE users');
      await db.execAsync('ALTER TABLE users_backup RENAME TO users');
    },
  },
  {
    version: 3,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      await db.execAsync('CREATE INDEX idx_posts_user_id ON posts (user_id)');
    },
    down: async (db) => {
      await db.execAsync('DROP TABLE IF EXISTS posts');
    },
  },
];

export const runMigrations = async (): Promise<void> => {
  const db = await getDatabase();

  // Create migrations table if it does not exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get current version
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = result?.version || 0;

  // Run pending migrations
  const pendingMigrations = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pendingMigrations) {
    console.log(`Running migration version ${migration.version}...`);

    await db.execAsync('BEGIN TRANSACTION');

    try {
      await migration.up(db);

      await db.runAsync(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        [migration.version]
      );

      await db.execAsync('COMMIT');
      console.log(`Migration ${migration.version} completed successfully`);
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
};

export const rollbackMigration = async (): Promise<void> => {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );

  if (!result?.version) {
    console.log('No migrations to rollback');
    return;
  }

  const migration = migrations.find(m => m.version === result.version);

  if (!migration) {
    throw new Error(`Migration ${result.version} not found`);
  }

  await db.execAsync('BEGIN TRANSACTION');

  try {
    await migration.down(db);
    await db.runAsync(
      'DELETE FROM schema_migrations WHERE version = ?',
      [result.version]
    );
    await db.execAsync('COMMIT');
    console.log(`Rolled back migration ${result.version}`);
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
};
```

## TypeScript Integration

Leverage TypeScript for type-safe database operations.

### Type Definitions

```typescript
// src/database/types.ts
export interface DatabaseConfig {
  name: string;
  version: number;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

export interface QueryOptions {
  where?: string;
  params?: unknown[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Generic type for table rows
export type TableRow<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

// Helper type for insert operations
export type InsertData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

// Helper type for update operations
export type UpdateData<T> = Partial<Omit<T, 'id' | 'created_at'>>;
```

### Type-Safe Query Builder

```typescript
// src/database/queryBuilder.ts
type WhereClause = {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: unknown;
};

export class QueryBuilder<T> {
  private tableName: string;
  private selectColumns: string[] = ['*'];
  private whereClauses: WhereClause[] = [];
  private orderByClause?: string;
  private limitValue?: number;
  private offsetValue?: number;
  private params: unknown[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(...columns: (keyof T | '*')[]): this {
    this.selectColumns = columns as string[];
    return this;
  }

  where(column: keyof T, operator: WhereClause['operator'], value?: unknown): this {
    this.whereClauses.push({
      column: column as string,
      operator,
      value,
    });
    return this;
  }

  orderBy(column: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `${String(column)} ${direction}`;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  build(): { query: string; params: unknown[] } {
    let query = `SELECT ${this.selectColumns.join(', ')} FROM ${this.tableName}`;
    this.params = [];

    if (this.whereClauses.length > 0) {
      const conditions = this.whereClauses.map(clause => {
        if (clause.operator === 'IS NULL' || clause.operator === 'IS NOT NULL') {
          return `${clause.column} ${clause.operator}`;
        }
        if (clause.operator === 'IN' && Array.isArray(clause.value)) {
          const placeholders = clause.value.map(() => '?').join(', ');
          this.params.push(...clause.value);
          return `${clause.column} IN (${placeholders})`;
        }
        this.params.push(clause.value);
        return `${clause.column} ${clause.operator} ?`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (this.orderByClause) {
      query += ` ORDER BY ${this.orderByClause}`;
    }

    if (this.limitValue !== undefined) {
      query += ` LIMIT ?`;
      this.params.push(this.limitValue);
    }

    if (this.offsetValue !== undefined) {
      query += ` OFFSET ?`;
      this.params.push(this.offsetValue);
    }

    return { query, params: this.params };
  }

  async execute(): Promise<T[]> {
    const db = await getDatabase();
    const { query, params } = this.build();
    return db.getAllAsync<T>(query, params);
  }
}

// Usage example
const getPublishedPosts = async (): Promise<Post[]> => {
  return new QueryBuilder<Post>('posts')
    .select('id', 'title', 'excerpt', 'published_at')
    .where('status', '=', 'published')
    .orderBy('published_at', 'DESC')
    .limit(10)
    .execute();
};
```

## Testing Database Operations

Implement comprehensive tests for your database layer.

### Test Setup

```typescript
// src/database/__tests__/setup.ts
import * as SQLite from 'expo-sqlite';

let testDb: SQLite.SQLiteDatabase;

export const setupTestDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // Use in-memory database for tests
  testDb = await SQLite.openDatabaseAsync(':memory:');

  // Initialize schema
  await testDb.execAsync(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await testDb.execAsync(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  return testDb;
};

export const teardownTestDatabase = async (): Promise<void> => {
  if (testDb) {
    await testDb.closeAsync();
  }
};

export const clearTestData = async (): Promise<void> => {
  await testDb.execAsync('DELETE FROM posts');
  await testDb.execAsync('DELETE FROM users');
};
```

### Unit Tests

```typescript
// src/database/__tests__/userRepository.test.ts
import { setupTestDatabase, teardownTestDatabase, clearTestData } from './setup';
import { userRepository } from '../repositories/userRepository';

describe('UserRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        uuid: 'test-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        is_active: 1,
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
    });

    it('should fail when creating user with duplicate email', async () => {
      const userData = {
        uuid: 'test-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        is_active: 1,
      };

      await userRepository.create(userData);

      await expect(
        userRepository.create({ ...userData, uuid: 'test-uuid-2' })
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        uuid: 'test-uuid-1',
        email: 'find@example.com',
        name: 'Find User',
        is_active: 1,
      };

      await userRepository.create(userData);

      const found = await userRepository.findByEmail('find@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await userRepository.create({
        uuid: 'test-uuid-1',
        email: 'update@example.com',
        name: 'Original Name',
        is_active: 1,
      });

      const updated = await userRepository.update(user.id!, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.email).toBe('update@example.com');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await userRepository.create({
        uuid: 'test-uuid-1',
        email: 'delete@example.com',
        name: 'Delete User',
        is_active: 1,
      });

      const deleted = await userRepository.delete(user.id!);

      expect(deleted).toBe(true);

      const found = await userRepository.findById(user.id!);
      expect(found).toBeNull();
    });
  });
});
```

### Integration Tests

```typescript
// src/database/__tests__/integration.test.ts
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { createPostWithTags } from '../repositories/postRepository';
import { userRepository } from '../repositories/userRepository';

describe('Database Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create post with tags in a transaction', async () => {
    // Create a user first
    const user = await userRepository.create({
      uuid: 'int-test-uuid',
      email: 'integration@example.com',
      name: 'Integration User',
      is_active: 1,
    });

    // Create post with tags
    const post = await createPostWithTags(
      {
        uuid: 'post-uuid-1',
        user_id: user.id!,
        title: 'Test Post',
        content: 'Test content',
        status: 'draft',
        view_count: 0,
      },
      ['react-native', 'sqlite', 'database']
    );

    expect(post).toBeDefined();
    expect(post.title).toBe('Test Post');

    // Verify tags were created and linked
    const db = await getDatabase();
    const postTags = await db.getAllAsync(
      `SELECT t.name FROM tags t
       INNER JOIN post_tags pt ON t.id = pt.tag_id
       WHERE pt.post_id = ?`,
      [post.id]
    );

    expect(postTags).toHaveLength(3);
  });
});
```

## Conclusion

SQLite provides a powerful and reliable local database solution for React Native applications. By following the patterns and practices outlined in this guide, you can build robust offline-capable applications with complex data requirements.

Key takeaways:

1. **Choose the right library** based on your project setup (Expo vs bare React Native)
2. **Design your schema carefully** with proper indexes and foreign keys
3. **Use transactions** for operations that must succeed or fail together
4. **Implement migrations** to handle schema changes across versions
5. **Optimize queries** with indexes, batch operations, and caching
6. **Leverage TypeScript** for type-safe database operations
7. **Write comprehensive tests** to ensure data integrity

With SQLite properly implemented, your React Native application will have a solid foundation for managing local data, enabling offline functionality, and providing a seamless user experience regardless of network conditions.

## Further Reading

- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [react-native-sqlite-storage GitHub](https://github.com/andpor/react-native-sqlite-storage)
- [SQLite Official Documentation](https://www.sqlite.org/docs.html)
- [React Native Performance Optimization](https://reactnative.dev/docs/performance)
