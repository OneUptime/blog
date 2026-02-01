# How to Write Tests with Bun Test Runner

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Testing, JavaScript, Unit Testing

Description: A comprehensive guide to writing fast and efficient tests using Bun's built-in test runner, covering assertions, mocking, spies, lifecycle hooks, and best practices.

---

Testing is a critical part of modern software development, and choosing the right test runner can significantly impact your development workflow. Bun, the fast all-in-one JavaScript runtime, comes with a built-in test runner that is incredibly fast and feature-rich. In this guide, we will explore how to write comprehensive tests using Bun's test runner, from basic assertions to advanced mocking and snapshot testing.

## Why Choose Bun Test Runner?

Before diving into the code, let's understand why Bun's test runner stands out:

- **Speed**: Bun's test runner is built from the ground up for performance, often running 10-50x faster than Jest
- **Zero Configuration**: Works out of the box with TypeScript and JSX support
- **Jest-Compatible**: Familiar API for developers coming from Jest
- **Built-in Mocking**: No need for external mocking libraries
- **Snapshot Testing**: Native support for snapshot testing
- **Code Coverage**: Built-in coverage reporting

## Getting Started with Bun Test

To get started, you need to have Bun installed. If you haven't already, install it using:

```bash
curl -fsSL https://bun.sh/install | bash
```

Bun automatically discovers and runs test files that match these patterns:
- `*.test.ts` or `*.test.js`
- `*.spec.ts` or `*.spec.js`
- Any file in a `__tests__` directory

## Basic Test Structure

Let's start with the fundamental building blocks of a Bun test file. The following example demonstrates how to import test utilities and write a simple test case.

```typescript
// Import describe, test (or it), and expect from bun:test
import { describe, test, it, expect } from "bun:test";

// A simple test case using the test function
test("addition works correctly", () => {
  const result = 2 + 2;
  expect(result).toBe(4);
});

// You can also use 'it' as an alias for 'test'
it("subtraction works correctly", () => {
  const result = 10 - 5;
  expect(result).toBe(5);
});
```

To run your tests, simply execute:

```bash
bun test
```

## Organizing Tests with describe

The `describe` function helps you group related tests together. This improves readability and allows you to apply shared setup/teardown logic to multiple tests.

```typescript
import { describe, test, expect } from "bun:test";

// Group related tests under a common description
describe("Calculator", () => {
  // Tests for addition operations
  describe("add", () => {
    test("adds two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    test("adds negative numbers", () => {
      expect(add(-1, -1)).toBe(-2);
    });

    test("adds zero", () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  // Tests for multiplication operations
  describe("multiply", () => {
    test("multiplies two numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    test("multiplies by zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });
});

// Helper functions for the tests
function add(a: number, b: number): number {
  return a + b;
}

function multiply(a: number, b: number): number {
  return a * b;
}
```

## Assertions and Matchers

Bun provides a comprehensive set of matchers for assertions. Here are the most commonly used ones organized by category.

### Equality Matchers

These matchers are used to check if values are equal or identical.

```typescript
import { test, expect } from "bun:test";

test("equality matchers", () => {
  // toBe uses Object.is for strict equality (primitives)
  expect(5).toBe(5);
  expect("hello").toBe("hello");

  // toEqual performs deep equality for objects and arrays
  expect({ name: "John", age: 30 }).toEqual({ name: "John", age: 30 });
  expect([1, 2, 3]).toEqual([1, 2, 3]);

  // toStrictEqual is like toEqual but also checks for undefined properties
  expect({ a: 1 }).toStrictEqual({ a: 1 });
});
```

### Truthiness Matchers

These matchers help verify boolean conditions and null/undefined values.

```typescript
import { test, expect } from "bun:test";

test("truthiness matchers", () => {
  // Check for null and undefined
  expect(null).toBeNull();
  expect(undefined).toBeUndefined();
  expect("value").toBeDefined();

  // Check for truthy and falsy values
  expect(true).toBeTruthy();
  expect(1).toBeTruthy();
  expect("non-empty").toBeTruthy();

  expect(false).toBeFalsy();
  expect(0).toBeFalsy();
  expect("").toBeFalsy();
  expect(null).toBeFalsy();
});
```

### Number Matchers

Number matchers are useful for comparing numeric values with precision.

```typescript
import { test, expect } from "bun:test";

test("number matchers", () => {
  const value = 10;

  expect(value).toBeGreaterThan(5);
  expect(value).toBeGreaterThanOrEqual(10);
  expect(value).toBeLessThan(20);
  expect(value).toBeLessThanOrEqual(10);

  // For floating point comparisons, use toBeCloseTo to avoid rounding errors
  expect(0.1 + 0.2).toBeCloseTo(0.3, 5); // 5 decimal places precision
});
```

### String and Array Matchers

These matchers work with strings and arrays to check for containment and patterns.

```typescript
import { test, expect } from "bun:test";

test("string matchers", () => {
  const message = "Hello, World!";

  // Check if string contains a substring
  expect(message).toContain("World");

  // Check if string matches a regular expression
  expect(message).toMatch(/Hello/);
  expect(message).toMatch(/world/i); // Case insensitive

  // Check string length
  expect(message).toHaveLength(13);
});

test("array matchers", () => {
  const fruits = ["apple", "banana", "orange"];

  // Check if array contains an element
  expect(fruits).toContain("banana");

  // Check array length
  expect(fruits).toHaveLength(3);

  // Check if array contains element matching criteria
  expect(fruits).toContainEqual("apple");
});
```

### Exception Matchers

These matchers verify that code throws or does not throw exceptions.

```typescript
import { test, expect } from "bun:test";

test("exception matchers", () => {
  // Function that throws an error
  const throwError = () => {
    throw new Error("Something went wrong");
  };

  // Check that function throws
  expect(throwError).toThrow();
  expect(throwError).toThrow("Something went wrong");
  expect(throwError).toThrow(/wrong/);
  expect(throwError).toThrow(Error);

  // Function that doesn't throw
  const noError = () => "success";
  expect(noError).not.toThrow();
});
```

## Async Testing

Modern JavaScript applications heavily rely on asynchronous code. Bun's test runner provides excellent support for testing async functions.

### Testing Promises

You can test promises by returning them from your test function or using async/await syntax.

```typescript
import { test, expect } from "bun:test";

// Simulated async function that fetches user data
async function fetchUser(id: number): Promise<{ id: number; name: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  if (id <= 0) {
    throw new Error("Invalid user ID");
  }
  
  return { id, name: "John Doe" };
}

// Test async function using async/await
test("fetchUser returns user data", async () => {
  const user = await fetchUser(1);
  
  expect(user).toEqual({ id: 1, name: "John Doe" });
  expect(user.name).toBe("John Doe");
});

// Test async function that throws
test("fetchUser throws for invalid ID", async () => {
  await expect(fetchUser(-1)).rejects.toThrow("Invalid user ID");
});

// Test with resolves matcher
test("fetchUser resolves with user object", async () => {
  await expect(fetchUser(5)).resolves.toHaveProperty("name");
});
```

### Testing with Timeouts

For long-running tests, you can specify a custom timeout to prevent tests from hanging.

```typescript
import { test, expect } from "bun:test";

// Set a custom timeout for slow operations (in milliseconds)
test("slow operation completes", async () => {
  const result = await slowOperation();
  expect(result).toBe("done");
}, 10000); // 10 second timeout

async function slowOperation(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return "done";
}
```

## Test Filtering and Skipping

Bun provides several ways to filter and control which tests run, which is useful during development and debugging.

### Skipping Tests

Use `.skip` to temporarily disable tests without removing them.

```typescript
import { describe, test, expect } from "bun:test";

// Skip a single test
test.skip("this test is skipped", () => {
  expect(true).toBe(false); // This won't run
});

// Skip an entire describe block
describe.skip("skipped suite", () => {
  test("this won't run", () => {
    expect(1).toBe(1);
  });
});
```

### Running Only Specific Tests

Use `.only` to run only specific tests, ignoring all others.

```typescript
import { describe, test, expect } from "bun:test";

// Only this test will run
test.only("focused test", () => {
  expect(2 + 2).toBe(4);
});

// This test is ignored when .only is present elsewhere
test("this is ignored", () => {
  expect(1).toBe(1);
});
```

### Marking Tests as TODO

Use `.todo` to mark tests that need to be implemented later.

```typescript
import { test } from "bun:test";

// Placeholder for future test implementation
test.todo("implement error handling tests");
test.todo("add edge case coverage");
```

### Command Line Filtering

You can also filter tests from the command line.

```bash
# Run tests matching a pattern
bun test --test-name-pattern "Calculator"

# Run a specific test file
bun test calculator.test.ts

# Run tests in a specific directory
bun test ./tests/unit/
```

## Mocking and Spies

Mocking is essential for isolating units of code during testing. Bun provides built-in mocking capabilities.

### Creating Mock Functions

Mock functions let you track calls and control return values.

```typescript
import { test, expect, mock } from "bun:test";

test("mock function basics", () => {
  // Create a mock function
  const mockFn = mock((x: number) => x * 2);

  // Call the mock
  const result1 = mockFn(5);
  const result2 = mockFn(10);

  // Verify the mock was called correctly
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn).toHaveBeenCalledTimes(2);
  expect(mockFn).toHaveBeenCalledWith(5);
  expect(mockFn).toHaveBeenLastCalledWith(10);

  // Verify return values
  expect(result1).toBe(10);
  expect(result2).toBe(20);
});
```

### Mocking Return Values

You can configure mock functions to return specific values.

```typescript
import { test, expect, mock } from "bun:test";

test("mock return values", () => {
  const mockFn = mock();

  // Configure return values
  mockFn.mockReturnValue("default");
  expect(mockFn()).toBe("default");

  // Configure return value for next call only
  mockFn.mockReturnValueOnce("first").mockReturnValueOnce("second");
  
  expect(mockFn()).toBe("first");
  expect(mockFn()).toBe("second");
  expect(mockFn()).toBe("default"); // Falls back to default
});
```

### Mocking Implementations

For more complex scenarios, you can mock the entire implementation.

```typescript
import { test, expect, mock } from "bun:test";

test("mock implementations", () => {
  const mockFn = mock();

  // Set a custom implementation
  mockFn.mockImplementation((a: number, b: number) => a + b);
  expect(mockFn(2, 3)).toBe(5);

  // Set implementation for next call only
  mockFn.mockImplementationOnce((a: number, b: number) => a * b);
  expect(mockFn(2, 3)).toBe(6);  // Uses multiplication
  expect(mockFn(2, 3)).toBe(5);  // Back to addition
});
```

### Spying on Objects

Spies allow you to monitor method calls on existing objects.

```typescript
import { test, expect, spyOn } from "bun:test";

test("spying on object methods", () => {
  const calculator = {
    add(a: number, b: number) {
      return a + b;
    },
    multiply(a: number, b: number) {
      return a * b;
    },
  };

  // Create a spy on the add method
  const addSpy = spyOn(calculator, "add");

  // Call the method
  const result = calculator.add(2, 3);

  // Verify the spy recorded the call
  expect(addSpy).toHaveBeenCalled();
  expect(addSpy).toHaveBeenCalledWith(2, 3);
  expect(result).toBe(5); // Original implementation still works

  // Restore original behavior
  addSpy.mockRestore();
});
```

### Mocking Modules

Bun allows you to mock entire modules for complete isolation.

```typescript
import { test, expect, mock } from "bun:test";

// Mock a module before importing it
mock.module("./database", () => ({
  getUser: mock(() => ({ id: 1, name: "Mock User" })),
  saveUser: mock(() => true),
}));

// Now import the module - it will use the mocked version
import { getUser, saveUser } from "./database";

test("mocked module functions", () => {
  const user = getUser(1);
  expect(user).toEqual({ id: 1, name: "Mock User" });

  const saved = saveUser({ id: 2, name: "New User" });
  expect(saved).toBe(true);
});
```

## Lifecycle Hooks

Lifecycle hooks help you set up and clean up test environments. They run at specific times during the test lifecycle.

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

describe("Database Tests", () => {
  let database: Database;
  let connection: Connection;

  // Runs once before all tests in this describe block
  beforeAll(async () => {
    console.log("Setting up database connection...");
    connection = await Database.connect("test://localhost");
    database = new Database(connection);
  });

  // Runs once after all tests in this describe block
  afterAll(async () => {
    console.log("Closing database connection...");
    await connection.close();
  });

  // Runs before each test in this describe block
  beforeEach(async () => {
    console.log("Resetting database state...");
    await database.reset();
    await database.seed(testData);
  });

  // Runs after each test in this describe block
  afterEach(async () => {
    console.log("Cleaning up test data...");
    await database.cleanup();
  });

  test("can insert a record", async () => {
    const record = await database.insert({ name: "Test" });
    expect(record.id).toBeDefined();
  });

  test("can query records", async () => {
    const records = await database.findAll();
    expect(records.length).toBeGreaterThan(0);
  });
});

// Type definitions for the example
interface Connection {
  close(): Promise<void>;
}

interface Database {
  reset(): Promise<void>;
  seed(data: any): Promise<void>;
  cleanup(): Promise<void>;
  insert(record: any): Promise<{ id: number }>;
  findAll(): Promise<any[]>;
}

const Database = {
  connect: async (url: string): Promise<Connection> => ({
    close: async () => {},
  }),
};

const testData = [{ name: "Sample" }];
```

## Snapshot Testing

Snapshot testing is useful for ensuring that output doesn't change unexpectedly. Bun stores snapshots and compares them on subsequent runs.

```typescript
import { test, expect } from "bun:test";

// Function that generates complex output
function generateReport(data: { name: string; items: string[] }) {
  return {
    title: `Report for ${data.name}`,
    itemCount: data.items.length,
    items: data.items.map((item, index) => ({
      id: index + 1,
      label: item.toUpperCase(),
    })),
    generatedAt: "2026-01-31", // Use fixed date for snapshot consistency
  };
}

test("report generation matches snapshot", () => {
  const report = generateReport({
    name: "January Sales",
    items: ["Product A", "Product B", "Product C"],
  });

  // First run creates the snapshot, subsequent runs compare against it
  expect(report).toMatchSnapshot();
});

test("HTML output matches snapshot", () => {
  const html = `
    <div class="card">
      <h1>Welcome</h1>
      <p>This is a test component</p>
    </div>
  `;

  expect(html).toMatchSnapshot();
});
```

To update snapshots when intentional changes are made:

```bash
bun test --update-snapshots
```

## Code Coverage

Bun provides built-in code coverage reporting to help identify untested code paths.

```bash
# Run tests with coverage
bun test --coverage

# Generate detailed coverage report
bun test --coverage --coverage-reporter=text
```

The coverage report shows:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of conditional branches taken
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## Test Organization Best Practices

Here is an example of a well-organized test file that demonstrates good testing patterns.

```typescript
import { describe, test, expect, beforeEach, mock } from "bun:test";

// System under test
import { UserService } from "./user-service";
import type { UserRepository } from "./user-repository";

describe("UserService", () => {
  // Declare shared variables
  let userService: UserService;
  let mockRepository: UserRepository;

  // Set up fresh instances before each test
  beforeEach(() => {
    // Create mock repository with all required methods
    mockRepository = {
      findById: mock(() => Promise.resolve({ id: 1, name: "John" })),
      save: mock(() => Promise.resolve({ id: 1, name: "John" })),
      delete: mock(() => Promise.resolve(true)),
    };

    // Inject mock dependency
    userService = new UserService(mockRepository);
  });

  // Group tests by method
  describe("getUser", () => {
    test("returns user when found", async () => {
      const user = await userService.getUser(1);
      expect(user).toEqual({ id: 1, name: "John" });
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    test("throws when user not found", async () => {
      mockRepository.findById = mock(() => Promise.resolve(null));
      await expect(userService.getUser(999)).rejects.toThrow("User not found");
    });
  });

  describe("createUser", () => {
    test("creates and returns new user", async () => {
      const newUser = await userService.createUser({ name: "Jane" });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(newUser.id).toBeDefined();
    });

    test("validates user data before saving", async () => {
      await expect(userService.createUser({ name: "" })).rejects.toThrow(
        "Name is required"
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
```

## Best Practices Summary

Following these best practices will help you write maintainable and effective tests:

1. **Use descriptive test names**: Test names should clearly describe what is being tested and the expected outcome. Use the pattern "should [expected behavior] when [condition]".

2. **Follow the AAA pattern**: Structure tests with Arrange (setup), Act (execute), and Assert (verify) sections for clarity.

3. **Keep tests isolated**: Each test should be independent and not rely on the state from other tests. Use `beforeEach` to reset state.

4. **Mock external dependencies**: Use mocks and spies to isolate the unit under test from external services, databases, and APIs.

5. **Test edge cases**: Include tests for boundary conditions, empty inputs, invalid data, and error scenarios.

6. **Avoid testing implementation details**: Focus on testing behavior and outcomes rather than internal implementation.

7. **Use meaningful assertions**: Choose the most specific matcher for each assertion to get clearer error messages.

8. **Group related tests**: Use `describe` blocks to organize tests by feature, component, or method.

9. **Keep tests fast**: Fast tests encourage frequent running. Mock slow operations like network requests and database queries.

10. **Maintain test coverage**: Aim for high coverage but prioritize testing critical paths and complex logic over achieving 100% coverage.

11. **Clean up after tests**: Use `afterEach` and `afterAll` hooks to clean up resources, close connections, and reset state.

12. **Update snapshots intentionally**: Review snapshot changes carefully and only update them when changes are intentional.

## Conclusion

Bun's test runner provides a powerful, fast, and feature-rich testing experience for JavaScript and TypeScript projects. Its Jest-compatible API makes migration easy, while its performance improvements can significantly speed up your test suite. From basic assertions to advanced mocking and snapshot testing, Bun has everything you need to write comprehensive tests.

The key takeaways from this guide are:
- Bun test runner is fast and works out of the box with TypeScript
- Use `describe` to organize tests and lifecycle hooks to manage setup and teardown
- Leverage the full range of matchers for precise assertions
- Mock external dependencies to keep tests isolated and fast
- Use snapshot testing for complex outputs that should remain stable
- Enable code coverage to identify untested code paths

Start by writing simple tests for your core functions, then gradually expand coverage as you become more comfortable with the testing patterns. Remember that good tests serve as documentation and provide confidence when refactoring code. Happy testing!
