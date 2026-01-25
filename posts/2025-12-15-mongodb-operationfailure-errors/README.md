# How to Fix "OperationFailure" Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Troubleshooting, Error Handling, DevOps

Description: A comprehensive guide to diagnosing and resolving MongoDB OperationFailure errors including authentication failures, permission issues, query errors, and resource constraints with practical solutions.

---

OperationFailure is MongoDB's way of telling you that a command or operation could not complete. Unlike connection errors, these indicate that MongoDB received your request but could not fulfill it. Understanding the error codes and messages is key to quick resolution.

## Understanding OperationFailure

The OperationFailure exception contains several useful fields:

```python
try:
    result = db.collection.find_one({"_id": 1})
except OperationFailure as e:
    print(f"Code: {e.code}")
    print(f"Message: {e.details['errmsg']}")
    print(f"Code Name: {e.details.get('codeName')}")
```

```mermaid
flowchart TD
    A[MongoDB Operation] --> B{Operation Result}
    B -->|Success| C[Return Result]
    B -->|Failure| D[OperationFailure Exception]

    D --> E{Error Category}
    E -->|Authentication| F[Code 18, 13]
    E -->|Authorization| G[Code 13]
    E -->|Query Error| H[Code 2, 51, 96]
    E -->|Write Error| I[Code 11000, 121]
    E -->|Resource| J[Code 50, 262]

    F --> K[Check Credentials]
    G --> L[Check Permissions]
    H --> M[Fix Query Syntax]
    I --> N[Handle Duplicate/Validation]
    J --> O[Optimize or Scale]
```

## Common OperationFailure Errors and Solutions

### Error Code 18: Authentication Failed

**Error Message:** `Authentication failed`

This occurs when credentials are invalid or the authentication mechanism is misconfigured.

```javascript
// Wrong password
MongoClient.connect('mongodb://user:wrongpass@localhost:27017/mydb')

// Error: Authentication failed
```

**Solution:**

```javascript
// Verify credentials and authentication source
const uri = 'mongodb://username:password@localhost:27017/mydb?authSource=admin';

const client = new MongoClient(uri, {
  authMechanism: 'SCRAM-SHA-256'  // Specify mechanism if needed
});

// Or use separate auth options
const client = new MongoClient('mongodb://localhost:27017/mydb', {
  auth: {
    username: 'myuser',
    password: 'mypassword'
  },
  authSource: 'admin'  // Database where user is defined
});
```

### Error Code 13: Unauthorized

**Error Message:** `not authorized on database to execute command`

The authenticated user lacks permission for the operation.

```javascript
// Error: not authorized on production to execute command { find: "users" }
```

**Solution:**

```javascript
// In mongo shell, grant appropriate role
use admin
db.grantRolesToUser("appuser", [
  { role: "readWrite", db: "production" }
]);

// Or create user with correct permissions
db.createUser({
  user: "appuser",
  pwd: "securepassword",
  roles: [
    { role: "readWrite", db: "production" },
    { role: "read", db: "analytics" }
  ]
});

// For specific collection access
db.createRole({
  role: "ordersReadWrite",
  privileges: [
    {
      resource: { db: "production", collection: "orders" },
      actions: ["find", "insert", "update", "remove"]
    }
  ],
  roles: []
});
```

### Error Code 11000: Duplicate Key Error

**Error Message:** `E11000 duplicate key error collection`

Attempted to insert a document with a duplicate value for a unique index.

```javascript
// Error: E11000 duplicate key error collection: mydb.users index: email_1 dup key: { email: "user@example.com" }
```

**Solution:**

```javascript
// Option 1: Use upsert for insert-or-update pattern
async function upsertUser(email, userData) {
  return await db.users.updateOne(
    { email: email },
    { $set: userData },
    { upsert: true }
  );
}

// Option 2: Catch and handle the duplicate
async function createUser(userData) {
  try {
    return await db.users.insertOne(userData);
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('User with this email already exists');
    }
    throw error;
  }
}

// Option 3: Check existence first (has race condition)
async function safeCreateUser(userData) {
  const existing = await db.users.findOne({ email: userData.email });
  if (existing) {
    return { existed: true, user: existing };
  }

  try {
    const result = await db.users.insertOne(userData);
    return { existed: false, user: { ...userData, _id: result.insertedId } };
  } catch (error) {
    if (error.code === 11000) {
      // Race condition - another request inserted first
      const existing = await db.users.findOne({ email: userData.email });
      return { existed: true, user: existing };
    }
    throw error;
  }
}
```

### Error Code 121: Document Validation Failed

**Error Message:** `Document failed validation`

The document does not meet schema validation rules.

```javascript
// Error: Document failed validation
// Failing document: { name: "Product", price: -10 }
```

**Solution:**

```javascript
// Check your validation rules
db.getCollectionInfos({ name: "products" })[0].options.validator

// Fix the document to match validation
db.products.insertOne({
  name: "Product",
  price: 10,  // Must be positive per validation rule
  category: "electronics"  // Required field
});

// Or bypass validation temporarily (not recommended for production)
db.products.insertOne(
  { name: "Product", price: -10 },
  { bypassDocumentValidation: true }
);

// Update validation rules if needed
db.runCommand({
  collMod: "products",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price"],
      properties: {
        name: { bsonType: "string" },
        price: { bsonType: "number", minimum: 0 }
      }
    }
  },
  validationLevel: "moderate"  // Only validate updates to existing fields
});
```

### Error Code 50: ExceededTimeLimit

**Error Message:** `operation exceeded time limit`

The operation took longer than maxTimeMS allows.

```javascript
// Error: operation exceeded time limit
```

**Solution:**

```javascript
// Option 1: Increase time limit for specific operations
const results = await db.largeCollection
  .find({ status: "active" })
  .maxTimeMS(60000)  // 60 seconds
  .toArray();

// Option 2: Optimize the query with indexes
db.largeCollection.createIndex({ status: 1 });

// Option 3: Use aggregation pipeline with $limit
const results = await db.largeCollection.aggregate([
  { $match: { status: "active" } },
  { $limit: 1000 },
  { $project: { name: 1, status: 1 } }
], { maxTimeMS: 30000 }).toArray();

// Option 4: Set server-side timeout (admin operation)
db.adminCommand({
  setParameter: 1,
  maxTimeMS: 30000  // Server-wide default
});
```

### Error Code 2: BadValue

**Error Message:** Various - depends on the specific bad value

Invalid query syntax or parameter values.

```javascript
// Error: unknown top level operator: $invalidOp
db.collection.find({ $invalidOp: {} })

// Error: $in needs an array
db.collection.find({ field: { $in: "notAnArray" } })
```

**Solution:**

```javascript
// Fix query syntax
// Wrong
db.collection.find({ $or: { a: 1, b: 2 } });
// Correct
db.collection.find({ $or: [{ a: 1 }, { b: 2 }] });

// Wrong
db.collection.find({ field: { $in: "value" } });
// Correct
db.collection.find({ field: { $in: ["value"] } });

// Wrong
db.collection.find({ "nested.field": { $exists: "yes" } });
// Correct
db.collection.find({ "nested.field": { $exists: true } });
```

### Error Code 96: OperationNotSupportedInTransaction

**Error Message:** `operation not supported in transaction`

Certain operations are not allowed within transactions.

```javascript
// Error: Cannot create collection in transaction
const session = client.startSession();
session.startTransaction();
await db.createCollection("newCollection", { session });  // Fails
```

**Solution:**

```javascript
// Create collections outside transactions
await db.createCollection("orders");

// Then use transaction for data operations
const session = client.startSession();
try {
  session.startTransaction();

  await db.orders.insertOne({ item: "product", qty: 1 }, { session });
  await db.inventory.updateOne(
    { item: "product" },
    { $inc: { qty: -1 } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

### Error Code 262: ExceededMemoryLimit

**Error Message:** `Sort exceeded memory limit`

Sort or aggregation operations exceed the memory limit (100MB by default).

```javascript
// Error: Sort exceeded memory limit of 104857600 bytes
```

**Solution:**

```javascript
// Option 1: Create an index for the sort field
db.collection.createIndex({ sortField: 1 });

// Option 2: Allow disk use for aggregations
const results = await db.collection.aggregate([
  { $sort: { largeField: 1 } },
  { $group: { _id: "$category", total: { $sum: "$amount" } } }
], { allowDiskUse: true }).toArray();

// Option 3: Limit results before sorting
const results = await db.collection.aggregate([
  { $match: { status: "active" } },  // Filter first
  { $limit: 10000 },  // Limit documents
  { $sort: { createdAt: -1 } }
]).toArray();

// Option 4: Use cursor for large result sets
const cursor = db.collection.find().sort({ field: 1 }).batchSize(1000);
while (await cursor.hasNext()) {
  const doc = await cursor.next();
  // Process document
}
```

## Generic Error Handling Pattern

Implement a robust error handler for all OperationFailure scenarios:

```javascript
class MongoErrorHandler {
  static handle(error) {
    if (error.name !== 'MongoError' && error.name !== 'MongoServerError') {
      throw error;
    }

    switch (error.code) {
      case 11000:
        return this.handleDuplicateKey(error);
      case 13:
        return this.handleUnauthorized(error);
      case 18:
        return this.handleAuthenticationFailed(error);
      case 50:
        return this.handleTimeout(error);
      case 121:
        return this.handleValidationFailed(error);
      case 262:
        return this.handleMemoryLimit(error);
      default:
        return this.handleUnknown(error);
    }
  }

  static handleDuplicateKey(error) {
    const match = error.message.match(/index: (\w+)/);
    const field = match ? match[1].replace('_1', '') : 'unknown';
    throw new ConflictError(`Duplicate value for field: ${field}`);
  }

  static handleUnauthorized(error) {
    throw new ForbiddenError('Insufficient permissions for this operation');
  }

  static handleAuthenticationFailed(error) {
    throw new UnauthorizedError('Invalid database credentials');
  }

  static handleTimeout(error) {
    throw new TimeoutError('Database operation timed out');
  }

  static handleValidationFailed(error) {
    throw new ValidationError('Document does not meet schema requirements');
  }

  static handleMemoryLimit(error) {
    throw new ResourceError('Operation requires too much memory');
  }

  static handleUnknown(error) {
    console.error('Unhandled MongoDB error:', error);
    throw new DatabaseError('An unexpected database error occurred');
  }
}

// Usage
async function safeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    MongoErrorHandler.handle(error);
  }
}
```

## Summary

OperationFailure errors in MongoDB cover a wide range of issues:

- **Authentication (18)**: Check credentials and authSource
- **Authorization (13)**: Verify user roles and permissions
- **Duplicate Key (11000)**: Use upsert or handle conflicts
- **Validation (121)**: Ensure documents match schema rules
- **Timeout (50)**: Optimize queries or increase limits
- **Memory (262)**: Add indexes or enable disk use

Understanding error codes helps you write more resilient applications that handle failures gracefully and provide meaningful feedback to users.
