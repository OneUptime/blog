# How to Validate Email Addresses in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Email, Regex, Data Quality

Description: Learn how to validate email address format in MongoDB using $jsonSchema with bsonType and pattern constraints to enforce data quality at the database level.

---

## Why Validate Emails at the Database Level?

Application-level validation can be bypassed by direct database writes, migration scripts, or buggy code paths. Adding schema validation in MongoDB ensures that invalid email addresses are rejected regardless of how data reaches the database - creating a reliable last line of defense for data quality.

## Basic Email Pattern Validation

MongoDB schema validation uses `$jsonSchema` with a `pattern` keyword that accepts a regex string:

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address"
        }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

The `validationAction: "error"` rejects invalid documents outright. Use `"warn"` to log violations without rejecting during migrations.

## Testing the Validator

```javascript
// Valid - succeeds
db.users.insertOne({ email: "alice@example.com" });

// Invalid - rejected
db.users.insertOne({ email: "not-an-email" });
// MongoServerError: Document failed validation

// Invalid - missing @
db.users.insertOne({ email: "alice.example.com" });
// MongoServerError: Document failed validation
```

## Combining Email Validation with Other Fields

A real user schema validates multiple fields together:

```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address"
        },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 32,
          pattern: "^[a-zA-Z0-9_]+$",
          description: "Alphanumeric username 3-32 characters"
        },
        createdAt: {
          bsonType: "date",
          description: "Must be a BSON date"
        },
        role: {
          bsonType: "string",
          enum: ["admin", "user", "moderator"]
        }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

## Handling Arrays of Emails

For documents with multiple email addresses (e.g., contact lists):

```javascript
db.createCollection("contacts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        emails: {
          bsonType: "array",
          items: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
          },
          description: "All entries must be valid email addresses"
        }
      }
    }
  }
});
```

## Viewing and Updating the Validator

Inspect the current validator on an existing collection:

```javascript
db.getCollectionInfos({ name: "users" })[0].options.validator
```

Update the validator without recreating the collection:

```javascript
db.runCommand({
  collMod: "users",
  validator: { /* updated $jsonSchema */ },
  validationAction: "error",
  validationLevel: "strict"
});
```

## Limitations to Know

MongoDB's `pattern` follows JSON Schema draft 4 regex semantics (ECMA 262), though MongoDB internally uses a PCRE2 engine. It does not validate email semantics beyond format (e.g., it won't check if the domain has valid MX records). For production systems, combine schema validation with application-level validation using a library like `validator.js` or Python's `email-validator`.

```javascript
// Application-level validation (Node.js) before insert
const validator = require("validator");
if (!validator.isEmail(userInput.email)) {
  throw new Error("Invalid email address");
}
```

## Summary

MongoDB schema validation with `$jsonSchema` and `pattern` enforces email format at the database level, catching invalid data from any source. Set `validationAction: "error"` and `validationLevel: "strict"` for new collections. For existing data, use `"warn"` and `"moderate"` during a cleanup phase before switching to strict enforcement. Combine with application-level validation for complete email integrity.
