# How to Use Enum Validation in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Quality, Database

Description: Learn how to use enum constraints in MongoDB $jsonSchema validation to restrict field values to a predefined set, enforcing data consistency at the database level.

---

The `enum` keyword in MongoDB's `$jsonSchema` validation restricts a field's value to a specific list of allowed values. This is ideal for status fields, categories, roles, and any field that should only contain values from a known set.

## Basic Enum Validation

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status", "priority"],
      properties: {
        status: {
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          description: "Status must be one of the allowed values"
        },
        priority: {
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority must be low, medium, high, or urgent"
        }
      }
    }
  }
});
```

## Testing Enum Enforcement

**Valid insert:**

```javascript
db.orders.insertOne({
  status: "pending",
  priority: "high"
});
// Succeeds
```

**Invalid - value not in enum:**

```javascript
db.orders.insertOne({
  status: "dispatched",  // not in the allowed list
  priority: "high"
});
```

Error:

```text
MongoServerError: Document failed validation
```

## Combining enum with bsonType

Combine `enum` with `bsonType` for stricter validation that also checks the type:

```javascript
properties: {
  role: {
    bsonType: "string",
    enum: ["admin", "editor", "viewer", "guest"],
    description: "Role must be a string and one of the defined roles"
  },
  statusCode: {
    bsonType: "int",
    enum: [0, 1, 2, 3],
    description: "Status code must be 0, 1, 2, or 3"
  }
}
```

## Allowing null in Enum

Include `null` in the enum list to allow the field to have a null value while still constraining non-null values. Note that field absence is controlled by the `required` array, not by `null` in the enum:

```javascript
properties: {
  category: {
    enum: ["electronics", "clothing", "books", "food", null],
    description: "Category can be null or one of the defined categories"
  }
}
```

## Enum Validation on Nested Fields

Apply enum constraints to fields inside subdocuments:

```javascript
db.createCollection("employees", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        contract: {
          bsonType: "object",
          properties: {
            type: {
              enum: ["full-time", "part-time", "contractor", "intern"],
              description: "Contract type must be valid"
            },
            level: {
              enum: ["L1", "L2", "L3", "L4", "L5"],
              description: "Level must be L1 through L5"
            }
          }
        }
      }
    }
  }
});
```

## Enum Validation on Array Elements

```javascript
properties: {
  permissions: {
    bsonType: "array",
    items: {
      enum: ["read", "write", "delete", "admin"],
      description: "Each permission must be a valid permission string"
    },
    uniqueItems: true
  }
}
```

**Valid insert:**

```javascript
db.roles.insertOne({
  name: "editor",
  permissions: ["read", "write"]
});
```

**Invalid - unknown permission:**

```javascript
db.roles.insertOne({
  name: "superuser",
  permissions: ["read", "execute"]  // 'execute' not in enum
});
// Fails validation
```

## Updating Enum Values

When business requirements change and you need to add new allowed values, update the validator:

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        status: {
          enum: ["pending", "processing", "shipped", "delivered", "cancelled", "returned"]
        }
      }
    }
  }
});
```

## Summary

The `enum` keyword in MongoDB's `$jsonSchema` validation constrains field values to a predefined list, preventing invalid states from entering the database. Combine `enum` with `bsonType` for complete field validation, include `null` in the enum list to permit optional fields, and apply enum constraints to array items using the `items` keyword. When your allowed values change, update the validator with `collMod`.
