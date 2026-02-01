# How to Use SQLite with Bun's Native Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, SQLite, Database, Performance

Description: A comprehensive guide to using Bun's built-in SQLite support for high-performance database operations in JavaScript and TypeScript applications.

---

Bun ships with native SQLite support through the `bun:sqlite` module, making it one of the fastest ways to work with SQLite in JavaScript. Unlike Node.js where you need third-party packages like `better-sqlite3` or `sqlite3`, Bun includes SQLite bindings directly in its runtime. This means zero additional dependencies, instant setup, and exceptional performance.

In this guide, we will explore everything you need to know about using SQLite with Bun, from basic operations to advanced techniques like transactions, migrations, and performance optimization.

## Why Use Bun's Native SQLite?

Before diving into the code, let's understand why Bun's SQLite implementation stands out:

- **Zero Dependencies**: No npm packages to install. SQLite is built directly into Bun.
- **Synchronous API**: Unlike many Node.js alternatives, `bun:sqlite` uses a synchronous API, which is often simpler and faster for most use cases.
- **High Performance**: Bun's SQLite bindings are optimized for speed, often outperforming popular alternatives by 3-10x.
- **Full SQLite Feature Set**: Supports prepared statements, transactions, WAL mode, and all standard SQLite functionality.
- **TypeScript Support**: First-class TypeScript support with proper type definitions.

## Getting Started with bun:sqlite

The `bun:sqlite` module exports a `Database` class that you use to create or open SQLite databases.

Here is how to import the module and create your first database:

```typescript
import { Database } from "bun:sqlite";

// Create a new database file (or open existing one)
const db = new Database("myapp.db");

// Always close the database when done
// db.close();
```

## Creating an In-Memory Database

For testing, caching, or temporary data storage, you can create an in-memory database that exists only while your application runs.

To create an in-memory database, pass `:memory:` as the database path:

```typescript
import { Database } from "bun:sqlite";

// Create an in-memory database
const memoryDb = new Database(":memory:");

// This database will be lost when the process exits
// Perfect for tests and temporary data
```

## Creating Tables and Schema

Let's create a practical example with a users table. SQLite uses standard SQL for table creation.

This example creates a users table with common fields and constraints:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Create a users table with various data types
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
  )
`);

// Create an index on email for faster lookups
db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

console.log("Database schema created successfully");
```

## CRUD Operations

### Inserting Data

The `run()` method executes SQL statements that do not return data. For inserts, it returns information about the operation.

Here is how to insert a single record:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Insert a single user
const result = db.run(
  `INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`,
  ["john@example.com", "johndoe", "hashed_password_here"]
);

console.log("Inserted row ID:", result.lastInsertRowid);
console.log("Rows affected:", result.changes);
```

### Reading Data

Bun's SQLite provides several methods for querying data: `query()`, `prepare()`, `get()`, and `all()`.

Use `query().all()` to fetch multiple rows as an array of objects:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Fetch all active users
const users = db.query(`SELECT * FROM users WHERE is_active = ?`).all(1);

console.log("Active users:", users);
// Output: [{ id: 1, email: 'john@example.com', username: 'johndoe', ... }]
```

Use `query().get()` to fetch a single row:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Fetch a single user by email
const user = db.query(`SELECT * FROM users WHERE email = ?`).get("john@example.com");

if (user) {
  console.log("Found user:", user.username);
} else {
  console.log("User not found");
}
```

### Updating Data

The `run()` method works for UPDATE statements just like INSERT.

Here is how to update a user's information:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Update a user's username
const result = db.run(
  `UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ["john_updated", 1]
);

console.log("Rows updated:", result.changes);
```

### Deleting Data

Deleting records follows the same pattern using `run()`.

Here is how to delete a user:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Soft delete (recommended approach)
db.run(`UPDATE users SET is_active = 0 WHERE id = ?`, [1]);

// Hard delete (permanent)
const result = db.run(`DELETE FROM users WHERE id = ?`, [1]);

console.log("Rows deleted:", result.changes);
```

## Prepared Statements

Prepared statements are pre-compiled SQL queries that can be executed multiple times with different parameters. They offer better performance and security against SQL injection.

Here is how to create and use prepared statements:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Prepare statements once
const insertUser = db.prepare(
  `INSERT INTO users (email, username, password_hash) VALUES ($email, $username, $password)`
);

const findUserByEmail = db.prepare(
  `SELECT * FROM users WHERE email = $email`
);

const updateUser = db.prepare(
  `UPDATE users SET username = $username WHERE id = $id`
);

// Use them multiple times efficiently
insertUser.run({
  $email: "alice@example.com",
  $username: "alice",
  $password: "hashed_password_1"
});

insertUser.run({
  $email: "bob@example.com",
  $username: "bob",
  $password: "hashed_password_2"
});

// Query with named parameters
const alice = findUserByEmail.get({ $email: "alice@example.com" });
console.log("Found:", alice);

// Finalize when done (optional but recommended for long-running apps)
insertUser.finalize();
findUserByEmail.finalize();
updateUser.finalize();
```

## Transactions

Transactions ensure that a series of database operations either all succeed or all fail together. This is critical for maintaining data integrity.

Here is how to use transactions with Bun's SQLite:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Create a transaction function
function transferCredits(fromUserId: number, toUserId: number, amount: number) {
  const transaction = db.transaction(() => {
    // Deduct from sender
    db.run(
      `UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?`,
      [amount, fromUserId, amount]
    );

    // Check if deduction was successful
    const sender = db.query(`SELECT credits FROM users WHERE id = ?`).get(fromUserId);
    if (!sender) {
      throw new Error("Sender not found or insufficient credits");
    }

    // Add to receiver
    db.run(
      `UPDATE users SET credits = credits + ? WHERE id = ?`,
      [amount, toUserId]
    );

    return { success: true, amount };
  });

  // Execute the transaction
  try {
    const result = transaction();
    console.log("Transfer completed:", result);
  } catch (error) {
    console.error("Transfer failed, rolled back:", error.message);
  }
}
```

You can also use explicit transaction control for more complex scenarios:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Manual transaction control
try {
  db.run("BEGIN TRANSACTION");

  db.run(`INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`, 
    ["user1@example.com", "user1", "hash1"]);
  db.run(`INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`, 
    ["user2@example.com", "user2", "hash2"]);

  db.run("COMMIT");
  console.log("Transaction committed successfully");
} catch (error) {
  db.run("ROLLBACK");
  console.error("Transaction rolled back:", error.message);
}
```

## WAL Mode for Better Concurrency

Write-Ahead Logging (WAL) mode improves SQLite's concurrency by allowing reads and writes to happen simultaneously. This is especially useful for web applications.

Enable WAL mode immediately after opening the database:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Enable WAL mode for better concurrent access
db.run("PRAGMA journal_mode = WAL");

// Verify WAL mode is enabled
const mode = db.query("PRAGMA journal_mode").get();
console.log("Journal mode:", mode); // { journal_mode: 'wal' }

// Other useful pragmas for performance
db.run("PRAGMA synchronous = NORMAL"); // Good balance of safety and speed
db.run("PRAGMA cache_size = 10000"); // Increase cache size (in pages)
db.run("PRAGMA temp_store = MEMORY"); // Store temp tables in memory
```

## Creating and Using Indexes

Indexes dramatically improve query performance on large tables. Create indexes on columns you frequently search or sort by.

Here is how to create and manage indexes:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("users.db");

// Create a simple index
db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

// Create a composite index for queries that filter on multiple columns
db.run(`CREATE INDEX IF NOT EXISTS idx_users_active_created 
        ON users(is_active, created_at)`);

// Create a unique index (also enforces uniqueness)
db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
        ON users(email)`);

// Check existing indexes
const indexes = db.query(`
  SELECT name, sql FROM sqlite_master 
  WHERE type = 'index' AND tbl_name = 'users'
`).all();

console.log("Indexes on users table:", indexes);

// Analyze query performance with EXPLAIN QUERY PLAN
const plan = db.query(`
  EXPLAIN QUERY PLAN 
  SELECT * FROM users WHERE email = 'test@example.com'
`).all();

console.log("Query plan:", plan);
```

## Database Migrations

For production applications, you need a structured way to manage schema changes over time.

Here is a simple but effective migration system:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("app.db");

// Define migrations as an array of SQL statements
const migrations = [
  {
    version: 1,
    name: "create_users_table",
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    version: 2,
    name: "add_users_password",
    sql: `ALTER TABLE users ADD COLUMN password_hash TEXT`
  },
  {
    version: 3,
    name: "create_posts_table",
    sql: `
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
  },
  {
    version: 4,
    name: "add_posts_index",
    sql: `CREATE INDEX idx_posts_user_id ON posts(user_id)`
  }
];

function runMigrations() {
  // Create migrations tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get current version
  const current = db.query(
    `SELECT MAX(version) as version FROM schema_migrations`
  ).get() as { version: number | null };

  const currentVersion = current?.version || 0;

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      const transaction = db.transaction(() => {
        db.run(migration.sql);
        db.run(
          `INSERT INTO schema_migrations (version, name) VALUES (?, ?)`,
          [migration.version, migration.name]
        );
      });

      transaction();
      console.log(`Migration ${migration.version} completed`);
    }
  }

  console.log("All migrations applied");
}

runMigrations();
```

## Type-Safe Queries with TypeScript

Bun's SQLite works great with TypeScript. You can define interfaces for your data models.

Here is how to add type safety to your queries:

```typescript
import { Database } from "bun:sqlite";

// Define your types
interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  is_active: number;
}

interface CreateUserInput {
  email: string;
  username: string;
  password_hash: string;
}

const db = new Database("users.db");

// Type-safe query functions
function getAllUsers(): User[] {
  return db.query(`SELECT * FROM users`).all() as User[];
}

function getUserById(id: number): User | null {
  return db.query(`SELECT * FROM users WHERE id = ?`).get(id) as User | null;
}

function createUser(input: CreateUserInput): number {
  const result = db.run(
    `INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`,
    [input.email, input.username, input.password_hash]
  );
  return Number(result.lastInsertRowid);
}

// Usage with full type safety
const newUserId = createUser({
  email: "typed@example.com",
  username: "typeduser",
  password_hash: "secure_hash"
});

const user = getUserById(newUserId);
if (user) {
  console.log(user.email); // TypeScript knows this is a string
}
```

## Bulk Insert Operations

When inserting many records, use transactions and prepared statements for optimal performance.

Here is how to efficiently insert thousands of records:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("bulk.db");

db.run(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Generate sample data
const logs = Array.from({ length: 10000 }, (_, i) => ({
  level: i % 3 === 0 ? "ERROR" : i % 2 === 0 ? "WARN" : "INFO",
  message: `Log message number ${i}`
}));

// Bulk insert with transaction and prepared statement
const insertMany = db.transaction((items: typeof logs) => {
  const insert = db.prepare(
    `INSERT INTO logs (level, message) VALUES (?, ?)`
  );

  for (const item of items) {
    insert.run(item.level, item.message);
  }
});

console.time("Bulk insert");
insertMany(logs);
console.timeEnd("Bulk insert");
// Typically completes in under 100ms for 10,000 records
```

## Handling JSON Data

SQLite has built-in JSON functions. Combined with Bun, you can easily store and query JSON data.

Here is how to work with JSON in SQLite:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("json_example.db");

db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL
  )
`);

// Insert JSON data
const settings = {
  theme: "dark",
  notifications: { email: true, push: false },
  language: "en"
};

db.run(
  `INSERT INTO documents (data) VALUES (?)`,
  [JSON.stringify(settings)]
);

// Query JSON fields using SQLite JSON functions
const result = db.query(`
  SELECT 
    id,
    json_extract(data, '$.theme') as theme,
    json_extract(data, '$.notifications.email') as email_notifications
  FROM documents
`).all();

console.log("Query result:", result);
// [{ id: 1, theme: 'dark', email_notifications: 1 }]

// Filter by JSON value
const darkThemeUsers = db.query(`
  SELECT * FROM documents 
  WHERE json_extract(data, '$.theme') = ?
`).all("dark");

console.log("Dark theme users:", darkThemeUsers);
```

## Error Handling

Proper error handling ensures your application gracefully handles database issues.

Here is a comprehensive error handling pattern:

```typescript
import { Database } from "bun:sqlite";

class DatabaseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

function safeQuery<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific SQLite errors
      if (error.message.includes("UNIQUE constraint failed")) {
        throw new DatabaseError("Duplicate entry", error);
      }
      if (error.message.includes("FOREIGN KEY constraint failed")) {
        throw new DatabaseError("Referenced record not found", error);
      }
      if (error.message.includes("no such table")) {
        throw new DatabaseError("Table does not exist", error);
      }
    }
    throw new DatabaseError("Database operation failed", error);
  }
}

// Usage
const db = new Database("safe.db");

try {
  const result = safeQuery(() => 
    db.run(`INSERT INTO users (email) VALUES (?)`, ["duplicate@example.com"])
  );
  console.log("Insert successful:", result);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error("Database error:", error.message);
  }
}
```

## Best Practices Summary

Follow these guidelines to get the most out of Bun's SQLite support:

1. **Enable WAL Mode**: Always enable WAL mode for applications with concurrent access. Add `db.run("PRAGMA journal_mode = WAL")` right after opening the database.

2. **Use Prepared Statements**: For queries that run multiple times, use `db.prepare()` to compile them once and reuse them.

3. **Wrap Multi-Step Operations in Transactions**: Use `db.transaction()` for operations that need to succeed or fail together.

4. **Create Indexes Strategically**: Add indexes on columns used in WHERE clauses, JOIN conditions, and ORDER BY clauses. But avoid over-indexing as it slows down writes.

5. **Close Resources**: Call `db.close()` when your application shuts down. For prepared statements in long-running apps, call `statement.finalize()` when done.

6. **Use In-Memory Databases for Tests**: Pass `:memory:` as the path for fast, isolated test databases.

7. **Implement Migrations**: Use a versioned migration system for production applications to manage schema changes safely.

8. **Add Type Safety**: Define TypeScript interfaces for your database models and add type annotations to query functions.

9. **Handle Errors Gracefully**: Catch and handle SQLite-specific errors appropriately, providing meaningful feedback to users.

10. **Optimize Pragmas**: Configure SQLite pragmas based on your use case. Use `PRAGMA synchronous = NORMAL` for a balance of safety and speed.

## Conclusion

Bun's native SQLite support provides a powerful, fast, and convenient way to work with databases in JavaScript and TypeScript applications. The synchronous API simplifies code structure, while the built-in optimizations ensure excellent performance without external dependencies.

Whether you are building a small CLI tool, a web application backend, or a high-performance data processing pipeline, Bun's SQLite integration offers everything you need. The combination of prepared statements, transactions, WAL mode, and proper indexing lets you build robust database-driven applications that scale well.

Start with the basics shown in this guide, then gradually adopt more advanced patterns like migrations and type-safe queries as your application grows. The investment in proper database architecture pays dividends as your codebase evolves.

For more information, check out the [official Bun SQLite documentation](https://bun.sh/docs/api/sqlite) and experiment with the examples provided. Happy coding!
