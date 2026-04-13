# How to Set Up Collection-Level Validation Actions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, JSON Schema, Data Quality, Collection

Description: Learn how to configure MongoDB collection-level document validation with error and warn actions to enforce data quality at the database level.

---

## What Are Validation Actions?

MongoDB collection validators define rules that documents must pass before being inserted or updated. The `validationAction` setting controls what happens when a document fails validation:

- **`error`** (default) - reject the write with an error
- **`warn`** - allow the write but log a warning in the MongoDB log

Combined with `validationLevel` (`strict` or `moderate`), you can control when validation applies.

## Creating a Collection with Validation

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "createdAt"],
      properties: {
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 50,
          description: "Must be a string between 3 and 50 characters"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 150,
          description: "Must be an integer between 0 and 150"
        },
        role: {
          enum: ["admin", "editor", "viewer"],
          description: "Must be one of the allowed roles"
        },
        createdAt: {
          bsonType: "date",
          description: "Must be a date"
        }
      }
    }
  },
  validationAction: "error",   // reject invalid writes
  validationLevel: "strict"    // validate all inserts and updates
})
```

## Validation Actions Explained

### Error Action (strict enforcement)

```javascript
// validationAction: "error" - rejects invalid writes
try {
  await db.collection("users").insertOne({
    username: "ab",        // too short (min 3)
    email: "not-an-email",
    createdAt: new Date()
  })
} catch (err) {
  console.error(err.code)     // 121 (DocumentValidationFailure)
  console.error(err.errInfo)  // details about which rule failed
  /*
  {
    failingDocumentId: ObjectId("..."),
    details: {
      operatorName: "$jsonSchema",
      schemaRulesNotSatisfied: [
        { operatorName: "properties",
          propertiesNotSatisfied: [
            { propertyName: "username",
              description: "Must be a string between 3 and 50 characters",
              details: [{ operatorName: "minLength", specifiedAs: { minLength: 3 }, reason: "...", consideredValue: "ab" }]
            }
          ]
        }
      ]
    }
  }
  */
}
```

### Warn Action (non-blocking)

```javascript
// Create collection with warn action for gradual migration
db.createCollection("legacyOrders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["orderId", "amount"],
      properties: {
        orderId: { bsonType: "string" },
        amount: { bsonType: "double", minimum: 0 }
      }
    }
  },
  validationAction: "warn",  // allow writes but log warnings
  validationLevel: "moderate"
})

// This insert will succeed but generate a warning in mongod.log
await db.collection("legacyOrders").insertOne({
  orderId: "ORD-001"
  // missing "amount" field - validation fails but write is allowed
})
```

Check the MongoDB log for validation warnings:

```bash
grep "Document would fail validation" /var/log/mongodb/mongod.log
```

## Validation Levels

```javascript
// strict: validate all inserts and updates (default)
// moderate: only validate new inserts and updates to valid documents

// Example: add validation to existing collection without rejecting existing data
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "status"],
      properties: {
        status: { enum: ["pending", "shipped", "delivered", "cancelled"] }
      }
    }
  },
  validationAction: "warn",    // start with warn
  validationLevel: "moderate"  // don't revalidate existing documents
})
```

## Modifying Existing Validation

```javascript
// Update validation rules on an existing collection
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "createdAt", "status"],
      properties: {
        username: { bsonType: "string", minLength: 3 },
        email: {
          bsonType: "string",
          pattern: "^.+@.+\\..+$"
        },
        status: {
          enum: ["active", "suspended", "deleted"]
        },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
})
```

## Viewing Current Validation Rules

```javascript
// Get validation rules for a collection
db.getCollectionInfos({ name: "users" })[0].options.validator

// Or use listCollections
db.runCommand({
  listCollections: 1,
  filter: { name: "users" }
}).cursor.firstBatch[0].options
```

## Bypassing Validation

For administrative data corrections, bypass validation using the `bypassDocumentValidation` option:

```javascript
// Only available to users with the bypassDocumentValidation privilege
await db.collection("users").insertOne(
  { username: "x", email: "legacy-format" },
  { bypassDocumentValidation: true }
)
```

## Gradual Rollout Strategy

For existing collections, roll out validation gradually:

```javascript
// Phase 1: warn mode - collect metrics without blocking writes
db.runCommand({ collMod: "orders", validationAction: "warn", validator: schema })

// Monitor logs for 1-2 weeks

// Phase 2: switch to error mode once application is compliant
db.runCommand({ collMod: "orders", validationAction: "error" })
```

## Summary

MongoDB collection validators enforce document structure using `$jsonSchema` with either `error` (reject invalid writes) or `warn` (log but allow) actions. Use `error` for strict enforcement in production, and `warn` during gradual rollouts or when adding validation to collections with legacy data. The `validationLevel` `moderate` setting prevents revalidating existing documents that may not conform to new rules.
