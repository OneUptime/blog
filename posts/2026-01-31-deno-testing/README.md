# How to Write Tests with Deno Test Runner

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Testing, TypeScript, Unit Testing

Description: A comprehensive guide to writing and running tests in Deno using the built-in test runner, covering assertions, async tests, mocking, coverage, and best practices.

---

Testing is a critical part of software development, and Deno makes it incredibly easy with its built-in test runner. Unlike Node.js, where you need to install external testing frameworks like Jest or Mocha, Deno ships with everything you need out of the box. In this guide, we will explore how to write comprehensive tests using Deno's native testing capabilities.

## Why Use Deno's Built-in Test Runner?

Deno's test runner offers several advantages over traditional testing frameworks:

- **Zero configuration**: No need to install or configure external packages
- **TypeScript support**: Tests can be written in TypeScript without additional setup
- **Built-in assertions**: Standard library includes a comprehensive assertion module
- **Parallel execution**: Tests run in parallel by default for faster feedback
- **Permission aware**: Tests respect Deno's security model
- **Coverage reports**: Built-in code coverage without external tools

## Getting Started with Deno.test

The most basic way to write a test in Deno is using the `Deno.test()` function. This function registers a test case that Deno will execute when you run `deno test`.

Here is a simple test that checks if basic addition works correctly:

```typescript
// basic_test.ts
Deno.test("addition works correctly", () => {
  const result = 2 + 2;
  if (result !== 4) {
    throw new Error(`Expected 4, got ${result}`);
  }
});
```

You can also use the object syntax for more control over test configuration:

```typescript
// object_syntax_test.ts
Deno.test({
  name: "subtraction works correctly",
  fn: () => {
    const result = 10 - 5;
    if (result !== 5) {
      throw new Error(`Expected 5, got ${result}`);
    }
  },
});
```

To run your tests, simply execute the following command in your terminal:

```bash
deno test
```

## Using Assertions from Standard Library

While you can throw errors manually, Deno's standard library provides a powerful assertions module that makes tests more readable and provides better error messages.

First, import the assertions you need from the standard library:

```typescript
// assertions_test.ts
import {
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
  assertRejects,
  assertExists,
  assertInstanceOf,
  assertStringIncludes,
  assertArrayIncludes,
  assertMatch,
} from "https://deno.land/std/assert/mod.ts";
```

Here are examples demonstrating each assertion type:

```typescript
// equality_test.ts
import { assertEquals, assertNotEquals, assertStrictEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("assertEquals compares values deeply", () => {
  // Works with primitives
  assertEquals(2 + 2, 4);
  
  // Works with objects (deep equality)
  assertEquals({ name: "Deno" }, { name: "Deno" });
  
  // Works with arrays
  assertEquals([1, 2, 3], [1, 2, 3]);
});

Deno.test("assertNotEquals checks inequality", () => {
  assertNotEquals("hello", "world");
  assertNotEquals([1, 2], [1, 2, 3]);
});

Deno.test("assertStrictEquals uses reference equality for objects", () => {
  const obj = { name: "Deno" };
  assertStrictEquals(obj, obj); // Same reference
  assertStrictEquals(5, 5); // Primitives work the same
});
```

The following example shows how to test for thrown errors and check string contents:

```typescript
// error_and_string_test.ts
import {
  assertThrows,
  assertStringIncludes,
  assertMatch,
} from "https://deno.land/std/assert/mod.ts";

// Function that throws an error
function divideByZero(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  return a / b;
}

Deno.test("assertThrows catches expected errors", () => {
  assertThrows(
    () => divideByZero(10, 0),
    Error,
    "Cannot divide by zero"
  );
});

Deno.test("assertStringIncludes checks substrings", () => {
  const message = "Hello, Deno world!";
  assertStringIncludes(message, "Deno");
});

Deno.test("assertMatch tests against regex patterns", () => {
  const email = "test@example.com";
  assertMatch(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
});
```

## Writing Async Tests

Many real-world applications involve asynchronous operations. Deno handles async tests seamlessly by allowing your test function to return a Promise.

This example demonstrates testing async functions that fetch data or perform I/O operations:

```typescript
// async_test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

// Simulated async function that fetches user data
async function fetchUser(id: number): Promise<{ id: number; name: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { id, name: `User ${id}` };
}

Deno.test("async test with await", async () => {
  const user = await fetchUser(1);
  assertEquals(user.id, 1);
  assertEquals(user.name, "User 1");
});

Deno.test("multiple async operations", async () => {
  const [user1, user2] = await Promise.all([
    fetchUser(1),
    fetchUser(2),
  ]);
  
  assertEquals(user1.name, "User 1");
  assertEquals(user2.name, "User 2");
});
```

For testing async functions that should reject, use `assertRejects`:

```typescript
// async_error_test.ts
import { assertRejects } from "https://deno.land/std/assert/mod.ts";

async function fetchWithError(): Promise<void> {
  throw new Error("Network error");
}

Deno.test("assertRejects catches async errors", async () => {
  await assertRejects(
    async () => {
      await fetchWithError();
    },
    Error,
    "Network error"
  );
});
```

## Test Filtering and Organization

As your test suite grows, you will want to run specific tests or groups of tests. Deno provides several ways to filter tests.

### Running Specific Tests by Name

You can filter tests using the `--filter` flag with a string or regex pattern:

```bash
# Run tests containing "async" in their name
deno test --filter "async"

# Run tests matching a regex pattern
deno test --filter "/user/i"
```

### Ignoring Tests

Sometimes you need to temporarily skip a test. Use the `ignore` option:

```typescript
// ignored_test.ts
Deno.test({
  name: "this test is ignored",
  ignore: true,
  fn: () => {
    // This will not run
    throw new Error("Should not execute");
  },
});

// You can also conditionally ignore tests
Deno.test({
  name: "only runs on Linux",
  ignore: Deno.build.os !== "linux",
  fn: () => {
    console.log("Running on Linux");
  },
});
```

### Running Only Specific Tests

During development, you might want to focus on a single test. Use the `only` option:

```typescript
// only_test.ts
Deno.test({
  name: "this is the only test that runs",
  only: true,
  fn: () => {
    console.log("Focused testing");
  },
});

Deno.test("this test will be skipped when 'only' is used", () => {
  console.log("Skipped");
});
```

Note: The `only` option requires the `--allow-only` flag when running tests to prevent accidentally committing focused tests.

## Test Steps for Grouped Assertions

Deno allows you to create sub-tests within a test using test steps. This is useful for grouping related assertions and getting detailed output.

The following example shows how to organize related tests using steps:

```typescript
// steps_test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(name: string, email: string): User {
  return { id: Date.now(), name, email };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.test("User management", async (t) => {
  const user = createUser("John Doe", "john@example.com");

  await t.step("user has valid id", () => {
    assertEquals(typeof user.id, "number");
  });

  await t.step("user has correct name", () => {
    assertEquals(user.name, "John Doe");
  });

  await t.step("user has valid email", () => {
    assertEquals(validateEmail(user.email), true);
  });

  await t.step("nested steps", async (t) => {
    await t.step("email contains @", () => {
      assertEquals(user.email.includes("@"), true);
    });

    await t.step("email contains domain", () => {
      assertEquals(user.email.includes(".com"), true);
    });
  });
});
```

## Mocking and Stubbing

Testing often requires mocking external dependencies. Deno's standard library provides utilities for mocking and stubbing.

### Using Spy Functions

Spies allow you to track function calls without changing their behavior:

```typescript
// spy_test.ts
import { spy, assertSpyCall, assertSpyCalls } from "https://deno.land/std/testing/mock.ts";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

class Logger {
  log(message: string): void {
    console.log(message);
  }
}

Deno.test("spy tracks function calls", () => {
  const logger = new Logger();
  
  // Create a spy on the log method
  const logSpy = spy(logger, "log");
  
  // Call the method
  logger.log("Hello");
  logger.log("World");
  
  // Verify the spy was called
  assertSpyCalls(logSpy, 2);
  assertSpyCall(logSpy, 0, { args: ["Hello"] });
  assertSpyCall(logSpy, 1, { args: ["World"] });
  
  // Restore original behavior
  logSpy.restore();
});
```

### Using Stubs

Stubs replace function implementations entirely:

```typescript
// stub_test.ts
import { stub, returnsNext } from "https://deno.land/std/testing/mock.ts";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

// Service that depends on external API
class WeatherService {
  async getTemperature(city: string): Promise<number> {
    // In real code, this would call an API
    const response = await fetch(`https://api.weather.com/${city}`);
    const data = await response.json();
    return data.temperature;
  }
}

Deno.test("stub replaces function behavior", async () => {
  const service = new WeatherService();
  
  // Stub the getTemperature method to return predictable values
  const temperatureStub = stub(
    service,
    "getTemperature",
    returnsNext([25, 30, 28])
  );
  
  try {
    // Each call returns the next value
    assertEquals(await service.getTemperature("NYC"), 25);
    assertEquals(await service.getTemperature("LA"), 30);
    assertEquals(await service.getTemperature("Chicago"), 28);
  } finally {
    // Always restore the stub
    temperatureStub.restore();
  }
});
```

### Mocking Time

For time-dependent tests, use the FakeTime utility:

```typescript
// fake_time_test.ts
import { FakeTime } from "https://deno.land/std/testing/time.ts";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

Deno.test("FakeTime allows controlling time", () => {
  // Set time to 9 AM
  const time = new FakeTime(new Date("2024-01-01T09:00:00"));
  
  try {
    assertEquals(getGreeting(), "Good morning");
    
    // Advance time by 5 hours (to 2 PM)
    time.tick(5 * 60 * 60 * 1000);
    assertEquals(getGreeting(), "Good afternoon");
    
    // Advance time by 6 more hours (to 8 PM)
    time.tick(6 * 60 * 60 * 1000);
    assertEquals(getGreeting(), "Good evening");
  } finally {
    time.restore();
  }
});
```

## Snapshot Testing

Snapshot testing is useful for ensuring that output does not change unexpectedly. Deno has built-in snapshot testing support.

This example demonstrates how to use snapshot testing for complex data structures:

```typescript
// snapshot_test.ts
import { assertSnapshot } from "https://deno.land/std/testing/snapshot.ts";

interface Report {
  title: string;
  items: string[];
  metadata: Record<string, unknown>;
}

function generateReport(): Report {
  return {
    title: "Monthly Report",
    items: ["Revenue increased", "User growth stable", "Costs reduced"],
    metadata: {
      generatedAt: "2024-01-01",
      version: "1.0",
    },
  };
}

Deno.test("report snapshot", async (t) => {
  const report = generateReport();
  await assertSnapshot(t, report);
});

Deno.test("array snapshot", async (t) => {
  const numbers = [1, 2, 3, 4, 5].map((n) => n * 2);
  await assertSnapshot(t, numbers);
});
```

To update snapshots when your output intentionally changes, run tests with the `--update` flag:

```bash
deno test --allow-read --allow-write -- --update
```

## BDD Style Testing

If you prefer Behavior-Driven Development (BDD) style tests with `describe` and `it` blocks, Deno's standard library has you covered.

The BDD module provides familiar syntax for developers coming from Jest or Mocha:

```typescript
// bdd_test.ts
import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "https://deno.land/std/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

// Simple calculator class to test
class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  subtract(n: number): this {
    this.value -= n;
    return this;
  }

  multiply(n: number): this {
    this.value *= n;
    return this;
  }

  getResult(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

describe("Calculator", () => {
  let calculator: Calculator;

  beforeAll(() => {
    console.log("Starting Calculator tests");
  });

  afterAll(() => {
    console.log("Finished Calculator tests");
  });

  beforeEach(() => {
    calculator = new Calculator();
  });

  afterEach(() => {
    calculator.reset();
  });

  describe("add()", () => {
    it("should add positive numbers", () => {
      calculator.add(5);
      assertEquals(calculator.getResult(), 5);
    });

    it("should add negative numbers", () => {
      calculator.add(-3);
      assertEquals(calculator.getResult(), -3);
    });

    it("should chain additions", () => {
      calculator.add(1).add(2).add(3);
      assertEquals(calculator.getResult(), 6);
    });
  });

  describe("subtract()", () => {
    it("should subtract numbers", () => {
      calculator.add(10).subtract(3);
      assertEquals(calculator.getResult(), 7);
    });
  });

  describe("multiply()", () => {
    it("should multiply numbers", () => {
      calculator.add(5).multiply(3);
      assertEquals(calculator.getResult(), 15);
    });

    it("should handle multiplication by zero", () => {
      calculator.add(100).multiply(0);
      assertEquals(calculator.getResult(), 0);
    });
  });
});
```

## Code Coverage Reports

Deno can generate code coverage reports to help you identify untested code paths.

First, run tests with coverage enabled:

```bash
# Run tests and collect coverage data
deno test --coverage=coverage_dir

# Generate an HTML report
deno coverage coverage_dir --html

# Generate an LCOV report for CI integration
deno coverage coverage_dir --lcov > coverage.lcov
```

The coverage report shows you which lines of code were executed during tests and helps identify areas that need more test coverage.

## Testing with Permissions

Since Deno is secure by default, your tests need appropriate permissions. You can specify permissions at the test level:

```typescript
// permissions_test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test({
  name: "read file with permission",
  permissions: { read: true },
  fn: async () => {
    const content = await Deno.readTextFile("./test_data.txt");
    assertEquals(typeof content, "string");
  },
});

Deno.test({
  name: "network request with permission",
  permissions: { net: true },
  fn: async () => {
    const response = await fetch("https://api.example.com/health");
    assertEquals(response.ok, true);
  },
});

Deno.test({
  name: "test without any permissions",
  permissions: {},
  fn: () => {
    // This test runs in a completely sandboxed environment
    const result = 2 + 2;
    assertEquals(result, 4);
  },
});
```

When running tests, provide the necessary permissions:

```bash
deno test --allow-read --allow-net
```

## Best Practices Summary

Following these best practices will help you write maintainable and reliable tests:

1. **Name tests descriptively**: Use clear names that describe what is being tested and the expected outcome
2. **Keep tests focused**: Each test should verify one specific behavior
3. **Use test steps for related assertions**: Group related checks within a single test using steps
4. **Clean up resources**: Always restore mocks, stubs, and fake timers in a finally block
5. **Avoid test interdependence**: Tests should be able to run in any order
6. **Use appropriate assertions**: Choose the right assertion function for better error messages
7. **Test edge cases**: Include tests for boundary conditions, empty inputs, and error scenarios
8. **Organize tests logically**: Use BDD style or test steps to create a clear test hierarchy
9. **Run coverage regularly**: Monitor code coverage to identify untested paths
10. **Keep tests fast**: Mock external dependencies to avoid slow network or file system operations
11. **Use TypeScript**: Take advantage of type checking to catch errors before runtime
12. **Document complex test setups**: Add comments explaining why specific mocks or fixtures are needed

## Conclusion

Deno's built-in test runner provides a comprehensive and zero-configuration testing experience that covers everything from basic unit tests to complex integration scenarios. The standard library offers powerful utilities for assertions, mocking, stubbing, time manipulation, and snapshot testing.

By leveraging these tools effectively, you can build a robust test suite that gives you confidence in your code. The BDD style support makes it easy for teams familiar with Jest or Mocha to transition to Deno, while the permission-aware testing ensures your tests respect Deno's security model.

Start with simple tests using `Deno.test()` and assertions, then gradually incorporate more advanced features like mocking and snapshot testing as your application grows. Remember to run coverage reports regularly to identify gaps in your test suite, and follow the best practices outlined in this guide to maintain a healthy and reliable codebase.

Happy testing with Deno!
