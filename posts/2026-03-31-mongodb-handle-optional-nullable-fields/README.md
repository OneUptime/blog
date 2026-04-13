# How to Handle Optional/Nullable Fields in MongoDB Schemas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Validation, Design

Description: Learn how to model optional and nullable fields in MongoDB schemas, using JSON Schema validation, sparse indexes, and defensive query patterns.

---

## Optional vs. Nullable: the Difference

- **Optional field**: The field may or may not be present in a document.
- **Nullable field**: The field is always present but its value may be `null`.

MongoDB is schema-flexible by default, so both are allowed. The question is which convention you adopt and how to enforce it consistently.

## Choosing a Convention

Prefer **nullable** (always present, value is `null` when empty) when:
- You need to distinguish "not set" from "absent" for auditing.
- Application code always expects the key to exist.

Prefer **optional** (field absent) when:
- The field applies to only a small subset of documents (e.g., `premiumExpiry` on users).
- Omitting the field saves meaningful storage for large collections.

## Enforcing Nullable Fields with JSON Schema

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "phone"],
      properties: {
        email: { bsonType: "string" },
        phone: {
          oneOf: [
            { bsonType: "string" },
            { bsonType: "null" }
          ]
        }
      }
    }
  }
})
```

This requires `phone` to be present but allows it to be `null`.

## Querying for Null and Missing Values

In MongoDB, a query `{ phone: null }` matches both `null` values and documents where the field is absent:

```javascript
// Matches: { phone: null } AND { /* no phone field */ }
db.users.find({ phone: null })
```

To distinguish them, combine `$exists`:

```javascript
// Only documents with phone explicitly set to null
db.users.find({ phone: { $type: "null" } })

// Only documents missing the phone field entirely
db.users.find({ phone: { $exists: false } })
```

## Using $ifNull in Aggregation

`$ifNull` provides a default when a field is absent or null, making downstream logic cleaner:

```javascript
db.users.aggregate([
  {
    $project: {
      displayPhone: { $ifNull: ["$phone", "N/A"] },
      email: 1
    }
  }
])
```

## Sparse Indexes for Optional Fields

A regular index on an optional field includes `null` entries for every document missing the field, inflating index size. Use a sparse index instead - it only indexes documents where the field exists:

```javascript
db.users.createIndex({ phone: 1 }, { sparse: true })
```

Or use a partial index to index only non-null values:

```javascript
db.users.createIndex(
  { phone: 1 },
  { partialFilterExpression: { phone: { $type: "string" } } }
)
```

## Application-Layer Defensive Pattern (Node.js)

Always use `?.` (optional chaining) or nullish coalescing when reading optional fields:

```javascript
const phone = user.phone ?? "No phone provided";
const city = user.address?.city ?? "Unknown";
```

## Python Defensive Pattern

```python
phone = user.get("phone") or "No phone provided"
city = (user.get("address") or {}).get("city", "Unknown")
```

## Setting Optional Fields with $set and $unset

To explicitly set a field to null:

```javascript
db.users.updateOne({ _id: userId }, { $set: { phone: null } })
```

To remove an optional field entirely (saving storage):

```javascript
db.users.updateOne({ _id: userId }, { $unset: { phone: "" } })
```

## Summary

Choose a consistent convention: either nullable (field always present, value null when empty) or optional (field absent when not applicable). Use JSON Schema validation to enforce nullability. Use sparse or partial indexes on optional fields to avoid index bloat. In application code, use null-safe access patterns. Use `$ifNull` in aggregation to provide safe defaults when reading optional fields.
