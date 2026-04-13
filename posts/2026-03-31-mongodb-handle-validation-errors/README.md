# How to Handle Validation Errors from MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Validation, Error Handling, Schema, Node.js

Description: Learn how to handle MongoDB schema validation errors gracefully, including parsing WriteError details and returning meaningful messages to API clients.

---

## MongoDB Schema Validation Overview

MongoDB supports JSON Schema validation rules applied to collections. When a document violates these rules, MongoDB rejects the write with a `WriteError` containing error code 121 (DocumentValidationFailure). Your application needs to catch this error and provide meaningful feedback rather than leaking internal error details.

## Setting Up a Validated Collection

```javascript
// Define validation rules when creating the collection
await db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'createdAt'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Must be a valid email address'
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 100
        },
        age: {
          bsonType: 'int',
          minimum: 0,
          maximum: 150
        },
        role: {
          enum: ['user', 'admin', 'moderator'],
          description: 'Must be one of: user, admin, moderator'
        },
        createdAt: { bsonType: 'date' }
      }
    }
  },
  validationAction: 'error',  // reject invalid docs (vs 'warn')
  validationLevel: 'strict'   // apply to all inserts and updates
});
```

## Catching and Parsing Validation Errors

MongoDB validation errors use error code 121 with details embedded in the error object:

```javascript
const { MongoServerError } = require('mongodb');

const VALIDATION_ERROR_CODE = 121;

function parseValidationError(err) {
  if (!(err instanceof MongoServerError) || err.code !== VALIDATION_ERROR_CODE) {
    return null;
  }

  // Extract the schema validation details from errInfo
  const errInfo = err.errInfo;
  const details = errInfo?.details;

  if (!details) {
    return { message: 'Document validation failed', fields: [] };
  }

  // Parse the schemaRulesNotSatisfied array
  const fields = [];

  function extractViolations(schemaErrors, path = '') {
    for (const error of schemaErrors || []) {
      const fieldPath = path ? `${path}.${error.propertyName}` : error.propertyName;

      if (error.operatorName === 'required') {
        for (const missingField of error.missingProperties || []) {
          fields.push({
            field: missingField,
            rule: 'required',
            message: `Field '${missingField}' is required`
          });
        }
      } else if (error.operatorName === 'properties') {
        for (const propError of error.propertiesNotSatisfied || []) {
          for (const propErr of propError.details || []) {
            fields.push({
              field: propError.propertyName,
              rule: propErr.operatorName,
              message: propErr.description || `Validation failed for '${propError.propertyName}'`
            });
          }
        }
      } else {
        fields.push({
          field: fieldPath || 'document',
          rule: error.operatorName,
          message: error.description || `Failed rule: ${error.operatorName}`
        });
      }
    }
  }

  extractViolations(details.schemaRulesNotSatisfied);
  return { message: 'Document validation failed', fields };
}
```

## Express API Error Handler

Translate MongoDB validation errors into user-friendly API responses:

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

router.post('/users', async (req, res, next) => {
  try {
    const result = await db.collection('users').insertOne({
      ...req.body,
      createdAt: new Date()
    });
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    const validationError = parseValidationError(err);
    if (validationError) {
      return res.status(422).json({
        error: 'Validation failed',
        details: validationError.fields
      });
    }
    next(err);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Mongoose Validation vs MongoDB Native Validation

When using Mongoose, validation happens at the ODM layer before the data reaches MongoDB:

```javascript
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  age: {
    type: Number,
    min: [0, 'Age must be positive'],
    max: [150, 'Age must be realistic']
  }
});

// Mongoose validation error handling
try {
  await User.create(req.body);
} catch (err) {
  if (err.name === 'ValidationError') {
    const fields = Object.entries(err.errors).map(([field, error]) => ({
      field,
      message: error.message
    }));
    return res.status(422).json({ error: 'Validation failed', details: fields });
  }
  throw err;
}
```

## Summary

MongoDB schema validation errors (code 121) include structured details about which rules were violated and which fields failed. Parse the `errInfo.details.schemaRulesNotSatisfied` array to extract field-level error messages. Return 422 HTTP status with structured field errors from your API rather than exposing raw MongoDB error messages. When using Mongoose, the ODM validates before insertion and provides its own structured `ValidationError` type that maps field names to error messages.
