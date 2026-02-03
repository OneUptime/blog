# How to Use Drizzle ORM with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Drizzle ORM, TypeScript, PostgreSQL, Database, Backend

Description: Learn how to use Drizzle ORM for type-safe database operations in Node.js. This guide covers schema definition, queries, migrations, and best practices for production use.

---

Drizzle ORM is a TypeScript-first database toolkit that delivers type safety without the bloat. Unlike heavier ORMs that abstract away SQL entirely, Drizzle stays close to the metal while providing excellent developer experience. You write queries that look like SQL, get full autocompletion, and catch type errors at compile time rather than runtime.

This guide walks you through setting up Drizzle with PostgreSQL, defining schemas, writing queries, managing relations, running migrations, and handling transactions.

## Why Drizzle ORM

| Feature | Drizzle | Traditional ORMs |
|---------|---------|------------------|
| **Bundle Size** | ~7KB | 50-200KB+ |
| **SQL-like Syntax** | Yes | Often abstracted |
| **Type Safety** | Full TypeScript | Varies |
| **Learning Curve** | Know SQL, know Drizzle | New API to learn |
| **Performance** | Near raw SQL | Often slower |

Drizzle supports PostgreSQL, MySQL, SQLite, and several serverless databases. This guide focuses on PostgreSQL.

## Installation

Install Drizzle and the PostgreSQL driver:

```bash
# Install Drizzle ORM and PostgreSQL driver
npm install drizzle-orm postgres

# Install drizzle-kit for migrations (dev dependency)
npm install -D drizzle-kit

# TypeScript dependencies
npm install -D typescript @types/node
```

## Project Structure

A clean layout keeps your database code maintainable:

```
src/
  db/
    index.ts          # Database connection
    schema/
      index.ts        # Re-exports all schemas
      users.ts        # User schema
      posts.ts        # Post schema
    migrations/       # Generated migrations
drizzle.config.ts     # Drizzle Kit config
```

## Database Connection

Create the connection in a dedicated file:

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the postgres client with connection pool settings
const client = postgres(connectionString, {
  max: 10,           // Maximum connections in pool
  idle_timeout: 20,  // Close idle connections after 20s
  connect_timeout: 10,
});

// Create drizzle instance with schema for relational queries
export const db = drizzle(client, { schema });

// Export client for graceful shutdown
export { client };

// Graceful shutdown helper
export async function closeDatabase(): Promise<void> {
  await client.end();
  console.log('Database connections closed');
}
```

## Schema Definition

Drizzle schemas are TypeScript files that define your tables.

### Users Table

```typescript
// src/db/schema/users.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  // Auto-incrementing primary key
  id: serial('id').primaryKey(),

  // Unique email with max length
  email: varchar('email', { length: 255 }).notNull().unique(),

  // Password hash - use text for unbounded strings
  passwordHash: text('password_hash').notNull(),

  // Optional display name
  displayName: varchar('display_name', { length: 100 }),

  // Boolean with default
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Additional indexes
  emailIdx: uniqueIndex('email_idx').on(table.email),
}));

// Infer types from schema - no manual definitions needed
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Posts Table with Foreign Keys

```typescript
// src/db/schema/posts.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';
import { users } from './users';

// Enum for post status
export const postStatusEnum = pgEnum('post_status', [
  'draft',
  'published',
  'archived'
]);

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),

  // Foreign key to users with cascade delete
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),

  // Enum column with default
  status: postStatusEnum('status').default('draft').notNull(),

  // Nullable publish date
  publishedAt: timestamp('published_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for common query patterns
  authorIdx: index('author_idx').on(table.authorId),
  statusIdx: index('status_idx').on(table.status),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Schema Index

Export all schemas from one file:

```typescript
// src/db/schema/index.ts
export * from './users';
export * from './posts';
export * from './relations';
```

## Defining Relations

Relations enable the relational query API:

```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';

// User has many posts
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

// Post belongs to user
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

## CRUD Operations

Drizzle provides SQL-like queries and a relational API, both fully type-safe.

### Create Operations

```typescript
// src/services/user-service.ts
import { db } from '../db';
import { users, NewUser, User } from '../db/schema';

// Insert single record
export async function createUser(userData: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .returning(); // Returns inserted row

  return user;
}

// Insert multiple records
export async function createUsers(usersData: NewUser[]): Promise<User[]> {
  return db
    .insert(users)
    .values(usersData)
    .returning();
}

// Upsert - insert or update on conflict
export async function upsertUser(userData: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: userData.displayName,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}
```

### Read Operations

```typescript
import { db } from '../db';
import { users, posts } from '../db/schema';
import { eq, and, or, like, gt, desc, asc, sql } from 'drizzle-orm';

// Find by ID
export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user;
}

// Multiple conditions
export async function findActiveUsersAfter(date: Date): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        gt(users.createdAt, date)
      )
    )
    .orderBy(desc(users.createdAt));
}

// Search with LIKE
export async function searchUsers(query: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(
      or(
        like(users.email, `%${query}%`),
        like(users.displayName, `%${query}%`)
      )
    )
    .limit(20);
}

// Pagination
export async function getUsersPaginated(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [usersList, countResult] = await Promise.all([
    db.select().from(users).orderBy(asc(users.id)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);

  return { users: usersList, total: countResult[0].count };
}

// Select specific columns
export async function getUserEmails(): Promise<{ email: string }[]> {
  return db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.isActive, true));
}
```

### Relational Queries

Load nested data easily:

```typescript
// Get post with author
export async function getPostWithAuthor(postId: number) {
  return db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: true,
    },
  });
}

// Get post with author (specific columns only)
export async function getPostWithAuthorDetails(postId: number) {
  return db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: {
        columns: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });
}

// Get user with their published posts
export async function getUserWithPosts(userId: number) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      posts: {
        where: eq(posts.status, 'published'),
        orderBy: (posts, { desc }) => [desc(posts.publishedAt)],
        limit: 10,
      },
    },
  });
}
```

### Update Operations

```typescript
import { db } from '../db';
import { users, posts } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';

// Update by ID
export async function updateUser(
  id: number,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | undefined> {
  const [updated] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return updated;
}

// Conditional update
export async function publishPost(postId: number): Promise<Post | undefined> {
  const [post] = await db
    .update(posts)
    .set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.status, 'draft')
      )
    )
    .returning();

  return post;
}

// Bulk update
export async function deactivateOldUsers(days: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await db
    .update(users)
    .set({ isActive: false })
    .where(
      and(
        eq(users.isActive, true),
        lt(users.updatedAt, cutoff)
      )
    )
    .returning({ id: users.id });

  return result.length;
}
```

### Delete Operations

```typescript
import { db } from '../db';
import { users, posts } from '../db/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';

// Delete by ID
export async function deleteUser(id: number): Promise<boolean> {
  const result = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return result.length > 0;
}

// Delete with conditions
export async function deleteOldDrafts(days: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await db
    .delete(posts)
    .where(
      and(
        eq(posts.status, 'draft'),
        lt(posts.createdAt, cutoff)
      )
    )
    .returning({ id: posts.id });

  return result.length;
}

// Delete by ID list
export async function deletePostsByIds(ids: number[]): Promise<number> {
  const result = await db
    .delete(posts)
    .where(inArray(posts.id, ids))
    .returning({ id: posts.id });

  return result.length;
}
```

## Transactions

Transactions ensure multiple operations succeed or fail together.

### Callback-Based Transactions

Drizzle handles commit and rollback automatically:

```typescript
import { db } from '../db';
import { posts, comments, NewPost, NewComment } from '../db/schema';

// Create post with initial comment atomically
export async function createPostWithComment(
  postData: NewPost,
  initialComment: Omit<NewComment, 'postId'>
) {
  return db.transaction(async (tx) => {
    // Insert post
    const [post] = await tx
      .insert(posts)
      .values(postData)
      .returning();

    // Insert comment with new post ID
    const [comment] = await tx
      .insert(comments)
      .values({
        ...initialComment,
        postId: post.id,
      })
      .returning();

    // If either fails, both are rolled back
    return { post, comment };
  });
}

// Transfer ownership with validation
export async function transferPostOwnership(
  postId: number,
  fromUserId: number,
  toUserId: number
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Verify current ownership
    const [post] = await tx
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.authorId, fromUserId)))
      .limit(1);

    if (!post) {
      throw new Error('Post not found or not owned by user');
    }

    // Verify new owner exists
    const [newOwner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, toUserId))
      .limit(1);

    if (!newOwner) {
      throw new Error('New owner not found');
    }

    // Transfer
    await tx
      .update(posts)
      .set({ authorId: toUserId, updatedAt: new Date() })
      .where(eq(posts.id, postId));

    return true;
  });
}
```

### Nested Transactions

Use savepoints for complex operations:

```typescript
export async function importUserWithPosts(data: { user: NewUser; posts: NewPost[] }) {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values(data.user).returning();

    const imported = [];
    const failed = [];

    for (const postData of data.posts) {
      try {
        // Nested transaction for each post
        const post = await tx.transaction(async (nestedTx) => {
          const [newPost] = await nestedTx
            .insert(posts)
            .values({ ...postData, authorId: user.id })
            .returning();
          return newPost;
        });
        imported.push(post);
      } catch (error) {
        failed.push({ data: postData, error: error.message });
      }
    }

    return { user, imported, failed };
  });
}
```

## Migrations

Drizzle Kit generates SQL migrations from schema changes.

### Configuration

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only)
npx drizzle-kit push

# Open database browser
npx drizzle-kit studio
```

### Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Programmatic Migrations

Run migrations from code for production deployments:

```typescript
// src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL required');

  // Separate connection for migrations
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
```

## Raw SQL Queries

For complex queries or database-specific features:

```typescript
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Complex aggregation
export async function getPostStatsByMonth() {
  return db.execute(sql`
    SELECT
      DATE_TRUNC('month', published_at) as month,
      COUNT(*) as post_count,
      COUNT(DISTINCT author_id) as unique_authors
    FROM posts
    WHERE status = 'published'
      AND published_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', published_at)
    ORDER BY month DESC
  `);
}

// Full-text search
export async function searchPosts(query: string) {
  return db.execute(sql`
    SELECT id, title, excerpt,
      ts_rank(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', ${query})
      ) as rank
    FROM posts
    WHERE status = 'published'
      AND to_tsvector('english', title || ' ' || content)
          @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT 20
  `);
}
```

## Best Practices

### 1. Use Parameterized Queries

Drizzle parameterizes automatically, but be careful with raw SQL:

```typescript
// GOOD: Automatic parameterization
await db.select().from(users).where(eq(users.email, userInput));

// GOOD: Parameterized raw SQL
await db.execute(sql`SELECT * FROM users WHERE email = ${userInput}`);

// BAD: SQL injection risk
await db.execute(sql.raw(`SELECT * FROM users WHERE email = '${userInput}'`));
```

### 2. Select Specific Columns

Avoid loading unnecessary data:

```typescript
// BAD: Loads all columns including sensitive data
const allUsers = await db.select().from(users);

// GOOD: Only what you need
const userList = await db
  .select({ id: users.id, email: users.email })
  .from(users);
```

### 3. Index Your Queries

Add indexes for columns in WHERE, JOIN, and ORDER BY:

```typescript
export const posts = pgTable('posts', {
  // columns...
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
  statusIdx: index('status_idx').on(table.status),
}));
```

### 4. Handle Connection Errors

Implement retry logic for transient failures:

```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError!;
}
```

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Schema** | Define in TypeScript, use inferred types |
| **Queries** | Query builder for simple, relational API for nested data |
| **Transactions** | Callback-based for most cases |
| **Migrations** | Generate with drizzle-kit, run via code in production |
| **Performance** | Select specific columns, add indexes |

Drizzle excels when you want TypeScript safety with SQL clarity. The learning curve is minimal if you know SQL, and type inference catches errors before production.

---

Building reliable applications requires visibility into database performance. **OneUptime** provides comprehensive monitoring for your Node.js applications and PostgreSQL databases. Track query performance, set up alerts for slow queries, and get notified when connection pools are exhausted. Start monitoring your Drizzle-powered applications today at [oneuptime.com](https://oneuptime.com).
