# How to Use DynamoDB PartiQL for SQL-Like Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, PartiQL, SQL

Description: Learn how to use PartiQL to write SQL-compatible queries for DynamoDB, including SELECT, INSERT, UPDATE, DELETE operations, and batch statements.

---

If you've spent years writing SQL and switching to DynamoDB's expression-based API feels awkward, PartiQL might be your bridge. PartiQL is a SQL-compatible query language that works with DynamoDB. You write SELECT, INSERT, UPDATE, and DELETE statements, and DynamoDB translates them into its native operations.

It's not a replacement for the native API - it's an alternative interface. Under the hood, the same rules apply: you still need good partition keys, queries still work the same way, and scans are still expensive. But the syntax is more familiar if you're coming from a relational database background.

## Getting Started with PartiQL

You can run PartiQL statements through the AWS SDK, the CLI, or the DynamoDB console. Let's start with the SDK:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();

// Execute a PartiQL statement
async function executeStatement(statement, parameters) {
  const params = {
    Statement: statement,
    Parameters: parameters || []
  };

  const result = await dynamodb.executeStatement(params).promise();
  return result.Items.map(item => AWS.DynamoDB.Converter.unmarshall(item));
}
```

Note that PartiQL uses the low-level DynamoDB client, not the DocumentClient. The results come back in DynamoDB's native format (with type descriptors), so you need to unmarshall them.

## SELECT: Reading Data

Basic SELECT queries look very much like SQL:

```javascript
// Get a single item by primary key
const user = await executeStatement(
  "SELECT * FROM Users WHERE userId = ?",
  [{ S: 'user-001' }]
);

// Get specific attributes
const names = await executeStatement(
  'SELECT "name", email FROM Users WHERE userId = ?',
  [{ S: 'user-001' }]
);

// Query with sort key condition
const orders = await executeStatement(
  "SELECT * FROM Orders WHERE customerId = ? AND orderDate >= ?",
  [{ S: 'cust-001' }, { S: '2026-01-01' }]
);
```

Notice that attribute names that are reserved words need to be quoted with double quotes. `name` is a reserved word in DynamoDB, so it becomes `"name"`.

## Querying Global Secondary Indexes

To query a GSI, reference it with the table name and index name:

```javascript
// Query a GSI
const shippedOrders = await executeStatement(
  'SELECT * FROM "Orders"."status-date-index" WHERE "status" = ?',
  [{ S: 'shipped' }]
);
```

The table and index names are quoted with double quotes when they contain special characters or to be explicit.

## INSERT: Creating Items

```javascript
// Insert a new item
await executeStatement(
  `INSERT INTO Users VALUE {
    'userId': ?,
    'name': ?,
    'email': ?,
    'createdAt': ?
  }`,
  [
    { S: 'user-002' },
    { S: 'Jane Smith' },
    { S: 'jane@example.com' },
    { S: new Date().toISOString() }
  ]
);
```

PartiQL INSERT is equivalent to PutItem. It replaces the entire item if one with the same key exists. There's no built-in "insert only if not exists" syntax - you'd need a condition expression via the native API for that.

## UPDATE: Modifying Items

```javascript
// Update specific attributes
await executeStatement(
  'UPDATE Users SET email = ? WHERE userId = ?',
  [{ S: 'newemail@example.com' }, { S: 'user-001' }]
);

// Update multiple attributes
await executeStatement(
  'UPDATE Users SET email = ?, "name" = ?, updatedAt = ? WHERE userId = ?',
  [
    { S: 'newemail@example.com' },
    { S: 'Jane Doe' },
    { S: new Date().toISOString() },
    { S: 'user-001' }
  ]
);

// Remove an attribute
await executeStatement(
  'UPDATE Users REMOVE phoneNumber WHERE userId = ?',
  [{ S: 'user-001' }]
);
```

UPDATE in PartiQL requires you to specify the full primary key in the WHERE clause. You can't update multiple items with a single UPDATE statement.

## DELETE: Removing Items

```javascript
// Delete an item by primary key
await executeStatement(
  'DELETE FROM Users WHERE userId = ?',
  [{ S: 'user-001' }]
);

// Delete with composite key
await executeStatement(
  'DELETE FROM Orders WHERE customerId = ? AND orderId = ?',
  [{ S: 'cust-001' }, { S: 'ord-123' }]
);
```

Like UPDATE, DELETE requires the full primary key. You can't do a bulk delete with a WHERE clause on non-key attributes.

## Batch Operations

PartiQL supports batch statements for executing multiple operations atomically:

```javascript
// Batch execute multiple statements
async function batchExecute(statements) {
  const params = {
    Statements: statements.map(s => ({
      Statement: s.statement,
      Parameters: s.parameters || []
    }))
  };

  return dynamodb.batchExecuteStatement(params).promise();
}

// Insert multiple items in a batch
await batchExecute([
  {
    statement: "INSERT INTO Users VALUE {'userId': ?, 'name': ?, 'email': ?}",
    parameters: [{ S: 'user-003' }, { S: 'Bob' }, { S: 'bob@example.com' }]
  },
  {
    statement: "INSERT INTO Users VALUE {'userId': ?, 'name': ?, 'email': ?}",
    parameters: [{ S: 'user-004' }, { S: 'Alice' }, { S: 'alice@example.com' }]
  },
  {
    statement: "UPDATE Products SET stock = stock - ? WHERE productId = ?",
    parameters: [{ N: '1' }, { S: 'prod-001' }]
  }
]);
```

Batch operations can contain up to 25 statements. Each statement is processed independently - if one fails, the others still execute.

## Transactions with PartiQL

For all-or-nothing operations, use transactional PartiQL:

```javascript
// Transactional: either all succeed or all fail
async function transferCredits(fromUser, toUser, amount) {
  const params = {
    TransactStatements: [
      {
        Statement: 'UPDATE Users SET credits = credits - ? WHERE userId = ?',
        Parameters: [{ N: String(amount) }, { S: fromUser }]
      },
      {
        Statement: 'UPDATE Users SET credits = credits + ? WHERE userId = ?',
        Parameters: [{ N: String(amount) }, { S: toUser }]
      },
      {
        Statement: `INSERT INTO TransactionLog VALUE {
          'transactionId': ?,
          'fromUser': ?,
          'toUser': ?,
          'amount': ?,
          'timestamp': ?
        }`,
        Parameters: [
          { S: `txn-${Date.now()}` },
          { S: fromUser },
          { S: toUser },
          { N: String(amount) },
          { S: new Date().toISOString() }
        ]
      }
    ]
  };

  await dynamodb.executeTransaction(params).promise();
}
```

## Working with Complex Data Types

PartiQL handles DynamoDB's nested data types:

```javascript
// Insert an item with a map and a list
await executeStatement(
  `INSERT INTO Products VALUE {
    'productId': ?,
    'title': ?,
    'pricing': {
      'base': ?,
      'currency': ?
    },
    'tags': [?, ?, ?]
  }`,
  [
    { S: 'prod-005' },
    { S: 'Widget Pro' },
    { N: '29.99' },
    { S: 'USD' },
    { S: 'widget' },
    { S: 'premium' },
    { S: 'bestseller' }
  ]
);

// Query nested attributes
const result = await executeStatement(
  'SELECT productId, pricing.base, tags FROM Products WHERE productId = ?',
  [{ S: 'prod-005' }]
);
```

## Using PartiQL in the AWS CLI

You can also run PartiQL from the command line:

```bash
# Select items
aws dynamodb execute-statement \
  --statement "SELECT * FROM Users WHERE userId = 'user-001'"

# Insert an item
aws dynamodb execute-statement \
  --statement "INSERT INTO Users VALUE {'userId': 'user-005', 'name': 'Charlie', 'email': 'charlie@example.com'}"

# Update an item
aws dynamodb execute-statement \
  --statement "UPDATE Users SET email = 'new@email.com' WHERE userId = 'user-005'"

# Delete an item
aws dynamodb execute-statement \
  --statement "DELETE FROM Users WHERE userId = 'user-005'"
```

## Using PartiQL in the DynamoDB Console

The DynamoDB console has a PartiQL editor built in. Go to your table, click "Explore table items", and switch to the "PartiQL editor" tab. This is great for ad-hoc queries and debugging.

## PartiQL vs. Native API: When to Use Each

PartiQL is great for:
- Developers familiar with SQL who want a gentler learning curve
- Ad-hoc queries in the console or CLI
- Simple CRUD operations where the expression syntax feels verbose
- Batch operations mixing different operation types

The native API is better for:
- Complex conditional writes (condition expressions)
- Fine-grained control over capacity consumption (ReturnConsumedCapacity)
- Operations that need ReturnValues
- Performance-sensitive code (slightly less overhead)

```javascript
// PartiQL version - cleaner for simple queries
const result = await executeStatement(
  "SELECT orderId, orderAmount FROM Orders WHERE customerId = ? AND orderDate >= ?",
  [{ S: 'cust-001' }, { S: '2026-02-01' }]
);

// Native API version - more verbose but more control
const result2 = await docClient.query({
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid AND orderDate >= :date',
  ProjectionExpression: 'orderId, orderAmount',
  ExpressionAttributeValues: {
    ':cid': 'cust-001',
    ':date': '2026-02-01'
  },
  ReturnConsumedCapacity: 'TOTAL'
}).promise();
```

## Common Gotchas

**Full table scans.** A SELECT without a partition key in the WHERE clause triggers a Scan. This is just as expensive as a Scan via the native API:

```sql
-- This is a SCAN - reads the entire table!
SELECT * FROM Users WHERE email = 'jane@example.com'

-- This is a QUERY - efficient key-based lookup
SELECT * FROM Users WHERE userId = 'user-001'
```

**No LIKE operator.** DynamoDB doesn't support wildcard searches. Use `begins_with` via the native API instead.

**Parameter types.** PartiQL parameters must include the DynamoDB type descriptor (`{ S: 'string' }`, `{ N: '123' }`, etc.). This is easy to forget.

## Monitoring

Monitor PartiQL operations the same way you'd monitor native API calls. The underlying DynamoDB metrics (consumed capacity, throttling, latency) are identical. Track these with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) for comprehensive visibility.

## Wrapping Up

PartiQL gives you a SQL-like interface to DynamoDB without changing any of the underlying mechanics. It's not a magic layer that adds SQL capabilities - it's syntactic sugar over the same operations. Use it when the familiar syntax makes your code cleaner, especially for CRUD operations and batch statements. But understand that the same DynamoDB rules apply: design your keys well, avoid full table scans, and monitor your consumed capacity. PartiQL makes DynamoDB more accessible, but it doesn't make it a relational database.
