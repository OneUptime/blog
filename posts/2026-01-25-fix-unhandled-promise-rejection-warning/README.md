# How to Fix 'UnhandledPromiseRejectionWarning' in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, JavaScript, Async, Promises, Error Handling

Description: Understand and fix UnhandledPromiseRejectionWarning errors by properly catching promise rejections, using global handlers, and implementing best practices for async code.

---

When you see this warning in your Node.js application:

```
UnhandledPromiseRejectionWarning: Error: Something went wrong
(node:12345) UnhandledPromiseRejectionWarning: Unhandled promise rejection.
```

It means a Promise was rejected but there was no `.catch()` handler or try-catch block to handle the error. Starting with Node.js 15, unhandled rejections crash your application by default. Here is how to fix it properly.

## Why This Happens

Every Promise rejection needs a handler. Without one, the error has nowhere to go:

```javascript
// This causes UnhandledPromiseRejectionWarning
async function fetchData() {
    throw new Error('Network error');
}

fetchData();  // No .catch() or try-catch

// Same problem with Promise
Promise.reject(new Error('Something failed'));  // No handler
```

## Basic Fixes

### Add .catch() to Promises

```javascript
// Problem
fetchData();

// Fix
fetchData().catch(error => {
    console.error('Error fetching data:', error.message);
});
```

### Use try-catch with async/await

```javascript
// Problem
async function main() {
    const data = await fetchData();  // If this throws, no handler
}
main();

// Fix
async function main() {
    try {
        const data = await fetchData();
    } catch (error) {
        console.error('Error:', error.message);
    }
}
main();

// Or handle at the call site
main().catch(error => {
    console.error('Main function error:', error.message);
});
```

## Common Scenarios and Fixes

### Scenario 1: Event Handlers with Async Functions

```javascript
// Problem - async callback without error handling
button.addEventListener('click', async () => {
    const result = await saveData();  // Unhandled if this throws
});

// Fix - wrap in try-catch
button.addEventListener('click', async () => {
    try {
        const result = await saveData();
    } catch (error) {
        console.error('Save failed:', error);
        showErrorMessage('Failed to save');
    }
});
```

### Scenario 2: Array Methods with Async Callbacks

```javascript
// Problem - map with async function
const items = [1, 2, 3];
items.map(async (item) => {
    await processItem(item);  // Rejections not caught
});

// Fix - use Promise.all with try-catch
try {
    await Promise.all(items.map(async (item) => {
        await processItem(item);
    }));
} catch (error) {
    console.error('Processing failed:', error);
}

// Or use Promise.allSettled if you want all results
const results = await Promise.allSettled(
    items.map(item => processItem(item))
);

// Handle rejections
results.forEach((result, index) => {
    if (result.status === 'rejected') {
        console.error(`Item ${index} failed:`, result.reason);
    }
});
```

### Scenario 3: setTimeout/setInterval with Async

```javascript
// Problem
setTimeout(async () => {
    await doSomething();  // Unhandled if this throws
}, 1000);

// Fix
setTimeout(async () => {
    try {
        await doSomething();
    } catch (error) {
        console.error('Timer callback error:', error);
    }
}, 1000);

// Better - create a wrapper
function safeAsync(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error('Async error:', error);
        }
    };
}

setTimeout(safeAsync(async () => {
    await doSomething();
}), 1000);
```

### Scenario 4: Express.js Routes

```javascript
const express = require('express');
const app = express();

// Problem - async route without error handling
app.get('/users', async (req, res) => {
    const users = await User.findAll();  // Unhandled if this throws
    res.json(users);
});

// Fix 1 - try-catch in every route
app.get('/users', async (req, res, next) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        next(error);  // Pass to error handler
    }
});

// Fix 2 - wrapper function
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users', asyncHandler(async (req, res) => {
    const users = await User.findAll();
    res.json(users);
}));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
```

### Scenario 5: Constructor or Synchronous Context

```javascript
// Problem - async in constructor
class DataLoader {
    constructor() {
        this.loadData();  // Async method, rejection not caught
    }

    async loadData() {
        this.data = await fetchData();
    }
}

// Fix - use factory pattern
class DataLoader {
    constructor(data) {
        this.data = data;
    }

    static async create() {
        const data = await fetchData();
        return new DataLoader(data);
    }
}

// Usage
const loader = await DataLoader.create();
```

## Global Rejection Handler

As a safety net, add a global handler:

```javascript
// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);

    // Log to your error tracking service
    // errorTracker.captureException(reason);

    // In development, you might want to crash
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Also handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Graceful shutdown
    process.exit(1);
});
```

## Finding the Source

When you see the warning but are not sure where it comes from:

```javascript
// Add stack traces to rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);

    // If reason is an Error, print the stack
    if (reason instanceof Error) {
        console.error('Stack:', reason.stack);
    }
});
```

Run Node.js with `--trace-warnings`:

```bash
node --trace-warnings app.js
```

This shows where the warning originated.

## Promisified Callbacks

When converting callbacks to promises:

```javascript
// Problem - rejection in promisified code
function fetchDataCallback(callback) {
    // Simulating async operation that fails
    setTimeout(() => callback(new Error('Failed')), 100);
}

const fetchDataPromise = () => new Promise((resolve, reject) => {
    fetchDataCallback((error, data) => {
        if (error) reject(error);
        else resolve(data);
    });
});

// This needs catching
fetchDataPromise();  // Unhandled rejection

// Fix
fetchDataPromise().catch(error => {
    console.error('Fetch failed:', error);
});
```

## Promise Chain Best Practices

```javascript
// Always end promise chains with .catch()
getUserData(userId)
    .then(user => getOrders(user.id))
    .then(orders => processOrders(orders))
    .then(result => console.log('Done:', result))
    .catch(error => {
        // Catches any error in the chain
        console.error('Chain failed:', error);
    });

// With async/await
async function processUser(userId) {
    try {
        const user = await getUserData(userId);
        const orders = await getOrders(user.id);
        const result = await processOrders(orders);
        return result;
    } catch (error) {
        console.error('Processing failed:', error);
        throw error;  // Re-throw if caller should handle
    }
}
```

## Testing for Unhandled Rejections

In tests, make sure unhandled rejections fail the test:

```javascript
// Jest configuration
// jest.config.js
module.exports = {
    // ... other config
    setupFilesAfterEnv: ['./jest.setup.js']
};

// jest.setup.js
process.on('unhandledRejection', (reason) => {
    throw reason;  // Fail the test
});
```

## Node.js Version Behavior

| Node.js Version | Default Behavior |
|-----------------|------------------|
| < 15 | Warning only, app continues |
| >= 15 | Crashes the application |

You can configure this with the `--unhandled-rejections` flag:

```bash
# Options: strict, warn, none
node --unhandled-rejections=strict app.js  # Crash on rejection
node --unhandled-rejections=warn app.js    # Warn only (old behavior)
```

## Summary

UnhandledPromiseRejectionWarning tells you a Promise was rejected without a handler. Fix it by adding `.catch()` to promise chains, using try-catch with async/await, wrapping async callbacks, and adding a global `unhandledRejection` handler as a safety net. In modern Node.js, unhandled rejections crash your app, so proper error handling is not optional.
