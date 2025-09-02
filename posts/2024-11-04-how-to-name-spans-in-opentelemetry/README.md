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

```typescript
span.setName('YourClassName.functionName');
```


 - **Maintain Consistency:** 
 Use a consistent naming convention throughout your application. This could follow the pattern component_operation or Component.operation

```typescript
span.setName('UserService.fetchUserById');
```


- **Adopt Hierarchical Naming**:
If your application has multiple layers or components, a hierarchical naming convention can add clarity, indicating the context in which an operation occurs.

```typescript
span.setName('Controller/UserController.getUser');
```


### Using Attributes in Spans

Attributes in spans provide additional context and granularity to your traces, making it easier to understand and analyze the operations being performed. Here’s how you can effectively use attributes in your spans:

**What are Attributes?**

Attributes are key-value pairs that you can add to a span to provide more detailed information about the operation being traced. These can include metadata such as user IDs, HTTP status codes, error messages, or any other relevant data.

Here's an example

```typescript
// Add attributes to the span 
span.setAttribute('http.method', 'GET'); 
span.setAttribute('http.url', '/users'); 
span.setAttribute('user.id', '12345');
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

```typescript
span.addEvent('db_query_start');
```


### Recording exceptions in spans

Capturing exceptions in spans is crucial for understanding where and why errors occur within your application. Here's how to do it. 

```typescript

try {
  // Simulate an operation that throws an error
  throw new Error('Database connection failed');
} catch (error) {
  // Record the exception in the span
  span.recordException({
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  // Optionally set the span status to indicate an error
  span.setStatus({ code: 2, message: 'Error during operation' });
} finally {
  span.end();
}
```

### Putting all of it together.

Here's how to put span names, attributes, events and exceptions together. This is the code in JavaScript / TypeScript but you can apply the same principles to any framework / language of your choice. 

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('example-tracer');

// Start a span for the user login process
const loginSpan = tracer.startSpan('UserService.login', {
  attributes: {
    email: 'user@email.com'
  }
});

try {
  // Record an event for the start of user data validation
  loginSpan.addEvent('start_validation');
  await validateUser({
   user: {
     email: 'user@email.com'
   },
   parentSpan: loginSpan
  });
  loginSpan.addEvent('validation_complete');


} catch (error) {
  // Record the exception in the span
  loginSpan.recordException(error);

  // Set the span status to indicate an error
  loginSpan.setStatus({ code: 2, message: 'Error during user login' });
} finally {
  // End the registration span
  loginSpan.end();
}

function validateUser({
  user
  loginSpan
}) {
  const span = tracer.startSpan('UserService.validateUser', { parent: parentSpan });

  try {
    // Simulate user data validation
    console.log('User data validated.');
    span.addEvent('validation_complete');
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: 'Error in user data validation' });
    throw error;
  } finally {
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
