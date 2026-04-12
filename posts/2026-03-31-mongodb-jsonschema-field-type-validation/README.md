# How to Validate Field Types with $jsonSchema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Quality, Database

Description: Learn how to enforce field data types in MongoDB collections using $jsonSchema bsonType validation, preventing type mismatches at the database level.

---

MongoDB is schema-flexible by default, meaning documents can store any value type for any field. While this is powerful, it can cause bugs when applications expect consistent types. The `$jsonSchema` validator's `bsonType` keyword enforces type constraints at the database level, rejecting documents that use the wrong type for a field.

## Supported BSON Types

Common types for `bsonType`:

```text
string       - UTF-8 text
int          - 32-bit integer
long         - 64-bit integer
double       - Floating point number
decimal      - 128-bit decimal
bool         - true or false
date         - UTC datetime
objectId     - MongoDB ObjectId
array        - Array
object       - Subdocument
null         - Null value
binData      - Binary data
```

## Basic Type Validation Example

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "inStock"],
      properties: {
        name: {
          bsonType: "string",
          description: "Product name must be a string"
        },
        price: {
          bsonType: "double",
          description: "Price must be a number"
        },
        quantity: {
          bsonType: "int",
          description: "Quantity must be an integer"
        },
        inStock: {
          bsonType: "bool",
          description: "inStock must be a boolean"
        },
        createdAt: {
          bsonType: "date",
          description: "createdAt must be a date"
        }
      }
    }
  }
});
```

## Testing Type Enforcement

**Valid insert:**

```javascript
db.products.insertOne({
  name: "Widget Pro",
  price: 29.99,
  quantity: NumberInt(100),
  inStock: true,
  createdAt: new Date()
});
// Succeeds
```

**Invalid - wrong type for price:**

```javascript
db.products.insertOne({
  name: "Widget Pro",
  price: "29.99",  // string instead of double
  inStock: true
});
```

Error:

```text
MongoServerError: Document failed validation
```

## Allowing Multiple Types

Use an array of types when a field can legitimately hold different types:

```javascript
properties: {
  discount: {
    bsonType: ["double", "null"],
    description: "Discount can be a number or null"
  }
}
```

## Validating Array Element Types

Enforce that every element in an array is a specific type:

```javascript
db.createCollection("courses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        title: { bsonType: "string" },
        studentIds: {
          bsonType: "array",
          items: {
            bsonType: "objectId"
          },
          description: "All student IDs must be ObjectIds"
        },
        scores: {
          bsonType: "array",
          items: {
            bsonType: "double"
          },
          description: "All scores must be doubles"
        }
      }
    }
  }
});
```

## Type Validation for Nested Objects

```javascript
properties: {
  address: {
    bsonType: "object",
    required: ["street", "city"],
    properties: {
      street: { bsonType: "string" },
      city: { bsonType: "string" },
      zip: { bsonType: "string" },
      coordinates: {
        bsonType: "array",
        items: { bsonType: "double" },
        minItems: 2,
        maxItems: 2
      }
    }
  }
}
```

## Getting Validation Error Details

Use `validationAction: "warn"` during development to log failures without rejecting documents:

```javascript
db.runCommand({
  collMod: "products",
  validationAction: "warn"
});
```

Then check the MongoDB log for `WARN` entries with validation details.

## Checking Existing Documents Against New Rules

Before adding strict type validation to an existing collection, audit existing documents for type mismatches:

```javascript
db.products.find({
  $or: [
    { price: { $not: { $type: "double" } } },
    { inStock: { $not: { $type: "bool" } } }
  ]
});
```

Fix any non-conforming documents before switching to `validationLevel: "strict"`.

## Summary

`bsonType` in `$jsonSchema` validators enforces strict type constraints on MongoDB document fields. Use single type strings for strict enforcement, arrays of types when a field can be null or have alternate types, and nested schemas for subdocuments and array elements. Pair type validation with `required` fields to build robust data quality guarantees at the database level.
