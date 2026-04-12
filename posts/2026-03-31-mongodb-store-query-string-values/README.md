# How to Store and Query String Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, String, Query, Index, Collation

Description: Learn how MongoDB stores UTF-8 strings in BSON, how to perform case-insensitive and regex queries, and when to use collation for locale-aware sorting.

---

## String Type in BSON

MongoDB stores strings as BSON type `string` (type 2) encoded in UTF-8. All standard Unicode characters are supported, making it suitable for internationalized applications.

## Inserting String Values

```javascript
db.users.insertMany([
  { name: "Alice Chen", email: "alice@example.com", role: "admin" },
  { name: "Bob Smith", email: "bob@example.com", role: "viewer" },
  { name: "carlos garcia", email: "carlos@example.com", role: "viewer" },
]);
```

## Basic String Queries

```javascript
// Exact match (case-sensitive by default)
db.users.find({ role: "admin" });

// This will NOT match "Admin" or "ADMIN"
db.users.find({ role: "Admin" }); // returns nothing
```

## Case-Insensitive Queries

Use a regex with the `i` flag for case-insensitive matching:

```javascript
db.users.find({ role: { $regex: "^admin$", $options: "i" } });
```

For better performance, create a case-insensitive index using a collation:

```javascript
db.users.createIndex(
  { role: 1 },
  { collation: { locale: "en", strength: 2 } }
);

// Query must specify the same collation to use the index
db.users.find({ role: "Admin" }).collation({ locale: "en", strength: 2 });
```

## Prefix and Substring Queries

```javascript
// Prefix match - can use an index
db.users.find({ name: { $regex: "^Ali" } });

// Substring match - cannot use a standard index efficiently
db.users.find({ name: { $regex: "Smith" } });

// For word-based search at scale, use a text index instead
db.users.createIndex({ name: "text" });
db.users.find({ $text: { $search: "Smith" } });
```

## String Comparison in Aggregation

```javascript
db.users.aggregate([
  {
    $project: {
      nameUpper: { $toUpper: "$name" },
      nameLower: { $toLower: "$name" },
      nameLength: { $strLenCP: "$name" },
      firstName: { $arrayElemAt: [{ $split: ["$name", " "] }, 0] },
    },
  },
]);
```

## Sorting Strings with Collation

Without collation, MongoDB sorts strings by byte value (capital letters before lowercase):

```javascript
// Default sort: A, B, Z, a, b, z
db.users.find().sort({ name: 1 });

// Locale-aware sort respects language rules
db.users.find().sort({ name: 1 }).collation({ locale: "en", strength: 2 });
// Result: a, A, b, B, z, Z
```

## Trimming and Normalizing Strings

Use `$trim`, `$ltrim`, `$rtrim` in update pipelines to clean whitespace:

```javascript
db.users.updateMany({}, [
  {
    $set: {
      email: { $toLower: { $trim: { input: "$email" } } },
    },
  },
]);
```

## Schema Validation for Strings

Enforce minimum and maximum string lengths with pattern validation:

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        },
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
        },
      },
      required: ["email", "name"],
    },
  },
});
```

## Summary

MongoDB stores strings as UTF-8 BSON type 2 with full Unicode support. Case-insensitive queries work best with collation-backed indexes rather than regex, which cannot use standard indexes. Use `$regex` for prefix searches (index-friendly) or text indexes for full-text word search. Clean and normalize strings using aggregation pipeline operators like `$trim` and `$toLower` in update operations.
