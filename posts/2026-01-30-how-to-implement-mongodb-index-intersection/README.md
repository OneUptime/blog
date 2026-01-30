# How to Implement MongoDB Index Intersection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MongoDB, Indexes, Performance, Database

Description: Learn how MongoDB index intersection works and when to use multiple single-field indexes versus compound indexes.

---

MongoDB index intersection is a powerful query optimization feature that allows the database to use multiple indexes simultaneously to satisfy a single query. Understanding how to leverage this capability can significantly improve query performance in scenarios where compound indexes may not be practical.

## What is Index Intersection?

Index intersection occurs when MongoDB combines the results from multiple indexes to fulfill a query. Instead of relying on a single index, the query planner can use two or more indexes and intersect their results to find matching documents more efficiently.

Consider a collection with separate indexes on `status` and `category` fields:

```javascript
db.products.createIndex({ status: 1 });
db.products.createIndex({ category: 1 });

// This query can use index intersection
db.products.find({ status: "active", category: "electronics" });
```

MongoDB evaluates whether intersecting these indexes produces better performance than a collection scan or using just one index.

## Analyzing Index Intersection with explain()

The `explain()` method reveals whether MongoDB is using index intersection. Look for the `AND_SORTED` or `AND_HASH` stage in the execution plan:

```javascript
db.products.find({
  status: "active",
  category: "electronics"
}).explain("executionStats");
```

A typical index intersection plan shows:

```javascript
{
  "winningPlan": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "AND_SORTED",  // or AND_HASH
      "inputStages": [
        {
          "stage": "IXSCAN",
          "indexName": "status_1"
        },
        {
          "stage": "IXSCAN",
          "indexName": "category_1"
        }
      ]
    }
  }
}
```

## AND_SORTED vs AND_HASH Strategies

MongoDB uses two strategies for index intersection:

**AND_SORTED**: Used when both indexes return results sorted by the document `_id`. This is efficient because MongoDB can merge the sorted streams without additional memory overhead.

```javascript
// Both indexes naturally sort by _id
// AND_SORTED performs a merge-join operation
{
  "stage": "AND_SORTED",
  "inputStages": [/* index scans */]
}
```

**AND_HASH**: Used when indexes do not return results in `_id` order. MongoDB builds a hash table from one index's results and probes it with the other index's results.

```javascript
// Hash-based intersection
// More memory intensive but works with any index order
{
  "stage": "AND_HASH",
  "inputStages": [/* index scans */]
}
```

## When Index Intersection Helps

Index intersection is most beneficial in these scenarios:

**1. High Selectivity Filters**: When each index significantly reduces the result set:

```javascript
// Both conditions filter out most documents
db.orders.find({
  region: "west",      // 10% of documents
  status: "pending"    // 5% of documents
});
// Intersection: ~0.5% of documents
```

**2. Flexible Query Patterns**: When your application has diverse query patterns that would require many compound indexes:

```javascript
// Different query combinations
db.products.find({ brand: "Acme" });
db.products.find({ color: "red" });
db.products.find({ brand: "Acme", color: "red" });
db.products.find({ color: "red", size: "large" });
```

**3. Memory Constraints**: Single-field indexes consume less storage than multiple compound indexes covering all query combinations.

## Compound Index Alternatives

While index intersection is useful, compound indexes often provide better performance for frequent query patterns:

```javascript
// Compound index for common queries
db.products.createIndex({ status: 1, category: 1 });

// This query uses the compound index directly
// No intersection overhead
db.products.find({ status: "active", category: "electronics" });
```

**Advantages of compound indexes:**
- Single index scan operation
- No intersection overhead
- Predictable performance
- Can support sorting on indexed fields

**When to prefer compound indexes:**
- Queries with consistent field combinations
- Sorting requirements on multiple fields
- High-frequency queries requiring optimal performance

## Performance Comparison

Let us compare the two approaches with a practical example:

```javascript
// Setup: 1 million documents
db.orders.insertMany([/* sample data */]);

// Approach 1: Single-field indexes with intersection
db.orders.createIndex({ customer_id: 1 });
db.orders.createIndex({ order_date: 1 });

// Approach 2: Compound index
db.orders.createIndex({ customer_id: 1, order_date: 1 });

// Query both approaches
const query = {
  customer_id: "C12345",
  order_date: { $gte: ISODate("2026-01-01") }
};

// Measure execution stats
db.orders.find(query).explain("executionStats");
```

Typical results show compound indexes examining fewer documents:

| Approach | Documents Examined | Execution Time |
|----------|-------------------|----------------|
| Index Intersection | 1,500 | 45ms |
| Compound Index | 200 | 8ms |

## Best Practices

1. **Profile your queries**: Use `explain()` to verify index intersection is occurring and beneficial
2. **Monitor performance**: Index intersection adds overhead; ensure it improves overall query time
3. **Consider hybrid approaches**: Use compound indexes for frequent queries and rely on intersection for ad-hoc patterns
4. **Test with production data volumes**: Intersection behavior changes with data distribution

Index intersection is a valuable tool in MongoDB's query optimization arsenal. By understanding when it applies and how to analyze its effectiveness, you can make informed decisions about your indexing strategy and achieve optimal query performance.
