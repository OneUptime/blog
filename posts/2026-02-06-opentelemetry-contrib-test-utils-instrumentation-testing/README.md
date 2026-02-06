# How to Use @opentelemetry/contrib-test-utils for Instrumentation Library Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Testing, Instrumentation, Node.js, contrib-test-utils, JavaScript

Description: Learn how to use @opentelemetry/contrib-test-utils to write reliable tests for custom OpenTelemetry instrumentation libraries with practical examples.

---

Writing custom instrumentation libraries for OpenTelemetry is only half the battle. The other half is making sure those libraries actually produce correct spans, attributes, and context propagation under real conditions. The `@opentelemetry/contrib-test-utils` package gives you a structured testing harness built specifically for this purpose. Instead of cobbling together your own mock exporters and span processors, you get a battle-tested toolkit that the OpenTelemetry contributors themselves use to validate the official instrumentation packages.

## What Is contrib-test-utils?

The `@opentelemetry/contrib-test-utils` package lives in the `opentelemetry-js-contrib` repository. It provides utility functions and helper classes that simplify the process of setting up a test environment for instrumentation libraries. The package handles the tedious parts of testing: creating tracer providers, configuring in-memory exporters, registering and unregistering instrumentations, and extracting finished spans for assertions.

If you have ever written tests for an instrumentation library from scratch, you know how much boilerplate is involved. This package removes most of that overhead and lets you focus on verifying the actual telemetry your instrumentation produces.

## Installing the Package

Start by adding the test utilities alongside your dev dependencies:

```bash
# Install the test utilities and core OpenTelemetry packages
npm install --save-dev @opentelemetry/contrib-test-utils
npm install --save-dev @opentelemetry/api
npm install --save-dev @opentelemetry/sdk-trace-base
npm install --save-dev @opentelemetry/sdk-trace-node
```

You will also want a test runner. The contrib repository uses Mocha, but Jest works fine too. The examples in this post use Mocha with the `assert` module since that aligns with the upstream testing patterns.

## Setting Up the Test Environment

The core of `contrib-test-utils` revolves around the `InstrumentationTestHelper` pattern. Here is how you set up a basic test harness for a hypothetical HTTP client instrumentation:

```typescript
// test/http-client-instrumentation.test.ts
import { context, trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { HttpClientInstrumentation } from '../src/http-client-instrumentation';
import * as assert from 'assert';

// Create an in-memory exporter that captures spans for assertions
const memoryExporter = new InMemorySpanExporter();

// Set up the tracer provider with a simple processor
// SimpleSpanProcessor sends spans immediately, which is ideal for tests
const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
provider.register();

// Create the instrumentation instance
const instrumentation = new HttpClientInstrumentation({
  enabled: false, // We enable it explicitly in tests
});

describe('HttpClientInstrumentation', () => {
  beforeEach(() => {
    // Clear any spans from previous tests
    memoryExporter.reset();
    // Enable the instrumentation before each test
    instrumentation.enable();
  });

  afterEach(() => {
    // Disable after each test to avoid interference
    instrumentation.disable();
  });
});
```

The `InMemorySpanExporter` is the key piece here. It collects all finished spans in an array that you can inspect after your instrumented code runs. The `SimpleSpanProcessor` ensures spans are exported synchronously, so you do not need to deal with timing issues in your tests.

## Writing Your First Instrumentation Test

Now let's write a test that verifies our instrumentation creates the right spans:

```typescript
// test/http-client-instrumentation.test.ts (continued)
import * as http from 'http';

describe('HttpClientInstrumentation', () => {
  // ... setup from above ...

  it('should create a client span for outgoing HTTP requests', async () => {
    // Make an HTTP request that should be instrumented
    await makeHttpRequest('http://example.com/api/users');

    // Retrieve the finished spans from the exporter
    const spans = memoryExporter.getFinishedSpans();

    // Verify we got exactly one span
    assert.strictEqual(spans.length, 1, 'Expected exactly one span');

    const span = spans[0];

    // Check span name follows OpenTelemetry HTTP semantic conventions
    assert.strictEqual(span.name, 'GET');

    // Verify the span kind is CLIENT for outgoing requests
    assert.strictEqual(span.kind, SpanKind.CLIENT);

    // Check that required HTTP attributes are present
    const attrs = span.attributes;
    assert.strictEqual(attrs['http.method'], 'GET');
    assert.strictEqual(attrs['http.url'], 'http://example.com/api/users');
    assert.ok(attrs['http.status_code'], 'Missing http.status_code attribute');
  });

  it('should set error status on failed requests', async () => {
    try {
      // This should fail and the span should reflect the error
      await makeHttpRequest('http://localhost:1/nonexistent');
    } catch (e) {
      // Expected to throw
    }

    const spans = memoryExporter.getFinishedSpans();
    assert.strictEqual(spans.length, 1);

    const span = spans[0];
    // Verify the span status indicates an error
    assert.strictEqual(span.status.code, SpanStatusCode.ERROR);
  });
});
```

Each test follows a simple pattern: trigger the instrumented operation, pull the spans from the exporter, and verify their properties. The `getFinishedSpans()` method returns an array of `ReadableSpan` objects with all the details you need to inspect.

## Testing Context Propagation

One of the trickiest aspects of instrumentation testing is verifying that trace context propagates correctly between parent and child spans. Here is how to test that:

```typescript
it('should propagate context from parent span', async () => {
  // Create a parent span manually
  const tracer = trace.getTracer('test-tracer');

  await tracer.startActiveSpan('parent-operation', async (parentSpan) => {
    // Make an HTTP request inside the parent span context
    // The instrumentation should create a child span
    await makeHttpRequest('http://example.com/api/data');
    parentSpan.end();
  });

  const spans = memoryExporter.getFinishedSpans();

  // We should have two spans: the parent and the HTTP client span
  assert.strictEqual(spans.length, 2);

  // Find each span by name
  const parentSpan = spans.find((s) => s.name === 'parent-operation');
  const childSpan = spans.find((s) => s.name === 'GET');

  assert.ok(parentSpan, 'Parent span not found');
  assert.ok(childSpan, 'Child span not found');

  // Verify parent-child relationship through trace and span IDs
  assert.strictEqual(
    childSpan.spanContext().traceId,
    parentSpan.spanContext().traceId,
    'Child span should share the same trace ID as parent'
  );

  assert.strictEqual(
    childSpan.parentSpanId,
    parentSpan.spanContext().spanId,
    'Child span parentSpanId should match parent spanId'
  );
});
```

This test creates a manual parent span, runs the instrumented code within that context, and then verifies that the automatically created span is properly linked as a child. This is critical because broken context propagation is one of the most common instrumentation bugs.

## Using the registerInstrumentationTesting Helper

The `contrib-test-utils` package provides a convenience function called `registerInstrumentationTesting` that handles provider setup:

```typescript
// A cleaner setup using the helper function
import { registerInstrumentationTesting } from '@opentelemetry/contrib-test-utils';
import { HttpClientInstrumentation } from '../src/http-client-instrumentation';

// This registers the instrumentation and returns the configured provider
const instrumentation = registerInstrumentationTesting(
  new HttpClientInstrumentation()
);
```

This single call sets up the tracer provider, configures the in-memory exporter, and registers the instrumentation. It returns the instrumentation instance so you can call `enable()` and `disable()` as needed. The exporter is available through the provider if you need to access it directly.

## Testing Instrumentation Configuration Options

Most instrumentations accept configuration options. You should test that these options work correctly:

```typescript
it('should respect the ignoreIncomingPaths option', async () => {
  // Disable and recreate with config options
  instrumentation.disable();

  const configuredInstrumentation = new HttpClientInstrumentation({
    // Configure the instrumentation to ignore health check paths
    ignoreIncomingPaths: [/\/health/, '/ready'],
  });

  registerInstrumentationTesting(configuredInstrumentation);

  // This request should be ignored based on the config
  await makeHttpRequest('http://example.com/health');

  const spans = memoryExporter.getFinishedSpans();

  // No spans should be created for ignored paths
  assert.strictEqual(spans.length, 0, 'Health check path should be ignored');

  // Clean up
  configuredInstrumentation.disable();
});
```

Testing configuration options ensures that users can customize behavior without surprises. Pay special attention to filter functions, custom attribute hooks, and any options that modify span creation logic.

## Testing Attribute Hooks

Many instrumentations provide hooks that let users add custom attributes. These hooks should be tested to verify they receive the right arguments and that their return values are applied correctly:

```typescript
it('should call requestHook with correct arguments', async () => {
  const hookCalls: any[] = [];

  const hookedInstrumentation = new HttpClientInstrumentation({
    // Hook function that records its arguments for verification
    requestHook: (span, request) => {
      hookCalls.push({ span, request });
      span.setAttribute('custom.attribute', 'hook-value');
    },
  });

  registerInstrumentationTesting(hookedInstrumentation);

  await makeHttpRequest('http://example.com/api/test');

  // Verify the hook was called
  assert.strictEqual(hookCalls.length, 1, 'Hook should be called once');

  // Verify the custom attribute was added
  const spans = memoryExporter.getFinishedSpans();
  assert.strictEqual(spans[0].attributes['custom.attribute'], 'hook-value');

  hookedInstrumentation.disable();
});
```

## Running Tests with the Right Module Loading

Instrumentation libraries often use monkey-patching or module wrapping to intercept calls. This means the order of module loading matters. Make sure your instrumentation is registered before the target module is imported:

```typescript
// CORRECT: Register instrumentation before importing the target module
import { registerInstrumentationTesting } from '@opentelemetry/contrib-test-utils';
import { MyInstrumentation } from '../src';

// Register first
registerInstrumentationTesting(new MyInstrumentation());

// Then import the module that will be instrumented
import * as targetLibrary from 'target-library';
```

Getting this order wrong is a common source of test failures where spans simply do not appear because the module was loaded before the instrumentation had a chance to wrap it.

## Best Practices for Instrumentation Testing

Here are some patterns that will keep your instrumentation tests reliable:

First, always reset the exporter between tests. Leftover spans from previous tests will cause false failures and make debugging painful.

Second, test both success and failure paths. Your instrumentation should handle errors gracefully and set appropriate span statuses when things go wrong.

Third, verify semantic conventions. OpenTelemetry defines standard attribute names for different types of operations. Use the `@opentelemetry/semantic-conventions` package to reference these constants instead of hardcoding strings.

Fourth, test with realistic scenarios. Unit tests with mocked dependencies are good, but also include integration tests that make real network calls against a local test server. The `contrib-test-utils` package works well in both contexts.

Finally, keep an eye on the OpenTelemetry specification changes. Semantic conventions evolve, and your tests should be updated to reflect the latest stable conventions.

## Wrapping Up

The `@opentelemetry/contrib-test-utils` package takes the friction out of testing OpenTelemetry instrumentation libraries. By providing ready-made exporters, provider setup helpers, and patterns that match what the official contrib packages use, it lets you focus on verifying that your instrumentation produces correct, complete telemetry data. Whether you are building a new instrumentation from scratch or maintaining an existing one, having a solid test suite built on these utilities gives you the confidence to ship changes without breaking the observability your users depend on.
