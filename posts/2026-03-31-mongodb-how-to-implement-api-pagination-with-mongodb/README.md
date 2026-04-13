# How to Implement API Pagination with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Pagination, REST API, Performance, Query Optimization

Description: Learn how to implement cursor-based and offset-based API pagination with MongoDB, including best practices for large collections and sort stability.

---

## Two Pagination Approaches

MongoDB supports two main pagination patterns:

1. **Offset pagination** (`skip` + `limit`) - simple but degrades with large offsets
2. **Cursor pagination** (range queries on `_id` or a sorted field) - consistent performance regardless of position

## Offset Pagination

```javascript
// Node.js example
async function getPageOffset(collection, page, pageSize) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAt: -1, _id: -1 })  // stable sort with _id as tiebreaker
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments({}),
  ]);

  return {
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: skip + items.length < total,
      hasPrev: page > 1,
    },
  };
}

// Usage: GET /api/posts?page=3&pageSize=20
const result = await getPageOffset(db.collection('posts'), 3, 20);
```

## Cursor Pagination (Recommended for Large Datasets)

Cursor pagination avoids the performance cost of `skip` by using a range query:

```javascript
// Cursor-based pagination using _id
async function getPageCursor(collection, cursor, pageSize) {
  const { ObjectId } = require('mongodb');

  const query = cursor ? { _id: { $lt: new ObjectId(cursor) } } : {};

  const items = await collection
    .find(query)
    .sort({ _id: -1 })
    .limit(pageSize + 1)  // fetch one extra to determine if there is a next page
    .toArray();

  const hasNextPage = items.length > pageSize;
  if (hasNextPage) items.pop();  // remove the extra item

  const nextCursor = hasNextPage ? items[items.length - 1]._id.toString() : null;

  return {
    data: items,
    pagination: {
      nextCursor,
      hasNextPage,
    },
  };
}

// First page: GET /api/posts?pageSize=20
// Next page: GET /api/posts?cursor=64abc123def4567890123456&pageSize=20
```

## Cursor Pagination with Custom Sort Field

When sorting by a non-unique field like `createdAt`, use a compound cursor:

```javascript
async function getPageByCursor(collection, afterId, afterDate, pageSize) {
  const { ObjectId } = require('mongodb');

  let query = {};
  if (afterId && afterDate) {
    // Items after this point in the sort order
    query = {
      $or: [
        { createdAt: { $lt: new Date(afterDate) } },
        { createdAt: new Date(afterDate), _id: { $lt: new ObjectId(afterId) } },
      ],
    };
  }

  const items = await collection
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(pageSize + 1)
    .toArray();

  const hasNextPage = items.length > pageSize;
  if (hasNextPage) items.pop();

  let nextCursor = null;
  if (hasNextPage && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = {
      id: last._id.toString(),
      date: last.createdAt.toISOString(),
    };
  }

  return { data: items, pagination: { nextCursor, hasNextPage } };
}
```

## Index Strategy for Pagination

```javascript
// Ensure indexes support your sort order
// The default { _id: 1 } index already supports descending sort since single-field indexes can be traversed in either direction

// For createdAt + _id compound cursor
await db.collection('posts').createIndex({ createdAt: -1, _id: -1 });

// For filtered pagination
await db.collection('posts').createIndex({ userId: 1, createdAt: -1, _id: -1 });
```

## REST API Endpoint Example

```javascript
// Express.js paginated endpoint
router.get('/', async (req, res) => {
  const pageSize = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor || null;

  try {
    const result = await getPageCursor(db.collection('posts'), cursor, pageSize);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## When to Use Each Approach

```text
Offset pagination:
- Small collections (under 10,000 documents)
- Users need to jump to a specific page number
- Simple implementation is more important than performance

Cursor pagination:
- Large or growing collections
- Infinite scroll / "load more" UI patterns
- Consistent performance required
- Real-time data where results shift between pages
```

## Summary

Offset pagination is simple but slow on large collections because MongoDB must scan and discard `skip` documents. Cursor pagination using range queries on `_id` or compound sort fields maintains consistent performance regardless of collection size. Always create a compound index that matches your sort order and filter fields to prevent collection scans during pagination.
