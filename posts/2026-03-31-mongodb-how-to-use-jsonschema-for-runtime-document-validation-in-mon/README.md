# How to Use $jsonSchema for Runtime Document Validation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $jsonSchema, Schema Validation, Data Quality, Collection, Node.js

Description: Learn how to use MongoDB's $jsonSchema validator to enforce document structure at the database level, ensuring data integrity on every insert and update.

---

## What Is $jsonSchema Validation?

MongoDB's `$jsonSchema` validator enforces a JSON Schema on documents in a collection at the database layer. When enabled, every insert and update is validated against the schema - invalid documents are rejected before they are stored.

This is distinct from application-level validation and provides a safety net regardless of which application or tool writes to the collection.

## Setting Up Collection Validation

### At Collection Creation

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('myapp');

await db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      title: 'User Validation',
      required: ['email', 'role', 'createdAt'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[^@]+@[^@]+\\.[^@]+$',
          description: 'Must be a valid email address',
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'user', 'moderator'],
          description: 'Must be admin, user, or moderator',
        },
        age: {
          bsonType: 'int',
          minimum: 0,
          maximum: 150,
          description: 'Age must be between 0 and 150',
        },
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100,
        },
        createdAt: {
          bsonType: 'date',
        },
        address: {
          bsonType: 'object',
          properties: {
            street: { bsonType: 'string' },
            city: { bsonType: 'string' },
            country: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 2,  // ISO 3166 country code
            },
          }
        },
        tags: {
          bsonType: 'array',
          items: { bsonType: 'string' },
        }
      },
      additionalProperties: false,  // reject unknown fields
    }
  },
  validationLevel: 'strict',    // 'strict' or 'moderate'
  validationAction: 'error',    // 'error' (reject) or 'warn' (log only)
});
```

### Adding Validation to an Existing Collection

```javascript
await db.command({
  collMod: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'role'],
      properties: {
        email: { bsonType: 'string' },
        role: { bsonType: 'string', enum: ['admin', 'user'] },
      }
    }
  },
  validationLevel: 'moderate',  // only validate new writes, not existing docs
  validationAction: 'error',
});
```

## Validation Levels and Actions

| Setting | Values | Effect |
|---------|--------|--------|
| `validationLevel` | `strict` | Validate ALL inserts and updates |
| `validationLevel` | `moderate` | Only validate new documents and updated documents that already meet the criteria |
| `validationAction` | `error` | Reject invalid documents |
| `validationAction` | `warn` | Accept but log a warning |

## Common Schema Patterns

### Nested Objects

```javascript
const schema = {
  bsonType: 'object',
  required: ['name', 'price', 'category'],
  properties: {
    name: { bsonType: 'string', minLength: 1, maxLength: 200 },
    price: { bsonType: 'double', minimum: 0 },
    category: {
      bsonType: 'string',
      enum: ['electronics', 'clothing', 'books', 'toys'],
    },
    dimensions: {
      bsonType: 'object',
      required: ['width', 'height', 'depth'],
      properties: {
        width: { bsonType: 'double', minimum: 0, exclusiveMinimum: true },
        height: { bsonType: 'double', minimum: 0, exclusiveMinimum: true },
        depth: { bsonType: 'double', minimum: 0, exclusiveMinimum: true },
      }
    }
  }
};
```

### Arrays with Item Validation

```javascript
const schema = {
  bsonType: 'object',
  properties: {
    tags: {
      bsonType: 'array',
      minItems: 1,
      maxItems: 10,
      uniqueItems: true,
      items: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 50,
      }
    },
    scores: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        required: ['subject', 'score'],
        properties: {
          subject: { bsonType: 'string' },
          score: { bsonType: 'double', minimum: 0, maximum: 100 },
        }
      }
    }
  }
};
```

## Handling Validation Errors

```javascript
try {
  await db.collection('users').insertOne({
    email: 'not-an-email',
    role: 'superuser',  // not in enum
  });
} catch (err) {
  if (err.code === 121) {
    // Document failed validation
    console.error('Validation error:', err.message);
    // err.errInfo.details contains the specific validation failure
    console.error('Details:', JSON.stringify(err.errInfo?.details, null, 2));
  } else {
    throw err;
  }
}
```

## Viewing Current Validation Rules

```javascript
// Get collection info including validators
const collections = await db.listCollections({ name: 'users' }).toArray();
const userCollection = collections[0];
console.log(JSON.stringify(userCollection.options?.validator, null, 2));
```

Or via MongoDB shell:

```bash
db.getCollectionInfos({ name: "users" })
```

## PyMongo Usage

```python
from pymongo import MongoClient
from pymongo.errors import WriteError

client = MongoClient('mongodb://localhost:27017')
db = client['myapp']

# Create collection with validation
db.create_collection('products', validator={
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['name', 'price'],
        'properties': {
            'name': {'bsonType': 'string', 'minLength': 1},
            'price': {'bsonType': 'double', 'minimum': 0},
        }
    }
}, validationAction='error')

# Handle validation errors
try:
    db['products'].insert_one({'name': '', 'price': -5})
except WriteError as e:
    print(f"Validation failed: {e.details}")
```

## Removing Validation

```javascript
// Remove validation rules from a collection
await db.command({
  collMod: 'users',
  validator: {},
  validationLevel: 'off',
});
```

## Summary

MongoDB's `$jsonSchema` validator enforces document structure at the database level, preventing invalid data from ever being stored regardless of the application layer. Define required fields, data types, value ranges, enums, and nested object schemas. Use `validationLevel: 'strict'` with `validationAction: 'error'` in production to reject bad writes immediately. Handle `MongoServerError` with code `121` in your application to provide meaningful error messages to users when validation fails.
