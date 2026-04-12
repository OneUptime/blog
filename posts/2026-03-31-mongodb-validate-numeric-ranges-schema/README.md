# How to Validate Numeric Ranges in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Number, Range, Data Quality

Description: Learn how to validate numeric ranges in MongoDB using $jsonSchema minimum, maximum, and multipleOf constraints to enforce business rules at the database level.

---

## Basic Numeric Range Validation

MongoDB's `$jsonSchema` supports `minimum`, `maximum`, `exclusiveMinimum`, and `exclusiveMaximum` keywords for numeric constraints:

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["price", "quantity", "rating"],
      properties: {
        price: {
          bsonType: ["double", "decimal"],
          minimum: 0.01,
          description: "Price must be greater than or equal to 0.01"
        },
        quantity: {
          bsonType: "int",
          minimum: 0,
          maximum: 100000,
          description: "Quantity must be between 0 and 100,000"
        },
        rating: {
          bsonType: "double",
          minimum: 1.0,
          maximum: 5.0,
          description: "Rating must be between 1.0 and 5.0"
        }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

## Testing Numeric Validation

```javascript
// Valid
db.products.insertOne({ price: 19.99, quantity: 50, rating: 4.5 });

// Invalid - price below minimum
db.products.insertOne({ price: 0.0, quantity: 50, rating: 4.5 });
// MongoServerError: Document failed validation

// Invalid - rating exceeds maximum
db.products.insertOne({ price: 19.99, quantity: 50, rating: 5.5 });
// MongoServerError: Document failed validation

// Invalid - wrong type (string instead of number)
db.products.insertOne({ price: "19.99", quantity: 50, rating: 4.5 });
// MongoServerError: Document failed validation
```

## Exclusive Boundaries

Use `exclusiveMinimum` and `exclusiveMaximum` when the boundary value itself is not allowed:

```javascript
discount: {
  bsonType: "double",
  minimum: 0,
  exclusiveMinimum: true,    // must be > 0 (not >= 0)
  maximum: 100,
  exclusiveMaximum: true,    // must be < 100 (not <= 100)
  description: "Discount percentage must be between 0 and 100 exclusive"
}
```

Note: in MongoDB's `$jsonSchema` implementation, `exclusiveMinimum` and `exclusiveMaximum` are boolean values that modify `minimum`/`maximum` respectively (JSON Schema Draft 4 style):

```javascript
temperature: {
  bsonType: "double",
  minimum: -273.15,
  exclusiveMinimum: true,   // strictly greater than absolute zero
  description: "Temperature must be above absolute zero"
}
```

## Integer vs. Double Validation

Enforce integer types to prevent fractional quantities or IDs:

```javascript
pageNumber: {
  bsonType: "int",
  minimum: 1,
  description: "Page number must be a positive integer"
},
score: {
  bsonType: ["int", "double"],  // accept both int and double
  minimum: 0,
  maximum: 100
}
```

## multipleOf Constraint

For monetary values or quantities that must be whole units:

```javascript
unitPrice: {
  bsonType: "double",
  minimum: 0,
  multipleOf: 0.01,  // must be a multiple of 1 cent
  description: "Price must be in whole cents"
}
```

## Cross-Field Numeric Validation with $expr

`$jsonSchema` cannot compare two numeric fields. Use `$expr` for that:

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $and: [
      {
        $jsonSchema: {
          bsonType: "object",
          properties: {
            subtotal:  { bsonType: "double", minimum: 0 },
            discount:  { bsonType: "double", minimum: 0 },
            total:     { bsonType: "double", minimum: 0 }
          }
        }
      },
      {
        $expr: {
          $lte: ["$discount", "$subtotal"]  // discount cannot exceed subtotal
        }
      }
    ]
  }
});
```

## Real-World Example: User Profile

```javascript
db.createCollection("userProfiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        age: {
          bsonType: "int",
          minimum: 13,
          maximum: 120,
          description: "Age must be between 13 and 120"
        },
        creditScore: {
          bsonType: "int",
          minimum: 300,
          maximum: 850,
          description: "FICO score range"
        },
        monthlyIncome: {
          bsonType: "double",
          minimum: 0,
          description: "Monthly income cannot be negative"
        }
      }
    }
  }
});
```

## Summary

MongoDB `$jsonSchema` provides `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, and `multipleOf` keywords for numeric range validation. Combine with `bsonType` to ensure both the type and value are correct. Use `$expr` alongside `$jsonSchema` in a `$and` validator when cross-field numeric comparisons are needed (e.g., discount cannot exceed total). These constraints enforce business rules at the database level, preventing invalid data regardless of the write source.
