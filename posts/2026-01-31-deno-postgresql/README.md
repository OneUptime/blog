# How to Connect Deno to PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, PostgreSQL, Database, TypeScript

Description: Learn how to connect Deno applications to PostgreSQL databases with connection pooling, transactions, migrations, and production-ready error handling.

---

Deno has emerged as a modern, secure runtime for JavaScript and TypeScript. When building backend applications, connecting to a database is essential. PostgreSQL remains one of the most popular and powerful relational databases available. This guide will walk you through everything you need to know about connecting Deno to PostgreSQL, from basic connections to advanced patterns like connection pooling and migrations.

## Why Use PostgreSQL with Deno?

PostgreSQL offers robust features including ACID compliance, JSON support, full-text search, and excellent performance. Combined with Deno's secure-by-default approach and native TypeScript support, you get a powerful stack for building modern applications.

Here is a high-level overview of how Deno applications interact with PostgreSQL:

```mermaid
flowchart LR
    A[Deno Application] --> B[PostgreSQL Driver]
    B --> C[Connection Pool]
    C --> D[(PostgreSQL Database)]
    
    subgraph "Deno Runtime"
        A
        B
        C
    end
```

## Installing the PostgreSQL Driver

Deno uses URL-based imports, so there is no package.json or npm install required. The most popular PostgreSQL driver for Deno is `deno-postgres`. You can import it directly from deno.land/x.

The following import statement brings in the Client class for single connections:

```typescript
// Import the PostgreSQL client from deno.land/x
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
```

For connection pooling, you will also need the Pool class:

```typescript
// Import both Client and Pool for flexible connection management
import { 
  Client, 
  Pool 
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";
```

It is recommended to pin a specific version (like `v0.19.3`) to ensure reproducible builds and avoid unexpected breaking changes.

## Basic Connection Setup

The simplest way to connect to PostgreSQL is using the Client class with a connection string or configuration object.

### Using a Connection String

This example demonstrates connecting using a standard PostgreSQL connection URL:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Create a new client instance with a connection string
const client = new Client(
  "postgresql://username:password@localhost:5432/mydb"
);

// Establish the connection
await client.connect();

console.log("Connected to PostgreSQL successfully!");

// Always close the connection when done
await client.end();
```

### Using a Configuration Object

For more control and better security practices, use a configuration object with environment variables:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Define connection configuration using environment variables
const clientConfig = {
  user: Deno.env.get("POSTGRES_USER") || "postgres",
  password: Deno.env.get("POSTGRES_PASSWORD") || "secret",
  database: Deno.env.get("POSTGRES_DB") || "mydb",
  hostname: Deno.env.get("POSTGRES_HOST") || "localhost",
  port: parseInt(Deno.env.get("POSTGRES_PORT") || "5432"),
};

const client = new Client(clientConfig);

await client.connect();
console.log("Connected using configuration object!");
await client.end();
```

When running your Deno application, you need to grant network and environment permissions:

```bash
deno run --allow-net --allow-env your_script.ts
```

## Executing Queries

Once connected, you can execute SQL queries using the `queryObject` or `queryArray` methods.

### Simple SELECT Query

The queryObject method returns rows as JavaScript objects, making it easy to work with typed data:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const client = new Client("postgresql://user:pass@localhost:5432/mydb");
await client.connect();

// Define an interface for type safety
interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

// Execute a SELECT query and get results as typed objects
const result = await client.queryObject<User>(
  "SELECT id, name, email, created_at FROM users"
);

// Access the rows array containing User objects
console.log(`Found ${result.rowCount} users:`);
for (const user of result.rows) {
  console.log(`- ${user.name} (${user.email})`);
}

await client.end();
```

### INSERT Query

Inserting data follows the same pattern. The RETURNING clause lets you retrieve the inserted row:

```typescript
// Insert a new user and return the created record
const insertResult = await client.queryObject<User>(`
  INSERT INTO users (name, email) 
  VALUES ('John Doe', 'john@example.com')
  RETURNING id, name, email, created_at
`);

const newUser = insertResult.rows[0];
console.log(`Created user with ID: ${newUser.id}`);
```

## Parameterized Queries

**Never concatenate user input directly into SQL strings.** This creates SQL injection vulnerabilities. Always use parameterized queries.

### Using Positional Parameters

The driver supports positional parameters using $1, $2, etc:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const client = new Client("postgresql://user:pass@localhost:5432/mydb");
await client.connect();

// User input that should NEVER be concatenated into SQL
const userEmail = "alice@example.com";
const userName = "Alice Smith";

// Safe: Use parameterized query with $1, $2 placeholders
const result = await client.queryObject<{ id: number; name: string }>(
  "SELECT id, name FROM users WHERE email = $1 AND name = $2",
  [userEmail, userName]
);

if (result.rowCount && result.rowCount > 0) {
  console.log(`Found user: ${result.rows[0].name}`);
} else {
  console.log("User not found");
}

await client.end();
```

### Parameterized INSERT

The same approach works for INSERT, UPDATE, and DELETE operations:

```typescript
interface NewUser {
  id: number;
  name: string;
  email: string;
}

// Function to safely create a new user
async function createUser(
  client: Client, 
  name: string, 
  email: string
): Promise<NewUser> {
  const result = await client.queryObject<NewUser>(
    `INSERT INTO users (name, email) 
     VALUES ($1, $2) 
     RETURNING id, name, email`,
    [name, email]
  );
  return result.rows[0];
}

// Usage example
const user = await createUser(client, "Bob Wilson", "bob@example.com");
console.log(`Created user: ${user.id}`);
```

## Connection Pooling

For production applications, creating a new connection for each request is inefficient. Connection pooling maintains a set of reusable connections.

Here is how connection pooling works:

```mermaid
flowchart TB
    subgraph "Application Requests"
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
        R4[Request 4]
    end
    
    subgraph "Connection Pool"
        P[Pool Manager]
        C1[Connection 1]
        C2[Connection 2]
        C3[Connection 3]
    end
    
    subgraph "Database"
        DB[(PostgreSQL)]
    end
    
    R1 --> P
    R2 --> P
    R3 --> P
    R4 --> P
    
    P --> C1
    P --> C2
    P --> C3
    
    C1 --> DB
    C2 --> DB
    C3 --> DB
```

### Creating a Connection Pool

The Pool class manages multiple connections and handles distribution:

```typescript
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Create a pool with a maximum of 20 connections
// The lazy option delays connection creation until needed
const pool = new Pool(
  {
    user: "postgres",
    password: "secret",
    database: "mydb",
    hostname: "localhost",
    port: 5432,
  },
  20, // Maximum pool size
  true // Lazy: create connections on demand
);

// Function to execute a query using the pool
async function getUserById(id: number) {
  // Acquire a connection from the pool
  const client = await pool.connect();
  
  try {
    // Execute the query
    const result = await client.queryObject<{ id: number; name: string }>(
      "SELECT id, name FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  } finally {
    // CRITICAL: Always release the connection back to the pool
    client.release();
  }
}

// Usage in an HTTP handler
const user = await getUserById(42);
console.log(user);

// When shutting down the application, close all pool connections
await pool.end();
```

### Pool Best Practices

The following helper function ensures connections are always released, even if an error occurs:

```typescript
import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Generic function to execute queries with automatic connection management
async function withConnection<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    // Connection is released regardless of success or failure
    client.release();
  }
}

// Usage example: clean and safe query execution
const users = await withConnection(pool, async (client) => {
  const result = await client.queryObject<{ name: string }>(
    "SELECT name FROM users LIMIT 10"
  );
  return result.rows;
});
```

## Transactions

Transactions ensure that multiple operations either all succeed or all fail together. This is crucial for maintaining data integrity.

### Basic Transaction Pattern

The following example shows how to transfer money between accounts atomically:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

async function transferFunds(
  client: Client,
  fromAccountId: number,
  toAccountId: number,
  amount: number
): Promise<void> {
  // Start a transaction
  const transaction = client.createTransaction("transfer_funds");
  
  try {
    await transaction.begin();
    
    // Deduct from source account
    await transaction.queryObject(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, fromAccountId]
    );
    
    // Add to destination account
    await transaction.queryObject(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, toAccountId]
    );
    
    // Record the transaction in a log table
    await transaction.queryObject(
      `INSERT INTO transaction_log (from_account, to_account, amount, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [fromAccountId, toAccountId, amount]
    );
    
    // Commit all changes if everything succeeded
    await transaction.commit();
    console.log(`Transferred $${amount} successfully`);
    
  } catch (error) {
    // Rollback all changes if any operation failed
    await transaction.rollback();
    console.error("Transaction failed, all changes rolled back:", error);
    throw error;
  }
}
```

### Transaction with Savepoints

For complex operations, savepoints allow partial rollbacks:

```typescript
async function complexOperation(client: Client): Promise<void> {
  const transaction = client.createTransaction("complex_op");
  
  await transaction.begin();
  
  try {
    // First operation
    await transaction.queryObject(
      "INSERT INTO orders (customer_id, status) VALUES ($1, $2)",
      [1, "pending"]
    );
    
    // Create a savepoint before risky operation
    await transaction.queryObject("SAVEPOINT before_inventory");
    
    try {
      // Risky operation that might fail
      await transaction.queryObject(
        "UPDATE inventory SET quantity = quantity - 1 WHERE product_id = $1",
        [100]
      );
    } catch {
      // Rollback only to the savepoint, keeping the order insert
      await transaction.queryObject("ROLLBACK TO SAVEPOINT before_inventory");
      console.log("Inventory update failed, but order is preserved");
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Database Migrations

Migrations help you version control your database schema. Here is a simple migration system for Deno:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Interface for migration definitions
interface Migration {
  version: number;
  name: string;
  up: string;   // SQL to apply the migration
  down: string; // SQL to revert the migration
}

// Define your migrations in order
const migrations: Migration[] = [
  {
    version: 1,
    name: "create_users_table",
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    down: "DROP TABLE IF EXISTS users",
  },
  {
    version: 2,
    name: "add_users_status",
    up: `
      ALTER TABLE users 
      ADD COLUMN status VARCHAR(50) DEFAULT 'active'
    `,
    down: "ALTER TABLE users DROP COLUMN status",
  },
  {
    version: 3,
    name: "create_orders_table",
    up: `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    down: "DROP TABLE IF EXISTS orders",
  },
];

// Migration runner class
class MigrationRunner {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  // Initialize the migrations tracking table
  async init(): Promise<void> {
    await this.client.queryObject(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Get the current migration version
  async getCurrentVersion(): Promise<number> {
    const result = await this.client.queryObject<{ version: number }>(
      "SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations"
    );
    return result.rows[0].version;
  }

  // Run all pending migrations
  async migrate(): Promise<void> {
    await this.init();
    const currentVersion = await this.getCurrentVersion();

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        const transaction = this.client.createTransaction(
          `migration_${migration.version}`
        );
        
        try {
          await transaction.begin();
          await transaction.queryObject(migration.up);
          await transaction.queryObject(
            "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
            [migration.version, migration.name]
          );
          await transaction.commit();
          console.log(`Migration ${migration.version} completed`);
        } catch (error) {
          await transaction.rollback();
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }

    console.log("All migrations completed successfully");
  }
}

// Usage
const client = new Client("postgresql://user:pass@localhost:5432/mydb");
await client.connect();

const runner = new MigrationRunner(client);
await runner.migrate();

await client.end();
```

## Error Handling

Robust error handling is essential for production applications. The driver throws specific error types you can catch and handle:

```typescript
import { 
  Client,
  PostgresError 
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Custom error class for database operations
class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError: Error
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Safe query wrapper with comprehensive error handling
async function safeQuery<T>(
  client: Client,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const result = await client.queryObject<T>(query, params);
    return result.rows;
  } catch (error) {
    // Handle PostgreSQL-specific errors
    if (error instanceof PostgresError) {
      // Common PostgreSQL error codes
      switch (error.fields.code) {
        case "23505": // unique_violation
          throw new DatabaseError(
            "A record with this value already exists",
            "DUPLICATE_ENTRY",
            error
          );
        case "23503": // foreign_key_violation
          throw new DatabaseError(
            "Referenced record does not exist",
            "FOREIGN_KEY_ERROR",
            error
          );
        case "23502": // not_null_violation
          throw new DatabaseError(
            "Required field is missing",
            "MISSING_REQUIRED_FIELD",
            error
          );
        case "42P01": // undefined_table
          throw new DatabaseError(
            "Table does not exist",
            "TABLE_NOT_FOUND",
            error
          );
        default:
          throw new DatabaseError(
            `Database error: ${error.message}`,
            error.fields.code || "UNKNOWN",
            error
          );
      }
    }
    
    // Handle connection errors
    if (error instanceof Deno.errors.ConnectionRefused) {
      throw new DatabaseError(
        "Could not connect to database",
        "CONNECTION_REFUSED",
        error
      );
    }
    
    // Re-throw unknown errors
    throw error;
  }
}

// Usage with error handling
try {
  const users = await safeQuery<{ id: number; name: string }>(
    client,
    "SELECT id, name FROM users WHERE email = $1",
    ["test@example.com"]
  );
  console.log(users);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error(`Database error (${error.code}): ${error.message}`);
    // Handle specific error codes
    if (error.code === "CONNECTION_REFUSED") {
      // Maybe retry or alert ops team
    }
  }
}
```

### Connection Retry Logic

For production systems, implement retry logic for transient failures:

```typescript
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// Connect with exponential backoff retry
async function connectWithRetry(
  connectionString: string,
  config: RetryConfig = { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30000 }
): Promise<Client> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const client = new Client(connectionString);
      await client.connect();
      console.log(`Connected successfully on attempt ${attempt}`);
      return client;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < config.maxAttempts) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt - 1),
          config.maxDelayMs
        );
        
        console.log(
          `Connection attempt ${attempt} failed. Retrying in ${delay}ms...`
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `Failed to connect after ${config.maxAttempts} attempts: ${lastError?.message}`
  );
}

// Usage
const client = await connectWithRetry(
  "postgresql://user:pass@localhost:5432/mydb"
);
```

## Complete Application Example

Here is a complete example putting all the concepts together in a simple REST API:

```typescript
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Database configuration
const pool = new Pool(
  {
    user: Deno.env.get("DB_USER") || "postgres",
    password: Deno.env.get("DB_PASSWORD") || "secret",
    database: Deno.env.get("DB_NAME") || "myapp",
    hostname: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "5432"),
  },
  10,
  true
);

// User interface
interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

// Repository pattern for User operations
const UserRepository = {
  async findAll(): Promise<User[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<User>(
        "SELECT * FROM users ORDER BY created_at DESC"
      );
      return result.rows;
    } finally {
      client.release();
    }
  },

  async findById(id: number): Promise<User | null> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<User>(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async create(name: string, email: string): Promise<User> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<User>(
        `INSERT INTO users (name, email) VALUES ($1, $2)
         RETURNING *`,
        [name, email]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject(
        "DELETE FROM users WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  },
};

// Simple HTTP server using Deno's built-in server
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /users
    if (method === "GET" && path === "/users") {
      const users = await UserRepository.findAll();
      return new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /users
    if (method === "POST" && path === "/users") {
      const body = await request.json();
      const user = await UserRepository.create(body.name, body.email);
      return new Response(JSON.stringify(user), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Request error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Start server
console.log("Server running on http://localhost:8000");
Deno.serve({ port: 8000 }, handleRequest);
```

## Best Practices Summary

Following these best practices will help you build reliable and performant Deno applications with PostgreSQL:

1. **Always use parameterized queries** to prevent SQL injection attacks. Never concatenate user input into SQL strings.

2. **Use connection pooling** in production to reuse connections efficiently and prevent connection exhaustion.

3. **Always release connections** back to the pool. Use try/finally blocks to ensure connections are released even when errors occur.

4. **Wrap related operations in transactions** to maintain data integrity. Use savepoints for complex operations that need partial rollback capability.

5. **Handle errors gracefully** by catching PostgresError and checking error codes to provide meaningful error messages to users.

6. **Implement retry logic** for transient connection failures with exponential backoff to handle temporary network issues.

7. **Use environment variables** for database credentials. Never commit sensitive information to version control.

8. **Pin dependency versions** in your imports to ensure reproducible builds and avoid unexpected breaking changes.

9. **Run migrations in transactions** so that failed migrations can be rolled back cleanly without leaving the database in an inconsistent state.

10. **Use TypeScript interfaces** to define the shape of your data for better type safety and code completion.

## Conclusion

Connecting Deno to PostgreSQL is straightforward with the deno-postgres driver. This guide covered the essentials from basic connections to advanced patterns like connection pooling, transactions, and migrations. By following the patterns and best practices outlined here, you can build robust, production-ready applications.

The combination of Deno's security model, native TypeScript support, and PostgreSQL's reliability makes for an excellent stack for modern backend development. Start with simple queries, add connection pooling for production, and implement proper error handling and migrations as your application grows.

Remember to always use parameterized queries, manage your connections properly with pools, and handle errors gracefully. With these fundamentals in place, you are well-equipped to build scalable and maintainable Deno applications backed by PostgreSQL.
