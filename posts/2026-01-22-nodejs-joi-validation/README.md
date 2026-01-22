# How to Create Data Validation with Joi in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Node.js, Validation, Joi, API, Express.js

Description: Learn how to validate request data in Node.js applications using Joi, the powerful schema description language and data validator.

---

Data validation is crucial for building secure and reliable applications. Joi is one of the most popular validation libraries for Node.js, providing a powerful and expressive way to validate data. Let's explore how to use Joi effectively.

## Installation

```bash
npm install joi
```

## Basic Validation

```javascript
const Joi = require('joi');

// Define a schema
const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  
  email: Joi.string()
    .email()
    .required(),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
    .required(),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(120),
  
  birthDate: Joi.date()
    .max('now'),
  
  active: Joi.boolean()
    .default(true)
});

// Validate data
const userData = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securepass123',
  age: 25
};

const { error, value } = userSchema.validate(userData);

if (error) {
  console.error('Validation error:', error.details[0].message);
} else {
  console.log('Validated data:', value);
}
```

## Express.js Validation Middleware

```javascript
const express = require('express');
const Joi = require('joi');

const app = express();
app.use(express.json());

// Validation middleware factory
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,     // Return all errors, not just first
      stripUnknown: true,    // Remove unknown fields
      convert: true          // Enable type coercion
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    // Replace request data with validated/sanitized data
    req[property] = value;
    next();
  };
}

// Schema definitions
const schemas = {
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords must match' })
  }),
  
  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    bio: Joi.string().max(500)
  }).min(1), // At least one field required
  
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().trim()
  })
};

// Routes with validation
app.post('/users', validate(schemas.createUser), (req, res) => {
  // req.body is now validated and sanitized
  res.json({ message: 'User created', data: req.body });
});

app.put('/users/:id', validate(schemas.updateUser), (req, res) => {
  res.json({ message: 'User updated', data: req.body });
});

app.get('/users', validate(schemas.queryParams, 'query'), (req, res) => {
  // req.query has validated and default values
  const { page, limit, sort, search } = req.query;
  res.json({ page, limit, sort, search });
});

app.listen(3000);
```

## Advanced Schema Types

```javascript
const Joi = require('joi');

// String validation
const stringSchema = Joi.object({
  // Basic string constraints
  name: Joi.string().min(2).max(100).required(),
  
  // Email with custom domain
  email: Joi.string().email({ 
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net', 'org'] }
  }),
  
  // Pattern matching
  phone: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/),
  
  // URI validation
  website: Joi.string().uri({ scheme: ['http', 'https'] }),
  
  // UUID
  id: Joi.string().uuid({ version: 'uuidv4' }),
  
  // Alphanumeric with underscores
  slug: Joi.string().pattern(/^[a-z0-9_-]+$/),
  
  // Trim and lowercase
  tag: Joi.string().trim().lowercase(),
  
  // Credit card (Luhn validated)
  creditCard: Joi.string().creditCard()
});

// Number validation
const numberSchema = Joi.object({
  age: Joi.number().integer().min(0).max(150),
  price: Joi.number().precision(2).positive(),
  rating: Joi.number().min(1).max(5),
  quantity: Joi.number().integer().min(1).multiple(1),
  percentage: Joi.number().min(0).max(100)
});

// Date validation
const dateSchema = Joi.object({
  birthDate: Joi.date().max('now').required(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  createdAt: Joi.date().timestamp('unix')
});

// Array validation
const arraySchema = Joi.object({
  tags: Joi.array().items(Joi.string()).min(1).max(10).unique(),
  scores: Joi.array().items(Joi.number().min(0).max(100)),
  users: Joi.array().items(
    Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required()
    })
  )
});
```

## Conditional Validation

```javascript
const Joi = require('joi');

// Using when() for conditional fields
const paymentSchema = Joi.object({
  type: Joi.string().valid('credit_card', 'bank_transfer', 'paypal').required(),
  
  // Credit card fields required when type is credit_card
  cardNumber: Joi.string().creditCard().when('type', {
    is: 'credit_card',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  
  expiryDate: Joi.string().pattern(/^\d{2}\/\d{2}$/).when('type', {
    is: 'credit_card',
    then: Joi.required()
  }),
  
  cvv: Joi.string().length(3).when('type', {
    is: 'credit_card',
    then: Joi.required()
  }),
  
  // Bank transfer fields
  bankAccount: Joi.string().when('type', {
    is: 'bank_transfer',
    then: Joi.required()
  }),
  
  routingNumber: Joi.string().when('type', {
    is: 'bank_transfer',
    then: Joi.required()
  }),
  
  // PayPal fields
  paypalEmail: Joi.string().email().when('type', {
    is: 'paypal',
    then: Joi.required()
  })
});

// Complex conditions with switch
const subscriptionSchema = Joi.object({
  plan: Joi.string().valid('free', 'basic', 'premium', 'enterprise').required(),
  
  users: Joi.number().integer().min(1).when('plan', {
    switch: [
      { is: 'free', then: Joi.number().max(1) },
      { is: 'basic', then: Joi.number().max(5) },
      { is: 'premium', then: Joi.number().max(20) },
      { is: 'enterprise', then: Joi.number().max(1000) }
    ]
  }),
  
  billingCycle: Joi.string().valid('monthly', 'yearly').when('plan', {
    is: Joi.string().valid('basic', 'premium', 'enterprise'),
    then: Joi.required()
  })
});

// Using alternatives
const contactSchema = Joi.object({
  contact: Joi.alternatives().try(
    Joi.string().email(),
    Joi.string().pattern(/^\+?[1-9]\d{9,14}$/)
  ).required()
});
```

## Custom Validation

```javascript
const Joi = require('joi');

// Custom validation with extend
const customJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.slug': '{{#label}} must be a valid slug (lowercase, alphanumeric, hyphens only)'
  },
  rules: {
    slug: {
      validate(value, helpers) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
          return helpers.error('string.slug');
        }
        return value;
      }
    }
  }
}));

// Use custom type
const articleSchema = customJoi.object({
  title: customJoi.string().min(5).max(100).required(),
  slug: customJoi.string().slug().required()
});

// Custom validation with external function
const passwordSchema = Joi.object({
  password: Joi.string().min(8).required().custom((value, helpers) => {
    // Check for complexity
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*]/.test(value);
    
    const strength = [hasUppercase, hasLowercase, hasNumber, hasSpecial]
      .filter(Boolean).length;
    
    if (strength < 3) {
      return helpers.error('any.custom', {
        message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character'
      });
    }
    
    return value;
  }, 'password strength validation')
});

// Async custom validation (external)
const usernameSchema = Joi.object({
  username: Joi.string().min(3).max(30).required()
    .external(async (value) => {
      // Simulate async check (e.g., database lookup)
      const exists = await checkUsernameExists(value);
      if (exists) {
        throw new Error('Username already taken');
      }
      return value;
    })
});

async function checkUsernameExists(username) {
  // Simulated database check
  const existingUsers = ['admin', 'root', 'system'];
  return existingUsers.includes(username.toLowerCase());
}

// Validate with external
async function validateWithExternal(data) {
  try {
    const result = await usernameSchema.validateAsync(data, {
      externals: true
    });
    return result;
  } catch (error) {
    console.error('Validation error:', error.message);
    throw error;
  }
}
```

## Nested Objects and References

```javascript
const Joi = require('joi');

// Nested object validation
const orderSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  
  customer: Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().length(2).uppercase(),
      zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/),
      country: Joi.string().default('US')
    }).required()
  }).required(),
  
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().required(),
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().precision(2).positive().required()
    })
  ).min(1).required(),
  
  // Calculated fields with references
  subtotal: Joi.number().precision(2),
  tax: Joi.number().precision(2),
  total: Joi.number().precision(2)
});

// Schema composition
const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().length(2),
  zipCode: Joi.string().pattern(/^\d{5}/)
});

const personSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email()
});

// Combine schemas
const employeeSchema = personSchema.keys({
  employeeId: Joi.string().required(),
  department: Joi.string().required(),
  workAddress: addressSchema,
  homeAddress: addressSchema
});

// Link for recursive schemas
const categorySchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
  children: Joi.array().items(Joi.link('#category'))
}).id('category');
```

## Error Messages Customization

```javascript
const Joi = require('joi');

// Custom error messages
const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username can only contain letters and numbers',
      'string.min': 'Username must be at least {#limit} characters',
      'string.max': 'Username cannot exceed {#limit} characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required'
    }),
  
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least {#limit} characters',
      'any.required': 'Password is required'
    }),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(120)
    .messages({
      'number.min': 'You must be at least {#limit} years old',
      'number.max': 'Please enter a valid age'
    })
});

// Global preferences for all schemas
const customJoi = Joi.defaults((schema) =>
  schema.options({
    messages: {
      'any.required': '{{#label}} is required',
      'string.empty': '{{#label}} cannot be empty',
      'string.min': '{{#label}} must be at least {{#limit}} characters',
      'string.max': '{{#label}} cannot exceed {{#limit}} characters',
      'number.min': '{{#label}} must be at least {{#limit}}',
      'number.max': '{{#label}} cannot exceed {{#limit}}'
    },
    errors: {
      wrap: {
        label: false // Don't wrap labels in quotes
      }
    }
  })
);

// Format errors for API response
function formatValidationErrors(error) {
  return error.details.reduce((acc, detail) => {
    const key = detail.path.join('.');
    acc[key] = detail.message;
    return acc;
  }, {});
}

// Usage
const { error } = userSchema.validate({ username: 'ab' });
if (error) {
  console.log(formatValidationErrors(error));
  // { username: 'Username must be at least 3 characters' }
}
```

## Schema Options and Modifiers

```javascript
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email(),
  extraField: Joi.any()
});

// Validation options
const options = {
  abortEarly: false,        // Return all errors
  convert: true,            // Type coercion
  stripUnknown: true,       // Remove unknown keys
  presence: 'required',     // All fields required by default
  allowUnknown: false,      // Reject unknown fields
  skipFunctions: true,      // Skip function values
  
  // Error formatting
  errors: {
    render: true,
    wrap: {
      label: '"',
      array: '[]'
    }
  }
});

// Schema modifiers
const strictSchema = schema.options({ presence: 'required' });
const relaxedSchema = schema.options({ presence: 'optional' });

// Fork schema for different contexts
const createSchema = Joi.object({
  id: Joi.number(),
  name: Joi.string(),
  email: Joi.string().email()
});

const updateSchema = createSchema.fork(['id'], (schema) => schema.forbidden());
const patchSchema = createSchema.fork(['name', 'email'], (schema) => schema.optional());
```

## Real-World Example: API Validation Layer

```javascript
const Joi = require('joi');

// Centralized schema definitions
const schemas = {
  // Reusable components
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  // User schemas
  user: {
    create: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      role: Joi.string().valid('user', 'admin').default('user')
    }),
    
    update: Joi.object({
      username: Joi.string().alphanum().min(3).max(30),
      email: Joi.string().email(),
      bio: Joi.string().max(500),
      avatar: Joi.string().uri()
    }).min(1),
    
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },
  
  // Product schemas
  product: {
    create: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(2000),
      price: Joi.number().precision(2).positive().required(),
      category: Joi.string().required(),
      tags: Joi.array().items(Joi.string()).max(10),
      inventory: Joi.number().integer().min(0).default(0)
    }),
    
    search: Joi.object({
      q: Joi.string().min(2),
      category: Joi.string(),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().greater(Joi.ref('minPrice')),
      sort: Joi.string().valid('price', 'name', 'created'),
      order: Joi.string().valid('asc', 'desc').default('asc')
    }).concat(schemas.pagination)
  }
};

module.exports = schemas;
```

## Summary

| Feature | Description | Example |
|---------|-------------|---------|
| Basic Types | string, number, boolean, date, array, object | `Joi.string()` |
| Constraints | min, max, length, pattern | `Joi.string().min(3).max(30)` |
| Required | Mark field as required | `Joi.string().required()` |
| Default | Set default value | `Joi.boolean().default(true)` |
| Valid | Whitelist values | `Joi.string().valid('a', 'b')` |
| Conditional | Dynamic validation | `Joi.when('field', {...})` |
| Custom | Custom validators | `.custom(fn)` |
| External | Async validation | `.external(asyncFn)` |

| Validation Option | Purpose |
|-------------------|---------|
| `abortEarly: false` | Return all errors |
| `stripUnknown: true` | Remove extra fields |
| `convert: true` | Type coercion |
| `presence: 'required'` | All fields required |

Joi provides comprehensive data validation that integrates seamlessly with Express.js and other Node.js frameworks. Its expressive API makes complex validation rules easy to define and maintain.
