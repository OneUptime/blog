# How to Validate Nested Objects and Arrays in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Quality, Database

Description: Learn how to validate nested subdocuments and array fields in MongoDB using $jsonSchema, with practical examples for complex document structures.

---

MongoDB documents often contain nested objects and arrays. The `$jsonSchema` validator supports deep structural validation - you can define type, required, and constraint rules for fields at any nesting level. This guide covers validation patterns for common nested structures.

## Validating a Nested Subdocument

```javascript
db.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "address"],
      properties: {
        name: { bsonType: "string" },
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
              minLength: 2,
              maxLength: 2
            }
          }
        }
      }
    }
  }
});
```

**Valid insert:**

```javascript
db.customers.insertOne({
  name: "Alice",
  address: {
    street: "123 Main St",
    city: "Springfield",
    postalCode: "12345",
    country: "US"
  }
});
```

## Validating an Array of Primitives

```javascript
properties: {
  tags: {
    bsonType: "array",
    minItems: 1,
    maxItems: 10,
    uniqueItems: true,
    items: {
      bsonType: "string",
      minLength: 1,
      maxLength: 50
    },
    description: "1-10 unique string tags"
  }
}
```

## Validating an Array of Objects

```javascript
db.createCollection("invoices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["invoiceNumber", "lineItems"],
      properties: {
        invoiceNumber: { bsonType: "string" },
        lineItems: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["sku", "quantity", "unitPrice"],
            properties: {
              sku: { bsonType: "string" },
              description: { bsonType: "string" },
              quantity: {
                bsonType: "int",
                minimum: 1
              },
              unitPrice: {
                bsonType: "double",
                minimum: 0
              }
            }
          }
        }
      }
    }
  }
});
```

**Valid insert:**

```javascript
db.invoices.insertOne({
  invoiceNumber: "INV-2026-001",
  lineItems: [
    { sku: "WIDGET-A", quantity: NumberInt(5), unitPrice: 9.99 },
    { sku: "WIDGET-B", description: "Premium", quantity: NumberInt(2), unitPrice: 24.99 }
  ]
});
```

**Invalid - missing required field in array item:**

```javascript
db.invoices.insertOne({
  invoiceNumber: "INV-2026-002",
  lineItems: [
    { sku: "WIDGET-A", unitPrice: 9.99 }  // missing quantity
  ]
});
// Fails: Document failed validation
```

## Combining nested and Array Validation

A deeply nested real-world example:

```javascript
db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "date", "attendees"],
      properties: {
        name: { bsonType: "string" },
        date: { bsonType: "date" },
        venue: {
          bsonType: "object",
          properties: {
            name: { bsonType: "string" },
            address: { bsonType: "string" },
            capacity: { bsonType: "int", minimum: 1 }
          }
        },
        attendees: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["userId", "rsvp"],
            properties: {
              userId: { bsonType: "objectId" },
              rsvp: { enum: ["yes", "no", "maybe"] },
              checkedIn: { bsonType: "bool" }
            }
          }
        }
      }
    }
  }
});
```

## Checking Validation Details

To see why a document fails validation, use the `explain` approach with `validationAction: "warn"`:

```javascript
db.runCommand({
  collMod: "invoices",
  validationAction: "warn"
});
```

Then check logs for the full validation failure path including which nested field failed.

## Summary

MongoDB's `$jsonSchema` supports recursive nested validation: use `bsonType: "object"` with `required` and `properties` to validate subdocuments, and `bsonType: "array"` with `items` to validate each element in an array. Apply `minItems`, `maxItems`, and `uniqueItems` to control array shape. Nested validation applies the same rules as top-level validation, giving you complete control over deeply structured documents.
