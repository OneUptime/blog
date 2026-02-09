# How to Capture GraphQL Errors (Partial Failures with HTTP 200) in OpenTelemetry Span Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GraphQL, Error Tracking, Observability

Description: Capture GraphQL partial failures that return HTTP 200 but contain errors using OpenTelemetry span events and attributes.

GraphQL has a peculiar relationship with HTTP status codes. Even when something goes wrong, the response almost always comes back as HTTP 200. The errors live inside the response body, in the `errors` array, alongside whatever partial data the server managed to resolve. This breaks most standard monitoring tools that rely on HTTP status codes to detect failures.

If your alerting only watches for 5xx responses, you are blind to GraphQL errors. OpenTelemetry lets you fix this by recording errors as span events and attributes.

## The Problem with HTTP 200 Errors

Here is a typical GraphQL response with a partial failure:

```json
{
  "data": {
    "user": {
      "name": "Alice",
      "orders": null
    }
  },
  "errors": [
    {
      "message": "Failed to fetch orders: connection timeout",
      "path": ["user", "orders"],
      "extensions": {
        "code": "DOWNSTREAM_SERVICE_ERROR"
      }
    }
  ]
}
```

The HTTP status is 200. The `name` field resolved fine, but `orders` failed. Standard HTTP monitoring sees a successful request. Your users see broken data.

## Recording GraphQL Errors as Span Events

The key is to intercept the response before it leaves the server and record each error in the `errors` array as a span event:

```typescript
// graphql-error-plugin.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

export const graphqlErrorTrackingPlugin = {
  requestDidStart() {
    return {
      willSendResponse({ response, operationName }: any) {
        const span = trace.getActiveSpan();
        if (!span) return;

        const errors = response.body?.singleResult?.errors || [];

        if (errors.length === 0) {
          span.setAttribute('graphql.error.count', 0);
          return;
        }

        // Mark the span as having errors
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `${errors.length} GraphQL error(s)`,
        });

        span.setAttribute('graphql.error.count', errors.length);
        span.setAttribute('graphql.operation.name', operationName || 'anonymous');

        // Record each error as a separate span event
        for (const error of errors) {
          span.addEvent('graphql.error', {
            'graphql.error.message': error.message,
            'graphql.error.path': error.path?.join('.') || 'unknown',
            'graphql.error.code': error.extensions?.code || 'UNKNOWN',
          });
        }

        // Track whether the response has partial data or is fully failed
        const hasData = response.body?.singleResult?.data !== null;
        span.setAttribute('graphql.response.partial', hasData && errors.length > 0);
      },
    };
  },
};
```

## Classifying Error Types

Not all GraphQL errors are created equal. Validation errors, resolver errors, and authorization errors need different handling:

```typescript
// error-classifier.ts
function classifyGraphQLError(error: any): string {
  const code = error.extensions?.code;

  switch (code) {
    case 'GRAPHQL_VALIDATION_FAILED':
      return 'validation';
    case 'UNAUTHENTICATED':
      return 'auth';
    case 'FORBIDDEN':
      return 'authorization';
    case 'BAD_USER_INPUT':
      return 'client_error';
    case 'INTERNAL_SERVER_ERROR':
      return 'server_error';
    default:
      // Check if it is a resolver error by looking at the path
      if (error.path && error.path.length > 0) {
        return 'resolver_error';
      }
      return 'unknown';
  }
}

// Use it in your plugin
for (const error of errors) {
  const errorType = classifyGraphQLError(error);

  span.addEvent('graphql.error', {
    'graphql.error.message': error.message,
    'graphql.error.path': error.path?.join('.') || 'unknown',
    'graphql.error.code': error.extensions?.code || 'UNKNOWN',
    'graphql.error.type': errorType,
  });
}
```

## Building Metrics from Error Spans

Span events give you trace-level detail. For dashboards and alerts, you also want metrics:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('graphql-errors');

const errorCounter = meter.createCounter('graphql.errors', {
  description: 'Count of GraphQL errors by type and path',
});

const partialFailureCounter = meter.createCounter('graphql.partial_failures', {
  description: 'Count of responses that returned both data and errors',
});

// Inside your response hook
for (const error of errors) {
  errorCounter.add(1, {
    'graphql.error.type': classifyGraphQLError(error),
    'graphql.error.code': error.extensions?.code || 'UNKNOWN',
    'graphql.operation.name': operationName || 'anonymous',
  });
}

if (hasData && errors.length > 0) {
  partialFailureCounter.add(1, {
    'graphql.operation.name': operationName || 'anonymous',
  });
}
```

## Handling Error Paths for Cardinality

Be careful with the `graphql.error.path` attribute in metrics. Paths like `user.orders.0.items.2.price` include array indices that create high cardinality. Normalize the paths by stripping numeric segments:

```typescript
function normalizePath(path: (string | number)[]): string {
  return path
    .filter((segment) => typeof segment === 'string')
    .join('.');
}

// "user.orders.0.items.2.price" becomes "user.orders.items.price"
```

## Alerting on Partial Failures

With these metrics in place, you can set up alerts like:

- Alert when `graphql.errors` rate exceeds 5% of total requests
- Alert when `graphql.partial_failures` increases by more than 50% over the last 10 minutes
- Alert when a specific error code like `DOWNSTREAM_SERVICE_ERROR` appears more than 10 times per minute

The partial failure metric is especially valuable. It tells you that users are getting degraded responses, which is often worse than a clean error because the client might not handle it gracefully.

## Testing Your Error Instrumentation

Write integration tests that verify errors are captured:

```typescript
it('should record GraphQL errors as span events', async () => {
  const response = await server.executeOperation({
    query: '{ user(id: "bad") { name orders { id } } }',
  });

  // Verify the span has error events
  const spans = exporter.getFinishedSpans();
  const requestSpan = spans.find(s => s.name.includes('graphql'));

  expect(requestSpan?.status.code).toBe(SpanStatusCode.ERROR);
  expect(requestSpan?.events).toContainEqual(
    expect.objectContaining({ name: 'graphql.error' })
  );
});
```

Treating HTTP 200 as "everything is fine" is a trap with GraphQL. OpenTelemetry span events give you the granularity to see inside those 200 responses and catch errors that would otherwise go unnoticed.
