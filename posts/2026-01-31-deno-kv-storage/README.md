# How to Use Deno KV for Built-in Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, KV, Storage, Database

Description: A comprehensive guide to using Deno KV for built-in key-value storage with atomic operations, queues, and more.

---

Deno KV is a built-in key-value database that ships with Deno runtime, providing a zero-configuration storage solution for your applications. Unlike traditional databases that require separate installation, configuration, and connection management, Deno KV is ready to use out of the box. This makes it an excellent choice for serverless applications, edge computing, and rapid prototyping.

In this comprehensive guide, we will explore everything you need to know about Deno KV, from basic operations to advanced features like atomic transactions, queues, and secondary indexes.

## Why Choose Deno KV?

Before diving into the technical details, let us understand why Deno KV stands out:

- **Zero Configuration**: No need to install or configure external databases
- **ACID Transactions**: Full support for atomic operations ensuring data consistency
- **Global Replication**: When deployed to Deno Deploy, your data is replicated globally
- **Strong Consistency**: Guaranteed read-after-write consistency
- **Built-in Queues**: Native support for background job processing
- **Watch API**: Real-time notifications when data changes

## Getting Started with Deno KV

Opening a Deno KV database is straightforward. You can use the default database or specify a custom path for local development.

The following code demonstrates how to open a KV database:

```typescript
// Open the default KV database
const kv = await Deno.openKv();

// Or open a specific database file for local development
const localKv = await Deno.openKv("./my-database.sqlite");

// Always close the database when done
kv.close();
```

When running locally, Deno KV uses SQLite as its storage backend. In production on Deno Deploy, it uses a distributed, globally replicated database.

## Understanding Keys in Deno KV

Keys in Deno KV are arrays of key parts, which can be strings, numbers, booleans, Uint8Arrays, or bigints. This hierarchical key structure enables powerful querying capabilities.

Here is how keys work in practice:

```typescript
const kv = await Deno.openKv();

// Keys are arrays that create hierarchical namespaces
const userKey = ["users", "user_123"];
const orderKey = ["orders", 2024, "order_456"];
const settingsKey = ["settings", "theme", "dark"];

// Keys are ordered lexicographically within their namespace
// This enables range queries and efficient iteration
```

## Basic Key-Value Operations

Deno KV provides simple methods for storing, retrieving, and deleting data. Let us explore each operation.

### Setting Values

The `set` method stores a value at a given key:

```typescript
const kv = await Deno.openKv();

// Store a simple string value
await kv.set(["greetings", "hello"], "Hello, World!");

// Store a complex object - Deno KV handles serialization automatically
await kv.set(["users", "user_123"], {
  id: "user_123",
  name: "Alice Johnson",
  email: "alice@example.com",
  createdAt: new Date(),
  roles: ["admin", "editor"],
});

// Store with metadata about the operation
const result = await kv.set(["config", "api_key"], "secret_key_here");
console.log("Commit successful:", result.ok);
console.log("Version stamp:", result.versionstamp);
```

### Getting Values

Retrieve values using the `get` method:

```typescript
const kv = await Deno.openKv();

// Get a single value
const entry = await kv.get(["users", "user_123"]);

if (entry.value !== null) {
  console.log("User found:", entry.value);
  console.log("Key:", entry.key);
  console.log("Version:", entry.versionstamp);
} else {
  console.log("User not found");
}

// Get multiple values at once using getMany
const entries = await kv.getMany([
  ["users", "user_123"],
  ["users", "user_456"],
  ["config", "app_name"],
]);

for (const entry of entries) {
  console.log(`${entry.key}: ${entry.value}`);
}
```

### Deleting Values

Remove values with the `delete` method:

```typescript
const kv = await Deno.openKv();

// Delete a single entry
await kv.delete(["users", "user_123"]);

// Verify deletion
const entry = await kv.get(["users", "user_123"]);
console.log("Entry exists:", entry.value !== null); // false
```

## Listing and Iterating Over Data

One of Deno KV's powerful features is the ability to list entries by prefix, enabling efficient range queries.

Here is how to iterate over entries:

```typescript
const kv = await Deno.openKv();

// Seed some data
await kv.set(["products", "electronics", "laptop"], { name: "MacBook Pro", price: 2499 });
await kv.set(["products", "electronics", "phone"], { name: "iPhone 15", price: 999 });
await kv.set(["products", "clothing", "shirt"], { name: "Cotton Shirt", price: 29 });
await kv.set(["products", "clothing", "pants"], { name: "Jeans", price: 79 });

// List all products
console.log("All products:");
for await (const entry of kv.list({ prefix: ["products"] })) {
  console.log(`  ${entry.key.join("/")}: ${entry.value.name}`);
}

// List only electronics
console.log("\nElectronics only:");
for await (const entry of kv.list({ prefix: ["products", "electronics"] })) {
  console.log(`  ${entry.value.name}: $${entry.value.price}`);
}

// List with pagination
const pageSize = 10;
const iterator = kv.list({ prefix: ["products"] }, { limit: pageSize });
const results = [];
for await (const entry of iterator) {
  results.push(entry);
}

// Use cursor for next page
if (iterator.cursor) {
  const nextPage = kv.list(
    { prefix: ["products"] },
    { limit: pageSize, cursor: iterator.cursor }
  );
}
```

## Atomic Operations and Transactions

Deno KV provides atomic operations that guarantee multiple operations execute as a single unit. This is crucial for maintaining data consistency.

### Basic Atomic Operations

Here is a simple example of atomic transactions:

```typescript
const kv = await Deno.openKv();

// Perform multiple operations atomically
const result = await kv.atomic()
  .set(["users", "user_789"], { name: "Bob Smith", email: "bob@example.com" })
  .set(["emails", "bob@example.com"], "user_789")
  .set(["stats", "user_count"], 100)
  .commit();

if (result.ok) {
  console.log("All operations committed successfully");
} else {
  console.log("Transaction failed");
}
```

### Optimistic Concurrency with Version Checks

Deno KV supports optimistic locking using version stamps to prevent race conditions:

```typescript
const kv = await Deno.openKv();

// Function to safely increment a counter
async function incrementCounter(key: Deno.KvKey): Promise<number> {
  // Retry loop for handling conflicts
  while (true) {
    // Get current value and version
    const entry = await kv.get<number>(key);
    const currentValue = entry.value ?? 0;
    const newValue = currentValue + 1;

    // Attempt atomic update with version check
    const result = await kv.atomic()
      .check(entry) // Verify version has not changed
      .set(key, newValue)
      .commit();

    if (result.ok) {
      return newValue;
    }
    // If failed, another process modified the value - retry
    console.log("Conflict detected, retrying...");
  }
}

// Usage
const newCount = await incrementCounter(["counters", "page_views"]);
console.log("New page view count:", newCount);
```

### Complex Transactions with Multiple Checks

Here is a more complex example simulating a bank transfer:

```typescript
const kv = await Deno.openKv();

interface Account {
  id: string;
  balance: number;
  lastModified: Date;
}

async function transferFunds(
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<boolean> {
  while (true) {
    // Read both accounts
    const fromEntry = await kv.get<Account>(["accounts", fromAccountId]);
    const toEntry = await kv.get<Account>(["accounts", toAccountId]);

    if (!fromEntry.value || !toEntry.value) {
      throw new Error("One or both accounts not found");
    }

    if (fromEntry.value.balance < amount) {
      throw new Error("Insufficient funds");
    }

    // Calculate new balances
    const updatedFrom: Account = {
      ...fromEntry.value,
      balance: fromEntry.value.balance - amount,
      lastModified: new Date(),
    };

    const updatedTo: Account = {
      ...toEntry.value,
      balance: toEntry.value.balance + amount,
      lastModified: new Date(),
    };

    // Atomic transaction with version checks on both accounts
    const result = await kv.atomic()
      .check(fromEntry)
      .check(toEntry)
      .set(["accounts", fromAccountId], updatedFrom)
      .set(["accounts", toAccountId], updatedTo)
      .set(["transactions", crypto.randomUUID()], {
        from: fromAccountId,
        to: toAccountId,
        amount,
        timestamp: new Date(),
      })
      .commit();

    if (result.ok) {
      return true;
    }
    // Retry on conflict
  }
}
```

## Secondary Indexes

Deno KV does not support queries by arbitrary fields, but you can implement secondary indexes to enable lookups by different attributes.

Here is how to implement secondary indexes:

```typescript
const kv = await Deno.openKv();

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

// Create a user with secondary indexes
async function createUser(user: User): Promise<void> {
  const result = await kv.atomic()
    // Primary storage by ID
    .set(["users", user.id], user)
    // Secondary index by email
    .set(["users_by_email", user.email], user.id)
    // Secondary index by username
    .set(["users_by_username", user.username], user.id)
    .commit();

  if (!result.ok) {
    throw new Error("Failed to create user");
  }
}

// Lookup user by email using secondary index
async function getUserByEmail(email: string): Promise<User | null> {
  // First, get the user ID from the email index
  const idEntry = await kv.get<string>(["users_by_email", email]);
  if (!idEntry.value) {
    return null;
  }

  // Then fetch the actual user data
  const userEntry = await kv.get<User>(["users", idEntry.value]);
  return userEntry.value;
}

// Update user email with index maintenance
async function updateUserEmail(userId: string, newEmail: string): Promise<void> {
  while (true) {
    const userEntry = await kv.get<User>(["users", userId]);
    if (!userEntry.value) {
      throw new Error("User not found");
    }

    const oldEmail = userEntry.value.email;
    const updatedUser = { ...userEntry.value, email: newEmail };

    const result = await kv.atomic()
      .check(userEntry)
      // Delete old email index
      .delete(["users_by_email", oldEmail])
      // Create new email index
      .set(["users_by_email", newEmail], userId)
      // Update user record
      .set(["users", userId], updatedUser)
      .commit();

    if (result.ok) {
      return;
    }
  }
}
```

## Key Expiration (TTL)

Deno KV supports automatic expiration of keys, which is useful for caching, sessions, and temporary data.

Here is how to use key expiration:

```typescript
const kv = await Deno.openKv();

// Set a key that expires in 1 hour (3600000 milliseconds)
await kv.set(
  ["sessions", "session_abc123"],
  {
    userId: "user_123",
    createdAt: new Date(),
    data: { theme: "dark" },
  },
  { expireIn: 3600000 }
);

// Set a cache entry that expires in 5 minutes
await kv.set(
  ["cache", "api_response", "endpoint_xyz"],
  { data: "cached response data", fetchedAt: new Date() },
  { expireIn: 300000 }
);

// The entry will automatically be deleted after expiration
// Subsequent reads will return null
setTimeout(async () => {
  const entry = await kv.get(["cache", "api_response", "endpoint_xyz"]);
  console.log("Cache hit:", entry.value !== null);
}, 310000);
```

## Queues for Background Processing

Deno KV includes a built-in queue system for processing background jobs. This is perfect for tasks like sending emails, processing images, or handling webhooks.

Here is how to use queues:

```typescript
const kv = await Deno.openKv();

// Define message types
interface EmailJob {
  type: "email";
  to: string;
  subject: string;
  body: string;
}

interface NotificationJob {
  type: "notification";
  userId: string;
  message: string;
}

type Job = EmailJob | NotificationJob;

// Enqueue a job
await kv.enqueue(
  {
    type: "email",
    to: "user@example.com",
    subject: "Welcome!",
    body: "Thanks for signing up!",
  } as EmailJob,
  {
    delay: 0, // Process immediately
    keysIfUndelivered: [["failed_jobs", crypto.randomUUID()]],
  }
);

// Enqueue a delayed job (process in 5 minutes)
await kv.enqueue(
  {
    type: "notification",
    userId: "user_123",
    message: "Your report is ready!",
  } as NotificationJob,
  { delay: 300000 }
);

// Listen for and process jobs
kv.listenQueue(async (job: Job) => {
  switch (job.type) {
    case "email":
      console.log(`Sending email to ${job.to}: ${job.subject}`);
      // Implement actual email sending logic here
      break;

    case "notification":
      console.log(`Notifying user ${job.userId}: ${job.message}`);
      // Implement actual notification logic here
      break;
  }
});
```

## Watching for Changes

The watch API allows you to receive real-time notifications when specific keys change. This is useful for building reactive applications.

Here is how to watch for changes:

```typescript
const kv = await Deno.openKv();

// Watch multiple keys for changes
const stream = kv.watch([
  ["config", "feature_flags"],
  ["users", "user_123"],
]);

// Process changes as they occur
(async () => {
  for await (const entries of stream) {
    for (const entry of entries) {
      if (entry.value !== null) {
        console.log(`Key ${entry.key.join("/")} changed to:`, entry.value);
      } else {
        console.log(`Key ${entry.key.join("/")} was deleted`);
      }
    }
  }
})();

// In another part of your application, updates trigger the watcher
await kv.set(["config", "feature_flags"], { newFeature: true });
```

## Performance Considerations

When working with Deno KV, keep these performance tips in mind:

### Batch Operations

Use `getMany` and atomic operations to reduce round trips:

```typescript
const kv = await Deno.openKv();

// Instead of multiple individual gets
// BAD: Multiple round trips
const user1 = await kv.get(["users", "1"]);
const user2 = await kv.get(["users", "2"]);
const user3 = await kv.get(["users", "3"]);

// GOOD: Single round trip
const [u1, u2, u3] = await kv.getMany([
  ["users", "1"],
  ["users", "2"],
  ["users", "3"],
]);
```

### Key Design

Design your keys for efficient access patterns:

```typescript
const kv = await Deno.openKv();

// Good key design enables efficient queries
// Organize by access pattern

// For time-series data, use timestamps in keys
const timestamp = Date.now();
await kv.set(["logs", "app", timestamp], { level: "info", message: "Server started" });

// Query logs within a time range
const startTime = Date.now() - 3600000; // 1 hour ago
const endTime = Date.now();

for await (const entry of kv.list({
  prefix: ["logs", "app"],
  start: ["logs", "app", startTime],
  end: ["logs", "app", endTime],
})) {
  console.log(entry.value);
}
```

### Connection Management

Reuse database connections within your application:

```typescript
// Create a singleton pattern for KV connection
let kvInstance: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv();
  }
  return kvInstance;
}

// Use throughout your application
const kv = await getKv();
```

## Best Practices Summary

Here are the essential best practices for working with Deno KV effectively:

1. **Use Hierarchical Keys**: Structure your keys with meaningful prefixes to enable efficient range queries and logical data organization.

2. **Implement Secondary Indexes**: When you need to query by multiple fields, create secondary indexes and maintain them atomically with your primary data.

3. **Always Use Atomic Operations**: When updating related data, use atomic transactions with version checks to prevent race conditions and ensure consistency.

4. **Batch Read Operations**: Use `getMany` for multiple reads instead of individual `get` calls to minimize round trips.

5. **Handle Optimistic Locking Conflicts**: Implement retry loops when using version checks, as concurrent modifications can cause conflicts.

6. **Use TTL for Temporary Data**: Set expiration times for sessions, caches, and temporary data to avoid manual cleanup.

7. **Design Keys for Access Patterns**: Consider how you will query your data and design your key structure accordingly.

8. **Leverage Queues for Background Work**: Use built-in queues instead of external job systems for simpler architectures.

9. **Close Connections Properly**: In long-running applications, manage your KV connections carefully and close them when shutting down.

10. **Test with Local SQLite**: During development, use local file-based databases for faster iteration and debugging.

## Conclusion

Deno KV represents a significant step forward in developer experience for building data-driven applications. By providing a built-in, zero-configuration database with powerful features like atomic transactions, queues, and real-time watches, it eliminates much of the complexity traditionally associated with database integration.

Whether you are building a simple prototype, a serverless function, or a full-featured web application, Deno KV offers a compelling storage solution. Its seamless integration with the Deno runtime, combined with global replication on Deno Deploy, makes it particularly attractive for edge computing scenarios where low latency is crucial.

The key to success with Deno KV lies in understanding its strengths and designing your data model accordingly. By following the patterns and practices outlined in this guide, you can build robust, scalable applications that take full advantage of what Deno KV has to offer.

Start experimenting with Deno KV in your next project, and experience the simplicity of having a powerful database available right out of the box. As your needs grow, you will find that Deno KV scales with you, from local development all the way to globally distributed production deployments.
