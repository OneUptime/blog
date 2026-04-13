# How to Avoid Using Regex Without Anchors for Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Index, Performance, Anti-Pattern

Description: Learn why unanchored regex queries in MongoDB cause full collection scans and how to use anchored patterns or text indexes for better performance.

---

Regular expressions are a powerful query tool in MongoDB, but unanchored regex patterns - those that don't start with `^` - cannot use indexes and will scan the entire collection. This is one of the most common causes of unexpectedly slow queries in MongoDB applications.

## How Regex Index Usage Works

MongoDB can use an index for a regex query only when the pattern is anchored to the start of the string with `^`. This is because indexes store string values in sorted order - a prefix scan is possible, but a mid-string search requires checking every value.

```javascript
// CAN use index - anchored at start
db.products.find({ name: /^laptop/ });

// CANNOT use index - unanchored, requires full scan
db.products.find({ name: /laptop/ });

// CANNOT use index - anchored at end only
db.products.find({ name: /laptop$/ });
```

## The Performance Impact

On a collection with 1 million documents, the difference is stark:

```javascript
// SLOW - unanchored, COLLSCAN
db.products.find({ sku: /ABC/ }).explain("executionStats");
// nDocsExamined: 1000000
// executionTimeMillis: 2300

// FAST - anchored, IXSCAN
db.products.find({ sku: /^ABC/ }).explain("executionStats");
// nDocsExamined: 42
// executionTimeMillis: 1
```

## Verify with explain()

Always check your regex queries with `explain("executionStats")`:

```javascript
db.users.find({ email: /gmail/ }).explain("executionStats");
// Look for: winningPlan.stage
// "COLLSCAN" = bad (no index used)
// "IXSCAN" = good (index used)
```

## Replacing Mid-String Searches with Text Indexes

If you need to find a pattern anywhere within a string (not just at the start), use a text index instead of an unanchored regex:

```javascript
// Create text index on searchable fields
db.articles.createIndex({ title: "text", body: "text" });

// Use $text search instead of regex
db.articles.find({ $text: { $search: "mongodb performance" } });
```

Text indexes support stemming, stop-word filtering, and relevance scoring.

## Restructuring Data for Prefix Queries

If your use case requires searching by a known prefix, structure your data so the prefix comes first:

```javascript
// If users search by domain in email addresses, store domain separately
const userDoc = {
  email: "alice@company.com",
  emailDomain: "company.com"  // store separately for efficient querying
};

// Create index on emailDomain
db.users.createIndex({ emailDomain: 1 });

// Now this query uses an index efficiently
db.users.find({ emailDomain: /^company/ });
```

## Case-Insensitive Anchored Queries

Case-insensitive regex options (`i`) disable index usage even for anchored patterns. Additionally, `$regex` does not support collation and cannot use case-insensitive collation indexes. To perform case-insensitive searches efficiently, avoid regex and use string comparison with a collation index:

```javascript
// Create case-insensitive index
db.users.createIndex(
  { username: 1 },
  { collation: { locale: "en", strength: 2 } }
);

// Query with matching collation - uses index (no regex needed)
db.users.find({ username: "alice" }).collation({ locale: "en", strength: 2 });
```

## When Unanchored Regex Is Acceptable

Unanchored regex is acceptable on small collections (under ~10,000 documents) where full scans are fast, or in rare administrative queries that run infrequently. Never use unanchored regex in hot query paths on large collections.

## Summary

Unanchored regex patterns in MongoDB cause collection scans because indexes cannot support mid-string searches. Always anchor performance-critical regex queries to the start of the string with `^`. For arbitrary substring matching, use text indexes with `$text` search. Verify query plans with `explain("executionStats")` and treat any `COLLSCAN` from a regex query as a red flag that needs architectural review.
