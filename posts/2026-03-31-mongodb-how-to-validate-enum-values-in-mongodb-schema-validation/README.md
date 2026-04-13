# How to Validate Enum Values in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, ENUM, JSON Schema, Data Quality

Description: Learn how to use MongoDB's JSON Schema validation to enforce enum constraints on fields, ensuring only allowed values are accepted.

---

## Why Validate Enums at the Database Level

Validating enum values at the database level prevents invalid data even when application logic has bugs or when data is inserted directly via scripts or admin tools.

## Basic Enum Validation

Use the `enum` keyword in JSON Schema to restrict field values:

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status"],
      properties: {
        status: {
          bsonType: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          description: "Order status must be one of the allowed values"
        }
      }
    }
  }
})
```

## Testing the Validation

```javascript
// This succeeds
db.orders.insertOne({ status: "pending", item: "Widget" })

// This fails
db.orders.insertOne({ status: "archived" })
// WriteError: Document failed validation
```

## Multiple Enum Fields

Validate multiple enum fields in the same schema:

```javascript
db.createCollection("employees", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["role", "department", "employmentType"],
      properties: {
        role: {
          bsonType: "string",
          enum: ["engineer", "manager", "director", "analyst"]
        },
        department: {
          bsonType: "string",
          enum: ["engineering", "sales", "hr", "finance", "marketing"]
        },
        employmentType: {
          bsonType: "string",
          enum: ["full-time", "part-time", "contractor", "intern"]
        }
      }
    }
  }
})
```

## Allowing Null for Optional Enum Fields

If a field is optional but must be a valid enum value when present:

```javascript
properties: {
  priority: {
    bsonType: ["string", "null"],
    enum: ["low", "medium", "high", null]
  }
}
```

## Updating Validation on an Existing Collection

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status"],
      properties: {
        status: {
          bsonType: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
})
```

## Validation Levels and Actions

```javascript
// Warn instead of reject on violation (good for migration)
validationAction: "warn"

// Validate inserts and updates to already-valid documents (skip updates to non-compliant documents)
validationLevel: "moderate"

// Validate all writes including updates to existing invalid docs
validationLevel: "strict"
```

## Checking Existing Validation Rules

```javascript
db.getCollectionInfos({ name: "orders" })[0].options.validator
```

## Summary

MongoDB JSON Schema validation enforces enum constraints using the `enum` keyword in the validator specification. Apply it at collection creation or update it with `collMod`. Use `validationAction: "warn"` during migrations and switch to `"error"` once all existing data complies.
