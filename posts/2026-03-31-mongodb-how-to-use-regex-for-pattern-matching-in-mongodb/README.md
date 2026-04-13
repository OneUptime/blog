# How to Use $regex for Pattern Matching in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $regex, Pattern Matching, Regular Expression, Text Search, Query

Description: Learn how to use MongoDB's $regex operator for pattern matching queries, including case-insensitive search, anchors, and performance considerations versus text indexes.

---

## What Is the $regex Operator?

The `$regex` operator matches documents where a field value matches a regular expression pattern. MongoDB supports Perl-compatible regular expressions (PCRE).

```javascript
// Find users with Gmail addresses
db.users.find({ email: { $regex: '@gmail\\.com$' } })

// Shorthand using JavaScript regex literal
db.users.find({ email: /gmail\.com$/ })
```

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('myapp');
const products = db.collection('products');

// Match products with 'Pro' in the name (case-sensitive)
const proProducts = await products.find({
  name: { $regex: 'Pro' }
}).toArray();

// Using JS regex literal (equivalent)
const proProducts2 = await products.find({
  name: /Pro/
}).toArray();

// Case-insensitive match with $options
const caseInsensitive = await products.find({
  name: { $regex: 'pro', $options: 'i' }
}).toArray();

// Case-insensitive with regex literal
const caseInsensitive2 = await products.find({
  name: /pro/i
}).toArray();
```

## Common Regex Options

| Option | Meaning |
|--------|---------|
| `i` | Case-insensitive matching |
| `m` | Multiline mode (`^` and `$` match start/end of lines) |
| `x` | Extended mode (ignore whitespace and comments) |
| `s` | Allows `.` to match newline characters |

## Pattern Matching Examples

```javascript
// Starts with 'Apple'
const apple = await products.find({ name: /^Apple/i }).toArray();

// Ends with '.com'
const dotCom = await db.collection('sites').find({ url: /\.com$/i }).toArray();

// Contains 'wireless' anywhere
const wireless = await products.find({ description: /wireless/i }).toArray();

// Exactly 5 digits (product code)
const validCodes = await products.find({ code: /^\d{5}$/ }).toArray();

// Email validation pattern
const validEmails = await db.collection('users').find({
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
}).toArray();

// Starts with a letter, then any alphanumeric
const slugs = await products.find({ slug: /^[a-z][a-z0-9-]*$/ }).toArray();
```

## $regex in Aggregation

```javascript
// Filter in $match
const results = await products.aggregate([
  { $match: { name: { $regex: 'pro', $options: 'i' } } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
]).toArray();

// As an expression using $regexMatch (MongoDB 4.2+)
const withFlag = await products.aggregate([
  {
    $project: {
      name: 1,
      isPro: { $regexMatch: { input: '$name', regex: /pro/i } },
    }
  }
]).toArray();

// Extract matching part with $regexFind
const withMatch = await products.aggregate([
  {
    $project: {
      name: 1,
      proMatch: { $regexFind: { input: '$name', regex: /Pro\s*\d+/i } },
    }
  },
  { $match: { proMatch: { $ne: null } } },
]).toArray();
```

## PyMongo Usage

```python
import re
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['myapp']
products = db['products']

# Using Python regex
pro_products = list(products.find({'name': re.compile('pro', re.IGNORECASE)}))

# Using $regex operator
pro_products2 = list(products.find({'name': {'$regex': 'pro', '$options': 'i'}}))

# Starts with a specific letter
a_products = list(products.find({'name': re.compile('^A')}))
```

## Performance Considerations

### Anchored regex patterns use indexes

Case-sensitive regex patterns anchored to the start of the string (`^pattern`) can use an index efficiently:

```javascript
// This CAN use an index on 'name' (case-sensitive, anchored)
await products.find({ name: /^Apple/ })

// Case-insensitive regex generally CANNOT use indexes effectively,
// even with an anchor — the prefix optimization does not apply
await products.find({ name: /^Apple/i })

// These also CANNOT efficiently use an index (no anchor or end anchor)
await products.find({ name: /Apple/ })    // no anchor
await products.find({ name: /Apple$/i })  // end anchor
```

### Avoid unanchored regex on large collections

```javascript
// SLOW on large collections without text index:
await products.find({ description: /wireless headphones/i })

// FASTER: use $text with a text index for full-text search
await products.createIndex({ description: 'text' });
await products.find({ $text: { $search: 'wireless headphones' } })
```

### Check index usage

```javascript
const plan = await products
  .find({ name: /^Apple/ })
  .explain('executionStats');

console.log(plan.executionStats.executionStages.stage);
// 'FETCH' with inputStage 'IXSCAN' for case-sensitive anchored patterns on indexed fields
// 'COLLSCAN' for unanchored or case-insensitive patterns
```

## When to Use $regex vs. $text

| Use Case | Recommendation |
|----------|---------------|
| Case-sensitive prefix matching (`^pattern`) | `$regex` with index |
| Exact pattern matching | `$regex` |
| Full-text word search | `$text` with text index |
| Case-insensitive contains | `$text` (faster) or `$regex` with `i` flag |
| Multi-word phrase search | `$text` |

## Summary

MongoDB's `$regex` operator enables powerful pattern matching on string fields using PCRE syntax. Case-sensitive anchored patterns (starting with `^`) can leverage indexes for efficient execution, while unanchored or case-insensitive patterns require broader scans. Use the `i` option for case-insensitive matching, but be aware it prevents efficient index usage. For full-text search scenarios involving natural language queries, prefer `$text` with a text index over `$regex`, as it is significantly faster on large collections.
