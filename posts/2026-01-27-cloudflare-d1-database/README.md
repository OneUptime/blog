# How to Use Cloudflare D1 Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare, D1, Database, SQLite, Serverless, Workers, Edge Computing

Description: Learn how to use Cloudflare D1, a serverless SQLite database that runs at the edge, including database creation, schema migrations, queries in Workers, prepared statements, transactions, and local development.

---

> D1 brings the simplicity of SQLite to the edge. Your data lives close to your users, your queries run in milliseconds, and you never have to manage database servers again.

## What is Cloudflare D1?

Cloudflare D1 is a serverless SQL database built on SQLite that runs on Cloudflare's global edge network. Unlike traditional databases that run in a single region, D1 replicates your data across Cloudflare's network, bringing your database closer to your users worldwide.

D1 is designed to work seamlessly with Cloudflare Workers, giving you a complete serverless stack for building applications. You get the familiar SQL interface of SQLite with the benefits of edge computing: low latency, automatic scaling, and zero infrastructure management.

### Key Features

- **SQLite compatibility**: Use standard SQL syntax and SQLite features you already know
- **Edge-native**: Data is replicated globally for low-latency reads
- **Serverless**: No servers to provision, scale, or maintain
- **Integrated with Workers**: First-class binding to Cloudflare Workers
- **Time Travel**: Query historical versions of your data for debugging
- **Branching**: Create database branches for development and testing

## Creating a D1 Database

### Prerequisites

Before you begin, make sure you have the Wrangler CLI installed and authenticated with your Cloudflare account.

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### Creating Your First Database

Use the Wrangler CLI to create a new D1 database.

```bash
# Create a new D1 database
wrangler d1 create my-app-database

# Output will show your database ID
# Save this ID for your wrangler.toml configuration
```

The command outputs a database ID that you will need to add to your `wrangler.toml` configuration file.

```toml
# wrangler.toml - Configure your Worker with D1 binding

name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 database binding
[[d1_databases]]
binding = "DB"  # The variable name you will use in your Worker code
database_name = "my-app-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Your database ID from the create command
```

### Listing and Managing Databases

```bash
# List all D1 databases in your account
wrangler d1 list

# Get information about a specific database
wrangler d1 info my-app-database

# Delete a database (use with caution)
wrangler d1 delete my-app-database
```

## Schema Migrations

D1 supports SQL migrations for managing your database schema. Migrations help you version control your database changes and apply them consistently across environments.

### Creating Migration Files

Create a `migrations` folder in your project and add numbered SQL files.

```
my-project/
  migrations/
    0001_create_users_table.sql
    0002_add_email_index.sql
    0003_create_posts_table.sql
  src/
    index.ts
  wrangler.toml
```

### Writing Migrations

Each migration file contains SQL statements to modify your schema.

```sql
-- migrations/0001_create_users_table.sql
-- Create the users table with basic fields

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

```sql
-- migrations/0002_create_posts_table.sql
-- Create posts table with foreign key to users

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    published BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for efficient queries by user
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Index for looking up posts by slug
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
```

### Running Migrations

Apply migrations to your database using Wrangler.

```bash
# Apply migrations to local development database
wrangler d1 migrations apply my-app-database --local

# Apply migrations to production database
wrangler d1 migrations apply my-app-database --remote

# List applied migrations
wrangler d1 migrations list my-app-database
```

### Rolling Back Migrations

D1 does not have built-in rollback support, so you need to create new migrations to undo changes.

```sql
-- migrations/0004_remove_published_column.sql
-- Rollback: Remove the published column from posts

-- SQLite does not support DROP COLUMN directly in older versions
-- Use the table recreation pattern instead
CREATE TABLE posts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO posts_new SELECT id, user_id, title, content, slug, created_at, updated_at FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
```

## Querying D1 in Cloudflare Workers

### Basic Worker Setup

Here is a complete example of a Cloudflare Worker that uses D1.

```typescript
// src/index.ts - Main Worker entry point

// Define the environment bindings for type safety
interface Env {
  // D1 database binding - matches the binding name in wrangler.toml
  DB: D1Database;
}

// Define types for your data models
interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  slug: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Simple routing based on URL path
    if (url.pathname === "/users" && request.method === "GET") {
      return handleGetUsers(env);
    }

    if (url.pathname === "/users" && request.method === "POST") {
      return handleCreateUser(request, env);
    }

    if (url.pathname.startsWith("/users/") && request.method === "GET") {
      const id = url.pathname.split("/")[2];
      return handleGetUser(parseInt(id), env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// Handler to get all users
async function handleGetUsers(env: Env): Promise<Response> {
  try {
    // Execute a simple SELECT query
    const result = await env.DB.prepare(
      "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC"
    ).all<User>();

    return Response.json({
      success: true,
      data: result.results,
      meta: {
        count: result.results.length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Handler to get a single user by ID
async function handleGetUser(id: number, env: Env): Promise<Response> {
  try {
    // Use .first() for single row queries
    const user = await env.DB.prepare(
      "SELECT id, username, email, created_at FROM users WHERE id = ?"
    )
      .bind(id)
      .first<User>();

    if (!user) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: user });
  } catch (error) {
    return Response.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Handler to create a new user
async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { username: string; email: string; password: string };

    // Insert the new user and return the created record
    const result = await env.DB.prepare(
      `INSERT INTO users (username, email, password_hash)
       VALUES (?, ?, ?)
       RETURNING id, username, email, created_at`
    )
      .bind(body.username, body.email, body.password) // In production, hash the password first
      .first<User>();

    return Response.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle unique constraint violations
    if (error.message?.includes("UNIQUE constraint failed")) {
      return Response.json(
        { success: false, error: "Username or email already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}
```

### Query Methods

D1 provides several methods for executing queries.

```typescript
// src/queries.ts - Different query methods in D1

interface Env {
  DB: D1Database;
}

// .all() - Returns all matching rows
async function getAllPosts(env: Env): Promise<Post[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM posts WHERE published = TRUE ORDER BY created_at DESC"
  ).all<Post>();

  // result.results contains the array of rows
  // result.meta contains query metadata (rows_read, rows_written, etc.)
  console.log(`Query read ${result.meta.rows_read} rows`);

  return result.results;
}

// .first() - Returns the first matching row or null
async function getPostBySlug(slug: string, env: Env): Promise<Post | null> {
  const post = await env.DB.prepare(
    "SELECT * FROM posts WHERE slug = ?"
  )
    .bind(slug)
    .first<Post>();

  return post; // Returns the post object or null
}

// .run() - For INSERT, UPDATE, DELETE without returning data
async function deletePost(id: number, env: Env): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM posts WHERE id = ?"
  )
    .bind(id)
    .run();

  // result.meta.changes tells you how many rows were affected
  return result.meta.changes > 0;
}

// .raw() - Returns raw arrays instead of objects (more efficient for large datasets)
async function getPostTitles(env: Env): Promise<string[]> {
  const result = await env.DB.prepare(
    "SELECT title FROM posts WHERE published = TRUE"
  ).raw<[string]>();

  // result is an array of arrays: [["Title 1"], ["Title 2"], ...]
  return result.map(row => row[0]);
}
```

## Prepared Statements and Parameter Binding

Always use prepared statements with parameter binding to prevent SQL injection attacks and improve performance.

```typescript
// src/prepared-statements.ts - Safe parameter binding examples

interface Env {
  DB: D1Database;
}

// CORRECT: Use .bind() for parameter binding
async function searchPosts(query: string, limit: number, env: Env): Promise<Post[]> {
  // The ? placeholders are safely replaced with bound values
  const result = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE (title LIKE ? OR content LIKE ?)
     AND published = TRUE
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(`%${query}%`, `%${query}%`, limit)
    .all<Post>();

  return result.results;
}

// WRONG: Never concatenate user input into SQL strings
async function unsafeSearch(query: string, env: Env): Promise<Post[]> {
  // DO NOT DO THIS - vulnerable to SQL injection
  const result = await env.DB.prepare(
    `SELECT * FROM posts WHERE title LIKE '%${query}%'` // DANGEROUS
  ).all<Post>();

  return result.results;
}

// Multiple bound parameters with named values using positional binding
async function createPost(
  userId: number,
  title: string,
  content: string,
  slug: string,
  env: Env
): Promise<Post> {
  // Parameters are bound in order: ?1, ?2, ?3, ?4
  const result = await env.DB.prepare(
    `INSERT INTO posts (user_id, title, content, slug)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING *`
  )
    .bind(userId, title, content, slug)
    .first<Post>();

  return result!;
}

// Binding NULL values
async function updatePostContent(
  id: number,
  content: string | null,
  env: Env
): Promise<void> {
  await env.DB.prepare(
    `UPDATE posts
     SET content = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(content, id) // null is handled correctly
    .run();
}

// Reusing prepared statements for batch operations
async function getMultipleUsers(ids: number[], env: Env): Promise<User[]> {
  // Create a prepared statement once
  const stmt = env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  );

  // Execute it multiple times with different bindings
  const users: User[] = [];
  for (const id of ids) {
    const user = await stmt.bind(id).first<User>();
    if (user) {
      users.push(user);
    }
  }

  return users;
}
```

## Transactions with D1 Batch

D1 supports atomic transactions using the batch API. All statements in a batch either succeed together or fail together.

```typescript
// src/transactions.ts - Atomic operations with batch

interface Env {
  DB: D1Database;
}

// Transfer points between users atomically
async function transferPoints(
  fromUserId: number,
  toUserId: number,
  amount: number,
  env: Env
): Promise<{ success: boolean; message: string }> {
  try {
    // All statements in the batch execute as a single atomic transaction
    const results = await env.DB.batch([
      // Deduct points from sender
      env.DB.prepare(
        `UPDATE users
         SET points = points - ?, updated_at = datetime('now')
         WHERE id = ? AND points >= ?`
      ).bind(amount, fromUserId, amount),

      // Add points to receiver
      env.DB.prepare(
        `UPDATE users
         SET points = points + ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(amount, toUserId),

      // Record the transaction
      env.DB.prepare(
        `INSERT INTO point_transfers (from_user_id, to_user_id, amount)
         VALUES (?, ?, ?)`
      ).bind(fromUserId, toUserId, amount),
    ]);

    // Check if the deduction succeeded (user had enough points)
    if (results[0].meta.changes === 0) {
      // The batch already executed, but no rows were updated
      // In a real app, you would check balance first or use a trigger
      return { success: false, message: "Insufficient points" };
    }

    return { success: true, message: "Transfer completed" };
  } catch (error) {
    // If any statement fails, the entire batch is rolled back
    return { success: false, message: "Transfer failed" };
  }
}

// Create a user with their initial settings atomically
async function createUserWithSettings(
  username: string,
  email: string,
  passwordHash: string,
  env: Env
): Promise<User> {
  // Use batch to ensure both operations succeed or fail together
  const results = await env.DB.batch([
    // Create the user
    env.DB.prepare(
      `INSERT INTO users (username, email, password_hash)
       VALUES (?, ?, ?)
       RETURNING *`
    ).bind(username, email, passwordHash),

    // We need the user ID from the first query, but batch does not allow that
    // Instead, use a subquery or handle this differently
  ]);

  // For operations that need the inserted ID, use RETURNING and a separate query
  const user = results[0].results[0] as User;

  // Now create settings with the known user ID
  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, theme, notifications_enabled)
     VALUES (?, 'light', TRUE)`
  )
    .bind(user.id)
    .run();

  return user;
}

// Bulk insert with batch for better performance
async function bulkInsertPosts(posts: Omit<Post, 'id'>[], env: Env): Promise<void> {
  // Create an array of prepared statements for the batch
  const statements = posts.map(post =>
    env.DB.prepare(
      `INSERT INTO posts (user_id, title, content, slug, published)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(post.user_id, post.title, post.content, post.slug, post.published)
  );

  // Execute all inserts atomically
  await env.DB.batch(statements);
}

// Delete related data atomically
async function deleteUserAndData(userId: number, env: Env): Promise<void> {
  // Delete all related data in a single atomic operation
  await env.DB.batch([
    // Delete user's posts
    env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(userId),

    // Delete user's settings
    env.DB.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId),

    // Delete user's notifications
    env.DB.prepare("DELETE FROM notifications WHERE user_id = ?").bind(userId),

    // Finally delete the user
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}
```

## Local Development

D1 provides a local development experience that mirrors production, allowing you to develop and test without affecting your production database.

### Running Locally with Wrangler

```bash
# Start the local development server
# This creates a local SQLite database for development
wrangler dev

# The local database is stored in .wrangler/state/v3/d1/
```

### Applying Migrations Locally

```bash
# Apply all pending migrations to your local database
wrangler d1 migrations apply my-app-database --local

# Execute raw SQL against local database
wrangler d1 execute my-app-database --local --command="SELECT * FROM users"

# Execute SQL from a file
wrangler d1 execute my-app-database --local --file=./seed-data.sql
```

### Seeding Development Data

Create a seed file for local development.

```sql
-- seed-data.sql - Sample data for local development

-- Insert test users
INSERT INTO users (username, email, password_hash) VALUES
  ('alice', 'alice@example.com', 'hash_placeholder_1'),
  ('bob', 'bob@example.com', 'hash_placeholder_2'),
  ('charlie', 'charlie@example.com', 'hash_placeholder_3');

-- Insert test posts
INSERT INTO posts (user_id, title, content, slug, published) VALUES
  (1, 'Getting Started with D1', 'Learn how to use Cloudflare D1...', 'getting-started-d1', TRUE),
  (1, 'Advanced D1 Patterns', 'Deep dive into D1 best practices...', 'advanced-d1-patterns', TRUE),
  (2, 'Draft Post', 'This is still a work in progress...', 'draft-post', FALSE);
```

```bash
# Seed your local database
wrangler d1 execute my-app-database --local --file=./seed-data.sql
```

### Local Testing Script

```typescript
// scripts/test-local.ts - Test your D1 queries locally

import { unstable_dev } from "wrangler";

async function testLocalD1() {
  // Start a local worker instance
  const worker = await unstable_dev("src/index.ts", {
    experimental: { disableExperimentalWarning: true },
  });

  try {
    // Test GET /users
    const usersResponse = await worker.fetch("/users");
    const usersData = await usersResponse.json();
    console.log("Users:", usersData);

    // Test POST /users
    const createResponse = await worker.fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testuser",
        email: "test@example.com",
        password: "testpass123",
      }),
    });
    const createData = await createResponse.json();
    console.log("Created user:", createData);

    // Test GET /users/:id
    const userResponse = await worker.fetch(`/users/${createData.data.id}`);
    const userData = await userResponse.json();
    console.log("Single user:", userData);
  } finally {
    await worker.stop();
  }
}

testLocalD1().catch(console.error);
```

### Debugging Queries

```typescript
// src/debug.ts - Query debugging helpers

interface Env {
  DB: D1Database;
}

// Log query execution details
async function debugQuery<T>(
  stmt: D1PreparedStatement,
  queryName: string
): Promise<D1Result<T>> {
  const startTime = performance.now();

  try {
    const result = await stmt.all<T>();
    const duration = performance.now() - startTime;

    console.log(`[D1 Query] ${queryName}`, {
      duration: `${duration.toFixed(2)}ms`,
      rowsRead: result.meta.rows_read,
      rowsWritten: result.meta.rows_written,
      resultCount: result.results.length,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[D1 Query Error] ${queryName}`, {
      duration: `${duration.toFixed(2)}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Usage
async function getRecentPosts(env: Env): Promise<Post[]> {
  const stmt = env.DB.prepare(
    "SELECT * FROM posts WHERE published = TRUE ORDER BY created_at DESC LIMIT 10"
  );

  const result = await debugQuery<Post>(stmt, "getRecentPosts");
  return result.results;
}
```

## Best Practices Summary

Here are the key best practices for working with Cloudflare D1.

| Practice | Description |
|----------|-------------|
| **Use prepared statements** | Always use `.bind()` for parameter binding to prevent SQL injection |
| **Use batch for transactions** | Group related operations in `DB.batch()` for atomic execution |
| **Add indexes** | Create indexes on columns used in WHERE clauses and JOINs |
| **Use RETURNING** | Use `RETURNING *` in INSERT/UPDATE to get results without a second query |
| **Handle errors** | Catch unique constraint violations and other database errors gracefully |
| **Test locally** | Use `wrangler dev` and `--local` flag to test without affecting production |
| **Version migrations** | Number your migration files and track them in version control |
| **Type your bindings** | Define TypeScript interfaces for your Env to get type safety |
| **Monitor query performance** | Check `result.meta.rows_read` to identify slow queries |
| **Use Time Travel** | Leverage D1's Time Travel feature to debug data issues |

## Conclusion

Cloudflare D1 brings the power of SQLite to the edge, giving you a serverless database that scales automatically and runs close to your users. With familiar SQL syntax, strong integration with Cloudflare Workers, and tools like migrations and Time Travel, D1 is an excellent choice for building fast, globally distributed applications.

The combination of D1 and Workers provides a complete serverless platform where you can build everything from simple APIs to complex applications without managing any infrastructure. Start with the basics, use prepared statements for security, leverage batch operations for transactions, and take advantage of local development to iterate quickly.

To learn more about monitoring your applications and ensuring reliability, check out [OneUptime](https://oneuptime.com) for comprehensive observability and incident management.
