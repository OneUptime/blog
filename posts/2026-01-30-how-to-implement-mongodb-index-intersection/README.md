# How to Implement MongoDB Index Intersection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MongoDB, Indexes, Performance, Database

Description: Learn how MongoDB index intersection works and when to use multiple single-field indexes versus compound indexes.

---

MongoDB index intersection is a documented query optimization feature that can combine multiple indexes to satisfy a single query. However, you should be careful not to design your schema around it. MongoDB's own documentation notes that the optimizer rarely chooses index intersection plans in practice, and compound indexes are usually the better choice for predictable performance.

## What is Index Intersection?

Index intersection occurs when MongoDB combines the results from multiple indexes to fulfill a query. Instead of relying on a single index, the query planner can intersect candidate results from two indexes to narrow down matching documents.

Consider a collection with separate indexes on `status` and `category` fields:

```javascript
db.products.createIndex({ status: 1 });
db.products.createIndex({ category: 1 });

// This query is eligible for index intersection in principle
db.products.find({ status: "active", category: "electronics" });
```

That does not mean the optimizer will choose an intersection plan. In current MongoDB documentation, index intersection is described as a feature that exists, but one the planner rarely picks automatically. In many real workloads, you will still see a single `IXSCAN`, a compound index plan, or even a `COLLSCAN` if the available indexes are not selective enough.

## Analyzing Index Intersection with explain()

The `explain()` method reveals whether MongoDB is using index intersection. If the planner selects an intersection plan, look for the `AND_SORTED` or `AND_HASH` stage in the execution plan:

```javascript
db.products.find({
  status: "active",
  category: "electronics"
}).explain("executionStats");
```

A possible index intersection plan looks like this:

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

This example shows the shape of an intersection plan, not a plan you should expect to see regularly. MongoDB's documentation explicitly says the optimizer rarely chooses index intersection plans, so you should treat these stages as possible explain outputs rather than typical winning plans.

## AND_SORTED vs AND_HASH Strategies

MongoDB documents two execution strategies for index intersection:

**AND_SORTED**: Used when both index scans can be intersected in sorted order, allowing a merge-style intersection.

```javascript
// Sort-based intersection
{
  "stage": "AND_SORTED",
  "inputStages": [/* index scans */]
}
```

**AND_HASH**: Used for hash-based intersection between index scan results.

```javascript
// Hash-based intersection
{
  "stage": "AND_HASH",
  "inputStages": [/* index scans */]
}
```

There is an important practical limitation here: MongoDB's documentation says hash-based index intersection is disabled by default, and sort-based index intersection is disabled in plan selection. That is why many real `explain()` results never show these stages unless you are looking at a forced or very specific plan.

## When Index Intersection Is Attractive in Theory

Index intersection is attractive conceptually in these scenarios, but you still need to verify real planner behavior with `explain()`:

**1. High Selectivity Filters**: When each predicate independently removes most documents:

```javascript
// Both conditions filter out most documents
db.orders.find({
  region: "west",      // 10% of documents
  status: "pending"    // 5% of documents
});
// In theory, combining both predicates is much more selective
```

**2. Flexible Query Patterns**: When your application has diverse query patterns that would require many compound indexes:

```javascript
// Different query combinations
db.products.find({ brand: "Acme" });
db.products.find({ color: "red" });
db.products.find({ brand: "Acme", color: "red" });
db.products.find({ color: "red", size: "large" });
```

**3. Broad Query Surfaces**: When you cannot justify creating a separate compound index for every combination of fields.

In practice, these are not reasons to assume MongoDB will choose index intersection. They are reasons to test whether intersection appears at all, and then compare it with a well-designed compound index.

## Compound Index Alternatives

For frequent query patterns, compound indexes are usually the better answer:

```javascript
// Compound index for common queries
db.products.createIndex({ status: 1, category: 1 });

// This query uses the compound index directly
// No intersection overhead
db.products.find({ status: "active", category: "electronics" });
```

**Why compound indexes are usually preferred:**
- Single index scan operation
- No intersection overhead
- Predictable performance
- Can support sorting on indexed fields
- Aligns with MongoDB's current planner guidance

**When to prefer compound indexes:**
- Queries with consistent field combinations
- Sorting requirements on multiple fields
- High-frequency queries requiring optimal performance

## What MongoDB's Docs Say

MongoDB's official documentation makes four points that are easy to miss:

1. MongoDB can execute queries using index intersection.
2. If intersection is selected, `explain()` may show `AND_SORTED` or `AND_HASH`.
3. The optimizer rarely chooses those plans in practice.
4. Schema design should favor compound indexes rather than relying on intersection.

For current details, see the MongoDB docs on [index intersection](https://www.mongodb.com/docs/manual/core/index-intersection/) and [explain results](https://www.mongodb.com/docs/manual/reference/explain-results/).

## Best Practices

1. **Do not assume intersection will win**: Separate single-field indexes do not guarantee an `AND_SORTED` or `AND_HASH` winning plan.
2. **Use `explain()` on your MongoDB version**: Planner behavior is version-specific and can differ from simplified examples.
3. **Prefer compound indexes for important queries**: Especially when the same field combinations are queried frequently.
4. **Test filtering and sorting together**: Compound indexes often outperform any intersection-based alternative when sort order matters.
5. **Treat intersection as a fallback, not a design target**: If it appears and helps, great, but do not depend on it.

Index intersection is still useful to understand because it appears in MongoDB documentation and `explain()` output. But the practical lesson is simple: know that the feature exists, verify plans empirically, and prefer compound indexes when you need reliable performance.
