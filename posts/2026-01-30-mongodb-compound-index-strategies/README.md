# How to Build MongoDB Compound Index Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MongoDB, Performance, Indexing, Database

Description: Design effective compound indexes in MongoDB using the ESR rule, index prefixes, and query pattern analysis for optimal query performance.

---

Compound indexes in MongoDB can dramatically improve query performance, but poorly designed indexes can actually hurt your database. This guide covers the practical strategies you need to build effective compound indexes that work with your query patterns.

## What Are Compound Indexes?

A compound index is an index on multiple fields. Unlike single-field indexes, the order of fields in a compound index matters significantly.

Here is a basic compound index creation:

```javascript
// Create a compound index on status and createdAt fields
db.orders.createIndex({ status: 1, createdAt: -1 })
```

The `1` indicates ascending order, and `-1` indicates descending order. This index supports queries that filter on `status`, queries that filter on both `status` and `createdAt`, and queries that filter on `status` and sort by `createdAt`.

## The ESR Rule: Equality, Sort, Range

The ESR rule is the most important principle for designing compound indexes. It defines the optimal order of fields in your index.

| Position | Field Type | Description |
|----------|------------|-------------|
| First | Equality | Fields with exact match conditions (e.g., `status: "active"`) |
| Second | Sort | Fields used in sort operations |
| Third | Range | Fields with range conditions (e.g., `$gt`, `$lt`, `$in`) |

### Why ESR Works

MongoDB traverses indexes from left to right. Equality fields narrow down the search space immediately. Sort fields allow MongoDB to return results in order without an in-memory sort. Range fields come last because they create a scan within the narrowed result set.

Consider this query:

```javascript
// Query with equality, sort, and range conditions
db.orders.find({
    status: "shipped",           // Equality
    amount: { $gte: 100 }        // Range
}).sort({ createdAt: -1 })       // Sort
```

Here is the optimal index following ESR:

```javascript
// ESR-optimized index: Equality first, Sort second, Range third
db.orders.createIndex({
    status: 1,      // E - Equality
    createdAt: -1,  // S - Sort
    amount: 1       // R - Range
})
```

### ESR in Practice: A Real Example

Let us work through a practical scenario with a products collection:

```javascript
// Sample product documents
db.products.insertMany([
    {
        category: "electronics",
        brand: "TechCorp",
        price: 299.99,
        rating: 4.5,
        inStock: true,
        createdAt: new Date("2025-06-15")
    },
    {
        category: "electronics",
        brand: "GadgetPro",
        price: 549.00,
        rating: 4.8,
        inStock: true,
        createdAt: new Date("2025-08-20")
    },
    {
        category: "clothing",
        brand: "StyleMax",
        price: 79.99,
        rating: 4.2,
        inStock: false,
        createdAt: new Date("2025-07-10")
    }
])
```

A typical e-commerce query might look like this:

```javascript
// Find in-stock electronics under $500, sorted by rating
db.products.find({
    category: "electronics",     // Equality
    inStock: true,               // Equality
    price: { $lt: 500 }          // Range
}).sort({ rating: -1 })          // Sort
```

Applying ESR:

```javascript
// Optimal index for this query pattern
db.products.createIndex({
    category: 1,    // E - Equality (first equality field)
    inStock: 1,     // E - Equality (second equality field)
    rating: -1,     // S - Sort
    price: 1        // R - Range
})
```

## Index Prefixes and Their Power

A compound index supports queries on any prefix of its fields. This is one of the most powerful features for reducing the total number of indexes you need.

```javascript
// This single compound index
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1 })

// Supports all of these query patterns:
// 1. Queries on customerId alone
db.orders.find({ customerId: "cust_123" })

// 2. Queries on customerId and status
db.orders.find({ customerId: "cust_123", status: "pending" })

// 3. Queries on all three fields
db.orders.find({
    customerId: "cust_123",
    status: "pending",
    createdAt: { $gte: new Date("2025-01-01") }
})
```

### What Prefixes Do NOT Support

The same index does NOT efficiently support queries that skip the prefix:

```javascript
// This compound index
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1 })

// Does NOT efficiently support these queries:
// Query on status alone (skips customerId)
db.orders.find({ status: "pending" })

// Query on createdAt alone (skips customerId and status)
db.orders.find({ createdAt: { $gte: new Date("2025-01-01") } })

// Query on status and createdAt (skips customerId)
db.orders.find({ status: "pending", createdAt: { $gte: new Date("2025-01-01") } })
```

### Planning Indexes with Prefixes

Here is a strategy for minimizing indexes while covering multiple query patterns:

```javascript
// Instead of creating three separate indexes:
db.users.createIndex({ tenantId: 1 })
db.users.createIndex({ tenantId: 1, role: 1 })
db.users.createIndex({ tenantId: 1, role: 1, lastLogin: -1 })

// Create one compound index that covers all three patterns:
db.users.createIndex({ tenantId: 1, role: 1, lastLogin: -1 })
```

| Query Pattern | Covered by Single Index? |
|---------------|-------------------------|
| `{ tenantId }` | Yes (prefix) |
| `{ tenantId, role }` | Yes (prefix) |
| `{ tenantId, role, lastLogin }` | Yes (full index) |
| `{ role }` | No |
| `{ role, lastLogin }` | No |

## Index Intersection

MongoDB can use multiple indexes for a single query through index intersection. However, this is generally less efficient than a well-designed compound index.

```javascript
// Two separate indexes
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ customerId: 1 })

// This query might use index intersection
db.orders.find({ status: "shipped", customerId: "cust_456" })
```

### When Index Intersection Happens

MongoDB uses index intersection when no single index covers all query fields and multiple indexes together provide better coverage than a collection scan.

Here is how to check if intersection is being used:

```javascript
// Check the query plan
db.orders.find({
    status: "shipped",
    customerId: "cust_456"
}).explain("executionStats")

// Look for "AND_SORTED" or "AND_HASH" in the winning plan
// These indicate index intersection
```

### Compound Index vs Index Intersection

| Factor | Compound Index | Index Intersection |
|--------|---------------|-------------------|
| Query Performance | Generally faster | Additional merge step required |
| Index Size | Single larger index | Multiple smaller indexes |
| Write Performance | One index to update | Multiple indexes to update |
| Flexibility | Specific to query pattern | More flexible combinations |

In most cases, a compound index outperforms index intersection:

```javascript
// Preferred: Single compound index
db.orders.createIndex({ status: 1, customerId: 1 })

// Less efficient: Relying on intersection of two indexes
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ customerId: 1 })
```

## Multikey Indexes in Compound Indexes

When a field contains an array, MongoDB creates a multikey index. You can include array fields in compound indexes with some restrictions.

```javascript
// Document with an array field
db.articles.insertOne({
    title: "MongoDB Indexing Guide",
    author: "Jane Dev",
    tags: ["mongodb", "database", "performance"],
    category: "technical",
    views: 1500
})
```

Creating a compound index with an array field:

```javascript
// This works: one array field in compound index
db.articles.createIndex({ category: 1, tags: 1, views: -1 })
```

### The Multikey Limitation

A compound index can have at most one array field. MongoDB cannot create a compound index where more than one field is an array.

```javascript
// Document with two array fields
db.recipes.insertOne({
    name: "Chocolate Cake",
    ingredients: ["flour", "sugar", "cocoa", "eggs"],
    tags: ["dessert", "chocolate", "baking"]
})

// This will FAIL - cannot have two array fields in compound index
db.recipes.createIndex({ ingredients: 1, tags: 1 })
// Error: cannot index parallel arrays
```

### Workarounds for Multiple Arrays

If you need to query on multiple array fields, consider restructuring your data:

```javascript
// Option 1: Separate indexes for each array field
db.recipes.createIndex({ ingredients: 1 })
db.recipes.createIndex({ tags: 1 })

// Option 2: Restructure data to avoid parallel arrays
db.recipes.insertOne({
    name: "Chocolate Cake",
    attributes: [
        { type: "ingredient", value: "flour" },
        { type: "ingredient", value: "sugar" },
        { type: "tag", value: "dessert" },
        { type: "tag", value: "chocolate" }
    ]
})

// Now you can create a compound index on the single array
db.recipes.createIndex({ "attributes.type": 1, "attributes.value": 1 })
```

### Querying Multikey Compound Indexes

Here is how queries work with multikey compound indexes:

```javascript
// Index on category and tags (array)
db.articles.createIndex({ category: 1, tags: 1 })

// Query matching a single tag value
db.articles.find({ category: "technical", tags: "mongodb" })

// Query using $in on the array field
db.articles.find({ category: "technical", tags: { $in: ["mongodb", "postgresql"] } })

// Query using $all to match multiple values
db.articles.find({ category: "technical", tags: { $all: ["mongodb", "performance"] } })
```

## Sort Direction in Compound Indexes

The direction of fields in a compound index affects which sort operations the index can support.

### Matching Sort Directions

An index can support a sort if the sort direction matches the index direction or is the exact reverse:

```javascript
// This index
db.logs.createIndex({ level: 1, timestamp: -1 })

// Supports these sorts:
db.logs.find().sort({ level: 1, timestamp: -1 })   // Exact match
db.logs.find().sort({ level: -1, timestamp: 1 })   // Exact reverse

// Does NOT support these sorts (requires in-memory sort):
db.logs.find().sort({ level: 1, timestamp: 1 })    // Mixed directions
db.logs.find().sort({ level: -1, timestamp: -1 })  // Mixed directions
```

### Practical Example with Sort Direction

Consider an events collection where you need different sort orders:

```javascript
// Events collection
db.events.insertMany([
    { type: "click", userId: "u1", timestamp: new Date("2025-12-01T10:00:00Z"), value: 1 },
    { type: "purchase", userId: "u1", timestamp: new Date("2025-12-01T11:30:00Z"), value: 99 },
    { type: "click", userId: "u2", timestamp: new Date("2025-12-01T09:15:00Z"), value: 1 }
])
```

If your application needs both ascending and descending sorts:

```javascript
// Query 1: Recent events first (descending timestamp)
db.events.find({ type: "click" }).sort({ timestamp: -1 })

// Query 2: Oldest events first (ascending timestamp)
db.events.find({ type: "click" }).sort({ timestamp: 1 })
```

Both queries are supported by either of these indexes (they are equivalent for these queries):

```javascript
// Option A
db.events.createIndex({ type: 1, timestamp: 1 })

// Option B
db.events.createIndex({ type: 1, timestamp: -1 })

// MongoDB can traverse an index in either direction
// So { type: 1, timestamp: 1 } supports sort({ timestamp: -1 })
// when filtering on type
```

### When Direction Matters: Multi-field Sorts

Direction becomes critical with multi-field sorts:

```javascript
// Query: Find user events, sort by value descending, then timestamp ascending
db.events.find({ userId: "u1" }).sort({ value: -1, timestamp: 1 })

// This index supports the query
db.events.createIndex({ userId: 1, value: -1, timestamp: 1 })

// This index does NOT support the sort (wrong directions)
db.events.createIndex({ userId: 1, value: 1, timestamp: 1 })
```

## Analyzing Indexes with explain()

The `explain()` method is your primary tool for understanding how MongoDB uses your indexes.

### Basic explain() Usage

```javascript
// Get the query plan
db.orders.find({ status: "shipped" }).explain()

// Get execution statistics (actually runs the query)
db.orders.find({ status: "shipped" }).explain("executionStats")

// Get all possible plans considered
db.orders.find({ status: "shipped" }).explain("allPlansExecution")
```

### Key Fields to Examine

Here is what to look for in explain output:

```javascript
// Run a query with explain
const result = db.orders.find({
    status: "shipped",
    createdAt: { $gte: new Date("2025-01-01") }
}).sort({ amount: -1 }).explain("executionStats")

// Key fields to examine:
// result.queryPlanner.winningPlan.stage - Should be "FETCH" or "IXSCAN"
// result.queryPlanner.winningPlan.inputStage.indexName - Which index was used
// result.executionStats.totalDocsExamined - Documents scanned
// result.executionStats.totalKeysExamined - Index keys scanned
// result.executionStats.executionTimeMillis - Query execution time
```

### Understanding the Query Plan Stages

| Stage | Description | What It Means |
|-------|-------------|---------------|
| COLLSCAN | Collection scan | No index used, full scan |
| IXSCAN | Index scan | Index is being used |
| FETCH | Document fetch | Retrieving documents from index pointers |
| SORT | In-memory sort | Index did not cover sort, extra processing |
| SORT_KEY_GENERATOR | Generate sort keys | Preparing for in-memory sort |
| PROJECTION_COVERED | Covered query | All data from index, no document fetch |

### A Complete explain() Analysis

Let us walk through analyzing a real query:

```javascript
// Create sample data and indexes
db.transactions.insertMany([
    { accountId: "acc_1", type: "debit", amount: 150, date: new Date("2025-11-15") },
    { accountId: "acc_1", type: "credit", amount: 500, date: new Date("2025-11-20") },
    { accountId: "acc_2", type: "debit", amount: 75, date: new Date("2025-11-18") }
])

// Create a compound index
db.transactions.createIndex({ accountId: 1, date: -1, type: 1 })

// Analyze this query
const explanation = db.transactions.find({
    accountId: "acc_1",
    date: { $gte: new Date("2025-11-01") }
}).sort({ date: -1 }).explain("executionStats")

// Check the results
print("Index used:", explanation.queryPlanner.winningPlan.inputStage.indexName)
print("Keys examined:", explanation.executionStats.totalKeysExamined)
print("Docs examined:", explanation.executionStats.totalDocsExamined)
print("Docs returned:", explanation.executionStats.nReturned)
print("Execution time:", explanation.executionStats.executionTimeMillis, "ms")
```

### Identifying Index Problems

Look for these warning signs in explain output:

```javascript
// Problem 1: Collection scan (no index used)
// Stage: "COLLSCAN"
// Solution: Create an appropriate index

// Problem 2: High ratio of examined to returned documents
// If totalDocsExamined >> nReturned, the index is not selective enough
// Example: 10000 examined, 10 returned = poor selectivity
// Solution: Add more fields to the index or reorder fields

// Problem 3: In-memory sort
// Stage includes "SORT" after "IXSCAN"
// Solution: Add sort field to index in correct position (ESR rule)

// Problem 4: Index not fully utilized
// Check indexBounds - if a field shows [MinKey, MaxKey], it is not constrained
// Solution: Ensure query includes the prefix fields
```

### Practical Debugging Session

Here is a step-by-step debugging workflow:

```javascript
// Step 1: Identify slow query
db.orders.find({
    region: "north",
    status: { $in: ["pending", "processing"] },
    orderDate: { $gte: new Date("2025-01-01") }
}).sort({ priority: -1 }).explain("executionStats")

// Step 2: Check current indexes
db.orders.getIndexes()

// Step 3: Analyze the plan
// If you see COLLSCAN or SORT stage, you need a better index

// Step 4: Apply ESR rule
// E: region (equality)
// S: priority (sort)
// R: status ($in is effectively a range), orderDate (range)
db.orders.createIndex({ region: 1, priority: -1, status: 1, orderDate: 1 })

// Step 5: Verify improvement
db.orders.find({
    region: "north",
    status: { $in: ["pending", "processing"] },
    orderDate: { $gte: new Date("2025-01-01") }
}).sort({ priority: -1 }).explain("executionStats")

// Compare totalKeysExamined, totalDocsExamined, and executionTimeMillis
```

## Covered Queries

A covered query is one where all the requested fields are in the index. MongoDB can return results directly from the index without fetching documents.

```javascript
// Create an index that can cover queries
db.users.createIndex({ email: 1, name: 1, status: 1 })

// This query is covered (only requesting indexed fields)
db.users.find(
    { email: "user@example.com" },
    { _id: 0, name: 1, status: 1 }  // Projection excludes _id, includes only indexed fields
)

// This query is NOT covered (requesting non-indexed field)
db.users.find(
    { email: "user@example.com" },
    { name: 1, lastLogin: 1 }  // lastLogin is not in the index
)
```

Important note: You must exclude `_id` from the projection for a covered query, unless `_id` is part of the index.

### Verifying Covered Queries

```javascript
// Check if query is covered
const result = db.users.find(
    { email: "user@example.com" },
    { _id: 0, name: 1, status: 1 }
).explain("executionStats")

// For a covered query, you will see:
// totalDocsExamined: 0 (no documents fetched)
// totalKeysExamined: [some number] (only index accessed)
```

## Index Size and Memory Considerations

Compound indexes consume more memory than single-field indexes. Monitor your index sizes:

```javascript
// Check index sizes for a collection
db.orders.stats().indexSizes

// Example output:
// {
//     "_id_": 1234567,
//     "status_1_createdAt_-1": 2345678,
//     "customerId_1_status_1_createdAt_-1": 3456789
// }

// Check total index size
db.orders.totalIndexSize()
```

### Balancing Index Count and Query Coverage

| Approach | Pros | Cons |
|----------|------|------|
| Many specific indexes | Optimal for specific queries | High memory usage, slower writes |
| Few broad indexes | Lower memory, faster writes | May not cover all queries optimally |
| Prefix-based strategy | Good balance | Requires careful planning |

## Real-World Compound Index Patterns

Here are common patterns you will encounter in production systems.

### Multi-Tenant Applications

```javascript
// Always include tenantId first for data isolation
db.documents.createIndex({ tenantId: 1, type: 1, createdAt: -1 })
db.documents.createIndex({ tenantId: 1, ownerId: 1, status: 1 })

// Query pattern
db.documents.find({
    tenantId: "tenant_abc",
    type: "invoice",
    createdAt: { $gte: new Date("2025-01-01") }
}).sort({ createdAt: -1 })
```

### Time-Series Data

```javascript
// For time-series queries, time field often comes after equality filters
db.metrics.createIndex({
    sensorId: 1,         // Filter by sensor
    metricType: 1,       // Filter by metric type
    timestamp: -1        // Sort by time (recent first)
})

// Query pattern
db.metrics.find({
    sensorId: "sensor_42",
    metricType: "temperature",
    timestamp: {
        $gte: new Date("2025-12-01"),
        $lt: new Date("2025-12-02")
    }
}).sort({ timestamp: -1 })
```

### E-commerce Product Catalog

```javascript
// Support filtering, sorting, and pagination
db.products.createIndex({
    category: 1,         // Primary filter
    inStock: 1,          // Secondary filter
    rating: -1,          // Sort by rating
    price: 1             // Range filter on price
})

// Query pattern for category page
db.products.find({
    category: "laptops",
    inStock: true,
    price: { $gte: 500, $lte: 1500 }
}).sort({ rating: -1 }).limit(20)
```

### User Activity Logs

```javascript
// Support queries by user and time range
db.activityLogs.createIndex({
    userId: 1,
    action: 1,
    timestamp: -1
})

// Query pattern
db.activityLogs.find({
    userId: "user_123",
    action: "login",
    timestamp: { $gte: new Date("2025-12-01") }
}).sort({ timestamp: -1 }).limit(100)
```

## Common Mistakes to Avoid

### Mistake 1: Ignoring Query Patterns

```javascript
// Wrong: Creating index without analyzing actual queries
db.orders.createIndex({ orderId: 1, status: 1, amount: 1 })

// Right: Analyze your actual query patterns first
// If most queries filter by status and sort by createdAt:
db.orders.createIndex({ status: 1, createdAt: -1 })
```

### Mistake 2: Too Many Indexes

```javascript
// Wrong: Creating an index for every possible query
db.users.createIndex({ email: 1 })
db.users.createIndex({ email: 1, name: 1 })
db.users.createIndex({ email: 1, name: 1, status: 1 })
db.users.createIndex({ email: 1, status: 1 })

// Right: Use prefix property strategically
db.users.createIndex({ email: 1, status: 1, name: 1 })
// Covers queries on: email, email+status, email+status+name
```

### Mistake 3: Wrong Field Order

```javascript
// Wrong: Range field before sort field
db.products.createIndex({ category: 1, price: 1, rating: -1 })

// Query will require in-memory sort:
db.products.find({
    category: "electronics",
    price: { $lt: 500 }
}).sort({ rating: -1 })

// Right: Follow ESR rule
db.products.createIndex({ category: 1, rating: -1, price: 1 })
```

### Mistake 4: Not Testing with Production-Like Data

```javascript
// Indexes may behave differently with varying data distributions
// Always test with:
// 1. Realistic data volume
// 2. Realistic data distribution
// 3. Realistic query patterns

// Use explain() with production-like data to validate index effectiveness
```

## Index Management Commands

Here is a reference for common index operations:

```javascript
// List all indexes on a collection
db.orders.getIndexes()

// Create index in background (does not block operations)
db.orders.createIndex(
    { status: 1, createdAt: -1 },
    { background: true }
)

// Create unique compound index
db.users.createIndex(
    { tenantId: 1, email: 1 },
    { unique: true }
)

// Create partial index (only index documents matching filter)
db.orders.createIndex(
    { status: 1, createdAt: -1 },
    { partialFilterExpression: { status: { $ne: "archived" } } }
)

// Drop an index by name
db.orders.dropIndex("status_1_createdAt_-1")

// Drop an index by specification
db.orders.dropIndex({ status: 1, createdAt: -1 })

// Rebuild all indexes on a collection
db.orders.reIndex()
```

## Summary

Building effective compound indexes requires understanding your query patterns and applying the ESR rule consistently. Remember these key points:

1. Apply ESR: Equality fields first, then Sort fields, then Range fields
2. Use prefixes: Design compound indexes to support multiple query patterns
3. Mind the direction: Match sort directions for multi-field sorts
4. Avoid multikey limits: Only one array field per compound index
5. Test with explain(): Always validate index usage with real queries
6. Balance coverage and count: Fewer well-designed indexes beat many specific ones

Start by analyzing your most frequent and slowest queries, apply these strategies, and verify improvements with `explain()`. Effective indexing is an iterative process that requires ongoing attention as your application evolves.
