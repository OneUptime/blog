# How to Debug Lambda Functions with CloudWatch Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Debugging, Monitoring

Description: A practical guide to using CloudWatch Logs for debugging AWS Lambda functions, including structured logging, log insights queries, and setting up effective alerting.

---

When your Lambda function breaks at 2 AM, CloudWatch Logs is your first stop. It captures everything your function outputs - console.log statements, errors, stack traces, and Lambda platform events like cold starts and timeouts. The problem isn't lack of data. It's finding the right data in the ocean of log entries. Let's set up logging that makes debugging fast and painless.

## How Lambda Logging Works

Every Lambda function automatically gets a CloudWatch Log Group named `/aws/lambda/function-name`. Each invocation writes to a log stream within that group. Lambda also adds platform messages: START (with request ID), END (with duration and memory), and REPORT (with billed duration and max memory used).

A typical log stream looks like:

```
START RequestId: abc-123 Version: $LATEST
2026-02-12T10:00:00.000Z abc-123 INFO Processing order ORD-001
2026-02-12T10:00:00.100Z abc-123 INFO Order saved to database
END RequestId: abc-123
REPORT RequestId: abc-123 Duration: 150.00 ms Billed Duration: 200 ms Memory Size: 256 MB Max Memory Used: 89 MB
```

The request ID is your primary correlation key. Every log entry for a single invocation shares the same request ID.

## Structured Logging

The biggest debugging improvement you can make is switching from unstructured strings to structured JSON logs. JSON logs are searchable, filterable, and parseable by CloudWatch Logs Insights.

This logging utility produces structured JSON output:

```javascript
// src/utils/logger.js
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  withContext(additionalContext) {
    return new Logger({ ...this.context, ...additionalContext });
  }

  log(level, message, data = {}) {
    if (LOG_LEVELS[level] < LOG_LEVELS[LOG_LEVEL]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    // Use console methods that map to CloudWatch log levels
    switch (level) {
      case 'ERROR':
        console.error(JSON.stringify(entry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(entry));
        break;
      default:
        console.log(JSON.stringify(entry));
    }
  }

  debug(message, data) { this.log('DEBUG', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
}

module.exports = Logger;
```

Use it in your Lambda handler:

```javascript
// src/handlers/order-handler.js
const Logger = require('../utils/logger');

exports.handler = async (event, context) => {
  // Create a logger with request context
  const logger = new Logger({
    requestId: context.awsRequestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
  });

  logger.info('Received request', {
    httpMethod: event.httpMethod,
    path: event.path,
    sourceIp: event.requestContext?.identity?.sourceIp,
  });

  try {
    const orderId = event.pathParameters?.orderId;
    const orderLogger = logger.withContext({ orderId });

    orderLogger.info('Fetching order from database');

    const order = await getOrder(orderId);

    if (!order) {
      orderLogger.warn('Order not found');
      return { statusCode: 404, body: '{"error":"Not found"}' };
    }

    orderLogger.info('Order retrieved successfully', {
      orderStatus: order.status,
      itemCount: order.items.length,
    });

    return { statusCode: 200, body: JSON.stringify(order) };
  } catch (error) {
    logger.error('Request failed', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });

    return { statusCode: 500, body: '{"error":"Internal error"}' };
  }
};
```

Now your logs look like this:

```json
{"timestamp":"2026-02-12T10:00:00.000Z","level":"INFO","message":"Received request","requestId":"abc-123","functionName":"order-handler","httpMethod":"GET","path":"/orders/ORD-001","sourceIp":"203.0.113.1"}
{"timestamp":"2026-02-12T10:00:00.050Z","level":"INFO","message":"Fetching order from database","requestId":"abc-123","functionName":"order-handler","orderId":"ORD-001"}
{"timestamp":"2026-02-12T10:00:00.150Z","level":"INFO","message":"Order retrieved successfully","requestId":"abc-123","functionName":"order-handler","orderId":"ORD-001","orderStatus":"active","itemCount":3}
```

## CloudWatch Logs Insights

Logs Insights is where structured logging pays off. You can query across all log streams with a SQL-like syntax.

Find all errors in the last hour:

```
fields @timestamp, @message
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

Find slow invocations:

```
filter @type = "REPORT"
| stats avg(@duration), max(@duration), count(*) as invocations by bin(1h)
```

Find cold starts:

```
filter @message like /Init Duration/
| parse @message "Init Duration: * ms" as initDuration
| stats avg(initDuration), max(initDuration), count(*) as coldStarts by bin(1h)
```

Find specific order processing:

```
fields @timestamp, level, message, orderId, orderStatus
| filter orderId = "ORD-001"
| sort @timestamp asc
```

Find errors by type:

```
fields @timestamp, errorName, errorMessage, requestId
| filter level = "ERROR"
| stats count(*) as errorCount by errorName
| sort errorCount desc
```

Find memory-intensive invocations:

```
filter @type = "REPORT"
| parse @message "Max Memory Used: * MB" as memoryUsed
| parse @message "Memory Size: * MB" as memorySize
| filter memoryUsed / memorySize > 0.8
| sort memoryUsed desc
| limit 20
```

## Setting Up Log-Based Alarms

Create CloudWatch alarms that trigger when specific log patterns appear.

This CDK configuration creates a metric filter and alarm for Lambda errors:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class LogAlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logGroup = logs.LogGroup.fromLogGroupName(
      this, 'FunctionLogs', '/aws/lambda/order-handler'
    );

    // Metric filter for errors
    const errorMetric = new logs.MetricFilter(this, 'ErrorMetric', {
      logGroup,
      filterPattern: logs.FilterPattern.literal('"level":"ERROR"'),
      metricNamespace: 'MyApp/Lambda',
      metricName: 'ErrorCount',
      metricValue: '1',
    });

    // Alarm on error count
    const errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
      metric: errorMetric.metric({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'More than 5 errors in 5 minutes',
    });

    // Metric filter for slow queries
    const slowQueryMetric = new logs.MetricFilter(this, 'SlowQueryMetric', {
      logGroup,
      filterPattern: logs.FilterPattern.literal('"message":"Database query slow"'),
      metricNamespace: 'MyApp/Lambda',
      metricName: 'SlowQueryCount',
    });

    // Metric filter for specific business events
    const failedPaymentMetric = new logs.MetricFilter(this, 'FailedPayment', {
      logGroup,
      filterPattern: logs.FilterPattern.literal('"message":"Payment failed"'),
      metricNamespace: 'MyApp/Business',
      metricName: 'FailedPayments',
    });
  }
}
```

## Log Retention and Cost Management

By default, Lambda log groups retain logs forever. That gets expensive. Set a retention policy.

```typescript
// Set retention when creating the function
const fn = new lambda.Function(this, 'Handler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/handler'),
  logRetention: logs.RetentionDays.TWO_WEEKS,
});
```

Or set it on an existing log group:

```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/order-handler \
  --retention-in-days 14
```

For cost optimization, consider:
- 14-day retention for development functions
- 30-90 day retention for production functions
- Export to S3 for long-term archival (much cheaper)

## Debugging Timeouts

Lambda timeouts produce no error in your function code - the runtime just kills the process. You see the REPORT line with a duration equal to the configured timeout.

To debug timeouts, add timing to your code:

```javascript
exports.handler = async (event, context) => {
  const logger = new Logger({ requestId: context.awsRequestId });

  // Log remaining time periodically for long-running operations
  const timeoutWarning = setInterval(() => {
    const remaining = context.getRemainingTimeInMillis();
    if (remaining < 5000) {
      logger.warn('Function approaching timeout', {
        remainingMs: remaining,
      });
    }
  }, 1000);

  try {
    const startDb = Date.now();
    const data = await queryDatabase();
    logger.info('Database query completed', { durationMs: Date.now() - startDb });

    const startProcess = Date.now();
    const result = await processData(data);
    logger.info('Data processing completed', { durationMs: Date.now() - startProcess });

    return result;
  } finally {
    clearInterval(timeoutWarning);
  }
};
```

## Debugging Cold Starts

Cold starts show up in the REPORT line as "Init Duration." To find and analyze them:

```
filter @type = "REPORT"
| filter @message like /Init Duration/
| parse @message "Init Duration: * ms" as initDuration
| parse @message "Duration: * ms" as duration
| parse @message "Memory Size: * MB" as memorySize
| fields @timestamp, initDuration, duration, memorySize
| sort initDuration desc
| limit 50
```

If cold starts are too frequent or too slow, consider:
- Reducing package size (fewer dependencies = faster init)
- Increasing memory (more memory = more CPU = faster init)
- Using provisioned concurrency for critical functions
- Moving initialization code outside the handler

## Correlation Across Services

When one Lambda function triggers another (via SQS, SNS, or direct invocation), pass a correlation ID through the chain.

```javascript
// In the first function
exports.handler = async (event, context) => {
  const correlationId = event.headers?.['x-correlation-id'] || context.awsRequestId;

  // Pass to SQS
  await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ data: 'something' }),
    MessageAttributes: {
      correlationId: { DataType: 'String', StringValue: correlationId },
    },
  }));
};

// In the second function
exports.handler = async (event) => {
  for (const record of event.Records) {
    const correlationId = record.messageAttributes?.correlationId?.stringValue || 'unknown';
    const logger = new Logger({ correlationId });

    logger.info('Processing message from upstream function');
    // Now you can search by correlationId across both functions
  }
};
```

For distributed tracing beyond logs, check out our guide on [enabling X-Ray tracing for Lambda](https://oneuptime.com/blog/post/enable-xray-tracing-lambda-functions/view).

## Using Powertools for AWS Lambda

AWS Lambda Powertools provides a production-ready logging library with structured logging, correlation IDs, and log sampling built in.

```bash
npm install @aws-lambda-powertools/logger
```

```javascript
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({
  serviceName: 'order-service',
  logLevel: 'INFO',
});

exports.handler = async (event, context) => {
  logger.addContext(context);

  logger.info('Processing request', { event });

  // Logs are automatically structured with service name, request ID, etc.
};
```

## Wrapping Up

Effective Lambda debugging starts with structured logging. JSON logs make CloudWatch Logs Insights actually useful. Add request IDs, correlation IDs, and timing data to every log entry. Set up metric filters and alarms so you find out about problems before your users do. And set log retention policies so you don't pay to store logs forever. These aren't advanced techniques - they're table stakes for running Lambda functions in production.
