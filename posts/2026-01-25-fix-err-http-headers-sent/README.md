# How to Fix 'Error: ERR_HTTP_HEADERS_SENT'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Express, HTTP, Debugging, Error Handling

Description: Fix the ERR_HTTP_HEADERS_SENT error in Express.js by understanding response lifecycle, using proper return statements, and avoiding multiple responses.

---

When you see this error in your Node.js application:

```
Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
```

It means you are trying to send multiple responses or modify headers after the response has already started. HTTP allows only one response per request, and once headers are sent, they cannot be changed.

## Understanding the Problem

Every HTTP response follows this sequence:
1. Set headers
2. Send headers (happens automatically when you start sending body)
3. Send body
4. End response

Once step 2 happens, you cannot go back. This error occurs when code tries to:

```javascript
// Problem: Two responses for one request
app.get('/user', (req, res) => {
    res.json({ name: 'John' });    // First response - headers sent
    res.json({ name: 'Jane' });    // Error! Cannot send another response
});
```

## Common Causes and Fixes

### 1. Missing Return Statement

The most common cause:

```javascript
// Problem - missing return
app.get('/user/:id', (req, res) => {
    const user = findUser(req.params.id);

    if (!user) {
        res.status(404).json({ error: 'Not found' });
        // Execution continues!
    }

    res.json(user);  // Error: headers already sent
});

// Fix - add return
app.get('/user/:id', (req, res) => {
    const user = findUser(req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'Not found' });
    }

    res.json(user);  // Only runs if user exists
});
```

### 2. Async Callback After Response

```javascript
// Problem - callback runs after response
app.get('/data', (req, res) => {
    getData((err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed' });
            // No return, continues to next line
        }
        res.json(data);  // Runs even after error response
    });
});

// Fix
app.get('/data', (req, res) => {
    getData((err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed' });
        }
        res.json(data);
    });
});
```

### 3. Multiple Middleware Sending Responses

```javascript
// Problem - middleware sends response but does not stop chain
function authMiddleware(req, res, next) {
    if (!req.headers.authorization) {
        res.status(401).json({ error: 'Unauthorized' });
        // Missing return, next() might be called elsewhere
    }
    next();  // Route handler runs anyway
}

app.get('/protected', authMiddleware, (req, res) => {
    res.json({ secret: 'data' });  // Error if auth failed
});

// Fix
function authMiddleware(req, res, next) {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
```

### 4. Loop That Sends Multiple Responses

```javascript
// Problem - response inside loop
app.get('/items', (req, res) => {
    const items = getItems();

    items.forEach(item => {
        res.json(item);  // First iteration works, rest fail
    });
});

// Fix - collect results first
app.get('/items', (req, res) => {
    const items = getItems();
    res.json(items);  // Send all at once
});
```

### 5. Error Handler After Response

```javascript
// Problem - error thrown after response started
app.get('/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    try {
        await streamData(res);  // Starts writing to response
    } catch (error) {
        // Error happens mid-stream
        res.status(500).json({ error: error.message });  // Error!
    }
});

// Fix - check if headers sent
app.get('/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    try {
        await streamData(res);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            // Headers already sent, just end the response
            res.end();
            console.error('Stream error:', error);
        }
    }
});
```

### 6. Promise Rejection After Response

```javascript
// Problem - multiple async paths can resolve
app.get('/race', async (req, res) => {
    const timeout = setTimeout(() => {
        res.status(408).json({ error: 'Timeout' });
    }, 5000);

    const data = await fetchData();  // This might complete after timeout
    clearTimeout(timeout);
    res.json(data);  // Error if timeout already responded
});

// Fix - track response state
app.get('/race', async (req, res) => {
    let responded = false;

    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            res.status(408).json({ error: 'Timeout' });
        }
    }, 5000);

    try {
        const data = await fetchData();
        clearTimeout(timeout);
        if (!responded) {
            responded = true;
            res.json(data);
        }
    } catch (error) {
        clearTimeout(timeout);
        if (!responded) {
            responded = true;
            res.status(500).json({ error: error.message });
        }
    }
});
```

## Using res.headersSent

Express provides a built-in check:

```javascript
app.get('/data', async (req, res) => {
    try {
        const data = await fetchData();
        res.json(data);
    } catch (error) {
        // Check before sending error response
        if (res.headersSent) {
            console.error('Cannot send error, headers already sent:', error);
            return;
        }
        res.status(500).json({ error: error.message });
    }
});
```

## Error Handling Middleware

Create a safe error handler:

```javascript
// Safe error handler
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Do not send response if headers already sent
    if (res.headersSent) {
        return next(err);  // Delegate to default Express handler
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
}

app.use(errorHandler);
```

## Async Handler Wrapper

Create a wrapper that handles async errors properly:

```javascript
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        // Only pass to error handler if headers not sent
        if (!res.headersSent) {
            next(error);
        } else {
            console.error('Error after headers sent:', error);
        }
    });
};

app.get('/data', asyncHandler(async (req, res) => {
    const data = await fetchData();
    res.json(data);
}));
```

## Debugging Tips

Add logging to find where double responses happen:

```javascript
// Debug middleware
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let responseSent = false;

    res.json = (data) => {
        if (responseSent) {
            console.error('Double response detected!');
            console.trace();  // Print stack trace
            return res;
        }
        responseSent = true;
        return originalJson(data);
    };

    res.send = (data) => {
        if (responseSent) {
            console.error('Double response detected!');
            console.trace();
            return res;
        }
        responseSent = true;
        return originalSend(data);
    };

    next();
});
```

## Response Helper Function

Create a safe response function:

```javascript
function sendResponse(res, statusCode, data) {
    if (res.headersSent) {
        console.warn('Attempted to send response after headers sent');
        return false;
    }

    res.status(statusCode).json(data);
    return true;
}

// Usage
app.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return sendResponse(res, 404, { error: 'User not found' });
        }

        sendResponse(res, 200, { data: user });
    } catch (error) {
        sendResponse(res, 500, { error: error.message });
    }
});
```

## Summary

ERR_HTTP_HEADERS_SENT means your code tries to send multiple responses or modify headers after they have been sent. The fix is usually adding `return` statements after sending responses, checking `res.headersSent` before sending, and being careful with async code that might have multiple execution paths leading to responses. Always ensure each request handler has exactly one response path.
