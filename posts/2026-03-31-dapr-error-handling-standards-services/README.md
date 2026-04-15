# How to Implement Error Handling Standards for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error Handling, Resilience, Microservice, Retry

Description: Establish consistent error handling standards for Dapr services including retry policies, dead-letter queues, circuit breakers, and structured error responses.

---

## Overview

Distributed systems fail in unpredictable ways. Dapr provides built-in resilience primitives that you can combine with application-level error handling patterns to create consistent, reliable services.

## Defining Resilience Policies

Create a Dapr resiliency resource to define retry and circuit breaker behavior:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: service-resiliency
  namespace: default
spec:
  policies:
    retries:
      standard-retry:
        policy: exponential
        maxRetries: 3
        maxInterval: 10s
    circuitBreakers:
      default-cb:
        maxRequests: 1
        interval: 5s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      order-service:
        retry: standard-retry
        circuitBreaker: default-cb
```

## Standardized Error Response Structure

Define a consistent error response model across all services:

```javascript
function createErrorResponse(code, message, details = {}) {
  return {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      traceId: details.traceId || 'unknown',
      service: process.env.APP_ID || 'unknown'
    }
  };
}

app.use((err, req, res, next) => {
  const traceParent = req.headers['traceparent'] || '';
  const traceId = traceParent.split('-')[1];

  if (err.status === 404) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message, { traceId }));
  }

  res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', { traceId }));
});
```

## Handling Pub/Sub Errors with Dead-Letter Topics

Configure a dead-letter topic for failed message processing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  deadLetterTopic: orders-dlq
  route: /orders
```

Handle dead-letter messages separately:

```javascript
app.post('/orders-dlq', (req, res) => {
  const failedEvent = req.body;
  logger.error('Message moved to DLQ', {
    eventId: failedEvent.id,
    topic: failedEvent.topic,
    data: failedEvent.data
  });
  // Store for manual review or reprocessing
  storeForReview(failedEvent);
  res.status(200).send('OK');
});
```

## Service Invocation Error Handling

Handle Dapr service invocation errors with proper status code mapping:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const client = new DaprClient();

async function callInventoryService(itemId) {
  try {
    const result = await client.invoker.invoke(
      'inventory-service',
      'items/' + itemId,
      HttpMethod.GET
    );
    return result;
  } catch (err) {
    let parsed;
    try {
      parsed = JSON.parse(err.message);
    } catch {
      throw new InternalError('Unexpected error calling inventory service');
    }
    if (parsed.status === 404) {
      throw new NotFoundError(`Item ${itemId} not found`);
    }
    if (parsed.status === 503) {
      throw new ServiceUnavailableError('Inventory service unavailable');
    }
    throw new InternalError('Unexpected error calling inventory service');
  }
}
```

## Summary

Consistent error handling in Dapr services requires defining resiliency policies at the infrastructure level, standardizing error response structures across services, and routing unprocessable messages to dead-letter topics. Combining Dapr's built-in retry and circuit breaker mechanisms with application-level error boundaries ensures that failures are handled predictably and do not cascade across your microservice mesh.
