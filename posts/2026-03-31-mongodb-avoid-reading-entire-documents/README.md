# How to Avoid Reading Entire Documents When You Only Need a Few Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Projection, Performance, Anti-Pattern, Optimization

Description: Learn how to use MongoDB projections to fetch only the fields you need, reducing network transfer, memory usage, and query latency.

---

One of the most common MongoDB performance mistakes is fetching entire documents when only a few fields are needed. Large documents transferred over the network waste bandwidth, increase deserialization time, and consume more application memory. Projections are MongoDB's mechanism to return only the fields you need.

## The Problem

Consider a user document with 30 fields - profile data, settings, history, preferences. If you only need the user's name and email for a display component, fetching the whole document wastes resources:

```javascript
// BAD - fetches 30 fields when you need 2
const user = await db.collection('users').findOne({ _id: userId });
displayUserCard(user.name, user.email);  // only uses name and email
```

On a collection with millions of documents and high query volume, this unnecessary data transfer adds up significantly.

## Using Projections

Pass a projection document as the second argument to `find` or `findOne`. Specify `1` for fields to include or `0` to exclude:

```javascript
// GOOD - fetch only what you need
const user = await db.collection('users').findOne(
  { _id: userId },
  { projection: { name: 1, email: 1, _id: 0 } }
);
```

Note: `_id` is included by default. Explicitly exclude it with `_id: 0` if you don't need it.

## Inclusion vs Exclusion Projections

You cannot mix inclusion and exclusion (except for `_id`):

```javascript
// VALID - all inclusions (plus _id: 0 exclusion)
{ projection: { name: 1, email: 1, _id: 0 } }

// VALID - all exclusions
{ projection: { passwordHash: 0, internalNotes: 0 } }

// INVALID - cannot mix (throws error)
{ projection: { name: 1, passwordHash: 0 } }
```

Use inclusion projections when you know exactly which small set of fields you need. Use exclusion projections when you want almost all fields but need to strip a few sensitive ones.

## Nested Field Projections

Use dot notation to project specific nested fields:

```javascript
const order = await db.collection('orders').findOne(
  { _id: orderId },
  { projection: { 'address.city': 1, 'address.country': 1, total: 1, _id: 0 } }
);
// Returns: { total: 99.99, address: { city: "New York", country: "US" } }
```

## Covered Queries - Maximum Performance

When the projection contains only fields that are part of an index, MongoDB can answer the query entirely from the index without reading the actual document (a "covered query"). This is the fastest possible read path:

```javascript
// Index on { userId: 1, status: 1, createdAt: 1 }
db.orders.createIndex({ userId: 1, status: 1, createdAt: 1 });

// This query is fully covered - no document reads required
const orders = await db.collection('orders').find(
  { userId: "usr_123" },
  { projection: { userId: 1, status: 1, createdAt: 1, _id: 0 } }
).toArray();
```

Verify with `explain("executionStats")` - look for `PROJECTION_COVERED` stage with no `FETCH` stage.

## Array Element Projection

Use `$slice` to return only part of an array:

```javascript
// Return only the first 5 comments from a post
const post = await db.collection('posts').findOne(
  { _id: postId },
  { projection: { title: 1, comments: { $slice: 5 } } }
);
```

## Performance Impact

The difference can be dramatic for large documents. A document with 50KB of embedded data fetched without projection vs a 200-byte projected result means 250x less data per query. At 10,000 queries per second, that is a significant reduction in network I/O and memory allocation.

## Summary

Always use projections when fetching documents in MongoDB. Specify exactly which fields your application needs rather than returning entire documents. For read-heavy paths, design indexes to enable covered queries - where the projection only touches indexed fields, avoiding document reads entirely. This habit consistently reduces latency, network usage, and memory pressure in production systems.
