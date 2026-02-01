# How to Connect Bun to PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, PostgreSQL, Database, Backend

Description: A comprehensive guide to connecting Bun runtime to PostgreSQL databases with practical examples covering drivers, queries, transactions, pooling, and ORMs.

---

Bun is a fast JavaScript runtime that has gained significant traction among developers for its speed and developer experience. When building backend applications, connecting to a database like PostgreSQL is essential. In this guide, we will explore multiple ways to connect Bun to PostgreSQL, from basic driver usage to advanced patterns like connection pooling and ORM integration.

## Why Use Bun with PostgreSQL?

Bun offers several advantages when working with PostgreSQL:

- **Native TypeScript support**: No need for additional compilation steps
- **Fast startup times**: Bun starts significantly faster than Node.js
- **Built-in package manager**: Quick dependency installation
- **NPM compatibility**: Use existing Node.js PostgreSQL packages

PostgreSQL remains one of the most reliable and feature-rich relational databases. Combining it with Bun creates a powerful stack for building modern web applications, APIs, and microservices.

## Installing PostgreSQL Drivers

Bun is compatible with most Node.js PostgreSQL drivers. The two most popular options are `pg` (node-postgres) and `postgres` (postgres.js). Let's look at both.

### Installing the pg Driver

The `pg` package is the most widely used PostgreSQL client for Node.js and works seamlessly with Bun.

```bash
bun add pg
bun add -d @types/pg
```

### Installing postgres.js

postgres.js is a modern PostgreSQL client that offers excellent performance and a clean API.

```bash
bun add postgres
```

## Basic Connection Setup

### Using the pg Driver

Here is a basic example of connecting to PostgreSQL using the pg driver. We create a client instance with connection parameters and then connect to the database.

```typescript
import { Client } from "pg";

// Create a new client instance with connection configuration
const client = new Client({
  host: "localhost",
  port: 5432,
  database: "myapp",
  user: "postgres",
  password: "your_password",
});

// Connect to the database
async function connect() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
}

// Always close the connection when done
async function disconnect() {
  await client.end();
  console.log("Disconnected from PostgreSQL");
}

connect();
```

### Using postgres.js

postgres.js provides a simpler API with automatic connection management. The connection is established lazily when the first query is executed.

```typescript
import postgres from "postgres";

// Create a SQL connection instance
// The connection string format: postgres://user:password@host:port/database
const sql = postgres({
  host: "localhost",
  port: 5432,
  database: "myapp",
  username: "postgres",
  password: "your_password",
});

// Test the connection by running a simple query
async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log("Connected! Server time:", result[0].current_time);
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

testConnection();
```

### Using Environment Variables

In production, you should never hardcode database credentials. Use environment variables instead. Bun has built-in support for loading `.env` files.

```typescript
import postgres from "postgres";

// Bun automatically loads .env files
// Create a .env file with DATABASE_URL=postgres://user:pass@host:port/db
const sql = postgres(process.env.DATABASE_URL || "postgres://localhost:5432/myapp");

export default sql;
```

Create a `.env` file in your project root:

```env
DATABASE_URL=postgres://postgres:your_password@localhost:5432/myapp
```

## Executing Queries

### Simple Queries with pg

The pg driver uses a callback-style API that has been wrapped with promises. Here is how to execute basic SELECT, INSERT, UPDATE, and DELETE queries.

```typescript
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

// SELECT query - fetches all users from the database
const selectResult = await client.query("SELECT * FROM users");
console.log("Users:", selectResult.rows);

// INSERT query - adds a new user and returns the created record
const insertResult = await client.query(
  "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
  ["John Doe", "john@example.com"]
);
console.log("Created user:", insertResult.rows[0]);

// UPDATE query - modifies an existing user's email
const updateResult = await client.query(
  "UPDATE users SET email = $1 WHERE id = $2 RETURNING *",
  ["newemail@example.com", 1]
);
console.log("Updated user:", updateResult.rows[0]);

// DELETE query - removes a user by ID
const deleteResult = await client.query(
  "DELETE FROM users WHERE id = $1 RETURNING *",
  [1]
);
console.log("Deleted user:", deleteResult.rows[0]);

await client.end();
```

### Tagged Template Queries with postgres.js

postgres.js uses tagged template literals, which provide automatic SQL injection protection and a cleaner syntax.

```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Variables in tagged templates are automatically escaped
const userId = 1;
const userName = "John Doe";
const userEmail = "john@example.com";

// SELECT with a WHERE clause - the userId is safely interpolated
const users = await sql`
  SELECT * FROM users WHERE id = ${userId}
`;

// INSERT with returning - values are automatically parameterized
const newUser = await sql`
  INSERT INTO users (name, email)
  VALUES (${userName}, ${userEmail})
  RETURNING *
`;

// UPDATE with multiple parameters
const updatedUser = await sql`
  UPDATE users
  SET name = ${userName}, email = ${userEmail}
  WHERE id = ${userId}
  RETURNING *
`;

// DELETE with returning
const deletedUser = await sql`
  DELETE FROM users
  WHERE id = ${userId}
  RETURNING *
`;

console.log("Query results:", { users, newUser, updatedUser, deletedUser });
```

## Parameterized Queries and SQL Injection Prevention

Parameterized queries are essential for preventing SQL injection attacks. Both drivers handle this differently.

### Parameterized Queries with pg

The pg driver uses positional parameters ($1, $2, etc.) and a separate values array. This ensures user input is never interpreted as SQL code.

```typescript
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

// DANGEROUS - Never do this! User input could contain malicious SQL
// const badQuery = `SELECT * FROM users WHERE email = '${userInput}'`;

// SAFE - Use parameterized queries with positional placeholders
const userInput = "user@example.com'; DROP TABLE users; --";

const result = await client.query(
  "SELECT * FROM users WHERE email = $1",
  [userInput]
);

// The malicious input is treated as a literal string, not SQL
console.log("Safe query executed, found rows:", result.rowCount);

// Multiple parameters are numbered sequentially
const searchResult = await client.query(
  "SELECT * FROM users WHERE name LIKE $1 AND created_at > $2 LIMIT $3",
  ["%john%", "2025-01-01", 10]
);

await client.end();
```

### Safe Queries with postgres.js

postgres.js automatically handles parameterization through tagged template literals. Any interpolated value is treated as a parameter.

```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// All interpolated values are automatically parameterized
const userInput = "user@example.com'; DROP TABLE users; --";

// This is completely safe - userInput becomes a bound parameter
const result = await sql`
  SELECT * FROM users WHERE email = ${userInput}
`;

// For dynamic column names or table names, use sql.identifier()
const columnName = "email";
const tableName = "users";

const dynamicResult = await sql`
  SELECT ${sql(columnName)} FROM ${sql(tableName)} LIMIT 10
`;

// For IN clauses with arrays, postgres.js handles them automatically
const ids = [1, 2, 3, 4, 5];
const usersById = await sql`
  SELECT * FROM users WHERE id = ANY(${ids})
`;

console.log("Results:", { result, dynamicResult, usersById });
```

## Connection Pooling

Connection pooling is crucial for production applications. Creating a new database connection for each request is expensive and can exhaust database resources.

### Connection Pool with pg

The pg driver provides a `Pool` class that manages a pool of reusable connections.

```typescript
import { Pool } from "pg";

// Create a connection pool with configuration options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                  // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not available
});

// The pool emits an error event for any idle client errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
});

// Query using the pool - connection is automatically acquired and released
async function getUsers() {
  const result = await pool.query("SELECT * FROM users LIMIT 100");
  return result.rows;
}

// For multiple queries, acquire a client from the pool
async function createUserWithProfile(name: string, email: string, bio: string) {
  const client = await pool.connect();
  
  try {
    const userResult = await client.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
      [name, email]
    );
    
    const userId = userResult.rows[0].id;
    
    await client.query(
      "INSERT INTO profiles (user_id, bio) VALUES ($1, $2)",
      [userId, bio]
    );
    
    return userId;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

// Graceful shutdown - drain the pool before exiting
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});
```

### Connection Pool with postgres.js

postgres.js has built-in connection pooling. You configure pool settings when creating the SQL instance.

```typescript
import postgres from "postgres";

// postgres.js manages a connection pool automatically
const sql = postgres(process.env.DATABASE_URL, {
  max: 20,              // Maximum connections in pool
  idle_timeout: 30,     // Seconds before closing idle connections
  connect_timeout: 10,  // Seconds to wait for connection
  max_lifetime: 60 * 30, // Maximum lifetime of a connection in seconds
});

// Queries automatically use pooled connections
async function getUsers() {
  return await sql`SELECT * FROM users LIMIT 100`;
}

// Multiple queries use the same or different connections as needed
async function createUserWithProfile(name: string, email: string, bio: string) {
  const [user] = await sql`
    INSERT INTO users (name, email)
    VALUES (${name}, ${email})
    RETURNING id
  `;
  
  await sql`
    INSERT INTO profiles (user_id, bio)
    VALUES (${user.id}, ${bio})
  `;
  
  return user.id;
}

// Close all connections when shutting down
process.on("SIGTERM", async () => {
  await sql.end();
  process.exit(0);
});
```

## Transactions

Transactions ensure that multiple database operations either all succeed or all fail together, maintaining data integrity.

### Transactions with pg

With the pg driver, you manage transactions by executing BEGIN, COMMIT, and ROLLBACK statements.

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Transfer funds between accounts atomically
async function transferFunds(fromAccountId: number, toAccountId: number, amount: number) {
  const client = await pool.connect();
  
  try {
    // Start the transaction
    await client.query("BEGIN");
    
    // Deduct from source account
    const deductResult = await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance",
      [amount, fromAccountId]
    );
    
    if (deductResult.rowCount === 0) {
      throw new Error("Insufficient funds or account not found");
    }
    
    // Add to destination account
    const addResult = await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [amount, toAccountId]
    );
    
    if (addResult.rowCount === 0) {
      throw new Error("Destination account not found");
    }
    
    // Record the transaction
    await client.query(
      "INSERT INTO transactions (from_account, to_account, amount, created_at) VALUES ($1, $2, $3, NOW())",
      [fromAccountId, toAccountId, amount]
    );
    
    // Commit all changes
    await client.query("COMMIT");
    
    return { success: true, message: "Transfer completed" };
  } catch (error) {
    // Rollback on any error - no changes are persisted
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Always release the client
    client.release();
  }
}
```

### Transactions with postgres.js

postgres.js provides a cleaner transaction API using a callback function.

```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Transfer funds using postgres.js transaction helper
async function transferFunds(fromAccountId: number, toAccountId: number, amount: number) {
  // The sql.begin() method handles BEGIN, COMMIT, and ROLLBACK automatically
  return await sql.begin(async (tx) => {
    // All queries inside this callback use the same transaction
    
    const [fromAccount] = await tx`
      UPDATE accounts
      SET balance = balance - ${amount}
      WHERE id = ${fromAccountId} AND balance >= ${amount}
      RETURNING balance
    `;
    
    if (!fromAccount) {
      throw new Error("Insufficient funds or account not found");
    }
    
    const [toAccount] = await tx`
      UPDATE accounts
      SET balance = balance + ${amount}
      WHERE id = ${toAccountId}
      RETURNING balance
    `;
    
    if (!toAccount) {
      throw new Error("Destination account not found");
    }
    
    await tx`
      INSERT INTO transactions (from_account, to_account, amount, created_at)
      VALUES (${fromAccountId}, ${toAccountId}, ${amount}, NOW())
    `;
    
    return { success: true, fromBalance: fromAccount.balance, toBalance: toAccount.balance };
  });
  // Transaction is automatically committed if no error, rolled back otherwise
}
```

## Database Migrations

Migrations help you version control your database schema changes. Several tools work well with Bun.

### Using dbmate

dbmate is a database-agnostic migration tool that works well with any runtime.

```bash
# Install dbmate (on macOS)
brew install dbmate

# Create a new migration
dbmate new create_users_table
```

This creates a migration file that you can edit with your SQL:

```sql
-- migrate:up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- migrate:down
DROP TABLE IF EXISTS users;
```

Run migrations with:

```bash
dbmate up    # Apply pending migrations
dbmate down  # Rollback last migration
dbmate status # Show migration status
```

### Simple Migration System with postgres.js

For smaller projects, you can implement a simple migration system directly in Bun.

```typescript
import postgres from "postgres";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const sql = postgres(process.env.DATABASE_URL);

// Create migrations tracking table if it does not exist
async function initMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

// Get list of applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  const results = await sql`SELECT version FROM schema_migrations ORDER BY version`;
  return results.map((r) => r.version);
}

// Run all pending migrations from the migrations directory
async function runMigrations() {
  await initMigrations();
  
  const applied = await getAppliedMigrations();
  const migrationsDir = join(process.cwd(), "migrations");
  const files = await readdir(migrationsDir);
  
  const pending = files
    .filter((f) => f.endsWith(".sql") && !applied.includes(f))
    .sort();
  
  for (const file of pending) {
    console.log(`Running migration: ${file}`);
    
    const content = await readFile(join(migrationsDir, file), "utf-8");
    
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
    });
    
    console.log(`Completed migration: ${file}`);
  }
  
  console.log(`Applied ${pending.length} migrations`);
}

runMigrations().then(() => sql.end());
```

## Error Handling

Proper error handling ensures your application can recover gracefully from database issues.

```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Custom error types for different database errors
class DatabaseError extends Error {
  constructor(message: string, public originalError: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

class UniqueViolationError extends DatabaseError {
  constructor(public field: string, originalError: unknown) {
    super(`Duplicate value for field: ${field}`, originalError);
    this.name = "UniqueViolationError";
  }
}

class NotFoundError extends DatabaseError {
  constructor(resource: string, id: unknown) {
    super(`${resource} with id ${id} not found`, null);
    this.name = "NotFoundError";
  }
}

// Wrapper function that handles common PostgreSQL errors
async function createUser(name: string, email: string) {
  try {
    const [user] = await sql`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING *
    `;
    return user;
  } catch (error: unknown) {
    // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (error && typeof error === "object" && "code" in error) {
      const pgError = error as { code: string; constraint?: string };
      
      // 23505 = unique_violation
      if (pgError.code === "23505") {
        throw new UniqueViolationError("email", error);
      }
      
      // 23503 = foreign_key_violation
      if (pgError.code === "23503") {
        throw new DatabaseError("Referenced record does not exist", error);
      }
      
      // 23502 = not_null_violation
      if (pgError.code === "23502") {
        throw new DatabaseError("Required field is missing", error);
      }
    }
    
    // Re-throw unknown errors
    throw new DatabaseError("Database operation failed", error);
  }
}

// Using the error handling in an API endpoint
async function handleCreateUser(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const user = await createUser(body.name, body.email);
    return new Response(JSON.stringify(user), { status: 201 });
  } catch (error) {
    if (error instanceof UniqueViolationError) {
      return new Response(
        JSON.stringify({ error: "Email already exists" }),
        { status: 409 }
      );
    }
    
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404 }
      );
    }
    
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
```

## ORM Options for Bun

While raw SQL gives you full control, ORMs can speed up development. Several ORMs work well with Bun.

### Drizzle ORM

Drizzle is a TypeScript ORM that offers excellent type safety and performance.

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

Define your schema:

```typescript
// schema.ts
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: varchar("content", { length: 10000 }),
  authorId: serial("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Use Drizzle in your application:

```typescript
// db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, posts } from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Type-safe queries with full autocompletion
async function getUserWithPosts(userId: number) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  const userPosts = await db.select().from(posts).where(eq(posts.authorId, userId));
  
  return { user: user[0], posts: userPosts };
}

// Insert with type checking
async function createUser(name: string, email: string) {
  const result = await db.insert(users).values({ name, email }).returning();
  return result[0];
}

// Update with type safety
async function updateUserEmail(userId: number, newEmail: string) {
  const result = await db
    .update(users)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return result[0];
}
```

### Prisma

Prisma is a popular ORM with a great developer experience. It works with Bun using the Node.js compatibility layer.

```bash
bun add prisma @prisma/client
bunx prisma init
```

## Best Practices Summary

Here are the key best practices for working with Bun and PostgreSQL:

1. **Always use parameterized queries** to prevent SQL injection attacks. Never concatenate user input into SQL strings.

2. **Use connection pooling** in production. Creating new connections for each request is expensive and can exhaust database resources.

3. **Handle errors gracefully** by catching specific PostgreSQL error codes and returning meaningful error messages to users.

4. **Use environment variables** for database credentials. Never commit connection strings with passwords to version control.

5. **Implement proper transaction handling** when multiple related operations need to succeed or fail together.

6. **Set appropriate timeouts** for connections and queries to prevent hanging requests from blocking resources.

7. **Use migrations** for schema changes. This ensures reproducible database states across environments and team members.

8. **Close connections on shutdown** to prevent connection leaks. Listen for SIGTERM and gracefully drain connection pools.

9. **Consider using an ORM** for complex applications. Drizzle offers excellent TypeScript integration and type safety.

10. **Monitor your database connections** in production. Track pool usage, query times, and error rates.

## Conclusion

Connecting Bun to PostgreSQL is straightforward thanks to its compatibility with Node.js packages. Whether you choose the battle-tested `pg` driver or the modern `postgres.js` library, you have access to all the features needed for production applications.

For most projects, I recommend starting with `postgres.js` due to its clean API, automatic parameterization through tagged templates, and built-in connection pooling. As your application grows, consider adding Drizzle ORM for type-safe queries and better maintainability.

Remember to always use parameterized queries, implement proper error handling, and leverage connection pooling. These practices will help you build reliable and secure applications that can scale with your needs.

The combination of Bun's speed and PostgreSQL's reliability creates a solid foundation for building modern web applications. Start with the basics covered in this guide, and expand your implementation as your requirements grow.
