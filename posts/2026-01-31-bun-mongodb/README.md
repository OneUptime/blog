# How to Use MongoDB with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, MongoDB, Database, NoSQL

Description: A comprehensive guide to integrating MongoDB with Bun runtime, covering connections, CRUD operations, aggregations, transactions, and production best practices.

---

Bun has emerged as one of the fastest JavaScript runtimes available today, offering exceptional performance for server-side applications. When paired with MongoDB, a flexible NoSQL database, you get a powerful combination for building modern applications. This guide walks you through everything you need to know about using MongoDB with Bun, from basic setup to advanced patterns.

## Why Use MongoDB with Bun?

MongoDB's document-based model pairs naturally with JavaScript applications. Documents are stored in BSON format, which maps directly to JavaScript objects. Combined with Bun's speed advantages over Node.js, you get a backend stack that is both developer-friendly and performant.

Key benefits include:
- Native JSON-like document storage
- Flexible schema design for evolving applications
- Horizontal scaling through sharding
- Rich query language and aggregation framework
- Bun's fast startup time and efficient memory usage

## Setting Up Your Project

First, create a new Bun project and install the MongoDB driver. Bun has excellent compatibility with npm packages, so the official MongoDB Node.js driver works seamlessly.

Initialize your project and install dependencies:

```bash
mkdir bun-mongodb-app
cd bun-mongodb-app
bun init -y
bun add mongodb
```

Create a TypeScript configuration for type safety:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## Connecting to MongoDB

The MongoClient class handles connections to your MongoDB server. Always store connection strings in environment variables for security.

Create a database connection module that exports a reusable client:

```typescript
// src/database.ts
import { MongoClient, Db } from "mongodb";

// Connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DATABASE_NAME = process.env.DATABASE_NAME || "myapp";

// Create a single MongoClient instance for connection pooling
const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
});

let db: Db | null = null;

// Connect to the database with error handling
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log(`Connected to MongoDB database: ${DATABASE_NAME}`);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Gracefully close the connection
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    db = null;
    console.log("MongoDB connection closed");
  }
}

// Get the database instance (throws if not connected)
export function getDatabase(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db;
}

// Export the client for advanced operations like transactions
export { client };
```

## Defining TypeScript Interfaces

Type definitions ensure your documents have a consistent structure and enable IDE autocompletion.

Define interfaces for your document schemas:

```typescript
// src/models/user.ts
import { ObjectId } from "mongodb";

// User document interface
export interface User {
  _id?: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating users (without auto-generated fields)
export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  roles?: string[];
}

// Input type for updating users (all fields optional)
export interface UpdateUserInput {
  email?: string;
  username?: string;
  profile?: Partial<User["profile"]>;
  roles?: string[];
  isActive?: boolean;
}
```

## CRUD Operations

CRUD operations form the foundation of any database interaction. The MongoDB driver provides intuitive methods for creating, reading, updating, and deleting documents.

### Creating Documents

Insert single documents with insertOne or multiple documents with insertMany:

```typescript
// src/services/userService.ts
import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../database";
import { User, CreateUserInput, UpdateUserInput } from "../models/user";

// Get the users collection with type safety
function getUsersCollection(): Collection<User> {
  return getDatabase().collection<User>("users");
}

// Create a single user
export async function createUser(input: CreateUserInput): Promise<User> {
  const collection = getUsersCollection();
  
  const now = new Date();
  const user: User = {
    ...input,
    roles: input.roles || ["user"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(user);
  
  return {
    ...user,
    _id: result.insertedId,
  };
}

// Create multiple users at once
export async function createManyUsers(inputs: CreateUserInput[]): Promise<ObjectId[]> {
  const collection = getUsersCollection();
  
  const now = new Date();
  const users: User[] = inputs.map((input) => ({
    ...input,
    roles: input.roles || ["user"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  const result = await collection.insertMany(users);
  
  return Object.values(result.insertedIds);
}
```

### Reading Documents

Query documents using find for multiple results or findOne for a single document:

```typescript
// Find a user by ID
export async function findUserById(id: string): Promise<User | null> {
  const collection = getUsersCollection();
  
  return collection.findOne({ _id: new ObjectId(id) });
}

// Find a user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = getUsersCollection();
  
  return collection.findOne({ email: email.toLowerCase() });
}

// Find all active users with pagination
export async function findActiveUsers(
  page: number = 1,
  limit: number = 10
): Promise<{ users: User[]; total: number }> {
  const collection = getUsersCollection();
  
  const skip = (page - 1) * limit;
  
  // Run count and find in parallel for efficiency
  const [users, total] = await Promise.all([
    collection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments({ isActive: true }),
  ]);

  return { users, total };
}

// Find users with specific roles
export async function findUsersByRole(role: string): Promise<User[]> {
  const collection = getUsersCollection();
  
  // The $in operator is not needed for single values in arrays
  return collection.find({ roles: role }).toArray();
}
```

### Updating Documents

Update operations modify existing documents. Use updateOne for single documents and updateMany for bulk updates:

```typescript
// Update a user by ID
export async function updateUser(
  id: string,
  updates: UpdateUserInput
): Promise<User | null> {
  const collection = getUsersCollection();
  
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

// Add a role to a user
export async function addUserRole(id: string, role: string): Promise<boolean> {
  const collection = getUsersCollection();
  
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: { roles: role },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

// Deactivate all users who have not logged in for 90 days
export async function deactivateInactiveUsers(
  lastLoginBefore: Date
): Promise<number> {
  const collection = getUsersCollection();
  
  const result = await collection.updateMany(
    {
      isActive: true,
      lastLoginAt: { $lt: lastLoginBefore },
    },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}
```

### Deleting Documents

Remove documents with deleteOne or deleteMany. Consider soft deletes for production applications:

```typescript
// Hard delete a user by ID
export async function deleteUser(id: string): Promise<boolean> {
  const collection = getUsersCollection();
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  
  return result.deletedCount > 0;
}

// Soft delete - mark as inactive instead of removing
export async function softDeleteUser(id: string): Promise<boolean> {
  const collection = getUsersCollection();
  
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

// Delete multiple users by IDs
export async function deleteUsersByIds(ids: string[]): Promise<number> {
  const collection = getUsersCollection();
  
  const objectIds = ids.map((id) => new ObjectId(id));
  const result = await collection.deleteMany({ _id: { $in: objectIds } });
  
  return result.deletedCount;
}
```

## Advanced Queries

MongoDB provides powerful query operators for complex filtering and pattern matching.

Use query operators for sophisticated document retrieval:

```typescript
// Find users matching multiple criteria
export async function searchUsers(criteria: {
  searchTerm?: string;
  roles?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}): Promise<User[]> {
  const collection = getUsersCollection();
  
  // Build query dynamically based on provided criteria
  const query: any = { isActive: true };

  if (criteria.searchTerm) {
    // Search in email or username using regex
    query.$or = [
      { email: { $regex: criteria.searchTerm, $options: "i" } },
      { username: { $regex: criteria.searchTerm, $options: "i" } },
      { "profile.firstName": { $regex: criteria.searchTerm, $options: "i" } },
      { "profile.lastName": { $regex: criteria.searchTerm, $options: "i" } },
    ];
  }

  if (criteria.roles && criteria.roles.length > 0) {
    // User must have at least one of the specified roles
    query.roles = { $in: criteria.roles };
  }

  if (criteria.createdAfter || criteria.createdBefore) {
    query.createdAt = {};
    if (criteria.createdAfter) {
      query.createdAt.$gte = criteria.createdAfter;
    }
    if (criteria.createdBefore) {
      query.createdAt.$lte = criteria.createdBefore;
    }
  }

  return collection.find(query).sort({ createdAt: -1 }).toArray();
}

// Find users with array element matching
export async function findUsersWithAllRoles(roles: string[]): Promise<User[]> {
  const collection = getUsersCollection();
  
  // $all ensures user has ALL specified roles
  return collection.find({ roles: { $all: roles } }).toArray();
}
```

## Aggregation Pipelines

Aggregations enable complex data transformations and analytics directly in the database.

Build aggregation pipelines for reports and analytics:

```typescript
// Get user statistics grouped by role
export async function getUserStatsByRole(): Promise<
  Array<{ role: string; count: number; activeCount: number }>
> {
  const collection = getUsersCollection();
  
  const pipeline = [
    // Unwind the roles array to create a document per role
    { $unwind: "$roles" },
    // Group by role and calculate statistics
    {
      $group: {
        _id: "$roles",
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ["$isActive", 1, 0] },
        },
      },
    },
    // Rename _id to role for clarity
    {
      $project: {
        _id: 0,
        role: "$_id",
        count: 1,
        activeCount: 1,
      },
    },
    // Sort by count descending
    { $sort: { count: -1 } },
  ];

  return collection.aggregate(pipeline).toArray() as Promise<
    Array<{ role: string; count: number; activeCount: number }>
  >;
}

// Get monthly user registration statistics
export async function getMonthlyRegistrations(
  year: number
): Promise<Array<{ month: number; count: number }>> {
  const collection = getUsersCollection();
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const pipeline = [
    // Filter by year
    {
      $match: {
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    // Group by month
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    // Format output
    {
      $project: {
        _id: 0,
        month: "$_id",
        count: 1,
      },
    },
    // Sort by month
    { $sort: { month: 1 } },
  ];

  return collection.aggregate(pipeline).toArray() as Promise<
    Array<{ month: number; count: number }>
  >;
}

// Get users with their order counts (cross-collection aggregation)
export async function getUsersWithOrderStats(): Promise<
  Array<User & { orderCount: number; totalSpent: number }>
> {
  const collection = getUsersCollection();
  
  const pipeline = [
    // Only active users
    { $match: { isActive: true } },
    // Join with orders collection
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "userId",
        as: "orders",
      },
    },
    // Add computed fields
    {
      $addFields: {
        orderCount: { $size: "$orders" },
        totalSpent: { $sum: "$orders.total" },
      },
    },
    // Remove the orders array from output
    { $project: { orders: 0 } },
    // Sort by total spent descending
    { $sort: { totalSpent: -1 } },
    // Limit to top 100
    { $limit: 100 },
  ];

  return collection.aggregate(pipeline).toArray() as Promise<
    Array<User & { orderCount: number; totalSpent: number }>
  >;
}
```

## Creating Indexes

Indexes dramatically improve query performance. Create indexes on fields you frequently query or sort by.

Set up indexes when your application starts:

```typescript
// src/database/indexes.ts
import { getDatabase } from "../database";

export async function createIndexes(): Promise<void> {
  const db = getDatabase();
  
  // Users collection indexes
  const usersCollection = db.collection("users");
  
  // Unique index on email for fast lookups and uniqueness constraint
  await usersCollection.createIndex(
    { email: 1 },
    { unique: true, name: "email_unique" }
  );
  
  // Unique index on username
  await usersCollection.createIndex(
    { username: 1 },
    { unique: true, name: "username_unique" }
  );
  
  // Compound index for common query patterns
  await usersCollection.createIndex(
    { isActive: 1, createdAt: -1 },
    { name: "active_users_by_date" }
  );
  
  // Text index for search functionality
  await usersCollection.createIndex(
    {
      email: "text",
      username: "text",
      "profile.firstName": "text",
      "profile.lastName": "text",
    },
    { name: "user_text_search" }
  );
  
  // Index on roles array for role-based queries
  await usersCollection.createIndex(
    { roles: 1 },
    { name: "user_roles" }
  );

  // Orders collection indexes
  const ordersCollection = db.collection("orders");
  
  await ordersCollection.createIndex(
    { userId: 1, createdAt: -1 },
    { name: "user_orders_by_date" }
  );
  
  await ordersCollection.createIndex(
    { status: 1 },
    { name: "order_status" }
  );

  console.log("Database indexes created successfully");
}
```

## Schema Validation

MongoDB schema validation enforces document structure at the database level, preventing invalid data from being inserted.

Apply schema validation rules to collections:

```typescript
// src/database/schemas.ts
import { getDatabase } from "../database";

export async function applySchemaValidation(): Promise<void> {
  const db = getDatabase();
  
  // User collection schema validation
  const userSchema = {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "passwordHash", "profile", "isActive", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address",
        },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 30,
          pattern: "^[a-zA-Z0-9_]+$",
          description: "Username must be 3-30 alphanumeric characters or underscores",
        },
        passwordHash: {
          bsonType: "string",
          minLength: 60,
          description: "Must be a valid password hash",
        },
        profile: {
          bsonType: "object",
          required: ["firstName", "lastName"],
          properties: {
            firstName: {
              bsonType: "string",
              minLength: 1,
              maxLength: 50,
            },
            lastName: {
              bsonType: "string",
              minLength: 1,
              maxLength: 50,
            },
            avatarUrl: {
              bsonType: "string",
            },
          },
        },
        roles: {
          bsonType: "array",
          items: {
            bsonType: "string",
            enum: ["user", "admin", "moderator", "editor"],
          },
        },
        isActive: {
          bsonType: "bool",
        },
        createdAt: {
          bsonType: "date",
        },
        updatedAt: {
          bsonType: "date",
        },
      },
    },
  };

  // Apply validation to users collection
  try {
    await db.command({
      collMod: "users",
      validator: userSchema,
      validationLevel: "strict",
      validationAction: "error",
    });
  } catch (error: any) {
    // Collection might not exist yet, create it with validation
    if (error.code === 26) {
      await db.createCollection("users", {
        validator: userSchema,
        validationLevel: "strict",
        validationAction: "error",
      });
    } else {
      throw error;
    }
  }

  console.log("Schema validation applied successfully");
}
```

## Transactions

Transactions ensure multiple operations succeed or fail together, maintaining data consistency across collections.

Implement transactions for operations that must be atomic:

```typescript
// src/services/orderService.ts
import { ClientSession, ObjectId } from "mongodb";
import { client, getDatabase } from "../database";

interface OrderItem {
  productId: ObjectId;
  quantity: number;
  price: number;
}

interface Order {
  _id?: ObjectId;
  userId: ObjectId;
  items: OrderItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
}

// Create order with inventory update in a transaction
export async function createOrderWithTransaction(
  userId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<Order> {
  // Start a session for the transaction
  const session: ClientSession = client.startSession();
  
  try {
    let order: Order | null = null;
    
    // Execute operations within a transaction
    await session.withTransaction(async () => {
      const db = getDatabase();
      const productsCollection = db.collection("products");
      const ordersCollection = db.collection<Order>("orders");
      const inventoryCollection = db.collection("inventory");
      
      // Fetch product details and validate availability
      const productIds = items.map((item) => new ObjectId(item.productId));
      const products = await productsCollection
        .find({ _id: { $in: productIds } }, { session })
        .toArray();
      
      if (products.length !== items.length) {
        throw new Error("One or more products not found");
      }
      
      // Check and update inventory for each item
      for (const item of items) {
        const result = await inventoryCollection.updateOne(
          {
            productId: new ObjectId(item.productId),
            quantity: { $gte: item.quantity },
          },
          {
            $inc: { quantity: -item.quantity },
          },
          { session }
        );
        
        if (result.modifiedCount === 0) {
          throw new Error(`Insufficient inventory for product ${item.productId}`);
        }
      }
      
      // Calculate order total
      const orderItems: OrderItem[] = items.map((item) => {
        const product = products.find(
          (p) => p._id.toString() === item.productId
        );
        return {
          productId: new ObjectId(item.productId),
          quantity: item.quantity,
          price: product!.price,
        };
      });
      
      const total = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      // Create the order
      order = {
        userId: new ObjectId(userId),
        items: orderItems,
        total,
        status: "pending",
        createdAt: new Date(),
      };
      
      const result = await ordersCollection.insertOne(order, { session });
      order._id = result.insertedId;
    });
    
    if (!order) {
      throw new Error("Order creation failed");
    }
    
    return order;
  } finally {
    // Always end the session
    await session.endSession();
  }
}

// Cancel order and restore inventory in a transaction
export async function cancelOrder(orderId: string): Promise<boolean> {
  const session = client.startSession();
  
  try {
    let success = false;
    
    await session.withTransaction(async () => {
      const db = getDatabase();
      const ordersCollection = db.collection<Order>("orders");
      const inventoryCollection = db.collection("inventory");
      
      // Find the order
      const order = await ordersCollection.findOne(
        { _id: new ObjectId(orderId), status: "pending" },
        { session }
      );
      
      if (!order) {
        throw new Error("Order not found or cannot be cancelled");
      }
      
      // Restore inventory for each item
      for (const item of order.items) {
        await inventoryCollection.updateOne(
          { productId: item.productId },
          { $inc: { quantity: item.quantity } },
          { session }
        );
      }
      
      // Update order status
      await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: "cancelled", cancelledAt: new Date() } },
        { session }
      );
      
      success = true;
    });
    
    return success;
  } finally {
    await session.endSession();
  }
}
```

## Error Handling

Robust error handling prevents application crashes and provides meaningful feedback to users.

Create custom error classes and handle MongoDB errors gracefully:

```typescript
// src/errors/databaseError.ts

// Custom error for database operations
export class DatabaseError extends Error {
  public code: string;
  public isRetryable: boolean;
  
  constructor(message: string, code: string, isRetryable: boolean = false) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

// Error codes for common MongoDB errors
export const MongoErrorCodes = {
  DUPLICATE_KEY: 11000,
  DOCUMENT_VALIDATION_FAILURE: 121,
  NETWORK_TIMEOUT: "ETIMEDOUT",
  CONNECTION_REFUSED: "ECONNREFUSED",
} as const;

// Handle MongoDB errors and convert to application errors
export function handleMongoError(error: any): never {
  // Duplicate key error
  if (error.code === MongoErrorCodes.DUPLICATE_KEY) {
    const field = extractDuplicateKeyField(error);
    throw new DatabaseError(
      `A record with this ${field} already exists`,
      "DUPLICATE_KEY",
      false
    );
  }
  
  // Validation error
  if (error.code === MongoErrorCodes.DOCUMENT_VALIDATION_FAILURE) {
    throw new DatabaseError(
      "Document validation failed: " + error.errInfo?.details?.schemaRulesNotSatisfied?.[0]?.description || "Invalid document",
      "VALIDATION_FAILED",
      false
    );
  }
  
  // Network errors (retryable)
  if (error.code === MongoErrorCodes.NETWORK_TIMEOUT || 
      error.code === MongoErrorCodes.CONNECTION_REFUSED) {
    throw new DatabaseError(
      "Database connection failed. Please try again.",
      "CONNECTION_ERROR",
      true
    );
  }
  
  // Write conflict in transaction
  if (error.hasErrorLabel?.("TransientTransactionError")) {
    throw new DatabaseError(
      "Transaction conflict. Please retry the operation.",
      "TRANSACTION_CONFLICT",
      true
    );
  }
  
  // Unknown error
  throw new DatabaseError(
    "An unexpected database error occurred",
    "UNKNOWN",
    false
  );
}

// Extract the field name from duplicate key error
function extractDuplicateKeyField(error: any): string {
  const keyPattern = error.keyPattern;
  if (keyPattern) {
    return Object.keys(keyPattern)[0];
  }
  return "value";
}

// Retry wrapper for retryable operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry if error is retryable
      if (error instanceof DatabaseError && !error.isRetryable) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }
  
  throw lastError;
}
```

## Connection Pooling Best Practices

Connection pooling improves performance by reusing database connections instead of creating new ones for each operation.

Configure and monitor your connection pool:

```typescript
// src/database/pool.ts
import { MongoClient, MongoClientOptions } from "mongodb";

// Production-ready connection pool configuration
export function createPooledClient(uri: string): MongoClient {
  const options: MongoClientOptions = {
    // Pool size settings
    maxPoolSize: 50,              // Maximum connections in the pool
    minPoolSize: 5,               // Minimum connections maintained
    maxIdleTimeMS: 60000,         // Close idle connections after 60 seconds
    
    // Connection settings
    connectTimeoutMS: 10000,      // Timeout for initial connection
    socketTimeoutMS: 45000,       // Timeout for socket operations
    serverSelectionTimeoutMS: 30000,  // Timeout for server selection
    
    // Write concern for durability
    w: "majority",
    wtimeoutMS: 10000,
    
    // Read preference for replica sets
    readPreference: "primaryPreferred",
    
    // Compression for network efficiency
    compressors: ["zstd", "snappy", "zlib"],
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
  };
  
  const client = new MongoClient(uri, options);
  
  // Monitor connection pool events
  client.on("connectionPoolCreated", (event) => {
    console.log(`Connection pool created for ${event.address}`);
  });
  
  client.on("connectionPoolClosed", (event) => {
    console.log(`Connection pool closed for ${event.address}`);
  });
  
  client.on("connectionCreated", (event) => {
    console.log(`New connection created: ${event.connectionId}`);
  });
  
  client.on("connectionClosed", (event) => {
    console.log(`Connection closed: ${event.connectionId}, reason: ${event.reason}`);
  });
  
  // Optional: Monitor slow queries
  client.on("commandSucceeded", (event) => {
    if (event.duration > 100) {
      console.warn(`Slow query detected: ${event.commandName} took ${event.duration}ms`);
    }
  });
  
  return client;
}

// Health check function for monitoring
export async function checkDatabaseHealth(client: MongoClient): Promise<{
  status: "healthy" | "unhealthy";
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await client.db().admin().ping();
    const latencyMs = Date.now() - startTime;
    
    return {
      status: "healthy",
      latencyMs,
    };
  } catch (error: any) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }
}
```

## Putting It All Together

Create a main application file that initializes the database and demonstrates the functionality:

```typescript
// src/index.ts
import { connectToDatabase, closeConnection } from "./database";
import { createIndexes } from "./database/indexes";
import { applySchemaValidation } from "./database/schemas";
import {
  createUser,
  findUserById,
  findActiveUsers,
  updateUser,
  searchUsers,
  getUserStatsByRole,
} from "./services/userService";
import { withRetry, handleMongoError } from "./errors/databaseError";

async function main() {
  try {
    // Initialize database connection
    await connectToDatabase();
    console.log("Database connected successfully");
    
    // Set up indexes and validation (run once on startup)
    await createIndexes();
    await applySchemaValidation();
    
    // Example: Create a user with retry logic
    const newUser = await withRetry(async () => {
      return createUser({
        email: "john.doe@example.com",
        username: "johndoe",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ",
        profile: {
          firstName: "John",
          lastName: "Doe",
        },
        roles: ["user"],
      });
    });
    console.log("Created user:", newUser._id?.toString());
    
    // Example: Find and update user
    const user = await findUserById(newUser._id!.toString());
    if (user) {
      await updateUser(user._id!.toString(), {
        profile: { firstName: "Jonathan", lastName: "Doe" },
      });
      console.log("Updated user profile");
    }
    
    // Example: Get paginated users
    const { users, total } = await findActiveUsers(1, 10);
    console.log(`Found ${total} active users, showing first ${users.length}`);
    
    // Example: Search users
    const searchResults = await searchUsers({
      searchTerm: "john",
      roles: ["user", "admin"],
    });
    console.log(`Search found ${searchResults.length} users`);
    
    // Example: Get aggregated statistics
    const stats = await getUserStatsByRole();
    console.log("User statistics by role:", stats);
    
  } catch (error: any) {
    handleMongoError(error);
  } finally {
    // Clean up on shutdown
    await closeConnection();
  }
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await closeConnection();
  process.exit(0);
});

// Run the application
main().catch(console.error);
```

## Best Practices Summary

Following these practices will help you build reliable and performant MongoDB applications with Bun:

**Connection Management**
- Use a single MongoClient instance for your entire application
- Configure connection pooling based on your workload
- Always close connections gracefully on application shutdown
- Use environment variables for connection strings

**Query Optimization**
- Create indexes for frequently queried fields
- Use projection to return only needed fields
- Implement pagination for large result sets
- Use aggregation pipelines for complex data transformations

**Data Integrity**
- Define TypeScript interfaces for all document types
- Apply schema validation at the database level
- Use transactions for operations that must be atomic
- Implement soft deletes instead of hard deletes when appropriate

**Error Handling**
- Create custom error classes for database errors
- Implement retry logic for transient failures
- Log slow queries and monitor performance
- Handle duplicate key errors gracefully

**Security**
- Never expose connection strings in code
- Use parameterized queries to prevent injection
- Implement proper authentication and authorization
- Encrypt sensitive fields when necessary

## Conclusion

MongoDB and Bun form an excellent combination for building modern JavaScript and TypeScript applications. The MongoDB driver's full compatibility with Bun means you can leverage all of MongoDB's features while benefiting from Bun's impressive performance.

Start with a solid foundation: proper connection management, type-safe document models, and comprehensive indexes. Build upon that with transactions for data consistency, aggregation pipelines for analytics, and robust error handling for production reliability.

The code examples in this guide provide a template for common patterns you will encounter in real applications. Adapt them to your specific needs, and remember that MongoDB's flexibility is both a strength and a responsibility. Use schema validation to enforce data integrity, and let TypeScript catch errors at compile time rather than runtime.

With these patterns in place, you are well-equipped to build scalable, maintainable applications that take full advantage of what both MongoDB and Bun have to offer.
