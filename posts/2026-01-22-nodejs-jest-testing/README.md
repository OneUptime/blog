# How to Use Jest for Testing Node.js Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Jest, Testing, UnitTests, TDD

Description: Learn how to use Jest for testing Node.js applications including unit tests, integration tests, mocking, async testing, and code coverage.

---

Jest is a popular JavaScript testing framework that works great with Node.js. It provides a complete testing solution with zero configuration, built-in mocking, and excellent developer experience.

## Installation and Setup

```bash
npm install --save-dev jest
```

### package.json Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
```

## Writing Basic Tests

### Test File Structure

```javascript
// math.js
function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, multiply };
```

```javascript
// math.test.js
const { add, multiply } = require('./math');

describe('Math functions', () => {
  describe('add', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    test('should handle negative numbers', () => {
      expect(add(-1, -1)).toBe(-2);
    });

    test('should handle zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('multiply', () => {
    test('should multiply two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });
  });
});
```

### Common Matchers

```javascript
describe('Jest Matchers', () => {
  // Equality
  test('equality matchers', () => {
    expect(2 + 2).toBe(4);                    // Strict equality
    expect({ a: 1 }).toEqual({ a: 1 });       // Deep equality
    expect([1, 2]).toStrictEqual([1, 2]);     // Strict deep equality
  });

  // Truthiness
  test('truthiness matchers', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(0).toBeDefined();
  });

  // Numbers
  test('number matchers', () => {
    expect(10).toBeGreaterThan(5);
    expect(10).toBeGreaterThanOrEqual(10);
    expect(5).toBeLessThan(10);
    expect(5).toBeLessThanOrEqual(5);
    expect(0.1 + 0.2).toBeCloseTo(0.3);       // Floating point
  });

  // Strings
  test('string matchers', () => {
    expect('Hello World').toMatch(/World/);
    expect('Hello World').toContain('World');
  });

  // Arrays
  test('array matchers', () => {
    const arr = ['apple', 'banana', 'cherry'];
    expect(arr).toContain('banana');
    expect(arr).toHaveLength(3);
    expect([1, 2, 3]).toEqual(expect.arrayContaining([1, 2]));
  });

  // Objects
  test('object matchers', () => {
    const obj = { name: 'John', age: 30 };
    expect(obj).toHaveProperty('name');
    expect(obj).toHaveProperty('name', 'John');
    expect(obj).toMatchObject({ name: 'John' });
    expect(obj).toEqual(expect.objectContaining({ name: 'John' }));
  });

  // Exceptions
  test('exception matchers', () => {
    const throwError = () => {
      throw new Error('Something went wrong');
    };
    expect(throwError).toThrow();
    expect(throwError).toThrow('Something went wrong');
    expect(throwError).toThrow(Error);
  });
});
```

## Async Testing

### Promises

```javascript
// api.js
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// api.test.js
test('fetchUser returns user data', async () => {
  const user = await fetchUser(1);
  expect(user).toHaveProperty('name');
});

// Using resolves/rejects
test('promise resolves with data', () => {
  return expect(fetchUser(1)).resolves.toHaveProperty('name');
});

test('promise rejects with error', () => {
  return expect(fetchUser(999)).rejects.toThrow('Not found');
});
```

### Callbacks

```javascript
// Using done callback
test('callback test', (done) => {
  function callback(data) {
    try {
      expect(data).toBe('hello');
      done();
    } catch (error) {
      done(error);
    }
  }
  
  fetchData(callback);
});
```

### Async/Await

```javascript
test('async/await test', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// With try/catch for errors
test('async function throws', async () => {
  await expect(asyncFunctionThatThrows()).rejects.toThrow('Error message');
});
```

## Mocking

### Mock Functions

```javascript
test('mock function', () => {
  const mockCallback = jest.fn(x => x * 2);
  
  [1, 2, 3].forEach(mockCallback);
  
  expect(mockCallback).toHaveBeenCalled();
  expect(mockCallback).toHaveBeenCalledTimes(3);
  expect(mockCallback).toHaveBeenCalledWith(1);
  expect(mockCallback).toHaveBeenLastCalledWith(3);
  expect(mockCallback.mock.results[0].value).toBe(2);
});
```

### Mock Return Values

```javascript
test('mock return values', () => {
  const mock = jest.fn();
  
  mock.mockReturnValue(10);
  expect(mock()).toBe(10);
  
  mock.mockReturnValueOnce(20).mockReturnValueOnce(30);
  expect(mock()).toBe(20);
  expect(mock()).toBe(30);
  expect(mock()).toBe(10);  // Falls back to mockReturnValue
  
  // Async mock
  const asyncMock = jest.fn().mockResolvedValue({ data: 'test' });
  expect(await asyncMock()).toEqual({ data: 'test' });
});
```

### Mocking Modules

```javascript
// userService.js
const axios = require('axios');

async function getUser(id) {
  const response = await axios.get(`/api/users/${id}`);
  return response.data;
}

module.exports = { getUser };

// userService.test.js
const axios = require('axios');
const { getUser } = require('./userService');

jest.mock('axios');

test('getUser returns user data', async () => {
  const mockUser = { id: 1, name: 'John' };
  axios.get.mockResolvedValue({ data: mockUser });
  
  const user = await getUser(1);
  
  expect(axios.get).toHaveBeenCalledWith('/api/users/1');
  expect(user).toEqual(mockUser);
});
```

### Manual Mocks

Create `__mocks__/axios.js`:

```javascript
module.exports = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
};
```

### Partial Mocking

```javascript
// Only mock specific functions
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  fetchData: jest.fn(),
}));
```

### Mocking Implementations

```javascript
const mockFn = jest.fn();

mockFn.mockImplementation((x) => x * 2);
expect(mockFn(5)).toBe(10);

mockFn.mockImplementationOnce((x) => x * 3);
expect(mockFn(5)).toBe(15);
expect(mockFn(5)).toBe(10);  // Back to original implementation
```

## Spying

```javascript
const video = {
  play() {
    return true;
  },
  pause() {
    return false;
  },
};

test('spy on method', () => {
  const spy = jest.spyOn(video, 'play');
  
  video.play();
  
  expect(spy).toHaveBeenCalled();
  
  spy.mockRestore();  // Restore original implementation
});
```

## Setup and Teardown

```javascript
describe('Database tests', () => {
  // Run once before all tests
  beforeAll(async () => {
    await db.connect();
  });

  // Run once after all tests
  afterAll(async () => {
    await db.disconnect();
  });

  // Run before each test
  beforeEach(async () => {
    await db.clear();
  });

  // Run after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should insert record', async () => {
    await db.insert({ name: 'Test' });
    const records = await db.findAll();
    expect(records).toHaveLength(1);
  });
});
```

### Scoped Setup

```javascript
describe('Outer', () => {
  beforeEach(() => console.log('Outer beforeEach'));

  describe('Inner', () => {
    beforeEach(() => console.log('Inner beforeEach'));
    
    test('test', () => {
      // Outer beforeEach runs first, then Inner beforeEach
    });
  });
});
```

## Testing Express APIs

```javascript
// app.js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

module.exports = app;
```

```javascript
// app.test.js
const request = require('supertest');
const app = require('./app');

describe('User API', () => {
  test('GET /api/users returns users', async () => {
    const response = await request(app).get('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('name', 'John');
  });

  test('POST /api/users creates user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Jane' })
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Jane' });
  });
});
```

## Snapshot Testing

```javascript
// For component output or complex objects
test('user object matches snapshot', () => {
  const user = createUser('John', 'john@example.com');
  expect(user).toMatchSnapshot();
});

// Inline snapshots
test('inline snapshot', () => {
  const user = { name: 'John', email: 'john@example.com' };
  expect(user).toMatchInlineSnapshot(`
    Object {
      "email": "john@example.com",
      "name": "John",
    }
  `);
});
```

Update snapshots:

```bash
jest --updateSnapshot
# or
jest -u
```

## Code Coverage

```bash
# Generate coverage report
jest --coverage

# With specific files
jest --coverage --collectCoverageFrom='src/**/*.js'
```

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/critical/': {
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
```

## Useful Patterns

### Test Each

```javascript
test.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 2, 4],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});

// With objects
test.each([
  { input: 'hello', expected: 'HELLO' },
  { input: 'world', expected: 'WORLD' },
])('toUpperCase($input) = $expected', ({ input, expected }) => {
  expect(input.toUpperCase()).toBe(expected);
});
```

### Skip and Only

```javascript
test.skip('skip this test', () => {
  // This test will not run
});

test.only('run only this test', () => {
  // Only this test will run
});

describe.skip('skip entire suite', () => {
  // All tests in here are skipped
});
```

### Custom Matchers

```javascript
// jest.setup.js
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
});

// Usage
test('custom matcher', () => {
  expect(10).toBeWithinRange(5, 15);
});
```

## Summary

| Feature | Usage |
|---------|-------|
| Basic test | `test('name', () => {})` |
| Group tests | `describe('name', () => {})` |
| Async test | `test('name', async () => {})` |
| Mock function | `jest.fn()` |
| Mock module | `jest.mock('module')` |
| Spy | `jest.spyOn(obj, 'method')` |
| Setup | `beforeEach()`, `beforeAll()` |
| Teardown | `afterEach()`, `afterAll()` |
| Snapshot | `expect(x).toMatchSnapshot()` |

Best practices:
- Write descriptive test names
- Use `describe` blocks to organize tests
- Clean up after tests with teardown hooks
- Mock external dependencies
- Aim for high code coverage but focus on critical paths
- Use `test.each` for parameterized tests
- Run tests in watch mode during development
