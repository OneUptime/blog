# How to Query Documents by Regular Expression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Regex, Index, Text Search

Description: Learn how to use regular expressions in MongoDB queries with $regex, inline regex syntax, flags, and performance considerations with indexes.

---

Regular expressions let you perform flexible pattern matching on string fields in MongoDB. You can use them directly in queries or through the `$regex` operator, with support for case-insensitivity, multiline matching, and other flags.

## Inline Regex Syntax

MongoDB supports JavaScript-style regex literals in mongosh:

```javascript
// Find products where name starts with "Pro"
db.products.find({ name: /^Pro/ })

// Case-insensitive match
db.products.find({ name: /widget/i })
```

## Using the $regex Operator

The `$regex` operator provides an explicit, driver-portable syntax:

```javascript
db.products.find({
  name: { $regex: "^Pro", $options: "i" }
})
```

Available options:
- `i` - case-insensitive
- `m` - multiline (^ and $ match line boundaries)
- `x` - extended - allows whitespace and comments
- `s` - allows `.` to match newline characters

## Common Pattern Examples

```javascript
// Contains substring (case-insensitive)
db.articles.find({ title: { $regex: "mongodb", $options: "i" } })

// Starts with a prefix
db.users.find({ username: /^admin/ })

// Ends with a suffix
db.files.find({ filename: /\.pdf$/i })

// Matches email format (basic)
db.contacts.find({
  email: { $regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" }
})

// Contains digits
db.codes.find({ code: /\d{4,}/ })
```

## Regex with Other Query Operators

Combine regex with other conditions:

```javascript
db.products.find({
  category: "electronics",
  name: { $regex: "^Samsung", $options: "i" },
  price: { $lt: 500 }
})
```

## Index Behavior with Regex

Regex queries at the beginning of a string (anchored with `^`) can use an index efficiently:

```javascript
db.users.createIndex({ username: 1 })

// This uses the index (anchored prefix)
db.users.find({ username: /^john/ })

// This does NOT use the index efficiently (unanchored)
db.users.find({ username: /john/ })
```

Run explain to verify:

```javascript
db.users.find({ username: /^john/ }).explain("executionStats")
// Look for IXSCAN vs COLLSCAN
```

Case-insensitive regex (`/pattern/i`) does not use standard indexes. For case-insensitive searching with index support, use a case-insensitive collation index or text index instead.

## Case-Insensitive Queries with Collation Index

The `$regex` operator is not collation-aware, so collation indexes do not improve regex query performance. However, for case-insensitive equality or range matching, a collation index is very efficient:

```javascript
db.users.createIndex(
  { username: 1 },
  { collation: { locale: "en", strength: 2 } }
)

// Case-insensitive equality match (uses the collation index)
db.users.find(
  { username: "john" }
).collation({ locale: "en", strength: 2 })
```

For case-insensitive regex, you must use the `i` flag (`/^john/i`), but note that this will not use a standard index efficiently.

## Using $text Instead of Regex for Full-Text Search

For full-text search across one or more fields, a text index is far more efficient than regex:

```javascript
db.articles.createIndex({ content: "text" })

db.articles.find({ $text: { $search: "mongodb aggregation" } })
```

Use regex when you need precise pattern matching; use text indexes for word-based full-text search.

## Summary

MongoDB supports regex queries via inline literals or the `$regex` operator. Anchored prefix patterns (using `^`) can leverage standard indexes. Case-insensitive regex bypasses standard indexes - use collation indexes or text indexes for those scenarios. Always run `explain()` on regex queries in production to ensure you are not performing unintended collection scans.
