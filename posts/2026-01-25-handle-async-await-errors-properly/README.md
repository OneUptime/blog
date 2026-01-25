# How to Handle Async/Await Errors Properly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, JavaScript, Async, Error Handling, Best Practices

Description: Learn proper error handling patterns for async/await in Node.js, including try-catch blocks, wrapper functions, Promise.allSettled, and Express.js middleware strategies.

---

Async/await makes asynchronous code look synchronous, but error handling is where many developers slip up. Without proper handling, a single rejected promise can crash your entire Node.js application. Here are the patterns that work in production.

## The Basic Try-Catch Pattern

The simplest approach wraps async code in try-catch:

```javascript
async function fetchUserData(userId) {
    try {
        const response = await fetch(`https://api.example.com/users/${userId}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const user = await response.json();
        return user;
    } catch (error) {
        // Handle all errors here
        console.error('Failed to fetch user:', error.message);
        throw error;  // Re-throw if caller should handle it
    }
}
```

But try-catch has problems when you have multiple await statements and need to handle each differently:

```javascript
async function processOrder(orderId) {
    try {
        const order = await fetchOrder(orderId);
        const inventory = await checkInventory(order.items);
        const payment = await processPayment(order.total);
        const shipping = await createShipment(order);
        return { order, inventory, payment, shipping };
    } catch (error) {
        // Which operation failed? Hard to tell
        console.error('Order processing failed:', error);
    }
}
```

## Individual Try-Catch Blocks

For granular error handling, wrap each operation:

```javascript
async function processOrder(orderId) {
    let order;
    try {
        order = await fetchOrder(orderId);
    } catch (error) {
        throw new Error(`Failed to fetch order: ${error.message}`);
    }

    let inventory;
    try {
        inventory = await checkInventory(order.items);
    } catch (error) {
        throw new Error(`Inventory check failed: ${error.message}`);
    }

    let payment;
    try {
        payment = await processPayment(order.total);
    } catch (error) {
        // Rollback inventory reservation
        await releaseInventory(inventory.reservationId);
        throw new Error(`Payment failed: ${error.message}`);
    }

    return { order, inventory, payment };
}
```

This is verbose but gives you control. There is a cleaner approach.

## The Wrapper Function Pattern

Create a utility that returns both error and result:

```javascript
// Utility function that catches errors
async function to(promise) {
    try {
        const result = await promise;
        return [null, result];
    } catch (error) {
        return [error, null];
    }
}

// Usage - cleaner code without nested try-catch
async function processOrder(orderId) {
    const [orderError, order] = await to(fetchOrder(orderId));
    if (orderError) {
        throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    const [inventoryError, inventory] = await to(checkInventory(order.items));
    if (inventoryError) {
        throw new Error(`Inventory check failed: ${inventoryError.message}`);
    }

    const [paymentError, payment] = await to(processPayment(order.total));
    if (paymentError) {
        await releaseInventory(inventory.reservationId);
        throw new Error(`Payment failed: ${paymentError.message}`);
    }

    return { order, inventory, payment };
}
```

You can use the `await-to-js` npm package for this pattern:

```bash
npm install await-to-js
```

```javascript
import to from 'await-to-js';

const [error, user] = await to(fetchUser(userId));
```

## Promise.allSettled for Parallel Operations

When running multiple promises in parallel, `Promise.all` fails fast on the first rejection. Use `Promise.allSettled` to get results from all promises:

```javascript
async function fetchDashboardData(userId) {
    const results = await Promise.allSettled([
        fetchUserProfile(userId),
        fetchUserOrders(userId),
        fetchUserNotifications(userId),
        fetchUserRecommendations(userId)
    ]);

    // Process results - each has status: 'fulfilled' or 'rejected'
    const [profile, orders, notifications, recommendations] = results;

    return {
        profile: profile.status === 'fulfilled' ? profile.value : null,
        orders: orders.status === 'fulfilled' ? orders.value : [],
        notifications: notifications.status === 'fulfilled' ? notifications.value : [],
        recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
        errors: results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason.message)
    };
}
```

## Express.js Error Handling

Express does not catch async errors by default. Wrap your handlers:

```javascript
// This breaks - Express does not catch the rejection
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);  // If this throws, app crashes
    res.json(user);
});

// Fix 1: Manual try-catch in every handler
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);  // Pass to error handler
    }
});

// Fix 2: Wrapper function
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
}));
```

Use the `express-async-handler` package for this:

```bash
npm install express-async-handler
```

```javascript
const asyncHandler = require('express-async-handler');

app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
}));
```

Add a centralized error handler:

```javascript
// Error handling middleware (must be last)
app.use((error, req, res, next) => {
    console.error('Error:', error.message);

    // Custom error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.details
        });
    }

    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Default error response
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message
    });
});
```

## Custom Error Classes

Create typed errors for better handling:

```javascript
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;  // Distinguishes from programming errors

        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

// Usage
async function getUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }
    return user;
}

// Error handler can now check error types
app.use((error, req, res, next) => {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: error.message,
            code: error.code,
            details: error.details
        });
    }

    // Unexpected errors
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
```

## Handling Unhandled Rejections

Always catch unhandled promise rejections at the process level:

```javascript
// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log to your error tracking service
    // Do NOT exit - this is just a warning in Node 15+
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Log to error tracking service
    // Gracefully shutdown
    process.exit(1);
});
```

## Timeout Handling

Add timeouts to async operations that might hang:

```javascript
function withTimeout(promise, ms, message = 'Operation timed out') {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]);
}

// Usage
async function fetchWithTimeout(url) {
    try {
        const response = await withTimeout(
            fetch(url),
            5000,
            'Request timed out after 5 seconds'
        );
        return response.json();
    } catch (error) {
        if (error.message.includes('timed out')) {
            // Handle timeout specifically
            console.error('Request timeout:', url);
        }
        throw error;
    }
}
```

## Retry Pattern

Retry failed operations with exponential backoff:

```javascript
async function retry(fn, options = {}) {
    const {
        attempts = 3,
        delay = 1000,
        backoff = 2,
        shouldRetry = () => true
    } = options;

    let lastError;

    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (i === attempts - 1 || !shouldRetry(error)) {
                throw error;
            }

            const waitTime = delay * Math.pow(backoff, i);
            console.log(`Attempt ${i + 1} failed, retrying in ${waitTime}ms`);
            await new Promise(r => setTimeout(r, waitTime));
        }
    }

    throw lastError;
}

// Usage
const data = await retry(
    () => fetchDataFromUnreliableAPI(),
    {
        attempts: 3,
        delay: 1000,
        shouldRetry: (error) => error.status !== 404  // Do not retry 404s
    }
);
```

## Summary

Proper async/await error handling requires thinking about each failure point. Use try-catch for simple cases, wrapper functions for cleaner code, Promise.allSettled for parallel operations, custom error classes for typed handling, and always catch unhandled rejections at the process level. In Express, wrap your async handlers and use centralized error middleware. These patterns will keep your Node.js applications stable in production.
