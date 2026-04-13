# How to Query Documents Where a Field Contains a Substring in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Text Search, Query, String

Description: Learn how to search for substrings in MongoDB using regex, $text search, and Atlas Search, with performance considerations and index strategies.

---

## Querying With a Regular Expression

MongoDB supports regex queries using the `$regex` operator or JavaScript regex literals. This is the simplest way to find documents where a field contains a substring:

```javascript
// Find products whose name contains "widget" (case-sensitive)
const results = await db.collection('products').find({
  name: { $regex: 'widget' }
}).toArray();

// Equivalent shorthand
const results2 = await db.collection('products').find({
  name: /widget/
}).toArray();
```

## Case-Insensitive Search

Add the `i` flag for case-insensitive matching:

```javascript
// Matches "Widget", "WIDGET", "widget", etc.
const results = await db.collection('products').find({
  name: { $regex: 'widget', $options: 'i' }
}).toArray();

// Shorthand
const results2 = await db.collection('products').find({
  name: /widget/i
}).toArray();
```

## Anchoring Patterns

Use anchors for prefix or suffix searches (prefix searches can use indexes):

```javascript
// Starts with "wid" - can use a regular index on 'name'
const startsWith = await db.collection('products').find({
  name: /^wid/i
}).toArray();

// Ends with "get"
const endsWith = await db.collection('products').find({
  name: /get$/i
}).toArray();
```

## Performance Warning: Regex Without Index

A regex with a leading wildcard (`/.*widget/`) performs a collection scan. An index on the field helps only with prefix anchored patterns (`/^widget/`).

```javascript
// This uses the index on 'name' (prefix-anchored, case-sensitive)
await db.collection('products').createIndex({ name: 1 });
db.collection('products').find({ name: /^widget/ }).explain(); // shows IXSCAN
```

For arbitrary substring searches, prefer full-text search.

## Full-Text Search With $text

For efficient full-word searching, create a text index:

```javascript
// Create a text index on one or more fields
await db.collection('products').createIndex({ name: 'text', description: 'text' });

// Search for "widget" or "gadget"
const results = await db.collection('products').find(
  { $text: { $search: 'widget gadget' } },
  { projection: { score: { $meta: 'textScore' } } }
).sort({ score: { $meta: 'textScore' } }).toArray();
```

Text index limitations: only one text index per collection, no support for partial word matching.

## Atlas Search for Advanced Substring Queries

For production substring search with wildcard support, use MongoDB Atlas Search:

```javascript
// Atlas Search with wildcard phrase
const results = await db.collection('products').aggregate([
  {
    $search: {
      index: 'default',
      wildcard: {
        query: '*widge*',
        path: 'name',
        allowAnalyzedField: true
      }
    }
  },
  { $limit: 20 }
]).toArray();
```

## Substring Search in an Array Field

To search for a substring in any element of an array field:

```javascript
// Find products where any tag contains "electro"
const results = await db.collection('products').find({
  tags: { $regex: 'electro', $options: 'i' }
}).toArray();
```

## Combining Substring With Other Conditions

```javascript
// Products starting with "Widget" that are in stock and priced under $50
const results = await db.collection('products').find({
  name: /^Widget/i,
  inStock: true,
  price: { $lt: 50 }
}).toArray();
```

## Summary

Use `$regex` for simple substring queries, anchored patterns (`/^prefix/`) to leverage regular indexes, `$text` with a text index for full-word searches, and Atlas Search for production-grade wildcard substring matching. Avoid unanchored regex on large collections without a text index, as they perform full collection scans.
