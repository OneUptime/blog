# How to Implement Custom Middleware Pattern in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Middleware, Express, Architecture

Description: Learn how to implement the middleware pattern in Node.js for composable request processing pipelines.

---

The middleware pattern is one of the most powerful architectural concepts in Node.js development. It allows you to create composable, reusable functions that can intercept and transform requests as they flow through your application. While frameworks like Express popularized this pattern, understanding how to build it from scratch gives you deep insight into how request processing pipelines work.

## Understanding the Middleware Pattern Basics

At its core, middleware is a function that sits between a request and a response. Each middleware function has access to the request object, the response object, and a mechanism to pass control to the next middleware in the chain.

```javascript
// Basic middleware function signature
function middleware(req, res, next) {
  // Do something with req or res
  console.log('Request received:', req.method, req.url);

  // Pass control to the next middleware
  next();
}
```

The key insight is that middleware functions are executed in sequence, forming a pipeline. Each function can modify the request, short-circuit the chain, or pass control forward.

## The Power of the next() Function

The `next()` function is what makes the middleware pattern work. It signals that the current middleware has finished its work and the next one should execute.

```javascript
function loggingMiddleware(req, res, next) {
  const start = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end to log after response
  res.end = function(...args) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
    originalEnd.apply(res, args);
  };

  next();
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return; // Stop the chain
  }

  req.user = { id: 1, name: 'User' }; // Attach user to request
  next();
}
```

## Building a Middleware System from Scratch

Let us create a simple but functional middleware system that mirrors how frameworks like Express work internally.

```javascript
class MiddlewareRunner {
  constructor() {
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this; // Enable chaining
  }

  execute(req, res) {
    let index = 0;

    const next = (err) => {
      if (err) {
        return this.handleError(err, req, res);
      }

      const middleware = this.middlewares[index++];

      if (!middleware) {
        return; // End of chain
      }

      try {
        middleware(req, res, next);
      } catch (error) {
        this.handleError(error, req, res);
      }
    };

    next();
  }

  handleError(err, req, res) {
    console.error('Error:', err.message);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
```

## Error Handling Middleware

Error handling middleware follows a special signature with four parameters. When an error occurs, the system skips regular middleware and jumps to error handlers.

```javascript
class EnhancedMiddlewareRunner {
  constructor() {
    this.middlewares = [];
    this.errorHandlers = [];
  }

  use(middleware) {
    if (middleware.length === 4) {
      this.errorHandlers.push(middleware);
    } else {
      this.middlewares.push(middleware);
    }
    return this;
  }

  execute(req, res) {
    let index = 0;

    const next = (err) => {
      if (err) {
        return this.runErrorHandlers(err, req, res);
      }

      const middleware = this.middlewares[index++];
      if (!middleware) return;

      try {
        middleware(req, res, next);
      } catch (error) {
        this.runErrorHandlers(error, req, res);
      }
    };

    next();
  }

  runErrorHandlers(err, req, res) {
    let index = 0;

    const next = (newErr) => {
      const handler = this.errorHandlers[index++];
      if (!handler) {
        res.statusCode = 500;
        res.end(err.message);
        return;
      }
      handler(newErr || err, req, res, next);
    };

    next();
  }
}

// Error handling middleware example
function errorHandler(err, req, res, next) {
  console.error('Error caught:', err.stack);
  res.statusCode = err.statusCode || 500;
  res.end(JSON.stringify({ error: err.message }));
}
```

## Async Middleware Support

Modern applications often need to perform asynchronous operations in middleware. Here is how to extend our system to handle promises.

```javascript
class AsyncMiddlewareRunner {
  constructor() {
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(req, res) {
    let index = 0;

    const next = async (err) => {
      if (err) {
        throw err;
      }

      const middleware = this.middlewares[index++];
      if (!middleware) return;

      await middleware(req, res, next);
    };

    try {
      await next();
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  }
}

// Async middleware example
async function databaseMiddleware(req, res, next) {
  req.db = await connectToDatabase();
  await next();
  await req.db.close(); // Cleanup after response
}

async function validateBodyMiddleware(req, res, next) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  req.body = JSON.parse(Buffer.concat(chunks).toString());
  await next();
}
```

## Putting It All Together

Here is a complete example using our custom middleware system with an HTTP server.

```javascript
const http = require('http');

const app = new AsyncMiddlewareRunner();

app.use(async (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  await next();
});

app.use(async (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  await next();
});

app.use(async (req, res, next) => {
  res.end(JSON.stringify({ message: 'Hello from middleware!' }));
});

const server = http.createServer((req, res) => {
  app.execute(req, res);
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Conclusion

The middleware pattern provides an elegant way to compose request processing logic. By understanding how to build it from scratch, you gain the flexibility to create custom solutions tailored to your application's needs. Whether you use Express, Koa, or your own implementation, the underlying principles remain the same: functions that process requests in sequence, connected by the `next()` function, with proper error handling and async support.
