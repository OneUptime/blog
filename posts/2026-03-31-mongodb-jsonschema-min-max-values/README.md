# How to Set Minimum and Maximum Values in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Quality, Database

Description: Learn how to use minimum, maximum, minLength, maxLength, minItems, and maxItems constraints in MongoDB $jsonSchema validation to enforce value range rules.

---

MongoDB's `$jsonSchema` validation supports range constraints for numeric fields, length constraints for strings, and size constraints for arrays. These keywords enforce bounds at the database level, ensuring data integrity without relying on application-layer checks.

## Numeric Range: minimum and maximum

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "stock"],
      properties: {
        name: { bsonType: "string" },
        price: {
          bsonType: "double",
          minimum: 0.01,
          maximum: 99999.99,
          description: "Price must be between $0.01 and $99,999.99"
        },
        stock: {
          bsonType: "int",
          minimum: 0,
          description: "Stock cannot be negative"
        },
        discountPercent: {
          bsonType: "double",
          minimum: 0,
          maximum: 100,
          description: "Discount must be 0-100%"
        }
      }
    }
  }
});
```

**Invalid - price below minimum:**

```javascript
db.products.insertOne({ name: "Widget", price: -5.00, stock: 10 });
// MongoServerError: Document failed validation
```

## Exclusive Bounds: exclusiveMinimum and exclusiveMaximum

Use `exclusiveMinimum` and `exclusiveMaximum` when the boundary value itself should not be allowed. In MongoDB's `$jsonSchema` (based on JSON Schema draft 4), these are boolean flags that modify `minimum` and `maximum`:

```javascript
properties: {
  rating: {
    bsonType: "double",
    minimum: 0,
    exclusiveMinimum: true,  // must be > 0, not >= 0
    maximum: 5.0,            // can be exactly 5.0
    description: "Rating must be greater than 0 and at most 5"
  }
}
```

## String Length: minLength and maxLength

```javascript
db.createCollection("posts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        title: {
          bsonType: "string",
          minLength: 5,
          maxLength: 200,
          description: "Title must be 5-200 characters"
        },
        slug: {
          bsonType: "string",
          minLength: 3,
          maxLength: 100
        },
        content: {
          bsonType: "string",
          minLength: 50,
          description: "Content must be at least 50 characters"
        }
      }
    }
  }
});
```

## Array Size: minItems and maxItems

```javascript
db.createCollection("surveys", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        answers: {
          bsonType: "array",
          minItems: 1,
          maxItems: 20,
          description: "Surveys must have 1-20 answers"
        },
        tags: {
          bsonType: "array",
          maxItems: 5,
          uniqueItems: true,
          items: { bsonType: "string" }
        }
      }
    }
  }
});
```

## Combining Multiple Constraints

Real-world example combining numeric, string, and array constraints:

```javascript
db.createCollection("job_listings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "salary", "skills"],
      properties: {
        title: {
          bsonType: "string",
          minLength: 5,
          maxLength: 150
        },
        salary: {
          bsonType: "object",
          properties: {
            min: {
              bsonType: "int",
              minimum: 0
            },
            max: {
              bsonType: "int",
              minimum: 0
            }
          }
        },
        yearsExperience: {
          bsonType: "int",
          minimum: 0,
          maximum: 50
        },
        skills: {
          bsonType: "array",
          minItems: 1,
          maxItems: 15,
          items: {
            bsonType: "string",
            minLength: 1,
            maxLength: 50
          }
        }
      }
    }
  }
});
```

## Testing Your Constraints

Before applying to production, test boundary values:

```javascript
// Test minimum boundary
db.products.insertOne({ name: "Test", price: 0.01, stock: 0 });  // valid
db.products.insertOne({ name: "Test", price: 0.00, stock: 0 });  // fails

// Test maximum boundary
db.products.insertOne({ name: "Test", price: 99999.99, stock: 0 });  // valid
db.products.insertOne({ name: "Test", price: 100000.00, stock: 0 }); // fails
```

## Summary

MongoDB `$jsonSchema` supports `minimum`/`maximum` for numeric bounds, `minLength`/`maxLength` for string lengths, and `minItems`/`maxItems` for array sizes. Use `exclusiveMinimum`/`exclusiveMaximum` when the boundary value itself is not allowed. Combine these constraints with `bsonType` and `required` to build thorough data validation rules that prevent invalid values from entering your collections.
