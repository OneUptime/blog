# How to Enforce Data Integrity with Schema Validation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Integrity, JSON Schema, Database

Description: Learn how to use MongoDB schema validation to enforce data integrity rules at the database level, including JSON Schema syntax, validation levels, and practical patterns.

---

MongoDB's flexible schema is a double-edged sword. It makes rapid development easy, but without constraints, your data can become inconsistent over time. Schema validation lets you define rules that MongoDB enforces on inserts and updates, catching bad data before it enters your database.

## Why Schema Validation Matters

Without validation, these problems creep in:

- Missing required fields
- Wrong data types (string instead of number)
- Invalid values (negative prices, future birth dates)
- Inconsistent field names (firstName vs first_name)

Application-level validation helps, but database-level validation is your last line of defense. It catches bugs in your code and protects against direct database modifications.

## Basic Schema Validation

### Creating a Collection with Validation

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address"
        },
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
          description: "Name is required and must be 1-100 characters"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 150,
          description: "Age must be between 0 and 150"
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp is required"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Adding Validation to Existing Collection

```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+\\..+$"
        },
        name: {
          bsonType: "string",
          minLength: 1
        }
      }
    }
  },
  validationLevel: "moderate",  // Only validate new and modified docs
  validationAction: "error"
});
```

## JSON Schema Syntax

### BSON Types

```javascript
{
  $jsonSchema: {
    properties: {
      // String types
      name: { bsonType: "string" },

      // Numeric types
      age: { bsonType: "int" },           // 32-bit integer
      balance: { bsonType: "long" },      // 64-bit integer
      price: { bsonType: "double" },      // 64-bit floating point
      amount: { bsonType: "decimal" },    // 128-bit decimal

      // Date and time
      createdAt: { bsonType: "date" },
      timestamp: { bsonType: "timestamp" },

      // Boolean
      isActive: { bsonType: "bool" },

      // ObjectId
      userId: { bsonType: "objectId" },

      // Array
      tags: { bsonType: "array" },

      // Nested object
      address: { bsonType: "object" },

      // Binary data
      avatar: { bsonType: "binData" },

      // Allow multiple types
      identifier: { bsonType: ["string", "int"] }
    }
  }
}
```

### String Constraints

```javascript
{
  properties: {
    // Length constraints
    username: {
      bsonType: "string",
      minLength: 3,
      maxLength: 30
    },

    // Pattern matching with regex
    email: {
      bsonType: "string",
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    },

    // Enumeration
    status: {
      bsonType: "string",
      enum: ["pending", "active", "suspended", "deleted"]
    }
  }
}
```

### Numeric Constraints

```javascript
{
  properties: {
    // Range constraints
    quantity: {
      bsonType: "int",
      minimum: 0,
      maximum: 10000
    },

    // Exclusive bounds
    discount: {
      bsonType: "double",
      minimum: 0,
      exclusiveMaximum: 1  // Less than 1 (not 1 or more)
    },

    // Multiple of (useful for currency)
    price: {
      bsonType: "double",
      minimum: 0,
      multipleOf: 0.01
    }
  }
}
```

### Array Validation

```javascript
{
  properties: {
    // Simple array
    tags: {
      bsonType: "array",
      minItems: 1,
      maxItems: 10,
      uniqueItems: true
    },

    // Array with item validation
    items: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { bsonType: "objectId" },
          quantity: { bsonType: "int", minimum: 1 },
          price: { bsonType: "double", minimum: 0 }
        }
      }
    }
  }
}
```

### Nested Objects

```javascript
{
  properties: {
    address: {
      bsonType: "object",
      required: ["street", "city", "country"],
      properties: {
        street: { bsonType: "string", minLength: 1 },
        city: { bsonType: "string", minLength: 1 },
        state: { bsonType: "string" },
        country: { bsonType: "string", minLength: 2, maxLength: 2 },
        postalCode: { bsonType: "string", pattern: "^[0-9]{5}(-[0-9]{4})?$" }
      },
      additionalProperties: false  // Reject unknown fields
    }
  }
}
```

## Validation Levels and Actions

### Validation Levels

```javascript
// strict: Validate all inserts and updates (default)
validationLevel: "strict"

// moderate: Validate inserts and updates to valid documents only
// Allows updating documents that already violate the schema
validationLevel: "moderate"

// off: Disable validation
validationLevel: "off"
```

### Validation Actions

```javascript
// error: Reject invalid documents (default)
validationAction: "error"

// warn: Accept but log warning
validationAction: "warn"
```

Use `warn` during migration periods:

```javascript
db.runCommand({
  collMod: "users",
  validator: { /* new schema */ },
  validationLevel: "moderate",
  validationAction: "warn"  // Log issues without rejecting
});
```

## Practical Schema Examples

### E-commerce Order

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "items", "status", "createdAt"],
      properties: {
        customerId: {
          bsonType: "objectId"
        },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["productId", "name", "quantity", "unitPrice"],
            properties: {
              productId: { bsonType: "objectId" },
              name: { bsonType: "string", minLength: 1 },
              quantity: { bsonType: "int", minimum: 1 },
              unitPrice: { bsonType: "decimal", minimum: 0 }
            }
          }
        },
        shippingAddress: {
          bsonType: "object",
          required: ["street", "city", "country", "postalCode"],
          properties: {
            street: { bsonType: "string" },
            city: { bsonType: "string" },
            state: { bsonType: "string" },
            country: { bsonType: "string" },
            postalCode: { bsonType: "string" }
          }
        },
        status: {
          bsonType: "string",
          enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        },
        total: {
          bsonType: "decimal",
          minimum: 0
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### User Profile with Optional Fields

```javascript
db.createCollection("profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "displayName"],
      properties: {
        userId: { bsonType: "objectId" },
        displayName: {
          bsonType: "string",
          minLength: 2,
          maxLength: 50
        },
        bio: {
          bsonType: "string",
          maxLength: 500
        },
        website: {
          bsonType: "string",
          pattern: "^https?://.*"
        },
        socialLinks: {
          bsonType: "object",
          properties: {
            twitter: { bsonType: "string" },
            github: { bsonType: "string" },
            linkedin: { bsonType: "string" }
          },
          additionalProperties: false
        },
        preferences: {
          bsonType: "object",
          properties: {
            theme: {
              bsonType: "string",
              enum: ["light", "dark", "system"]
            },
            notifications: { bsonType: "bool" },
            language: {
              bsonType: "string",
              pattern: "^[a-z]{2}(-[A-Z]{2})?$"
            }
          }
        }
      }
    }
  }
});
```

## Conditional Validation

Use `oneOf`, `anyOf`, `allOf` for complex rules:

```javascript
db.createCollection("payments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["amount", "method"],
      properties: {
        amount: { bsonType: "decimal", minimum: 0 },
        method: { bsonType: "string" }
      },
      // Different requirements based on payment method
      oneOf: [
        {
          properties: {
            method: { enum: ["credit_card"] },
            cardLast4: { bsonType: "string", pattern: "^[0-9]{4}$" },
            cardBrand: { bsonType: "string" }
          },
          required: ["cardLast4", "cardBrand"]
        },
        {
          properties: {
            method: { enum: ["bank_transfer"] },
            bankName: { bsonType: "string" },
            accountLast4: { bsonType: "string", pattern: "^[0-9]{4}$" }
          },
          required: ["bankName", "accountLast4"]
        },
        {
          properties: {
            method: { enum: ["crypto"] },
            walletAddress: { bsonType: "string", minLength: 26 },
            network: { bsonType: "string" }
          },
          required: ["walletAddress", "network"]
        }
      ]
    }
  }
});
```

## Migration Strategy

### Step 1: Audit Existing Data

```javascript
// Find documents that would fail validation
const schema = { /* your new schema */ };

db.users.find({
  $nor: [{ $jsonSchema: schema.$jsonSchema }]
}).forEach(doc => {
  print(`Invalid document: ${doc._id}`);
});
```

### Step 2: Fix Invalid Data

```javascript
// Update documents to comply
db.users.updateMany(
  { age: { $type: "string" } },
  [{ $set: { age: { $toInt: "$age" } } }]
);

// Remove invalid fields
db.users.updateMany(
  {},
  { $unset: { invalidField: "" } }
);
```

### Step 3: Apply Validation with Warning

```javascript
db.runCommand({
  collMod: "users",
  validator: schema,
  validationLevel: "moderate",
  validationAction: "warn"
});
```

### Step 4: Monitor and Fix Warnings

```javascript
// Check logs for validation warnings
db.adminCommand({ getLog: "global" }).log
  .filter(entry => entry.includes("Validation"))
  .forEach(print);
```

### Step 5: Enable Strict Validation

```javascript
db.runCommand({
  collMod: "users",
  validationLevel: "strict",
  validationAction: "error"
});
```

## Viewing Current Validation Rules

```javascript
// View collection validation rules
db.getCollectionInfos({ name: "users" })[0].options.validator;

// Or using listCollections
db.runCommand({ listCollections: 1, filter: { name: "users" } })
  .cursor.firstBatch[0].options;
```

---

Schema validation turns MongoDB's flexibility into a strength rather than a liability. Start with essential constraints, use moderate validation during migrations, and gradually tighten rules. Your future self will thank you when every document in the database matches your expectations.
