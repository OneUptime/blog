# How to Handle Errors in Lambda Functions Gracefully

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Error Handling, Serverless, Reliability

Description: Master error handling in AWS Lambda with patterns for retries, dead letter queues, structured logging, and graceful degradation in serverless applications.

---

Errors in Lambda functions are inevitable. Network calls fail, databases go down, upstream APIs return garbage, and sometimes your own code has bugs. What matters is how you handle those errors. A well-designed error handling strategy means the difference between a minor blip your users don't notice and a cascade of failures that takes down your application.

Let's go through the patterns and practices that make Lambda functions resilient.

## Understanding Lambda Error Types

Lambda errors fall into two categories:

**Invocation errors** happen before your code runs - invalid payloads, permission issues, out-of-memory crashes, or timeouts. AWS handles retries for these based on the invocation type.

**Function errors** happen in your code - unhandled exceptions, assertion failures, or errors you explicitly throw. How these are retried depends on the event source.

The retry behavior differs based on how Lambda is invoked:

| Invocation Type | Retries | Examples |
|---|---|---|
| Synchronous | None | API Gateway, ALB |
| Asynchronous | 2 retries | S3, SNS, EventBridge |
| Stream-based | Until data expires | Kinesis, DynamoDB Streams |

## Structured Error Handling

The first rule: never let unhandled exceptions escape your handler. Always wrap your handler logic in try-catch:

```javascript
// Always wrap handler logic in try-catch
exports.handler = async (event) => {
  try {
    const result = await processEvent(event);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Handler failed:', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      event: JSON.stringify(event).substring(0, 1000),
    });

    // Return an error response instead of throwing
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        requestId: event.requestContext?.requestId,
      }),
    };
  }
};
```

## Custom Error Classes

Create custom error classes to distinguish between different failure types:

```javascript
// Define custom errors with appropriate HTTP status codes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ExternalServiceError extends Error {
  constructor(service, message) {
    super(`${service} error: ${message}`);
    this.name = 'ExternalServiceError';
    this.statusCode = 502;
    this.retryable = true;
  }
}

// Use them in your handler
async function processOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('Order must contain at least one item');
  }

  const customer = await getCustomer(order.customerId);
  if (!customer) {
    throw new NotFoundError('Customer', order.customerId);
  }

  try {
    await chargePayment(customer, order.total);
  } catch (err) {
    throw new ExternalServiceError('PaymentGateway', err.message);
  }
}
```

## Retry Logic Within Lambda

For operations that can transiently fail (API calls, database queries), implement retry logic inside your function:

```javascript
// Retry a function call with exponential backoff
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'NetworkError'],
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if this error is retryable
      const isRetryable = retryableErrors.some(
        (e) => error.code === e || error.name === e || error.message.includes(e)
      );

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const data = await withRetry(
  () => fetchFromApi('https://api.example.com/data'),
  { maxAttempts: 3, retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '429'] }
);
```

For a deep dive on retry patterns, check out our post on [implementing retry logic in Lambda functions](https://oneuptime.com/blog/post/implement-retry-logic-in-lambda-functions/view).

## Dead Letter Queues

For asynchronous invocations, configure a dead letter queue (DLQ) to capture events that fail after all retries are exhausted:

```yaml
# CloudFormation: Lambda with SQS dead letter queue
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-processor
      Runtime: nodejs20.x
      Handler: index.handler
      DeadLetterConfig:
        TargetArn: !GetAtt DeadLetterQueue.Arn

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-processor-dlq
      MessageRetentionPeriod: 1209600  # 14 days
```

You can also use Lambda Destinations for more granular control:

```yaml
# Use destinations for both success and failure routing
EventInvokeConfig:
  Type: AWS::Lambda::EventInvokeConfig
  Properties:
    FunctionName: !Ref MyFunction
    MaximumRetryAttempts: 2
    MaximumEventAgeSeconds: 3600  # Discard events older than 1 hour
    DestinationConfig:
      OnSuccess:
        Destination: !GetAtt SuccessQueue.Arn
      OnFailure:
        Destination: !GetAtt FailureQueue.Arn
```

## Circuit Breaker Pattern

If an external service is down, retrying every single request is wasteful. Implement a circuit breaker that stops calling the service after a certain number of failures:

```javascript
// Simple circuit breaker for external service calls
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED = normal, OPEN = blocking, HALF_OPEN = testing
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      // Success - reset the circuit
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.warn('Circuit breaker OPENED after', this.failures, 'failures');
      }

      throw error;
    }
  }
}

// Store the circuit breaker outside the handler to persist across warm invocations
const paymentCircuit = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 });

exports.handler = async (event) => {
  try {
    const result = await paymentCircuit.call(() => chargePayment(event));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error.message.includes('Circuit breaker')) {
      return { statusCode: 503, body: 'Payment service temporarily unavailable' };
    }
    return { statusCode: 500, body: error.message };
  }
};
```

## Graceful Degradation

Sometimes the best error handling is to return a degraded but still useful response:

```javascript
// Return cached or default data when the primary source fails
async function getProductDetails(productId) {
  try {
    // Try the primary data source
    return await fetchFromDatabase(productId);
  } catch (dbError) {
    console.warn('Database unavailable, trying cache:', dbError.message);

    try {
      // Fall back to cache
      return await fetchFromCache(productId);
    } catch (cacheError) {
      console.warn('Cache miss, returning minimal data:', cacheError.message);

      // Return minimal data rather than an error
      return {
        id: productId,
        name: 'Product information temporarily unavailable',
        price: null,
        _degraded: true,
      };
    }
  }
}
```

## Structured Logging

Good error handling requires good logging. Use structured JSON logs so you can search and filter in CloudWatch:

```javascript
// Structured logging helper
function log(level, message, context = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: global.currentRequestId,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

exports.handler = async (event, context) => {
  global.currentRequestId = context.awsRequestId;

  log('INFO', 'Processing request', { eventType: event.type });

  try {
    const result = await processEvent(event);
    log('INFO', 'Request processed successfully', { resultCount: result.length });
    return result;
  } catch (error) {
    log('ERROR', 'Request processing failed', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
```

## Timeout Protection

Your Lambda function has a maximum execution time. Don't let it silently time out - detect when you're running out of time and clean up:

```javascript
// Check remaining execution time and bail out gracefully
exports.handler = async (event, context) => {
  const items = event.items;
  const processed = [];

  for (const item of items) {
    // Check if we have enough time left (leave 5 second buffer)
    const remainingMs = context.getRemainingTimeInMillis();
    if (remainingMs < 5000) {
      console.warn(`Running out of time with ${items.length - processed.length} items remaining`);
      // Save progress so the next invocation can continue
      await saveCheckpoint(processed);
      break;
    }

    const result = await processItem(item);
    processed.push(result);
  }

  return { processed: processed.length, total: items.length };
};
```

## Wrapping Up

Good error handling in Lambda isn't just about catching exceptions. It's about distinguishing between retryable and permanent failures, implementing appropriate retry strategies, using DLQs to capture failed events, degrading gracefully when dependencies are unavailable, and logging enough context to debug problems later. Build these patterns into your Lambda functions from the start, and your serverless application will handle the unexpected with resilience.
