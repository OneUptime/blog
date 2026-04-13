# How to Validate Nested Object Structure in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Nested Object, JSON Schema, Data Quality

Description: Learn how to define nested object validation rules in MongoDB's JSON Schema to enforce structure and types deep within embedded documents.

---

## Nested Object Validation Overview

MongoDB's JSON Schema validator supports nested `properties` definitions, letting you enforce structure at any depth in your documents.

## Basic Nested Object Validation

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "address"],
      properties: {
        name: {
          bsonType: "string",
          description: "Full name is required"
        },
        address: {
          bsonType: "object",
          required: ["street", "city", "country"],
          properties: {
            street: { bsonType: "string" },
            city: { bsonType: "string" },
            state: { bsonType: "string" },
            postalCode: {
              bsonType: "string",
              pattern: "^[0-9]{5}(-[0-9]{4})?$"
            },
            country: {
              bsonType: "string",
              enum: ["US", "CA", "UK", "AU"]
            }
          }
        }
      }
    }
  }
})
```

## Testing the Validation

```javascript
// Succeeds
db.users.insertOne({
  name: "Alice Smith",
  address: {
    street: "123 Main St",
    city: "Springfield",
    country: "US"
  }
})

// Fails - country is required inside address
db.users.insertOne({
  name: "Bob Jones",
  address: { street: "456 Elm St", city: "Portland" }
})
```

## Deeply Nested Structures

Validate objects nested multiple levels deep:

```javascript
db.createCollection("organizations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        contact: {
          bsonType: "object",
          properties: {
            primary: {
              bsonType: "object",
              required: ["email"],
              properties: {
                email: {
                  bsonType: "string",
                  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                },
                phone: { bsonType: "string" }
              }
            }
          }
        }
      }
    }
  }
})
```

## Validating Arrays of Objects

Validate that each element in an array matches a nested schema:

```javascript
properties: {
  lineItems: {
    bsonType: "array",
    items: {
      bsonType: "object",
      required: ["sku", "quantity", "price"],
      properties: {
        sku: { bsonType: "string" },
        quantity: {
          bsonType: "int",
          minimum: 1
        },
        price: {
          bsonType: "decimal",
          minimum: 0
        }
      }
    }
  }
}
```

## Conditional Nested Validation

Use `anyOf` with `not` to express conditional rules (MongoDB's `$jsonSchema` does not support `if`/`then`/`else`):

```javascript
{
  anyOf: [
    {
      not: {
        required: ["type"],
        properties: { type: { enum: ["business"] } }
      }
    },
    {
      required: ["taxId"],
      properties: {
        taxId: { bsonType: "string" }
      }
    }
  ]
}
```

This reads as: either the document does not have `type` set to `"business"`, or `taxId` must be present and be a string.

## Viewing and Updating Nested Validators

```javascript
// View current schema
db.getCollectionInfos({ name: "users" })[0].options.validator.$jsonSchema

// Update validation
db.runCommand({
  collMod: "users",
  validator: { $jsonSchema: { /* updated schema */ } }
})
```

## Summary

MongoDB JSON Schema validation handles nested objects by embedding `bsonType: "object"` with nested `properties` and `required` arrays at each level. Arrays of embedded documents use the `items` keyword. This approach enforces structural contracts deep within your documents without requiring application-level validation.
