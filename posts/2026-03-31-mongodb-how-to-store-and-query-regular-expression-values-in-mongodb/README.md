# How to Store and Query Regular Expression Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regular Expression, Regex, BSON, Queries

Description: Learn how to store regex patterns as BSON values in MongoDB documents and use them to dynamically match strings in application queries.

---

## Storing vs Querying with Regex

MongoDB supports two distinct uses of regular expressions:

1. **Querying with regex** - use a pattern to find matching documents (`$regex` operator)
2. **Storing regex as a value** - save a regex pattern as a document field using the BSON Regex type

This post covers both, with a focus on storing regex patterns as data.

## The BSON Regex Type

MongoDB's BSON format includes a native `regex` type that stores a pattern and optional flags. You can store these in documents and later retrieve them for use in your application.

## Storing Regex in mongosh

```javascript
// Insert a document with a stored regex pattern
db.validationRules.insertOne({
  fieldName: "email",
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  description: "Valid email address format",
  active: true
})

// Store with flags
db.validationRules.insertOne({
  fieldName: "username",
  pattern: /^[a-z][a-z0-9_]{2,19}$/i,  // case-insensitive flag
  description: "Username: letter, then alphanumeric/underscore, 3-20 chars",
  active: true
})

// View stored regex
db.validationRules.findOne({ fieldName: "email" }).pattern
// /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

## Storing Regex in Node.js

```javascript
const { MongoClient } = require("mongodb")

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()
const db = client.db("myapp")

// Store regex patterns for a rule engine
await db.collection("filterRules").insertMany([
  {
    ruleId: "rule-001",
    name: "Block disposable emails",
    pattern: /@(mailinator|guerrillamail|tempmail|throwaway)\./i,
    action: "block",
    priority: 1
  },
  {
    ruleId: "rule-002",
    name: "Allow corporate emails",
    pattern: /@(company\.com|subsidiary\.org)$/i,
    action: "allow",
    priority: 2
  }
])
```

## Retrieving and Using Stored Regex

```javascript
// Retrieve rules and use them for matching
const rules = await db.collection("filterRules")
  .find({ action: "block" })
  .sort({ priority: 1 })
  .toArray()

function applyRules(email, rules) {
  for (const rule of rules) {
    // The pattern field is already a JavaScript RegExp object
    if (rule.pattern.test(email)) {
      return { blocked: true, reason: rule.name }
    }
  }
  return { blocked: false }
}

const result = applyRules("user@mailinator.com", rules)
console.log(result)  // { blocked: true, reason: "Block disposable emails" }
```

## Querying Documents Using the $type Operator

```javascript
// Find all documents where a field contains a BSON regex type
db.validationRules.find({ pattern: { $type: "regex" } })

// BSON type number for regex is 11
db.validationRules.find({ pattern: { $type: 11 } })
```

## Querying for Specific Regex Patterns

Find documents where the stored regex matches a specific string (meta-query):

```javascript
// Find rules whose pattern would match a test string
// Note: MongoDB cannot execute stored regex - you must fetch and apply in application code
// The $regex operator is for querying STRING fields, not REGEX fields

// FETCH all active rules
const activeRules = await db.collection("filterRules")
  .find({ active: true })
  .toArray()

// Apply in application layer
const matchingRules = activeRules.filter(rule => rule.pattern.test(inputValue))
```

## Updating Stored Regex Patterns

```javascript
// Update a stored regex
await db.collection("validationRules").updateOne(
  { fieldName: "email" },
  {
    $set: {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/,
      updatedAt: new Date()
    }
  }
)

// Verify the update
const rule = await db.collection("validationRules").findOne({ fieldName: "email" })
console.log(rule.pattern)  // updated regex
```

## Python: Storing and Retrieving Regex

```python
from pymongo import MongoClient
import re

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]

# Store a Python regex in MongoDB
# PyMongo uses bson.regex.Regex for stored regex values
from bson.regex import Regex

db.patterns.insert_one({
    "name": "phone_us",
    "pattern": Regex(r"^\+?1?\s*[-.]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$"),
    "description": "US phone number format"
})

# Retrieve and use
doc = db.patterns.find_one({"name": "phone_us"})
pattern = doc["pattern"]

# Convert to Python re object for matching
regex = re.compile(pattern.pattern, pattern.flags)
print(bool(regex.match("+1-555-867-5309")))  # True
```

## Indexing Regex Fields

MongoDB cannot use a standard index to optimize queries against the BSON regex type itself. However, you can index metadata:

```javascript
// Index on active flag and priority for efficient rule loading
db.filterRules.createIndex({ active: 1, priority: 1 })

// Load only active, high-priority rules efficiently
const rules = await db.collection("filterRules")
  .find({ active: true })
  .sort({ priority: 1 })
  .limit(50)
  .toArray()
```

## Use Case: Dynamic Routing Rules

```javascript
// Store URL routing rules as regex patterns
await db.collection("routes").insertMany([
  { pattern: /^\/api\/v1\/users\/(\d+)$/, handler: "userHandler", group: 1, active: true },
  { pattern: /^\/api\/v1\/orders$/, handler: "orderListHandler", active: true },
  { pattern: /^\/static\/(.+)$/, handler: "staticFileHandler", group: 1, active: true }
])

// Route a request
async function routeRequest(path) {
  const routes = await db.collection("routes").find({ active: true }).toArray()

  for (const route of routes) {
    const match = route.pattern.exec(path)
    if (match) {
      return {
        handler: route.handler,
        params: route.group ? match[route.group] : null
      }
    }
  }
  return null
}

const result = await routeRequest("/api/v1/users/42")
// { handler: "userHandler", params: "42" }
```

## Summary

MongoDB's BSON Regex type allows storing regular expression patterns directly in documents. Use JavaScript regex literals in `mongosh` and the Node.js driver, or `bson.regex.Regex` in Python to store patterns. Retrieved patterns are native regex objects, ready to use in application-layer matching logic. MongoDB cannot execute stored regex against other fields, so pattern matching must happen in your application code after fetching the stored rules.
