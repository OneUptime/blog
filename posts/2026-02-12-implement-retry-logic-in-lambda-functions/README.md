# How to Implement Retry Logic in Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Retry Logic, Reliability, Serverless

Description: Implement robust retry patterns in AWS Lambda functions with exponential backoff, jitter, idempotency, and proper error classification for reliable serverless applications.

---

Transient failures are a fact of life in distributed systems. A database connection drops. An API returns a 503. A DynamoDB request gets throttled. These aren't bugs - they're expected behavior in cloud environments. The question is whether your Lambda function gives up on the first failure or retries intelligently.

Lambda has built-in retry behavior for asynchronous invocations and stream-based triggers, but that's coarse-grained. You often need fine-grained retry logic within your function - for specific operations, with specific backoff strategies, and only for errors that are actually transient.

## Built-in Lambda Retries

Before implementing your own retries, understand what Lambda already does:

**Synchronous invocations** (API Gateway, ALB): No automatic retries. If your function throws an error, the caller gets the error immediately.

**Asynchronous invocations** (S3, SNS, EventBridge): Lambda retries twice with delays between attempts. You can configure this:

```bash
# Configure retry behavior for async invocations
aws lambda put-function-event-invoke-config \
  --function-name my-function \
  --maximum-retry-attempts 1 \
  --maximum-event-age-seconds 3600
```

**Stream-based triggers** (Kinesis, DynamoDB Streams): Lambda retries until the record expires from the stream or you configure it otherwise.

## When to Retry

Not every error should be retried. Here's how to classify them:

**Retryable errors** - These are transient and will likely succeed on retry:
- Network timeouts (ETIMEDOUT, ECONNRESET)
- HTTP 429 (Too Many Requests)
- HTTP 500, 502, 503, 504
- DynamoDB ProvisionedThroughputExceededException
- Throttling exceptions from any AWS service

**Non-retryable errors** - These won't fix themselves:
- HTTP 400 (Bad Request)
- HTTP 401/403 (Authentication/Authorization failures)
- HTTP 404 (Not Found)
- Validation errors in your business logic
- Data format errors

```javascript
// Classify errors as retryable or permanent
function isRetryable(error) {
  // AWS SDK errors
  if (error.$metadata?.httpStatusCode) {
    const status = error.$metadata.httpStatusCode;
    return status === 429 || status >= 500;
  }

  // Throttling errors from AWS services
  const throttleErrors = [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'TooManyRequestsException',
    'RequestLimitExceeded',
  ];
  if (throttleErrors.includes(error.name)) return true;

  // Network errors
  const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE'];
  if (networkErrors.includes(error.code)) return true;

  return false;
}
```

## Exponential Backoff with Jitter

The standard retry strategy is exponential backoff - each retry waits longer than the last. Adding jitter (randomness) prevents multiple clients from retrying at exactly the same time, which would create a thundering herd.

```javascript
// Retry with exponential backoff and full jitter
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 200,      // Start with 200ms
    maxDelay = 30000,     // Cap at 30 seconds
    jitter = 'full',      // 'full', 'equal', or 'none'
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      // Apply jitter strategy
      if (jitter === 'full') {
        // Full jitter: random value between 0 and the calculated delay
        delay = Math.random() * delay;
      } else if (jitter === 'equal') {
        // Equal jitter: half fixed, half random
        delay = delay / 2 + Math.random() * (delay / 2);
      }
      // 'none': use the raw exponential delay

      console.log(
        `Attempt ${attempt}/${maxAttempts} failed: ${error.message}. ` +
        `Retrying in ${Math.round(delay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

Usage is straightforward:

```javascript
// Retry a DynamoDB operation that might get throttled
const item = await retryWithBackoff(
  () => dynamodb.send(new GetItemCommand({
    TableName: 'Users',
    Key: { userId: { S: userId } },
  })),
  { maxAttempts: 5, baseDelay: 100 }
);
```

## Idempotency - The Critical Companion to Retries

Retries mean your function might execute the same operation multiple times. If that operation creates an order, charges a credit card, or sends an email, you have a problem. This is where idempotency comes in - making it safe to execute the same operation multiple times with the same result.

Here's a DynamoDB-based idempotency implementation:

```javascript
// Idempotency layer using DynamoDB to prevent duplicate processing
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const IDEMPOTENCY_TABLE = 'IdempotencyStore';
const TTL_SECONDS = 3600; // Keep idempotency records for 1 hour

async function executeIdempotent(idempotencyKey, fn) {
  // Check if this operation was already completed
  const existing = await dynamo.send(new GetItemCommand({
    TableName: IDEMPOTENCY_TABLE,
    Key: { idempotencyKey: { S: idempotencyKey } },
  }));

  if (existing.Item) {
    const status = existing.Item.status.S;
    if (status === 'COMPLETED') {
      console.log(`Idempotent hit: ${idempotencyKey} already processed`);
      return JSON.parse(existing.Item.result.S);
    }
    if (status === 'IN_PROGRESS') {
      throw new Error('Operation already in progress');
    }
  }

  // Mark as in progress
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  await dynamo.send(new PutItemCommand({
    TableName: IDEMPOTENCY_TABLE,
    Item: {
      idempotencyKey: { S: idempotencyKey },
      status: { S: 'IN_PROGRESS' },
      ttl: { N: ttl.toString() },
    },
    ConditionExpression: 'attribute_not_exists(idempotencyKey) OR #s = :failed',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':failed': { S: 'FAILED' } },
  }));

  try {
    const result = await fn();

    // Mark as completed with the result
    await dynamo.send(new PutItemCommand({
      TableName: IDEMPOTENCY_TABLE,
      Item: {
        idempotencyKey: { S: idempotencyKey },
        status: { S: 'COMPLETED' },
        result: { S: JSON.stringify(result) },
        ttl: { N: ttl.toString() },
      },
    }));

    return result;
  } catch (error) {
    // Mark as failed so it can be retried
    await dynamo.send(new PutItemCommand({
      TableName: IDEMPOTENCY_TABLE,
      Item: {
        idempotencyKey: { S: idempotencyKey },
        status: { S: 'FAILED' },
        error: { S: error.message },
        ttl: { N: ttl.toString() },
      },
    }));
    throw error;
  }
}

// Usage in your handler
exports.handler = async (event) => {
  const orderId = event.orderId;

  return executeIdempotent(`process-order-${orderId}`, async () => {
    // This block runs at most once for each orderId
    const charge = await chargePayment(event);
    await sendConfirmationEmail(event);
    return { orderId, chargeId: charge.id };
  });
};
```

## Retry with Timeout Awareness

Lambda has a maximum execution time. Your retry logic should be aware of how much time is left:

```javascript
// Retry while respecting Lambda's remaining execution time
async function retryWithTimeLimit(fn, context, options = {}) {
  const { maxAttempts = 3, baseDelay = 500, minRemainingMs = 5000 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if we have enough time for another attempt
    const remaining = context.getRemainingTimeInMillis();
    if (remaining < minRemainingMs) {
      throw new Error(
        `Insufficient time for retry attempt ${attempt}. ` +
        `${remaining}ms remaining, need at least ${minRemainingMs}ms`
      );
    }

    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) throw error;

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), remaining - minRemainingMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Usage
exports.handler = async (event, context) => {
  const result = await retryWithTimeLimit(
    () => callExternalApi(event.data),
    context,
    { maxAttempts: 3, baseDelay: 1000 }
  );
  return result;
};
```

## Retry Specific AWS Operations

Each AWS service has its own throttling behavior. Here are targeted retry strategies:

```javascript
// DynamoDB: respect the RetryAfterSeconds hint
async function dynamoRetry(fn) {
  return retryWithBackoff(fn, {
    maxAttempts: 5,
    baseDelay: 50,  // DynamoDB throttles can clear quickly
    maxDelay: 5000,
  });
}

// S3: handle eventual consistency and throttling
async function s3Retry(fn) {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 10000,
  });
}

// External APIs: be more conservative
async function apiRetry(fn) {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 2000,  // External APIs need more breathing room
    maxDelay: 30000,
  });
}
```

## Python Retry Implementation

Here's the equivalent in Python using a decorator pattern:

```python
# Python retry decorator with exponential backoff
import time
import random
import functools

def retry(max_attempts=3, base_delay=0.2, max_delay=30, retryable_exceptions=None):
    if retryable_exceptions is None:
        retryable_exceptions = (Exception,)

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    if attempt == max_attempts:
                        raise

                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    delay = random.uniform(0, delay)  # Full jitter
                    print(f"Attempt {attempt} failed: {e}. Retrying in {delay:.2f}s")
                    time.sleep(delay)

        return wrapper
    return decorator

# Usage
@retry(max_attempts=3, retryable_exceptions=(ConnectionError, TimeoutError))
def fetch_data(url):
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

## Monitoring Retries

Track retry metrics to understand your system's health:

```javascript
// Log retry metrics for CloudWatch analysis
function logRetryMetric(operation, attempt, success, error) {
  console.log(JSON.stringify({
    metric: 'retry',
    operation,
    attempt,
    success,
    error: error?.message,
    timestamp: new Date().toISOString(),
  }));
}
```

Create CloudWatch metric filters to build dashboards showing retry rates across your Lambda functions. If retry rates spike, something is degrading. For monitoring setup details, see [creating custom CloudWatch metrics from Lambda](https://oneuptime.com/blog/post/create-custom-cloudwatch-metrics-from-lambda/view).

## Wrapping Up

Effective retry logic is about being smart - retry only transient errors, use exponential backoff with jitter to avoid thundering herds, respect Lambda's timeout constraints, and always pair retries with idempotency to prevent duplicate side effects. These patterns aren't unique to Lambda, but Lambda's execution model makes them especially important. Get them right, and your serverless functions will handle transient failures without breaking a sweat.
