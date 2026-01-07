# How to name spans in OpenTelemetry?

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: OpenTelemetry, Tracing

Description: Here's how to craft meaningful span names that enhance your observability efforts, making debugging and performance tuning a breeze. From best practices to advanced strategies, this guide covers it all. 

Tracing allows developers to understand how their applications behave in real-time, pinpointing performance bottlenecks and troubleshooting errors effectively. OpenTelemetry, a powerful open-source observability framework, provides the tools necessary to achieve this. Central to OpenTelemetry is the concept of a "span," representing a single operation within a trace. To harness the full potential of tracing, it is crucial to name spans effectively. Let’s explore how to name spans in OTel to maximize their utility.

### The Importance of Naming Spans

Properly named spans are more than just identifiers; they are the keys to understanding application workflows. Clear and consistent naming of spans ensures:

- **Quick Diagnosis:** Easily identify where performance issues lie.

- **Workflow Clarity:** Understand the sequence and hierarchy of operations within your application.
 
- **Insightful Analysis:** Provide meaningful data for debugging and performance tuning.

### Principles for Naming Spans

 - **Be Descriptive**: 
 A span name should clearly describe the operation it represents. Avoid generic names like "process" or "function" and strive for specificity.

For example:

This code snippet demonstrates naming a span with a class and method identifier, making it clear which operation is being traced.

```typescript
// Set a descriptive span name using ClassName.methodName convention
// This clearly identifies both the component and the specific operation
span.setName('YourClassName.functionName');
```


 - **Maintain Consistency:**
 Use a consistent naming convention throughout your application. This could follow the pattern component_operation or Component.operation

This example shows the Service.action naming pattern, which is ideal for microservices architectures.

```typescript
// Use consistent naming: ServiceName.actionDescription
// This makes filtering and searching traces much easier
span.setName('UserService.fetchUserById');
```


- **Adopt Hierarchical Naming**:
If your application has multiple layers or components, a hierarchical naming convention can add clarity, indicating the context in which an operation occurs.

This hierarchical pattern includes the layer (Controller), component (UserController), and action (getUser) for maximum context.

```typescript
// Hierarchical naming: Layer/Component.action
// Useful for distinguishing between Controller, Service, and Repository layers
span.setName('Controller/UserController.getUser');
```


### Using Attributes in Spans

Attributes in spans provide additional context and granularity to your traces, making it easier to understand and analyze the operations being performed. Here’s how you can effectively use attributes in your spans:

**What are Attributes?**

Attributes are key-value pairs that you can add to a span to provide more detailed information about the operation being traced. These can include metadata such as user IDs, HTTP status codes, error messages, or any other relevant data.

Here's an example

These attributes provide rich context for HTTP request tracing, making it easy to filter and analyze specific endpoints or users.

```typescript
// Add HTTP-related attributes to provide request context
span.setAttribute('http.method', 'GET');      // The HTTP method used
span.setAttribute('http.url', '/users');       // The endpoint being accessed
span.setAttribute('user.id', '12345');         // Custom attribute for user tracking
```


**Common Attributes**

Here are some commonly used attributes that can add value to your spans:

HTTP Attributes: `http.method`, `http.url`, `http.status_code`

Database Attributes: `db.statement`

User Attributes: `user.id`, `user.role`


### Using events in Spans

Span events in OpenTelemetry provide a way to add time-stamped annotations to spans, allowing you to capture detailed information about specific points in time during the span's lifecycle. These events can be crucial for understanding what happens within a span, offering deeper insights into operations and their performance.

Span events are like breadcrumbs that you drop at critical points within a span to record significant occurrences or milestones. Each event has a name, timestamp, and optional attributes to provide additional context.

Here's an example of using span events on key milestones.

This event marks the exact moment a database query begins, helping you understand timing within the span's lifecycle.

```typescript
// Add a timestamped event to mark when the database query starts
// Events help identify exactly when specific actions occur within a span
span.addEvent('db_query_start');
```


### Recording exceptions in spans

Capturing exceptions in spans is crucial for understanding where and why errors occur within your application. Here's how to do it.

This pattern ensures that all errors are properly recorded in your traces, including the full stack trace for debugging.

```typescript
try {
  // Simulate an operation that throws an error
  throw new Error('Database connection failed');
} catch (error) {
  // Record the exception in the span with full error details
  // This captures name, message, and stack trace for debugging
  span.recordException({
    name: error.name,       // Error type (e.g., "Error", "TypeError")
    message: error.message, // Human-readable error description
    stack: error.stack      // Full stack trace for debugging
  });

  // Set the span status to ERROR (code: 2) to mark this span as failed
  // This helps identify problematic traces in your dashboard
  span.setStatus({ code: 2, message: 'Error during operation' });
} finally {
  // Always end the span in finally block to ensure it's recorded
  // even if an exception occurs
  span.end();
}
```

### Putting all of it together.

Here's how to put span names, attributes, events and exceptions together. This is the code in JavaScript / TypeScript but you can apply the same principles to any framework / language of your choice.

This comprehensive example demonstrates a complete user login flow with proper span naming, attributes, events, exception handling, and parent-child span relationships.

```typescript
// Import the trace API from OpenTelemetry
import { trace } from '@opentelemetry/api';

// Create a tracer instance with a descriptive name
// This name helps identify where traces originate from
const tracer = trace.getTracer('example-tracer');

// Start a span for the user login process
// Using descriptive naming: ServiceName.action
const loginSpan = tracer.startSpan('UserService.login', {
  // Add initial attributes that provide context for this operation
  attributes: {
    email: 'user@email.com'  // User identifier for filtering/debugging
  }
});

try {
  // Record an event marking the start of validation
  // Events create a timeline of what happened within the span
  loginSpan.addEvent('start_validation');

  // Call the validation function, passing the parent span
  // This allows creating child spans for detailed tracing
  await validateUser({
    user: {
      email: 'user@email.com'
    },
    parentSpan: loginSpan  // Pass parent for span hierarchy
  });

  // Record successful completion of validation
  loginSpan.addEvent('validation_complete');

} catch (error) {
  // Record the full exception details in the span
  loginSpan.recordException(error);

  // Mark the span as failed with status code 2 (ERROR)
  loginSpan.setStatus({ code: 2, message: 'Error during user login' });
} finally {
  // Always end the span to ensure it gets recorded
  loginSpan.end();
}

// Helper function that creates its own child span
function validateUser({
  user,
  parentSpan  // Parent span for creating trace hierarchy
}) {
  // Create a child span linked to the parent
  // This shows the relationship in trace visualization
  const span = tracer.startSpan('UserService.validateUser', { parent: parentSpan });

  try {
    // Perform the actual validation logic
    console.log('User data validated.');

    // Mark validation completion with an event
    span.addEvent('validation_complete');
  } catch (error) {
    // Record any validation errors
    span.recordException(error);
    span.setStatus({ code: 2, message: 'Error in user data validation' });

    // Re-throw to propagate error to parent span
    throw error;
  } finally {
    // End the child span
    span.end();
  }
}
```


### Happy tracing!

Incorporating effective span naming, attributes, events, and exception handling in your OpenTelemetry traces can profoundly enhance your application's observability. By carefully naming your spans, providing detailed attributes, marking significant events, and recording exceptions, you ensure that every aspect of your application's performance is captured and understood. This comprehensive approach not only aids in debugging but also in optimizing and scaling your services with confidence.

**Related Reading:**

- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [Traces vs Metrics in Software Observability](https://oneuptime.com/blog/post/2025-08-21-traces-vs-metrics-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry: A Complete Guide](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
