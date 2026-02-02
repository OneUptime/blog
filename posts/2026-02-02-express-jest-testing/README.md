# How to Write Tests for Express with Jest

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Jest, Testing, Supertest

Description: Learn how to test Express.js applications with Jest and Supertest, covering unit tests, integration tests, mocking, and test organization.

---

Testing Express applications properly saves you from late-night debugging sessions and production incidents. This guide walks through setting up Jest with Supertest, writing different types of tests, and organizing your test suite for maintainability.

## Setting Up Jest and Supertest

First, install the testing dependencies:

```bash
npm install --save-dev jest supertest
```

Configure Jest in your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/*.test.js"]
  }
}
```

## Separating App from Server

The key to testable Express apps is separating your app configuration from the server startup. This lets tests import the app without starting a server.

```javascript
// app.js - Express app configuration
const express = require('express');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Error handling middleware - must be last
app.use(errorHandler);

module.exports = app;
```

```javascript
// server.js - Server startup (not imported in tests)
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Testing Routes with Supertest

Supertest lets you make HTTP requests to your Express app and assert on the response. No actual server needed.

```javascript
// routes/users.test.js
const request = require('supertest');
const app = require('../app');

describe('GET /api/users', () => {
  it('returns a list of users', async () => {
    // Make a GET request to the endpoint
    const response = await request(app)
      .get('/api/users')
      .expect('Content-Type', /json/)  // Check response header
      .expect(200);                      // Check status code

    // Assert on response body
    expect(response.body).toHaveProperty('users');
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/users/protected')
      .expect(401);

    expect(response.body.error).toBe('Unauthorized');
  });
});

describe('POST /api/users', () => {
  it('creates a new user with valid data', async () => {
    const newUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'securepassword123'
    };

    const response = await request(app)
      .post('/api/users')
      .send(newUser)                    // Send JSON body
      .set('Accept', 'application/json') // Set headers
      .expect(201);

    expect(response.body.user.email).toBe(newUser.email);
    expect(response.body.user).not.toHaveProperty('password'); // Should not expose password
  });

  it('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Test', password: 'pass123' })
      .expect(400);

    expect(response.body.error).toContain('email');
  });
});
```

## Common Jest Matchers for API Testing

| Matcher | Use Case | Example |
|---------|----------|---------|
| `toBe()` | Exact equality | `expect(status).toBe(200)` |
| `toEqual()` | Deep equality for objects | `expect(body).toEqual({ id: 1 })` |
| `toHaveProperty()` | Check property exists | `expect(user).toHaveProperty('id')` |
| `toContain()` | Array or string contains | `expect(errors).toContain('required')` |
| `toMatchObject()` | Partial object matching | `expect(user).toMatchObject({ name: 'Test' })` |
| `toThrow()` | Exception thrown | `expect(fn).toThrow('error')` |
| `toHaveLength()` | Array or string length | `expect(users).toHaveLength(5)` |
| `toBeDefined()` | Not undefined | `expect(user.id).toBeDefined()` |

## Mocking Dependencies

Real tests should not hit actual databases or external services. Jest's mocking lets you replace dependencies with controlled substitutes.

```javascript
// services/userService.js
const db = require('../db');

async function getUserById(id) {
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
}

module.exports = { getUserById };
```

```javascript
// services/userService.test.js
const { getUserById } = require('./userService');
const db = require('../db');

// Mock the entire db module
jest.mock('../db');

describe('getUserById', () => {
  // Reset mocks between tests to prevent state leakage
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user when found', async () => {
    // Set up the mock return value
    const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
    db.query.mockResolvedValue({ rows: [mockUser] });

    const result = await getUserById(1);

    // Verify the mock was called correctly
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );
    expect(result.rows[0]).toEqual(mockUser);
  });

  it('handles database errors', async () => {
    // Make the mock throw an error
    db.query.mockRejectedValue(new Error('Connection failed'));

    await expect(getUserById(1)).rejects.toThrow('Connection failed');
  });
});
```

## Testing Middleware

Middleware functions can be tested in isolation by creating mock request and response objects.

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
```

```javascript
// middleware/auth.test.js
const authMiddleware = require('./auth');
const jwt = require('jsonwebtoken');

// Mock jsonwebtoken module
jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    // Create fresh mock objects for each test
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),  // Allow chaining
      json: jest.fn()
    };
    nextFn = jest.fn();
  });

  it('calls next() with valid token', () => {
    const userData = { id: 1, email: 'test@example.com' };
    mockReq.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue(userData);

    authMiddleware(mockReq, mockRes, nextFn);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(mockReq.user).toEqual(userData);
    expect(nextFn).toHaveBeenCalled();
  });

  it('returns 401 when no token provided', () => {
    authMiddleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    authMiddleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });
});
```

## Testing with a Test Database

For integration tests, use a separate test database. Clean up data between tests to keep them isolated.

```javascript
// tests/integration/users.test.js
const request = require('supertest');
const app = require('../../app');
const db = require('../../db');

describe('User API Integration', () => {
  // Run before all tests in this file
  beforeAll(async () => {
    await db.migrate();  // Set up test database schema
  });

  // Clean up after each test
  afterEach(async () => {
    await db.query('DELETE FROM users');
  });

  // Close connection after all tests
  afterAll(async () => {
    await db.close();
  });

  it('creates and retrieves a user', async () => {
    // Create a user
    const createResponse = await request(app)
      .post('/api/users')
      .send({ email: 'integration@test.com', name: 'Test', password: 'pass123' })
      .expect(201);

    const userId = createResponse.body.user.id;

    // Retrieve the same user
    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.user.email).toBe('integration@test.com');
  });
});
```

## Test Coverage

Run tests with coverage to identify untested code:

```bash
npm run test:coverage
```

Jest outputs a coverage summary and generates an HTML report in `coverage/lcov-report/index.html`. Aim for meaningful coverage rather than 100% - focus on business logic and error handling.

```javascript
// jest.config.js - Coverage configuration
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',      // Exclude server startup
    '!src/**/*.test.js'    // Exclude test files
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Organizing Test Files

Keep tests close to the code they test. This makes it easy to find tests and encourages writing them.

```
src/
  routes/
    users.js
    users.test.js
  middleware/
    auth.js
    auth.test.js
  services/
    userService.js
    userService.test.js
tests/
  integration/
    users.test.js
  fixtures/
    users.json
```

## Quick Tips

- Use `describe` blocks to group related tests
- Name tests clearly - they serve as documentation
- Test both success and error paths
- Keep tests independent - no shared state between tests
- Use `beforeEach` for common setup instead of duplicating code
- Mock external dependencies but test your own code

Testing might feel slow at first, but it pays off when you can refactor with confidence and catch bugs before they reach production.
