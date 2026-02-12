# How to Use Lambda Powertools for TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, TypeScript, Powertools, Serverless

Description: A practical guide to AWS Lambda Powertools for TypeScript covering structured logging, tracing, metrics, and middleware patterns for production Lambda functions.

---

If you're building Lambda functions in TypeScript, you've got the same operational challenges as every other runtime - you need structured logging, distributed tracing, custom metrics, and proper error handling. Lambda Powertools for TypeScript gives you all of this with a clean, type-safe API that fits naturally into the TypeScript ecosystem.

The TypeScript version follows the same patterns as the Python library but takes advantage of TypeScript's type system for better developer experience and compile-time safety.

## Installation

Install the packages you need from npm.

```bash
# Install core utilities
npm install @aws-lambda-powertools/logger
npm install @aws-lambda-powertools/tracer
npm install @aws-lambda-powertools/metrics

# Install additional utilities
npm install @aws-lambda-powertools/parameters
npm install @aws-lambda-powertools/idempotency
```

Your SAM or CDK template should set the environment variables that Powertools uses.

```yaml
# SAM template
Resources:
  OrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x
      Handler: dist/handler.handler
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:22
      Environment:
        Variables:
          POWERTOOLS_SERVICE_NAME: order-service
          POWERTOOLS_METRICS_NAMESPACE: OrderApplication
          LOG_LEVEL: INFO
      Tracing: Active
```

## Structured Logging with Logger

The Logger class gives you structured JSON output with Lambda context automatically injected.

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const logger = new Logger({
  serviceName: 'order-service',
  logLevel: 'INFO',
  // Persistent keys appear in every log entry
  persistentKeys: {
    environment: process.env.ENVIRONMENT || 'unknown',
    version: process.env.APP_VERSION || '0.0.0',
  },
});

export const handler = async (event: OrderEvent, context: Context) => {
  // Inject Lambda context (function name, request ID, etc.)
  logger.addContext(context);

  const orderId = event.orderId;
  // Append keys for the duration of this invocation
  logger.appendKeys({ orderId });

  logger.info('Processing order');

  try {
    const result = await processOrder(event);
    logger.info('Order processed successfully', { result });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Failed to process order', error as Error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    // Remove keys for the next invocation (Lambda reuse)
    logger.removeKeys(['orderId']);
  }
};

async function processOrder(event: OrderEvent) {
  logger.info('Validating order items', { itemCount: event.items.length });
  // ... business logic
  return { orderId: event.orderId, status: 'completed' };
}

interface OrderEvent {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}
```

## Distributed Tracing with Tracer

The Tracer wraps the AWS X-Ray SDK with a cleaner API and automatic patching of AWS SDK calls.

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Context } from 'aws-lambda';

const tracer = new Tracer({ serviceName: 'order-service' });
const logger = new Logger({ serviceName: 'order-service' });

// Tracer automatically patches AWS SDK clients
const dynamoClient = tracer.captureAWSv3Client(
  DynamoDBDocumentClient.from(new DynamoDBClient({}))
);

export const handler = async (event: OrderEvent, context: Context) => {
  // Create a subsegment for the entire handler
  const segment = tracer.getSegment();
  const handlerSegment = segment?.addNewSubsegment('## handler');
  tracer.setSegment(handlerSegment!);

  try {
    tracer.putAnnotation('orderId', event.orderId);

    const order = await getOrder(event.orderId);
    const total = calculateTotal(order);

    tracer.putMetadata('orderTotal', total);

    return { statusCode: 200, body: JSON.stringify({ total }) };
  } catch (error) {
    tracer.addErrorAsMetadata(error as Error);
    throw error;
  } finally {
    handlerSegment?.close();
    tracer.setSegment(segment!);
  }
};

// Using the class-based approach with decorators
class OrderService {
  @tracer.captureMethod()
  async getOrder(orderId: string): Promise<Order> {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: 'orders',
        Key: { order_id: orderId },
      })
    );
    return result.Item as Order;
  }

  @tracer.captureMethod()
  calculateTotal(order: Order): number {
    return order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }
}
```

## Custom Metrics

Create custom CloudWatch metrics using the Embedded Metric Format.

```typescript
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import type { Context } from 'aws-lambda';

const metrics = new Metrics({
  namespace: 'OrderService',
  serviceName: 'order-service',
  defaultDimensions: {
    environment: process.env.ENVIRONMENT || 'dev',
  },
});

export const handler = async (event: OrderEvent, context: Context) => {
  // Metrics are automatically flushed after the handler completes
  metrics.addMetric('OrderReceived', MetricUnit.Count, 1);

  const startTime = Date.now();

  try {
    const result = await processOrder(event);

    // Track business metrics
    metrics.addMetric('OrderProcessed', MetricUnit.Count, 1);
    metrics.addMetric('OrderValue', MetricUnit.Count, result.total);

    // Track processing time
    const duration = Date.now() - startTime;
    metrics.addMetric('ProcessingDuration', MetricUnit.Milliseconds, duration);

    // Add a dimension for this specific metric
    metrics.addDimension('OrderType', result.type);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    metrics.addMetric('OrderFailed', MetricUnit.Count, 1);
    throw error;
  } finally {
    // Publish metrics (also happens automatically with middleware)
    metrics.publishStoredMetrics();
  }
};
```

## Middy Middleware Integration

Lambda Powertools for TypeScript works with the Middy middleware engine, which gives you a clean way to apply cross-cutting concerns.

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.info('Request received', {
    path: event.path,
    method: event.httpMethod,
  });

  metrics.addMetric('ApiRequest', MetricUnit.Count, 1);

  // Your business logic here
  const body = JSON.parse(event.body || '{}');

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success', data: body }),
  };
};

// Apply middleware stack
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
```

The Middy middleware approach is cleaner than decorator-based approaches because it separates your business logic from operational concerns. Each middleware handles one thing - logging, tracing, or metrics - and they compose together.

## Parameters Utility

Fetch configuration from SSM Parameter Store and Secrets Manager with built-in caching.

```typescript
import { getParameter, getSecret } from '@aws-lambda-powertools/parameters/ssm';
import { getSecret as getSecretValue } from '@aws-lambda-powertools/parameters/secrets';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'order-service' });

// Parameters are cached automatically (default 5 seconds)
export const handler = async (event: any) => {
  // Fetch from SSM Parameter Store (cached)
  const apiEndpoint = await getParameter('/myapp/api-endpoint');

  // Fetch a secret from Secrets Manager (cached)
  const dbCredentials = await getSecretValue('production/db-credentials', {
    transform: 'json',
    maxAge: 300, // Cache for 5 minutes
  });

  logger.info('Config loaded', { apiEndpoint });

  // Use the credentials
  const connection = await connectToDatabase({
    host: dbCredentials.host,
    password: dbCredentials.password,
  });

  // Process the event
  return { statusCode: 200 };
};
```

## Error Handling Patterns

Here's a pattern for consistent error handling across your Lambda functions.

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const logger = new Logger();
const metrics = new Metrics();

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handler = async (event: any) => {
  try {
    const result = await processEvent(event);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('Application error', {
        errorCode: error.errorCode,
        statusCode: error.statusCode,
      });
      metrics.addMetric('AppError', MetricUnit.Count, 1);
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ error: error.message, code: error.errorCode }),
      };
    }

    // Unexpected errors
    logger.error('Unexpected error', error as Error);
    metrics.addMetric('UnexpectedError', MetricUnit.Count, 1);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    metrics.publishStoredMetrics();
  }
};
```

## Summary

Lambda Powertools for TypeScript gives you production-ready observability with minimal boilerplate. The type safety catches configuration errors at compile time, and the Middy middleware integration keeps your handler code clean and focused on business logic.

If you're using Python instead, check out [Lambda Powertools for Python](https://oneuptime.com/blog/post/lambda-powertools-python/view). For Java, see [Lambda Powertools for Java](https://oneuptime.com/blog/post/lambda-powertools-java/view). The APIs are consistent across all three languages, so the patterns you learn transfer directly.
