# How to Add JSON Schema Validation to a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, JSON Schema, Data Quality, Collection

Description: Enforce data structure rules on MongoDB collections using JSON Schema validation to prevent invalid documents from being inserted or updated.

---

## What Is Collection Validation?

MongoDB supports document validation using JSON Schema (draft 4 spec with extensions). Validation rules are enforced on inserts and updates. You can choose how strictly to enforce them: reject invalid documents or just warn about them.

## Step 1: Add Validation When Creating a Collection

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 30,
          pattern: "^[a-zA-Z0-9_]+$",
          description: "Must be a string of 3-30 alphanumeric characters"
        },
        email: {
          bsonType: "string",
          pattern: "^[^@]+@[^@]+\\.[^@]+$",
          description: "Must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 150,
          description: "Age must be between 0 and 150"
        },
        role: {
          bsonType: "string",
          enum: ["admin", "editor", "viewer"],
          description: "Must be one of: admin, editor, viewer"
        },
        createdAt: {
          bsonType: "date",
          description: "Must be a BSON date"
        }
      },
      additionalProperties: false
    }
  },
  validationLevel: "strict",     // "strict" (default) or "moderate"
  validationAction: "error"      // "error" (default) or "warn"
})
```

- `validationLevel: "strict"`: All inserts and updates must pass validation
- `validationLevel: "moderate"`: New inserts must pass; updates to existing invalid documents are allowed
- `validationAction: "error"`: Reject invalid operations
- `validationAction: "warn"`: Allow invalid operations but log warnings

## Step 2: Add Validation to an Existing Collection

Use `collMod` to add or update validation:

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "items", "total", "status"],
      properties: {
        customerId: { bsonType: "objectId" },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["productId", "quantity", "price"],
            properties: {
              productId: { bsonType: "objectId" },
              quantity: { bsonType: "int", minimum: 1 },
              price: { bsonType: "decimal", minimum: 0 }
            }
          }
        },
        total: {
          bsonType: "decimal",
          minimum: 0
        },
        status: {
          bsonType: "string",
          enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        },
        shippingAddress: {
          bsonType: "object",
          required: ["street", "city", "country"],
          properties: {
            street: { bsonType: "string" },
            city: { bsonType: "string" },
            country: { bsonType: "string", minLength: 2, maxLength: 2 }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

## Step 3: Test Validation

```javascript
// Valid insert - succeeds
db.users.insertOne({
  username: "alice123",
  email: "alice@example.com",
  role: "viewer",
  createdAt: new Date()
})

// Invalid insert - missing required field
db.users.insertOne({
  username: "bob",
  role: "viewer"
  // Missing: email, createdAt
})
// MongoServerError: Document failed validation
// Reason: field 'email' is required

// Invalid enum value
db.users.insertOne({
  username: "carol",
  email: "carol@example.com",
  role: "superadmin",  // Not in enum
  createdAt: new Date()
})
// MongoServerError: Document failed validation
```

## Step 4: View Existing Validation Rules

```javascript
db.getCollectionInfos({ name: "users" })[0].options.validator
```

Or:

```javascript
db.runCommand({ listCollections: 1, filter: { name: "users" } })
  .cursor.firstBatch[0].options.validator
```

## Step 5: Combine JSON Schema with Query Operators

MongoDB validation supports `$and`, `$or`, `$nor` alongside `$jsonSchema`:

```javascript
db.createCollection("products", {
  validator: {
    $and: [
      {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "price"],
          properties: {
            name: { bsonType: "string", minLength: 1 },
            price: { bsonType: "decimal", minimum: 0 },
            discountedPrice: { bsonType: "decimal", minimum: 0 }
          }
        }
      },
      {
        $or: [
          { discountedPrice: { $exists: false } },
          { $expr: { $lte: ["$discountedPrice", "$price"] } }
        ]
      }
    ]
  }
})
```

This ensures `discountedPrice` (if present) is never greater than `price` - a business rule that pure JSON Schema can't express.

## Step 6: Bypass Validation for Admin Operations

During migrations, bypass validation with `bypassDocumentValidation`:

```javascript
db.runCommand({
  insert: "users",
  documents: [{ username: "legacy-user", createdAt: new Date("2010-01-01") }],
  bypassDocumentValidation: true
})
```

Or in the Node.js driver:

```javascript
await collection.insertOne(legacyDocument, { bypassDocumentValidation: true });
```

Requires `dbAdmin` role.

## Step 7: Remove Validation

To remove all validation rules:

```javascript
db.runCommand({
  collMod: "users",
  validator: {},
  validationLevel: "off"
})
```

## Common BSON Types

```text
"string"     - String
"int"        - 32-bit integer
"long"       - 64-bit integer
"double"     - Double
"decimal"    - Decimal128
"bool"       - Boolean
"date"       - BSON Date
"objectId"   - ObjectId
"array"      - Array
"object"     - Embedded document
"null"       - Null
"binData"    - Binary data
```

## Summary

MongoDB collection validation uses `$jsonSchema` to enforce document structure on inserts and updates. Define required fields, field types, enum values, string patterns, and numeric ranges in the schema. Use `validationAction: "error"` to reject invalid documents or `"warn"` for gradual adoption. Add validation to existing collections with `collMod`, and bypass it with `bypassDocumentValidation` for bulk migrations that need to insert legacy data.
