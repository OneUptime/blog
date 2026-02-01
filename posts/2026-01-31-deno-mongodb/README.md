# How to Use MongoDB with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, MongoDB, Database, NoSQL

Description: A comprehensive guide to integrating MongoDB with Deno, covering CRUD operations, aggregations, transactions, and production best practices.

---

Deno has emerged as a modern, secure runtime for JavaScript and TypeScript, offering native TypeScript support and a permission-based security model. When building backend applications with Deno, MongoDB is often the database of choice due to its flexible document model and excellent TypeScript compatibility. This guide will walk you through everything you need to know to effectively use MongoDB with Deno in production environments.

## Prerequisites

Before getting started, ensure you have the following installed:

- Deno 1.40 or later
- MongoDB 6.0 or later (local installation or MongoDB Atlas)
- Basic understanding of TypeScript and NoSQL databases

## Setting Up the MongoDB Driver

Deno uses URL-based imports, and the official MongoDB driver for Deno is available through deno.land. The driver provides full TypeScript support out of the box.

Create a new file to set up your database connection:

```typescript
// db.ts - Database connection module
import { MongoClient, Database, Collection } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

// Define your document interfaces for type safety
interface User {
  _id?: { $oid: string };
  name: string;
  email: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  _id?: { $oid: string };
  name: string;
  price: number;
  category: string;
  stock: number;
  tags: string[];
}

// MongoDB client instance
let client: MongoClient;
let db: Database;

// Initialize database connection
export async function connectToDatabase(uri: string, dbName: string): Promise<Database> {
  client = new MongoClient();
  
  try {
    await client.connect(uri);
    console.log("Connected to MongoDB successfully");
    db = client.database(dbName);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Get typed collection references
export function getUsersCollection(): Collection<User> {
  return db.collection<User>("users");
}

export function getProductsCollection(): Collection<Product> {
  return db.collection<Product>("products");
}

// Close database connection
export async function closeConnection(): Promise<void> {
  await client.close();
  console.log("MongoDB connection closed");
}
```

## Connecting to MongoDB

The connection process differs slightly depending on whether you are connecting to a local MongoDB instance or MongoDB Atlas.

### Local MongoDB Connection

For local development, connect using the standard MongoDB connection string:

```typescript
// main.ts - Application entry point
import { connectToDatabase, closeConnection } from "./db.ts";

const MONGODB_URI = "mongodb://localhost:27017";
const DATABASE_NAME = "myapp";

async function main() {
  try {
    const db = await connectToDatabase(MONGODB_URI, DATABASE_NAME);
    console.log(`Connected to database: ${DATABASE_NAME}`);
    
    // Your application logic here
    
  } catch (error) {
    console.error("Application error:", error);
  } finally {
    await closeConnection();
  }
}

main();
```

### MongoDB Atlas Connection

When connecting to MongoDB Atlas, use the connection string provided by Atlas with your credentials:

```typescript
// atlas-connection.ts - MongoDB Atlas connection
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

const ATLAS_URI = "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority";

async function connectToAtlas() {
  const client = new MongoClient();
  
  try {
    // Connect with Atlas connection string
    await client.connect(ATLAS_URI);
    
    const db = client.database("production");
    console.log("Connected to MongoDB Atlas");
    
    // Test the connection by listing collections
    const collections = await db.listCollectionNames();
    console.log("Available collections:", collections);
    
    return { client, db };
  } catch (error) {
    console.error("Atlas connection failed:", error);
    throw error;
  }
}
```

## CRUD Operations

MongoDB CRUD operations map naturally to TypeScript methods. Let us explore each operation with practical examples.

### Create Operations

Insert single documents or multiple documents at once:

```typescript
// crud-create.ts - Insert operations
import { getUsersCollection } from "./db.ts";

// Insert a single document
async function createUser(userData: Omit<User, "_id">) {
  const users = getUsersCollection();
  
  const insertedId = await users.insertOne({
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  console.log(`User created with ID: ${insertedId}`);
  return insertedId;
}

// Insert multiple documents in a batch
async function createManyUsers(usersData: Omit<User, "_id">[]) {
  const users = getUsersCollection();
  
  const documentsToInsert = usersData.map(user => ({
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  const result = await users.insertMany(documentsToInsert);
  console.log(`Inserted ${result.insertedCount} users`);
  return result.insertedIds;
}

// Example usage
await createUser({
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
});

await createManyUsers([
  { name: "Alice", email: "alice@example.com", age: 25, createdAt: new Date(), updatedAt: new Date() },
  { name: "Bob", email: "bob@example.com", age: 35, createdAt: new Date(), updatedAt: new Date() },
]);
```

### Read Operations

Query documents using filters, projections, and sorting:

```typescript
// crud-read.ts - Query operations
import { getUsersCollection, getProductsCollection } from "./db.ts";

// Find a single document by criteria
async function findUserByEmail(email: string) {
  const users = getUsersCollection();
  
  const user = await users.findOne({ email });
  
  if (!user) {
    console.log("User not found");
    return null;
  }
  
  return user;
}

// Find multiple documents with filters
async function findUsersByAgeRange(minAge: number, maxAge: number) {
  const users = getUsersCollection();
  
  const cursor = users.find({
    age: { $gte: minAge, $lte: maxAge }
  });
  
  const results = await cursor.toArray();
  console.log(`Found ${results.length} users in age range ${minAge}-${maxAge}`);
  return results;
}

// Find with projection to limit returned fields
async function findUsersWithProjection() {
  const users = getUsersCollection();
  
  const cursor = users.find(
    {}, // Empty filter matches all documents
    {
      projection: {
        name: 1,
        email: 1,
        _id: 0  // Exclude the _id field
      }
    }
  );
  
  return await cursor.toArray();
}

// Find with sorting and pagination
async function findUsersPaginated(page: number, pageSize: number) {
  const users = getUsersCollection();
  const skip = (page - 1) * pageSize;
  
  const cursor = users.find({})
    .sort({ createdAt: -1 })  // Sort by newest first
    .skip(skip)
    .limit(pageSize);
  
  const results = await cursor.toArray();
  const totalCount = await users.countDocuments({});
  
  return {
    data: results,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
  };
}
```

### Update Operations

Modify existing documents with various update strategies:

```typescript
// crud-update.ts - Update operations
import { getUsersCollection } from "./db.ts";

// Update a single document
async function updateUserEmail(userId: string, newEmail: string) {
  const users = getUsersCollection();
  
  const result = await users.updateOne(
    { _id: { $oid: userId } },
    {
      $set: {
        email: newEmail,
        updatedAt: new Date(),
      }
    }
  );
  
  console.log(`Modified ${result.modifiedCount} document(s)`);
  return result.modifiedCount > 0;
}

// Update multiple documents matching criteria
async function incrementAllUserAges() {
  const users = getUsersCollection();
  
  const result = await users.updateMany(
    {}, // Match all documents
    {
      $inc: { age: 1 },  // Increment age by 1
      $set: { updatedAt: new Date() }
    }
  );
  
  console.log(`Updated ${result.modifiedCount} users`);
  return result;
}

// Upsert: update if exists, insert if not
async function upsertUser(email: string, userData: Partial<User>) {
  const users = getUsersCollection();
  
  const result = await users.updateOne(
    { email },
    {
      $set: {
        ...userData,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      }
    },
    { upsert: true }
  );
  
  if (result.upsertedId) {
    console.log(`Created new user with ID: ${result.upsertedId}`);
  } else {
    console.log(`Updated existing user`);
  }
  
  return result;
}

// Find and update atomically, returning the updated document
async function findAndUpdateUser(email: string, updates: Partial<User>) {
  const users = getUsersCollection();
  
  const updatedUser = await users.findAndModify(
    { email },
    {
      update: {
        $set: { ...updates, updatedAt: new Date() }
      },
      new: true,  // Return the modified document
    }
  );
  
  return updatedUser;
}
```

### Delete Operations

Remove documents from collections:

```typescript
// crud-delete.ts - Delete operations
import { getUsersCollection } from "./db.ts";

// Delete a single document
async function deleteUserById(userId: string) {
  const users = getUsersCollection();
  
  const result = await users.deleteOne({
    _id: { $oid: userId }
  });
  
  if (result === 1) {
    console.log("User deleted successfully");
    return true;
  }
  
  console.log("User not found");
  return false;
}

// Delete multiple documents by criteria
async function deleteInactiveUsers(daysSinceLastUpdate: number) {
  const users = getUsersCollection();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastUpdate);
  
  const result = await users.deleteMany({
    updatedAt: { $lt: cutoffDate }
  });
  
  console.log(`Deleted ${result} inactive users`);
  return result;
}

// Soft delete pattern using a flag instead of actual deletion
async function softDeleteUser(userId: string) {
  const users = getUsersCollection();
  
  const result = await users.updateOne(
    { _id: { $oid: userId } },
    {
      $set: {
        deleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      }
    }
  );
  
  return result.modifiedCount > 0;
}
```

## Advanced Queries

MongoDB provides powerful query operators for complex data retrieval scenarios.

### Query Operators

Use comparison, logical, and element operators for sophisticated filtering:

```typescript
// advanced-queries.ts - Complex query examples
import { getProductsCollection, getUsersCollection } from "./db.ts";

// Multiple conditions with $and and $or
async function findProductsWithComplexFilter() {
  const products = getProductsCollection();
  
  // Find products that are either electronics under $500 or books under $50
  const results = await products.find({
    $or: [
      { $and: [{ category: "electronics" }, { price: { $lt: 500 } }] },
      { $and: [{ category: "books" }, { price: { $lt: 50 } }] }
    ]
  }).toArray();
  
  return results;
}

// Array operators for querying documents with arrays
async function findProductsByTags(tags: string[]) {
  const products = getProductsCollection();
  
  // $all requires all specified tags to be present
  const productsWithAllTags = await products.find({
    tags: { $all: tags }
  }).toArray();
  
  // $in matches if any of the specified tags are present
  const productsWithAnyTag = await products.find({
    tags: { $in: tags }
  }).toArray();
  
  // $elemMatch for complex array element conditions
  const productsWithSpecificCriteria = await products.find({
    tags: { $elemMatch: { $regex: "^tech", $options: "i" } }
  }).toArray();
  
  return { productsWithAllTags, productsWithAnyTag, productsWithSpecificCriteria };
}

// Text search with regex
async function searchUsersByName(searchTerm: string) {
  const users = getUsersCollection();
  
  // Case-insensitive partial match
  const results = await users.find({
    name: { $regex: searchTerm, $options: "i" }
  }).toArray();
  
  return results;
}

// Check field existence
async function findUsersWithPhone() {
  const users = getUsersCollection();
  
  const results = await users.find({
    phone: { $exists: true, $ne: null }
  }).toArray();
  
  return results;
}
```

## Aggregation Pipelines

Aggregation pipelines allow complex data transformations and analytics:

```typescript
// aggregation.ts - Aggregation pipeline examples
import { getProductsCollection, getUsersCollection } from "./db.ts";

// Group and calculate statistics
async function getProductStatsByCategory() {
  const products = getProductsCollection();
  
  const pipeline = [
    // Group by category
    {
      $group: {
        _id: "$category",
        totalProducts: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
        totalStock: { $sum: "$stock" },
      }
    },
    // Sort by total products descending
    { $sort: { totalProducts: -1 } },
    // Rename _id to category for clarity
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalProducts: 1,
        avgPrice: { $round: ["$avgPrice", 2] },
        minPrice: 1,
        maxPrice: 1,
        totalStock: 1,
      }
    }
  ];
  
  const results = await products.aggregate(pipeline).toArray();
  return results;
}

// Multi-stage pipeline with filtering and lookup
async function getUserOrderSummary() {
  const users = getUsersCollection();
  
  const pipeline = [
    // Filter active users only
    { $match: { deleted: { $ne: true } } },
    // Join with orders collection
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "userId",
        as: "orders"
      }
    },
    // Add computed fields
    {
      $addFields: {
        totalOrders: { $size: "$orders" },
        totalSpent: { $sum: "$orders.total" },
      }
    },
    // Remove the full orders array to reduce payload
    { $project: { orders: 0 } },
    // Sort by total spent
    { $sort: { totalSpent: -1 } },
    // Limit to top 10
    { $limit: 10 }
  ];
  
  const results = await users.aggregate(pipeline).toArray();
  return results;
}

// Date-based aggregation
async function getMonthlySignups() {
  const users = getUsersCollection();
  
  const pipeline = [
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        signups: "$count"
      }
    }
  ];
  
  const results = await users.aggregate(pipeline).toArray();
  return results;
}
```

## Creating and Managing Indexes

Indexes are critical for query performance in production applications:

```typescript
// indexes.ts - Index management
import { getUsersCollection, getProductsCollection } from "./db.ts";

// Create various types of indexes
async function createIndexes() {
  const users = getUsersCollection();
  const products = getProductsCollection();
  
  // Single field index for frequent lookups
  await users.createIndex(
    { email: 1 },
    { unique: true, name: "idx_users_email" }
  );
  
  // Compound index for queries that filter on multiple fields
  await users.createIndex(
    { age: 1, createdAt: -1 },
    { name: "idx_users_age_created" }
  );
  
  // Text index for full-text search
  await products.createIndex(
    { name: "text", tags: "text" },
    { name: "idx_products_text_search" }
  );
  
  // Partial index for optimizing queries on subset of documents
  await users.createIndex(
    { email: 1 },
    {
      name: "idx_active_users_email",
      partialFilterExpression: { deleted: { $ne: true } }
    }
  );
  
  // TTL index for automatic document expiration
  await users.createIndex(
    { sessionExpiry: 1 },
    { expireAfterSeconds: 0, name: "idx_session_ttl" }
  );
  
  console.log("All indexes created successfully");
}

// List existing indexes
async function listIndexes() {
  const users = getUsersCollection();
  
  const indexes = await users.listIndexes().toArray();
  console.log("Existing indexes:", JSON.stringify(indexes, null, 2));
  return indexes;
}

// Drop an index
async function dropIndex(indexName: string) {
  const users = getUsersCollection();
  
  await users.dropIndex(indexName);
  console.log(`Index ${indexName} dropped`);
}
```

## Schema Validation

MongoDB supports JSON Schema validation at the collection level:

```typescript
// schema-validation.ts - Collection schema validation
import { Database } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

// Create a collection with schema validation
async function createValidatedCollection(db: Database) {
  // Define the JSON Schema for validation
  const userSchema = {
    bsonType: "object",
    required: ["name", "email", "age"],
    properties: {
      name: {
        bsonType: "string",
        minLength: 1,
        maxLength: 100,
        description: "Name must be a string between 1 and 100 characters"
      },
      email: {
        bsonType: "string",
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        description: "Must be a valid email address"
      },
      age: {
        bsonType: "int",
        minimum: 0,
        maximum: 150,
        description: "Age must be an integer between 0 and 150"
      },
      phone: {
        bsonType: "string",
        pattern: "^\\+?[1-9]\\d{1,14}$",
        description: "Must be a valid phone number in E.164 format"
      },
      createdAt: {
        bsonType: "date",
        description: "Must be a valid date"
      }
    }
  };

  // Create collection with validator
  await db.createCollection("validated_users", {
    validator: {
      $jsonSchema: userSchema
    },
    validationLevel: "strict",  // "strict" or "moderate"
    validationAction: "error"   // "error" or "warn"
  });

  console.log("Validated collection created");
}

// Modify validation rules on existing collection
async function updateValidationRules(db: Database) {
  await db.runCommand({
    collMod: "validated_users",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "email"],
        // Updated schema rules
      }
    },
    validationLevel: "moderate"
  });
}
```

## Connection Pooling and Configuration

Proper connection management is essential for production applications:

```typescript
// connection-pool.ts - Connection pool configuration
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

interface ConnectionConfig {
  uri: string;
  database: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  connectTimeoutMS?: number;
  serverSelectionTimeoutMS?: number;
}

class DatabaseManager {
  private client: MongoClient | null = null;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
      ...config
    };
  }

  async connect() {
    if (this.client) {
      return this.client.database(this.config.database);
    }

    // Build connection string with pool settings
    const uri = new URL(this.config.uri);
    uri.searchParams.set("maxPoolSize", String(this.config.maxPoolSize));
    uri.searchParams.set("minPoolSize", String(this.config.minPoolSize));
    uri.searchParams.set("maxIdleTimeMS", String(this.config.maxIdleTimeMS));
    uri.searchParams.set("connectTimeoutMS", String(this.config.connectTimeoutMS));
    uri.searchParams.set("serverSelectionTimeoutMS", String(this.config.serverSelectionTimeoutMS));

    this.client = new MongoClient();
    await this.client.connect(uri.toString());
    
    console.log("Database connection established with pooling");
    return this.client.database(this.config.database);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log("Database connection closed");
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Singleton pattern for global database access
let dbManager: DatabaseManager | null = null;

export function initializeDatabaseManager(config: ConnectionConfig): DatabaseManager {
  if (!dbManager) {
    dbManager = new DatabaseManager(config);
  }
  return dbManager;
}

export function getDatabaseManager(): DatabaseManager {
  if (!dbManager) {
    throw new Error("Database manager not initialized. Call initializeDatabaseManager first.");
  }
  return dbManager;
}
```

## Error Handling

Robust error handling ensures your application behaves predictably:

```typescript
// error-handling.ts - Comprehensive error handling
import { MongoClient, Collection } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

// Custom error classes for different scenarios
class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}

class DocumentNotFoundError extends Error {
  constructor(collection: string, query: object) {
    super(`Document not found in ${collection} with query: ${JSON.stringify(query)}`);
    this.name = "DocumentNotFoundError";
  }
}

class DuplicateKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateKeyError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Wrapper function with comprehensive error handling
async function safeDbOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Handle specific MongoDB error codes
    if (error.code === 11000) {
      throw new DuplicateKeyError(`Duplicate key error in ${context}`);
    }
    
    if (error.code === 121) {
      throw new ValidationError(`Schema validation failed in ${context}: ${error.message}`);
    }
    
    if (error.message?.includes("connection") || error.message?.includes("timeout")) {
      throw new DatabaseConnectionError(`Connection error in ${context}`, error);
    }
    
    // Log unexpected errors for debugging
    console.error(`Unexpected error in ${context}:`, error);
    throw error;
  }
}

// Example usage with error handling
async function createUserSafely(userData: User, users: Collection<User>) {
  return safeDbOperation(async () => {
    // Validate required fields before database operation
    if (!userData.email || !userData.name) {
      throw new ValidationError("Email and name are required");
    }
    
    const insertedId = await users.insertOne(userData);
    return insertedId;
  }, "createUser");
}

// Retry mechanism for transient failures
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on transient errors
      if (error instanceof DatabaseConnectionError && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
```

## Transactions

MongoDB transactions ensure atomicity across multiple operations:

```typescript
// transactions.ts - Transaction support
import { MongoClient, Database } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

// Transfer funds between accounts using a transaction
async function transferFunds(
  client: MongoClient,
  db: Database,
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<boolean> {
  const session = client.startSession();
  
  try {
    // Start the transaction
    session.startTransaction();
    
    const accounts = db.collection("accounts");
    
    // Debit from source account
    const debitResult = await accounts.updateOne(
      {
        _id: { $oid: fromAccountId },
        balance: { $gte: amount }  // Ensure sufficient funds
      },
      {
        $inc: { balance: -amount },
        $push: {
          transactions: {
            type: "debit",
            amount,
            toAccount: toAccountId,
            date: new Date()
          }
        }
      },
      { session }
    );
    
    if (debitResult.modifiedCount === 0) {
      throw new Error("Insufficient funds or account not found");
    }
    
    // Credit to destination account
    const creditResult = await accounts.updateOne(
      { _id: { $oid: toAccountId } },
      {
        $inc: { balance: amount },
        $push: {
          transactions: {
            type: "credit",
            amount,
            fromAccount: fromAccountId,
            date: new Date()
          }
        }
      },
      { session }
    );
    
    if (creditResult.modifiedCount === 0) {
      throw new Error("Destination account not found");
    }
    
    // Commit the transaction
    await session.commitTransaction();
    console.log("Transfer completed successfully");
    return true;
    
  } catch (error) {
    // Abort transaction on any error
    await session.abortTransaction();
    console.error("Transfer failed, transaction aborted:", error);
    throw error;
    
  } finally {
    // End the session
    session.endSession();
  }
}

// Generic transaction wrapper for multiple operations
async function runInTransaction<T>(
  client: MongoClient,
  operations: (session: any) => Promise<T>
): Promise<T> {
  const session = client.startSession();
  
  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });
    
    const result = await operations(session);
    
    await session.commitTransaction();
    return result;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
    
  } finally {
    session.endSession();
  }
}
```

## Best Practices Summary

Following these best practices will help you build robust MongoDB applications with Deno:

**Connection Management**
- Use connection pooling with appropriate pool sizes for your workload
- Implement graceful shutdown handling to close connections properly
- Use retry logic with exponential backoff for transient failures

**Query Optimization**
- Create indexes for frequently queried fields and compound queries
- Use projections to limit returned fields and reduce network overhead
- Analyze query performance with explain() during development

**Schema Design**
- Enable schema validation for data integrity
- Use TypeScript interfaces for compile-time type checking
- Design schemas based on your application query patterns

**Error Handling**
- Implement specific error classes for different failure scenarios
- Use retry mechanisms for connection-related failures
- Log errors with sufficient context for debugging

**Transactions**
- Use transactions when multiple operations must be atomic
- Keep transactions short to minimize lock contention
- Always handle transaction commit and abort properly

**Security**
- Never hardcode credentials in source code
- Use environment variables for connection strings
- Enable authentication and use role-based access control

## Conclusion

MongoDB and Deno make an excellent combination for building modern backend applications. The native TypeScript support in both technologies provides strong typing throughout your stack, reducing runtime errors and improving developer productivity. The MongoDB driver for Deno offers comprehensive functionality including CRUD operations, aggregations, transactions, and index management.

By following the patterns and practices outlined in this guide, you can build production-ready applications that are performant, maintainable, and secure. Start with proper connection management and schema design, implement robust error handling, and use indexes strategically to optimize query performance.

As your application grows, consider implementing more advanced features like change streams for real-time updates, sharding for horizontal scaling, and replica sets for high availability. The MongoDB documentation and Deno community provide excellent resources for these advanced topics.

The combination of Deno's security model with MongoDB's flexible document store gives you a powerful foundation for building everything from simple APIs to complex distributed systems.
