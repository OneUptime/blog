# How to Use module.exports and require Properly in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JavaScript, Modules, CommonJS, require, exports

Description: Learn how to properly use module.exports and require in Node.js for organizing code into modules, including common patterns, circular dependencies, and migration to ES modules.

---

Node.js uses the CommonJS module system where each file is treated as a separate module. Understanding `module.exports` and `require` is fundamental to organizing Node.js code into maintainable, reusable pieces.

## The Basics

Every Node.js file has access to a `module` object. The `module.exports` property determines what the file exports when other files `require()` it.

```javascript
// greet.js
function greet(name) {
  return `Hello, ${name}!`;
}

// Export the function
module.exports = greet;
```

```javascript
// app.js
// Import the function
const greet = require('./greet');

console.log(greet('World')); // Hello, World!
```

## Exporting Patterns

### Pattern 1: Export a Single Function

When your module does one thing, export a single function:

```javascript
// hash.js
const crypto = require('crypto');

module.exports = function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
};
```

```javascript
// Usage
const hash = require('./hash');
const hashed = hash('my-password');
```

### Pattern 2: Export an Object with Multiple Functions

When your module provides multiple related functions:

```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = {
  add,
  subtract,
  multiply,
};
```

```javascript
// Usage - import entire module
const math = require('./math');
console.log(math.add(2, 3)); // 5

// Usage - destructure what you need
const { add, multiply } = require('./math');
console.log(add(2, 3)); // 5
```

### Pattern 3: Export a Class

When your module represents a reusable object type:

```javascript
// user.js
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  greet() {
    return `Hello, I'm ${this.name}`;
  }

  static createAdmin(name) {
    const user = new User(name, `${name.toLowerCase()}@admin.local`);
    user.isAdmin = true;
    return user;
  }
}

module.exports = User;
```

```javascript
// Usage
const User = require('./user');

const user = new User('John', 'john@example.com');
const admin = User.createAdmin('Admin');
```

### Pattern 4: Export a Factory Function

When you need to create configured instances:

```javascript
// logger.js
module.exports = function createLogger(prefix) {
  return {
    info(message) {
      console.log(`[${prefix}] INFO: ${message}`);
    },
    error(message) {
      console.error(`[${prefix}] ERROR: ${message}`);
    },
    debug(message) {
      if (process.env.DEBUG) {
        console.log(`[${prefix}] DEBUG: ${message}`);
      }
    },
  };
};
```

```javascript
// Usage
const createLogger = require('./logger');

const userLogger = createLogger('UserService');
const orderLogger = createLogger('OrderService');

userLogger.info('User created');
orderLogger.error('Order failed');
```

### Pattern 5: Export a Singleton

When you need a single shared instance:

```javascript
// database.js
const { Pool } = require('pg');

// Create pool once when module is first required
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query(text, params) {
    return pool.query(text, params);
  },
  
  async getClient() {
    const client = await pool.connect();
    return client;
  },
  
  async close() {
    await pool.end();
  },
};
```

```javascript
// Usage - same pool instance everywhere
const db = require('./database');

async function getUsers() {
  const result = await db.query('SELECT * FROM users');
  return result.rows;
}
```

## Understanding exports vs module.exports

Node.js provides `exports` as a shorthand for `module.exports`, but there is an important distinction:

```javascript
// At the start of every module, this happens internally:
// exports = module.exports = {};

// You can add properties to exports
exports.foo = 'bar';
exports.baz = function() {};

// This works because exports points to module.exports
```

But if you reassign `exports`, you break the reference:

```javascript
// BAD - this does NOT work
exports = function() {
  console.log('This will not be exported!');
};

// The require() will get an empty object {}
```

```javascript
// GOOD - reassign module.exports instead
module.exports = function() {
  console.log('This works!');
};
```

### Safe Pattern

To avoid confusion, pick one approach and stick with it:

```javascript
// Approach 1: Always use module.exports
module.exports = {
  foo: 'bar',
  baz: function() {},
};

// Approach 2: Use exports for adding properties
exports.foo = 'bar';
exports.baz = function() {};
// Do NOT reassign exports
```

## The require() Function

### How require() Works

When you call `require()`, Node.js:

1. Resolves the module path
2. Checks if module is cached
3. If not cached, loads and executes the module
4. Returns `module.exports`
5. Caches the result

```javascript
// First require() loads and executes the module
const a = require('./module');

// Second require() returns cached result
const b = require('./module');

console.log(a === b); // true - same object!
```

### Module Resolution

```javascript
// Core modules - no path, just name
const fs = require('fs');
const path = require('path');

// Installed packages - no path, just name
const express = require('express');
const lodash = require('lodash');

// Local files - relative path (must start with ./ or ../)
const utils = require('./utils');
const config = require('../config');

// Local files - absolute path
const helpers = require('/absolute/path/to/helpers');

// JSON files - parsed automatically
const package = require('./package.json');
console.log(package.version);

// Folder with index.js
const models = require('./models'); // Loads ./models/index.js
```

### Folder as Module

When you require a folder, Node.js looks for:

1. `package.json` with a `main` field
2. `index.js`
3. `index.node` (native addon)

```javascript
// models/index.js
const User = require('./user');
const Order = require('./order');
const Product = require('./product');

module.exports = {
  User,
  Order,
  Product,
};
```

```javascript
// app.js
const { User, Order } = require('./models');
```

## Circular Dependencies

Circular dependencies occur when module A requires module B, and module B requires module A. Node.js handles this, but you may get incomplete exports:

```javascript
// a.js
console.log('a.js loading');
const b = require('./b');
console.log('in a.js, b.done =', b.done);
exports.done = true;
```

```javascript
// b.js
console.log('b.js loading');
const a = require('./a');
console.log('in b.js, a.done =', a.done);
exports.done = true;
```

```javascript
// main.js
const a = require('./a');
const b = require('./b');

// Output:
// a.js loading
// b.js loading
// in b.js, a.done = undefined  <-- a.js not finished yet!
// in a.js, b.done = true
```

### Avoiding Circular Dependencies

**Solution 1: Restructure code**

```javascript
// shared.js - extract shared functionality
module.exports = {
  sharedFunction() {},
};
```

**Solution 2: Lazy require inside functions**

```javascript
// a.js
exports.doSomething = function() {
  // Require inside function, not at top level
  const b = require('./b');
  return b.helper();
};
```

**Solution 3: Dependency injection**

```javascript
// a.js
module.exports = function(b) {
  return {
    doSomething() {
      return b.helper();
    },
  };
};
```

```javascript
// main.js
const b = require('./b');
const a = require('./a')(b);
```

## Common Patterns and Best Practices

### Revealing Module Pattern

Export only public API, keep internals private:

```javascript
// userService.js

// Private - not exported
const users = new Map();

function validateEmail(email) {
  return email.includes('@');
}

// Public - exported
function createUser(name, email) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email');
  }
  
  const user = { id: Date.now(), name, email };
  users.set(user.id, user);
  return user;
}

function getUser(id) {
  return users.get(id);
}

function deleteUser(id) {
  return users.delete(id);
}

module.exports = {
  createUser,
  getUser,
  deleteUser,
  // validateEmail and users are NOT exported
};
```

### Configuration Module

```javascript
// config.js
const config = {
  development: {
    database: 'postgres://localhost/dev',
    debug: true,
  },
  production: {
    database: process.env.DATABASE_URL,
    debug: false,
  },
  test: {
    database: 'postgres://localhost/test',
    debug: false,
  },
};

const env = process.env.NODE_ENV || 'development';

module.exports = config[env];
```

```javascript
// Usage
const config = require('./config');
console.log(config.database);
```

### Plugin/Middleware Pattern

```javascript
// middleware/auth.js
module.exports = function authMiddleware(options = {}) {
  const { required = true } = options;
  
  return function(req, res, next) {
    const token = req.headers.authorization;
    
    if (!token && required) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify token...
    req.user = decodedUser;
    next();
  };
};
```

```javascript
// Usage
const auth = require('./middleware/auth');

app.get('/public', (req, res) => {});
app.get('/private', auth(), (req, res) => {});
app.get('/optional', auth({ required: false }), (req, res) => {});
```

## Moving to ES Modules

Node.js now supports ES modules (ESM). You can migrate gradually:

```javascript
// ES Module syntax (package.json needs "type": "module")
// Or use .mjs extension

// Named exports
export function add(a, b) {
  return a + b;
}

export const PI = 3.14159;

// Default export
export default class Calculator {
  // ...
}
```

```javascript
// Importing ES modules
import Calculator, { add, PI } from './math.js';
```

### Interop Between CommonJS and ESM

```javascript
// In ES module, import CommonJS
import cjsModule from './commonjs-module.cjs';

// In CommonJS, require ES module (async)
async function loadEsm() {
  const esmModule = await import('./es-module.mjs');
}
```

## Summary

| Pattern | When to Use |
|---------|-------------|
| `module.exports = function` | Single function module |
| `module.exports = { ... }` | Multiple exports |
| `module.exports = class` | Class export |
| `exports.name = value` | Adding to default export object |
| Factory function | Configurable instances |
| Singleton | Shared state/connections |

The CommonJS module system with `module.exports` and `require` is fundamental to Node.js development. Choose your export pattern based on what your module provides, and be consistent across your codebase.
