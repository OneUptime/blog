# How to Build a Custom Test Framework in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TypeScript, Testing, Node.js, Test Framework, Software Development

Description: Learn how to build a custom test framework in TypeScript from scratch. This guide covers test discovery, assertion libraries, test runners, and reporting with practical code examples.

---

Building your own test framework might seem like reinventing the wheel, but it teaches you valuable lessons about how testing tools work under the hood. Understanding these internals helps you debug test failures, write better tests, and customize existing frameworks when needed. In this guide, we will build a minimal yet functional test framework in TypeScript.

## Why Build Your Own Test Framework?

Before diving in, let us understand when building a custom framework makes sense:

- You need specialized testing capabilities not available in existing frameworks
- You want to deeply understand how testing tools work
- Your project has unique requirements that do not fit standard testing patterns
- You are building a testing tool as a product

## Project Structure

```
test-framework/
  src/
    core/
      TestRunner.ts
      TestSuite.ts
      TestCase.ts
    assertions/
      Assertions.ts
    reporters/
      ConsoleReporter.ts
    decorators/
      TestDecorators.ts
    types/
      index.ts
  index.ts
```

## Core Types and Interfaces

First, let us define the types that will form the foundation of our framework.

```typescript
// src/types/index.ts

// Represents the result of a single test
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
  skipped?: boolean;
}

// Represents a collection of test results
export interface SuiteResult {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

// Function signature for test cases
export type TestFunction = () => void | Promise<void>;

// Function signature for lifecycle hooks
export type HookFunction = () => void | Promise<void>;

// Configuration options for the test runner
export interface TestRunnerOptions {
  timeout: number;       // Maximum time for a single test
  bail: boolean;         // Stop on first failure
  parallel: boolean;     // Run tests in parallel
  filter?: string;       // Filter tests by name pattern
}
```

## Building the Test Case Class

The TestCase class represents a single test with its metadata and execution logic.

```typescript
// src/core/TestCase.ts

import { TestFunction, TestResult } from '../types';

export class TestCase {
  private name: string;
  private fn: TestFunction;
  private timeout: number;
  private skip: boolean;
  private only: boolean;

  constructor(
    name: string,
    fn: TestFunction,
    options: { timeout?: number; skip?: boolean; only?: boolean } = {}
  ) {
    this.name = name;
    this.fn = fn;
    this.timeout = options.timeout || 5000;
    this.skip = options.skip || false;
    this.only = options.only || false;
  }

  // Execute the test with timeout handling
  async run(): Promise<TestResult> {
    // Handle skipped tests
    if (this.skip) {
      return {
        name: this.name,
        passed: true,
        duration: 0,
        skipped: true,
      };
    }

    const startTime = Date.now();

    try {
      // Wrap the test execution in a timeout promise
      await this.executeWithTimeout();

      return {
        name: this.name,
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: this.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error,
      };
    }
  }

  // Execute the test function with a timeout
  private async executeWithTimeout(): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${this.timeout}ms`));
      }, this.timeout);
    });

    // Race between the test execution and the timeout
    await Promise.race([
      Promise.resolve(this.fn()),
      timeoutPromise,
    ]);
  }

  getName(): string {
    return this.name;
  }

  isOnly(): boolean {
    return this.only;
  }

  isSkipped(): boolean {
    return this.skip;
  }
}
```

## Building the Test Suite

The TestSuite class groups related tests together and manages lifecycle hooks.

```typescript
// src/core/TestSuite.ts

import { TestCase } from './TestCase';
import { HookFunction, SuiteResult, TestResult } from '../types';

export class TestSuite {
  private name: string;
  private tests: TestCase[] = [];
  private beforeAllHooks: HookFunction[] = [];
  private afterAllHooks: HookFunction[] = [];
  private beforeEachHooks: HookFunction[] = [];
  private afterEachHooks: HookFunction[] = [];

  constructor(name: string) {
    this.name = name;
  }

  // Add a test case to the suite
  addTest(test: TestCase): void {
    this.tests.push(test);
  }

  // Register lifecycle hooks
  beforeAll(fn: HookFunction): void {
    this.beforeAllHooks.push(fn);
  }

  afterAll(fn: HookFunction): void {
    this.afterAllHooks.push(fn);
  }

  beforeEach(fn: HookFunction): void {
    this.beforeEachHooks.push(fn);
  }

  afterEach(fn: HookFunction): void {
    this.afterEachHooks.push(fn);
  }

  // Run all tests in the suite
  async run(): Promise<SuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Check if any test has .only flag
    const hasOnlyTests = this.tests.some((test) => test.isOnly());
    const testsToRun = hasOnlyTests
      ? this.tests.filter((test) => test.isOnly())
      : this.tests;

    // Run beforeAll hooks
    await this.runHooks(this.beforeAllHooks);

    // Run each test
    for (const test of testsToRun) {
      // Run beforeEach hooks
      await this.runHooks(this.beforeEachHooks);

      // Execute the test
      const result = await test.run();
      results.push(result);

      // Run afterEach hooks
      await this.runHooks(this.afterEachHooks);
    }

    // Run afterAll hooks
    await this.runHooks(this.afterAllHooks);

    // Calculate summary
    const passed = results.filter((r) => r.passed && !r.skipped).length;
    const failed = results.filter((r) => !r.passed).length;
    const skipped = results.filter((r) => r.skipped).length;

    return {
      name: this.name,
      tests: results,
      duration: Date.now() - startTime,
      passed,
      failed,
      skipped,
    };
  }

  // Execute an array of hook functions
  private async runHooks(hooks: HookFunction[]): Promise<void> {
    for (const hook of hooks) {
      await hook();
    }
  }
}
```

## Building the Assertion Library

A good test framework needs expressive assertions. Here is a chainable assertion library.

```typescript
// src/assertions/Assertions.ts

export class AssertionError extends Error {
  constructor(message: string, public expected?: unknown, public actual?: unknown) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class Assertion<T> {
  private value: T;
  private negated: boolean = false;

  constructor(value: T) {
    this.value = value;
  }

  // Negate the next assertion
  get not(): this {
    this.negated = true;
    return this;
  }

  // Check equality using Object.is
  toBe(expected: T): void {
    const passed = Object.is(this.value, expected);
    this.assert(passed, `Expected ${this.value} to be ${expected}`, expected, this.value);
  }

  // Check deep equality
  toEqual(expected: T): void {
    const passed = this.deepEqual(this.value, expected);
    this.assert(passed, `Expected deep equality`, expected, this.value);
  }

  // Check if value is truthy
  toBeTruthy(): void {
    const passed = Boolean(this.value);
    this.assert(passed, `Expected ${this.value} to be truthy`);
  }

  // Check if value is falsy
  toBeFalsy(): void {
    const passed = !Boolean(this.value);
    this.assert(passed, `Expected ${this.value} to be falsy`);
  }

  // Check if value is null
  toBeNull(): void {
    const passed = this.value === null;
    this.assert(passed, `Expected ${this.value} to be null`);
  }

  // Check if value is undefined
  toBeUndefined(): void {
    const passed = this.value === undefined;
    this.assert(passed, `Expected ${this.value} to be undefined`);
  }

  // Check if value is defined (not null or undefined)
  toBeDefined(): void {
    const passed = this.value !== null && this.value !== undefined;
    this.assert(passed, `Expected value to be defined`);
  }

  // Check if value is an instance of a class
  toBeInstanceOf(constructor: new (...args: unknown[]) => unknown): void {
    const passed = this.value instanceof constructor;
    this.assert(passed, `Expected ${this.value} to be instance of ${constructor.name}`);
  }

  // Check if array contains a value
  toContain(item: unknown): void {
    if (!Array.isArray(this.value)) {
      throw new AssertionError('toContain can only be used with arrays');
    }
    const passed = this.value.includes(item);
    this.assert(passed, `Expected array to contain ${item}`);
  }

  // Check if value matches a regular expression
  toMatch(pattern: RegExp): void {
    if (typeof this.value !== 'string') {
      throw new AssertionError('toMatch can only be used with strings');
    }
    const passed = pattern.test(this.value);
    this.assert(passed, `Expected ${this.value} to match ${pattern}`);
  }

  // Check if function throws an error
  toThrow(expectedError?: string | RegExp): void {
    if (typeof this.value !== 'function') {
      throw new AssertionError('toThrow can only be used with functions');
    }

    let threw = false;
    let thrownError: Error | undefined;

    try {
      (this.value as () => void)();
    } catch (error) {
      threw = true;
      thrownError = error as Error;
    }

    if (!threw) {
      this.assert(false, 'Expected function to throw');
      return;
    }

    if (expectedError) {
      const message = thrownError?.message || '';
      const matches = typeof expectedError === 'string'
        ? message.includes(expectedError)
        : expectedError.test(message);
      this.assert(matches, `Expected error message to match ${expectedError}`);
    }
  }

  // Helper to handle negation and throw AssertionError
  private assert(condition: boolean, message: string, expected?: unknown, actual?: unknown): void {
    const finalCondition = this.negated ? !condition : condition;
    const finalMessage = this.negated ? message.replace('to ', 'not to ') : message;

    if (!finalCondition) {
      throw new AssertionError(finalMessage, expected, actual);
    }

    // Reset negation for next assertion
    this.negated = false;
  }

  // Deep equality comparison
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const keysA = Object.keys(aObj);
    const keysB = Object.keys(bObj);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => this.deepEqual(aObj[key], bObj[key]));
  }
}

// Factory function for creating assertions
export function expect<T>(value: T): Assertion<T> {
  return new Assertion(value);
}
```

## Building the Test Runner

The TestRunner orchestrates test discovery, execution, and reporting.

```typescript
// src/core/TestRunner.ts

import { TestSuite } from './TestSuite';
import { TestCase } from './TestCase';
import { TestRunnerOptions, SuiteResult, TestFunction, HookFunction } from '../types';

// Global state for the current suite
let currentSuite: TestSuite | null = null;
const suites: TestSuite[] = [];

// DSL functions for defining tests
export function describe(name: string, fn: () => void): void {
  const suite = new TestSuite(name);
  currentSuite = suite;
  suites.push(suite);
  fn();
  currentSuite = null;
}

export function it(name: string, fn: TestFunction, options?: { timeout?: number }): void {
  if (!currentSuite) {
    throw new Error('it() must be called within a describe() block');
  }
  currentSuite.addTest(new TestCase(name, fn, options));
}

// Alias for it
export const test = it;

// Skip a test
export function skip(name: string, fn: TestFunction): void {
  if (!currentSuite) {
    throw new Error('skip() must be called within a describe() block');
  }
  currentSuite.addTest(new TestCase(name, fn, { skip: true }));
}

// Run only this test
export function only(name: string, fn: TestFunction): void {
  if (!currentSuite) {
    throw new Error('only() must be called within a describe() block');
  }
  currentSuite.addTest(new TestCase(name, fn, { only: true }));
}

// Lifecycle hooks
export function beforeAll(fn: HookFunction): void {
  if (!currentSuite) {
    throw new Error('beforeAll() must be called within a describe() block');
  }
  currentSuite.beforeAll(fn);
}

export function afterAll(fn: HookFunction): void {
  if (!currentSuite) {
    throw new Error('afterAll() must be called within a describe() block');
  }
  currentSuite.afterAll(fn);
}

export function beforeEach(fn: HookFunction): void {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called within a describe() block');
  }
  currentSuite.beforeEach(fn);
}

export function afterEach(fn: HookFunction): void {
  if (!currentSuite) {
    throw new Error('afterEach() must be called within a describe() block');
  }
  currentSuite.afterEach(fn);
}

// Test runner class
export class TestRunner {
  private options: TestRunnerOptions;

  constructor(options: Partial<TestRunnerOptions> = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      bail: options.bail || false,
      parallel: options.parallel || false,
      filter: options.filter,
    };
  }

  async run(): Promise<SuiteResult[]> {
    const results: SuiteResult[] = [];

    for (const suite of suites) {
      const result = await suite.run();
      results.push(result);

      // Stop on first failure if bail is enabled
      if (this.options.bail && result.failed > 0) {
        break;
      }
    }

    return results;
  }

  // Clear all registered suites (useful for testing the framework itself)
  static reset(): void {
    suites.length = 0;
    currentSuite = null;
  }
}
```

## Building the Console Reporter

The reporter formats and displays test results.

```typescript
// src/reporters/ConsoleReporter.ts

import { SuiteResult, TestResult } from '../types';

export class ConsoleReporter {
  private colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
  };

  report(results: SuiteResult[]): void {
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    // Report each suite
    for (const suite of results) {
      this.reportSuite(suite);
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalSkipped += suite.skipped;
      totalDuration += suite.duration;
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary:');
    console.log(`  ${this.colors.green}Passed: ${totalPassed}${this.colors.reset}`);
    console.log(`  ${this.colors.red}Failed: ${totalFailed}${this.colors.reset}`);
    console.log(`  ${this.colors.yellow}Skipped: ${totalSkipped}${this.colors.reset}`);
    console.log(`  Duration: ${totalDuration}ms`);
    console.log('='.repeat(50));
  }

  private reportSuite(suite: SuiteResult): void {
    console.log(`\n${suite.name}`);

    for (const test of suite.tests) {
      this.reportTest(test);
    }
  }

  private reportTest(test: TestResult): void {
    if (test.skipped) {
      console.log(`  ${this.colors.yellow}○ SKIP${this.colors.reset} ${test.name}`);
    } else if (test.passed) {
      console.log(`  ${this.colors.green}✓ PASS${this.colors.reset} ${test.name} ${this.colors.gray}(${test.duration}ms)${this.colors.reset}`);
    } else {
      console.log(`  ${this.colors.red}✗ FAIL${this.colors.reset} ${test.name}`);
      if (test.error) {
        console.log(`    ${this.colors.red}${test.error.message}${this.colors.reset}`);
        if (test.error.stack) {
          const stackLines = test.error.stack.split('\n').slice(1, 4);
          stackLines.forEach((line) => {
            console.log(`    ${this.colors.gray}${line.trim()}${this.colors.reset}`);
          });
        }
      }
    }
  }
}
```

## Using the Framework

Here is how to use the framework to write and run tests.

```typescript
// tests/example.test.ts

import { describe, it, expect, beforeEach, afterAll, TestRunner } from '../src';
import { ConsoleReporter } from '../src/reporters/ConsoleReporter';

// Example class to test
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it('should add two numbers', () => {
    expect(calculator.add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(calculator.add(-1, 1)).toBe(0);
    expect(calculator.add(-1, -1)).toBe(-2);
  });

  it('should divide two numbers', () => {
    expect(calculator.divide(10, 2)).toBe(5);
  });

  it('should throw on division by zero', () => {
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
  });
});

describe('Assertions', () => {
  it('should check equality', () => {
    expect('hello').toBe('hello');
    expect({ a: 1 }).toEqual({ a: 1 });
  });

  it('should support negation', () => {
    expect(5).not.toBe(10);
    expect([1, 2, 3]).not.toContain(4);
  });

  it('should check array contents', () => {
    expect([1, 2, 3]).toContain(2);
  });
});

// Run tests
async function main() {
  const runner = new TestRunner();
  const results = await runner.run();

  const reporter = new ConsoleReporter();
  reporter.report(results);

  // Exit with appropriate code
  const failed = results.some((r) => r.failed > 0);
  process.exit(failed ? 1 : 0);
}

main();
```

## Advanced Features: Test Decorators

For a more modern approach, you can use TypeScript decorators to define tests.

```typescript
// src/decorators/TestDecorators.ts

import { TestSuite } from '../core/TestSuite';
import { TestCase } from '../core/TestCase';

const suiteRegistry = new Map<string, TestSuite>();

// Class decorator for test suites
export function Suite(name?: string) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T) {
    const suiteName = name || constructor.name;
    const suite = new TestSuite(suiteName);
    suiteRegistry.set(suiteName, suite);
    return constructor;
  };
}

// Method decorator for test cases
export function Test(name?: string, options?: { timeout?: number }) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const testName = name || propertyKey;
    const suite = suiteRegistry.get(target.constructor.name);

    if (suite) {
      suite.addTest(new TestCase(testName, descriptor.value, options));
    }

    return descriptor;
  };
}

// Example usage with decorators
@Suite('User Service Tests')
class UserServiceTests {
  @Test('should create a user')
  async testCreateUser() {
    // Test implementation
  }

  @Test('should validate email', { timeout: 1000 })
  testValidateEmail() {
    // Test implementation
  }
}
```

## Summary

Building a custom test framework teaches you the core concepts that power tools like Jest, Mocha, and Vitest:

| Component | Purpose |
|-----------|---------|
| TestCase | Wraps individual test functions with metadata |
| TestSuite | Groups tests and manages lifecycle hooks |
| Assertions | Provides expressive, chainable checks |
| TestRunner | Orchestrates discovery and execution |
| Reporter | Formats and displays results |

While you probably will not replace Jest in production, understanding these internals helps you write better tests and debug issues more effectively. The patterns shown here - chainable assertions, lifecycle hooks, and timeout handling - appear in every major testing framework.
