# How to Create MongoDB Covered Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MongoDB, Performance, Database, Indexing

Description: Optimize MongoDB query performance with covered queries that serve results entirely from indexes, avoiding document fetches for maximum speed.

---

## What Are Covered Queries?

A covered query in MongoDB is a query that can be satisfied entirely using an index, without needing to examine any documents. When MongoDB executes a covered query, it reads only the index entries to return results. This eliminates the expensive step of fetching documents from disk or memory.

Think of it like a library catalog. If you only need the book title and author, you can get that information directly from the catalog card without walking to the shelf and opening the book. The catalog "covers" your information needs.

### Why Covered Queries Matter

| Query Type | Data Source | Disk Access | Performance |
|------------|-------------|-------------|-------------|
| Non-indexed query | Collection scan | High | Slowest |
| Indexed query | Index + documents | Medium | Moderate |
| Covered query | Index only | Minimal | Fastest |

Covered queries provide significant performance benefits:

1. **Reduced I/O operations** - No document fetches means fewer disk reads
2. **Lower memory usage** - Indexes are typically smaller than full documents
3. **Faster response times** - Less data to process and transfer
4. **Better cache utilization** - Indexes fit more easily in RAM

---

## Requirements for a Covered Query

For MongoDB to execute a covered query, three conditions must be met:

1. **All query fields must be part of an index**
2. **All returned fields must be in the same index**
3. **No fields in the query can equal null or be checked for null existence**

Let us set up a sample collection to demonstrate these concepts.

### Setting Up the Example Collection

First, create a collection with user data that we will use throughout this tutorial.

```javascript
// Connect to your database
use performanceDemo

// Drop existing collection if it exists
db.users.drop()

// Insert sample documents
db.users.insertMany([
  {
    _id: ObjectId(),
    email: "alice@example.com",
    username: "alice_dev",
    firstName: "Alice",
    lastName: "Johnson",
    age: 28,
    department: "Engineering",
    salary: 95000,
    joinDate: ISODate("2022-03-15"),
    skills: ["javascript", "python", "mongodb"],
    address: {
      city: "San Francisco",
      state: "CA",
      zip: "94102"
    },
    isActive: true
  },
  {
    _id: ObjectId(),
    email: "bob@example.com",
    username: "bob_design",
    firstName: "Bob",
    lastName: "Smith",
    age: 34,
    department: "Design",
    salary: 87000,
    joinDate: ISODate("2021-07-22"),
    skills: ["figma", "sketch", "css"],
    address: {
      city: "New York",
      state: "NY",
      zip: "10001"
    },
    isActive: true
  },
  {
    _id: ObjectId(),
    email: "carol@example.com",
    username: "carol_pm",
    firstName: "Carol",
    lastName: "Williams",
    age: 41,
    department: "Product",
    salary: 110000,
    joinDate: ISODate("2020-01-10"),
    skills: ["jira", "confluence", "analytics"],
    address: {
      city: "Seattle",
      state: "WA",
      zip: "98101"
    },
    isActive: false
  }
])

// Add more documents for realistic testing
for (let i = 0; i < 10000; i++) {
  db.users.insertOne({
    email: `user${i}@example.com`,
    username: `user_${i}`,
    firstName: `FirstName${i}`,
    lastName: `LastName${i}`,
    age: Math.floor(Math.random() * 50) + 20,
    department: ["Engineering", "Design", "Product", "Sales", "Marketing"][Math.floor(Math.random() * 5)],
    salary: Math.floor(Math.random() * 100000) + 50000,
    joinDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    skills: ["skill1", "skill2", "skill3"],
    address: {
      city: "City" + i,
      state: "ST",
      zip: String(10000 + i)
    },
    isActive: Math.random() > 0.2
  })
}

print("Collection created with " + db.users.countDocuments() + " documents")
```

---

## Creating Your First Covered Query

### Step 1: Create an Appropriate Index

To create a covered query, you need an index that includes all fields you want to query and return.

```javascript
// Create a compound index on email and username
db.users.createIndex(
  { email: 1, username: 1 },
  { name: "email_username_idx" }
)
```

### Step 2: Write a Query with Proper Projection

The projection must include only indexed fields and explicitly exclude the `_id` field (unless `_id` is part of your index).

```javascript
// This query CAN be covered
// We query on email and return only email and username
db.users.find(
  { email: "alice@example.com" },
  { email: 1, username: 1, _id: 0 }
)
```

The `_id: 0` is critical. MongoDB returns `_id` by default, and if `_id` is not in your index, the query cannot be covered.

### Step 3: Verify with explain()

Use the `explain()` method to confirm your query is covered.

```javascript
// Check the execution stats
db.users.find(
  { email: "alice@example.com" },
  { email: 1, username: 1, _id: 0 }
).explain("executionStats")
```

Look for these indicators in the output:

```javascript
// In a covered query, you will see:
{
  "executionStats": {
    "totalDocsExamined": 0,        // No documents examined
    "totalKeysExamined": 1,        // Only index keys examined
    // ...
  },
  "winningPlan": {
    "stage": "PROJECTION_COVERED", // This confirms coverage
    // ...
  }
}
```

---

## Understanding explain() Output

The `explain()` method is your primary tool for verifying covered queries. Let us examine the key fields.

### Key Metrics to Check

| Field | Covered Query Value | Non-Covered Query Value |
|-------|---------------------|------------------------|
| totalDocsExamined | 0 | Greater than 0 |
| stage | PROJECTION_COVERED | FETCH or PROJECTION_SIMPLE |
| indexOnly (older versions) | true | false |

### Complete explain() Analysis Example

```javascript
// Create a more complex index for demonstration
db.users.createIndex(
  { department: 1, age: 1, salary: 1 },
  { name: "dept_age_salary_idx" }
)

// Run explain on a query designed to be covered
var explainResult = db.users.find(
  { department: "Engineering", age: { $gte: 25 } },
  { department: 1, age: 1, salary: 1, _id: 0 }
).explain("executionStats")

// Print relevant sections
print("=== Query Coverage Analysis ===")
print("Total Keys Examined: " + explainResult.executionStats.totalKeysExamined)
print("Total Docs Examined: " + explainResult.executionStats.totalDocsExamined)
print("Execution Time (ms): " + explainResult.executionStats.executionTimeMillis)

// Check the winning plan stage
var stage = explainResult.queryPlanner.winningPlan.stage
if (explainResult.queryPlanner.winningPlan.inputStage) {
  stage = explainResult.queryPlanner.winningPlan.inputStage.stage
}
print("Plan Stage: " + stage)

if (explainResult.executionStats.totalDocsExamined === 0) {
  print("Result: Query IS covered")
} else {
  print("Result: Query is NOT covered")
}
```

### Common explain() Stages

```javascript
// PROJECTION_COVERED - Query is fully covered by index
// FETCH - Documents must be retrieved (not covered)
// IXSCAN - Index scan stage
// COLLSCAN - Collection scan (no index used at all)
```

---

## Designing Compound Indexes for Coverage

Compound indexes are essential for covering queries that filter on multiple fields or return multiple fields.

### Index Field Order Matters

The order of fields in a compound index affects which queries it can cover. Follow the ESR rule:

1. **E**quality fields first (exact matches)
2. **S**ort fields second
3. **R**ange fields last

```javascript
// Good index design for common query patterns
db.users.createIndex(
  { department: 1, isActive: 1, age: 1, salary: 1 },
  { name: "dept_active_age_salary_idx" }
)

// This query will be covered:
// - department (equality)
// - isActive (equality)
// - age (range)
// - Returns: department, isActive, age, salary
db.users.find(
  {
    department: "Engineering",
    isActive: true,
    age: { $gte: 25, $lte: 40 }
  },
  { department: 1, isActive: 1, age: 1, salary: 1, _id: 0 }
)
```

### Covering Sort Operations

When your query includes a sort, the sort fields must also be in the index for full coverage.

```javascript
// Create index that supports sorting
db.users.createIndex(
  { department: 1, salary: -1, username: 1 },
  { name: "dept_salary_desc_username_idx" }
)

// Covered query with sort
db.users.find(
  { department: "Sales" },
  { department: 1, salary: 1, username: 1, _id: 0 }
).sort({ salary: -1 })

// Verify coverage with explain
db.users.find(
  { department: "Sales" },
  { department: 1, salary: 1, username: 1, _id: 0 }
).sort({ salary: -1 }).explain("executionStats")
```

### Index Prefix Coverage

A compound index can cover queries that use a prefix of its fields.

```javascript
// Given this index:
db.users.createIndex({ a: 1, b: 1, c: 1, d: 1 })

// These queries can potentially be covered:
db.users.find({ a: 1 }, { a: 1, _id: 0 })           // Uses prefix: a
db.users.find({ a: 1, b: 2 }, { a: 1, b: 1, _id: 0 }) // Uses prefix: a, b
db.users.find({ a: 1 }, { a: 1, b: 1, c: 1, _id: 0 }) // Query on a, return a,b,c

// This query CANNOT use the index efficiently:
db.users.find({ b: 2 }, { b: 1, _id: 0 })           // Skips 'a' - not a prefix
```

---

## Real-World Examples

### Example 1: User Lookup by Email

A common pattern is looking up users by email and returning minimal profile data.

```javascript
// Create targeted index
db.users.createIndex(
  { email: 1, username: 1, firstName: 1, lastName: 1 },
  { name: "user_lookup_idx" }
)

// Covered query for user lookup
// Returns display name info without fetching full document
db.users.find(
  { email: "alice@example.com" },
  {
    email: 1,
    username: 1,
    firstName: 1,
    lastName: 1,
    _id: 0
  }
)
```

### Example 2: Department Analytics

Generate department statistics using only indexed data.

```javascript
// Index for department queries
db.users.createIndex(
  { department: 1, salary: 1, isActive: 1 },
  { name: "dept_analytics_idx" }
)

// Aggregation pipeline that can use covered query for initial match
// Note: Full coverage in aggregations is more complex
db.users.aggregate([
  {
    $match: {
      department: "Engineering",
      isActive: true
    }
  },
  {
    $project: {
      _id: 0,
      department: 1,
      salary: 1
    }
  },
  {
    $group: {
      _id: "$department",
      avgSalary: { $avg: "$salary" },
      count: { $sum: 1 }
    }
  }
])
```

### Example 3: Paginated List with Sorting

Efficiently paginate through sorted results.

```javascript
// Index supporting pagination
db.users.createIndex(
  { isActive: 1, joinDate: -1, username: 1, email: 1 },
  { name: "active_users_paginated_idx" }
)

// Covered paginated query
// Returns list of active users sorted by join date
db.users.find(
  { isActive: true },
  { username: 1, email: 1, joinDate: 1, _id: 0 }
)
.sort({ joinDate: -1 })
.skip(0)
.limit(20)
```

---

## Limitations and Gotchas

### 1. The _id Field Trap

The most common mistake is forgetting to exclude `_id`.

```javascript
// NOT covered - _id is returned by default
db.users.find(
  { email: "alice@example.com" },
  { email: 1, username: 1 }
)

// Covered - explicitly exclude _id
db.users.find(
  { email: "alice@example.com" },
  { email: 1, username: 1, _id: 0 }
)

// Alternative: Include _id in the index
db.users.createIndex({ _id: 1, email: 1, username: 1 })
// Now this is covered:
db.users.find(
  { email: "alice@example.com" },
  { _id: 1, email: 1, username: 1 }
)
```

### 2. Embedded Documents

Queries on embedded document fields require careful index design.

```javascript
// Index on embedded field
db.users.createIndex(
  { "address.city": 1, "address.state": 1, username: 1 },
  { name: "address_city_state_idx" }
)

// Covered query on embedded fields
db.users.find(
  { "address.city": "San Francisco" },
  { "address.city": 1, "address.state": 1, username: 1, _id: 0 }
)

// NOT covered - returning entire embedded document
db.users.find(
  { "address.city": "San Francisco" },
  { address: 1, username: 1, _id: 0 }  // 'address' includes all subfields
)
```

### 3. Array Fields

Queries involving arrays have special considerations.

```javascript
// Index on array field
db.users.createIndex(
  { skills: 1, username: 1 },
  { name: "skills_username_idx" }
)

// This query is NOT covered in MongoDB
// Array field indexes create multiple index entries per document
// MongoDB must fetch documents to return correct results
db.users.find(
  { skills: "javascript" },
  { skills: 1, username: 1, _id: 0 }
)
```

### 4. Null Values and Existence Checks

Queries checking for null or field existence cannot be covered.

```javascript
// NOT covered - checking for null
db.users.find(
  { middleName: null },
  { email: 1, username: 1, _id: 0 }
)

// NOT covered - existence check
db.users.find(
  { middleName: { $exists: false } },
  { email: 1, username: 1, _id: 0 }
)
```

### 5. Regex Queries

Regex queries can be covered only under specific conditions.

```javascript
// Create index
db.users.createIndex(
  { username: 1, email: 1 },
  { name: "username_email_idx" }
)

// Covered - prefix regex (anchored at start)
db.users.find(
  { username: /^alice/ },
  { username: 1, email: 1, _id: 0 }
)

// NOT covered - non-anchored regex
db.users.find(
  { username: /alice/ },  // No ^ anchor
  { username: 1, email: 1, _id: 0 }
)
```

### Limitations Summary Table

| Scenario | Covered? | Workaround |
|----------|----------|------------|
| Missing _id: 0 in projection | No | Add _id: 0 or include _id in index |
| Returning array fields | No | None available |
| Null equality check | No | None available |
| $exists operator | No | None available |
| Non-prefix regex | No | Use prefix regex with ^ |
| Returning embedded document | No | Project specific subfields |
| Text search | No | None available |
| Geospatial queries | No | None available |

---

## Performance Benchmarking

Let us measure the actual performance difference between covered and non-covered queries.

### Benchmark Setup

```javascript
// Ensure we have enough data
print("Document count: " + db.users.countDocuments())

// Create index for testing
db.users.createIndex(
  { department: 1, age: 1, salary: 1, username: 1 },
  { name: "benchmark_idx" }
)

// Function to run benchmark
function benchmarkQuery(name, queryFunc, iterations) {
  var totalTime = 0
  var totalDocsExamined = 0
  var totalKeysExamined = 0

  for (var i = 0; i < iterations; i++) {
    var explain = queryFunc().explain("executionStats")
    totalTime += explain.executionStats.executionTimeMillis
    totalDocsExamined += explain.executionStats.totalDocsExamined
    totalKeysExamined += explain.executionStats.totalKeysExamined
  }

  print("\n=== " + name + " ===")
  print("Iterations: " + iterations)
  print("Avg Time (ms): " + (totalTime / iterations).toFixed(2))
  print("Avg Docs Examined: " + (totalDocsExamined / iterations).toFixed(0))
  print("Avg Keys Examined: " + (totalKeysExamined / iterations).toFixed(0))
}
```

### Running the Benchmark

```javascript
// Benchmark 1: Covered Query
benchmarkQuery(
  "Covered Query",
  function() {
    return db.users.find(
      { department: "Engineering" },
      { department: 1, age: 1, salary: 1, username: 1, _id: 0 }
    )
  },
  100
)

// Benchmark 2: Non-Covered Query (includes non-indexed field)
benchmarkQuery(
  "Non-Covered Query",
  function() {
    return db.users.find(
      { department: "Engineering" },
      { department: 1, age: 1, salary: 1, firstName: 1 }  // firstName not in index
    )
  },
  100
)

// Benchmark 3: Query returning full document
benchmarkQuery(
  "Full Document Query",
  function() {
    return db.users.find(
      { department: "Engineering" }
      // No projection - returns everything
    )
  },
  100
)
```

### Expected Results

Your actual numbers will vary based on hardware and data size, but the pattern should be clear:

| Query Type | Avg Time | Docs Examined | Keys Examined |
|------------|----------|---------------|---------------|
| Covered | 1-5 ms | 0 | ~2000 |
| Non-Covered | 5-15 ms | ~2000 | ~2000 |
| Full Document | 10-30 ms | ~2000 | ~2000 |

The covered query examines zero documents because all required data comes from the index.

---

## Best Practices

### 1. Design Indexes for Your Queries

Start by identifying your most frequent and performance-critical queries, then design indexes to cover them.

```javascript
// Document your query patterns
/*
Query Pattern 1: User authentication
  - Filter: email (equality)
  - Return: email, passwordHash, isActive

Query Pattern 2: User search
  - Filter: department (equality), isActive (equality)
  - Sort: lastName (ascending)
  - Return: firstName, lastName, email, department
*/

// Create indexes to match patterns
db.users.createIndex(
  { email: 1, passwordHash: 1, isActive: 1 },
  { name: "auth_lookup_idx" }
)

db.users.createIndex(
  { department: 1, isActive: 1, lastName: 1, firstName: 1, email: 1 },
  { name: "user_search_idx" }
)
```

### 2. Monitor Index Usage

Regularly check which indexes are being used and how effectively.

```javascript
// Get index statistics
db.users.aggregate([
  { $indexStats: {} }
]).forEach(function(idx) {
  print("Index: " + idx.name)
  print("  Accesses: " + idx.accesses.ops)
  print("  Since: " + idx.accesses.since)
  print("")
})
```

### 3. Balance Index Size vs Query Coverage

More fields in an index means larger index size. Find the right balance.

```javascript
// Check index sizes
db.users.stats().indexSizes

// Example output:
// {
//   "_id_": 245760,
//   "email_username_idx": 532480,
//   "dept_age_salary_idx": 409600
// }
```

### 4. Use Partial Indexes for Targeted Coverage

If you only query a subset of documents, partial indexes can provide coverage with less overhead.

```javascript
// Partial index for active users only
db.users.createIndex(
  { department: 1, salary: 1, username: 1 },
  {
    name: "active_users_partial_idx",
    partialFilterExpression: { isActive: true }
  }
)

// This query can be covered by the partial index
db.users.find(
  { department: "Engineering", isActive: true },
  { department: 1, salary: 1, username: 1, _id: 0 }
)
```

### 5. Consider Index-Only Counts

The `countDocuments()` method can also benefit from proper indexing.

```javascript
// Create index for counting
db.users.createIndex({ department: 1, isActive: 1 })

// This count uses only the index
db.users.countDocuments({ department: "Engineering", isActive: true })

// Verify with explain
db.users.explain("executionStats").count({ department: "Engineering", isActive: true })
```

---

## Debugging Uncovered Queries

When a query you expect to be covered is not, follow this debugging process.

### Step 1: Check the Projection

```javascript
// Common mistake: forgetting _id: 0
var query = db.users.find(
  { email: "test@example.com" },
  { email: 1, username: 1 }  // Missing _id: 0
)

// Fix:
var query = db.users.find(
  { email: "test@example.com" },
  { email: 1, username: 1, _id: 0 }
)
```

### Step 2: Verify Index Exists and Matches

```javascript
// List all indexes
db.users.getIndexes().forEach(function(idx) {
  print(idx.name + ": " + JSON.stringify(idx.key))
})

// Check if your fields are covered
// Query fields: email
// Projection fields: email, username
// Required index: { email: 1, username: 1 } or { username: 1, email: 1 }
```

### Step 3: Analyze explain() Output

```javascript
// Get detailed execution info
var explain = db.users.find(
  { email: "test@example.com" },
  { email: 1, username: 1, _id: 0 }
).explain("allPlansExecution")

// Check winning plan
printjson(explain.queryPlanner.winningPlan)

// Look for FETCH stage - this means not covered
// Look for PROJECTION_COVERED - this means covered
```

### Step 4: Check for Problematic Operators

```javascript
// These operators prevent coverage:
// $exists, $type (when checking for null), $elemMatch, $size

// Check your query for these patterns
var problematicQuery = db.users.find(
  { email: { $exists: true } },  // Prevents coverage
  { email: 1, _id: 0 }
)
```

---

## Covered Queries in Application Code

Here are examples of implementing covered queries in application code.

### Node.js with MongoDB Driver

```javascript
const { MongoClient } = require('mongodb');

async function getCoveredUserData(email) {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('performanceDemo');
    const users = db.collection('users');

    // Ensure index exists (do this once, not per query)
    await users.createIndex(
      { email: 1, username: 1, firstName: 1, lastName: 1 },
      { name: 'user_display_idx' }
    );

    // Execute covered query
    const result = await users.findOne(
      { email: email },
      {
        projection: {
          email: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          _id: 0  // Critical for coverage
        }
      }
    );

    return result;
  } finally {
    await client.close();
  }
}

// Verify coverage during development
async function verifyQueryCoverage(email) {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('performanceDemo');
    const users = db.collection('users');

    const explanation = await users.find(
      { email: email },
      {
        projection: {
          email: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          _id: 0
        }
      }
    ).explain('executionStats');

    const isCovered = explanation.executionStats.totalDocsExamined === 0;
    console.log(`Query is covered: ${isCovered}`);
    console.log(`Docs examined: ${explanation.executionStats.totalDocsExamined}`);
    console.log(`Keys examined: ${explanation.executionStats.totalKeysExamined}`);

    return isCovered;
  } finally {
    await client.close();
  }
}
```

### Python with PyMongo

```python
from pymongo import MongoClient
from pymongo import ASCENDING

def get_covered_user_data(email: str) -> dict:
    client = MongoClient('mongodb://localhost:27017')
    db = client['performanceDemo']
    users = db['users']

    # Ensure index exists
    users.create_index(
        [('email', ASCENDING), ('username', ASCENDING),
         ('firstName', ASCENDING), ('lastName', ASCENDING)],
        name='user_display_idx'
    )

    # Execute covered query
    # projection with _id: False ensures coverage
    result = users.find_one(
        {'email': email},
        {
            'email': 1,
            'username': 1,
            'firstName': 1,
            'lastName': 1,
            '_id': 0  # Must exclude _id for coverage
        }
    )

    client.close()
    return result


def verify_query_coverage(email: str) -> bool:
    client = MongoClient('mongodb://localhost:27017')
    db = client['performanceDemo']
    users = db['users']

    # Get query explanation
    cursor = users.find(
        {'email': email},
        {
            'email': 1,
            'username': 1,
            'firstName': 1,
            'lastName': 1,
            '_id': 0
        }
    )

    explanation = cursor.explain()

    docs_examined = explanation['executionStats']['totalDocsExamined']
    keys_examined = explanation['executionStats']['totalKeysExamined']

    is_covered = docs_examined == 0

    print(f"Query is covered: {is_covered}")
    print(f"Docs examined: {docs_examined}")
    print(f"Keys examined: {keys_examined}")

    client.close()
    return is_covered
```

---

## Summary

Covered queries are one of the most effective ways to optimize MongoDB read performance. By ensuring all query and projection fields exist in a single index, you eliminate document fetches entirely.

Key takeaways:

1. **Always exclude _id** in projections unless it is part of your index
2. **Design compound indexes** following the ESR rule (Equality, Sort, Range)
3. **Use explain()** to verify coverage before deploying to production
4. **Monitor index statistics** to ensure your covered query indexes are being used
5. **Be aware of limitations** with arrays, null checks, and certain operators

Start by identifying your most frequently executed read queries and design indexes specifically to cover them. The performance gains, especially at scale, can be substantial - often reducing query times by 50% or more.

---

## Further Reading

- MongoDB Index Documentation: https://www.mongodb.com/docs/manual/indexes/
- Query Optimization: https://www.mongodb.com/docs/manual/core/query-optimization/
- explain() Results: https://www.mongodb.com/docs/manual/reference/explain-results/
- Index Strategies: https://www.mongodb.com/docs/manual/applications/indexes/
