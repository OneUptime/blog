# How to Implement API Filtering and Sorting with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, API, Filter, Sort, Query

Description: Learn how to implement flexible API filtering and sorting with MongoDB by translating query string parameters into safe MongoDB filter and sort documents.

---

REST APIs that expose MongoDB data need robust filtering and sorting to let clients query exactly what they need. The key challenges are safely translating user-supplied query parameters into MongoDB queries, preventing injection attacks, and ensuring performant queries through proper indexing.

## Parse Query String Parameters into a MongoDB Filter

Map URL query parameters to MongoDB filter conditions by validating field names against an allowlist.

```javascript
const ALLOWED_FILTER_FIELDS = new Set(["status", "category", "createdAt", "userId"]);

function buildFilter(queryParams) {
  const filter = {};

  for (const [key, value] of Object.entries(queryParams)) {
    if (!ALLOWED_FILTER_FIELDS.has(key)) continue;  // Ignore unknown fields

    // Handle range operators: ?createdAt[gte]=2026-01-01
    if (typeof value === "object") {
      filter[key] = {};
      for (const [op, val] of Object.entries(value)) {
        const mongoOp = { gte: "$gte", lte: "$lte", gt: "$gt", lt: "$lt" }[op];
        if (mongoOp) filter[key][mongoOp] = isNaN(val) ? new Date(val) : Number(val);
      }
    } else {
      filter[key] = value;
    }
  }

  return filter;
}

// GET /orders?status=active&createdAt[gte]=2026-01-01
// Produces: { status: "active", createdAt: { $gte: ISODate("2026-01-01") } }
```

## Build a Safe Sort Document from Query Parameters

Parse the `sort` query parameter into a MongoDB sort object, validating field names.

```javascript
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "price", "name", "updatedAt"]);

function buildSort(sortParam) {
  if (!sortParam) return { createdAt: -1 };  // Default sort

  const sortDoc = {};
  const fields = sortParam.split(",");  // ?sort=-createdAt,name

  for (const field of fields) {
    const desc = field.startsWith("-");
    const name = desc ? field.slice(1) : field;

    if (!ALLOWED_SORT_FIELDS.has(name)) continue;
    sortDoc[name] = desc ? -1 : 1;
  }

  return Object.keys(sortDoc).length > 0 ? sortDoc : { createdAt: -1 };
}

// ?sort=-createdAt,name
// Produces: { createdAt: -1, name: 1 }
```

## Combine Filtering and Sorting in an Express Route

Wire the filter and sort builders into a GET route handler.

```javascript
const express = require("express");
const router = express.Router();

router.get("/orders", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const sort = buildSort(req.query.sort);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const [orders, total] = await Promise.all([
      db.collection("orders")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("orders").countDocuments(filter)
    ]);

    res.json({ data: orders, total, limit, skip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Support Text Search Filtering

Add full-text search support using MongoDB's `$text` operator alongside field filters.

```javascript
// Ensure a text index exists
await db.collection("products").createIndex({ name: "text", description: "text" });

function buildFilterWithSearch(queryParams) {
  const filter = buildFilter(queryParams);

  if (queryParams.search) {
    filter.$text = { $search: queryParams.search };
  }

  return filter;
}

// GET /products?search=wireless+headphones&category=electronics
```

## Add Compound Indexes for Common Filter and Sort Combinations

Ensure performant queries by creating compound indexes that match your most common filter-sort patterns.

```javascript
// Support filtering by status and sorting by createdAt (most common pattern)
await db.collection("orders").createIndex({ status: 1, createdAt: -1 });

// Support filtering by userId and sorting by price
await db.collection("orders").createIndex({ userId: 1, price: -1 });
```

Use the MongoDB query planner to verify that your filter and sort queries use these indexes.

```javascript
const plan = await db.collection("orders")
  .find({ status: "active" })
  .sort({ createdAt: -1 })
  .explain("executionStats");

console.log(plan.executionStats.executionStages.stage);
// Should output "FETCH" (not "COLLSCAN") with an "IXSCAN" input stage
console.log(plan.executionStats.executionStages.inputStage.stage);
// Should output "IXSCAN"
```

## Summary

Implementing API filtering and sorting with MongoDB requires translating query string parameters into MongoDB filter and sort documents using field allowlists to prevent injection. A flexible operator syntax such as `?field[gte]=value` supports range queries, while a comma-separated sort string enables multi-field sorting. Backing common filter-sort combinations with compound indexes ensures that queries remain performant as data grows.
