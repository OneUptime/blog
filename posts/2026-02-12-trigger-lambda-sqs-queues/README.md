# How to Trigger Lambda Functions from SQS Queues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SQS, Event-Driven Architecture

Description: Learn how to configure SQS queues as event sources for Lambda functions, including batch processing, error handling, and concurrency control patterns.

---

SQS and Lambda are a natural pairing. SQS provides reliable message queuing with built-in retries and dead letter queues, while Lambda provides on-demand compute that scales with your message volume. Together, they give you a processing pipeline that handles variable workloads gracefully - messages buffer in the queue during spikes, and Lambda scales up workers to drain it.

This pattern is everywhere in production AWS architectures. Let's set it up properly.

## How SQS-Lambda Integration Works

Lambda uses an Event Source Mapping to poll your SQS queue. The Lambda service handles all the polling - you don't need to write any polling code. When messages are available, Lambda pulls a batch, invokes your function with that batch, and deletes the messages from the queue if your function returns successfully.

Key behaviors to understand:

- Lambda uses long polling (20-second wait time) to check for messages
- Messages are received in batches (configurable, up to 10 for standard queues, up to 10,000 for FIFO)
- If your function succeeds, Lambda deletes the messages automatically
- If your function fails, the messages become visible again after the visibility timeout expires
- Lambda scales up to process messages faster when the queue depth grows

## Setting Up with AWS CDK

Here's a complete setup with proper error handling configuration.

This CDK stack creates an SQS queue with a dead letter queue and connects it to a Lambda function:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class SqsTriggerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Dead letter queue for messages that fail processing
    const dlq = new sqs.Queue(this, 'ProcessingDLQ', {
      queueName: 'order-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main processing queue
    const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: 'order-processing',
      visibilityTimeout: cdk.Duration.seconds(90), // 6x your Lambda timeout
      retentionPeriod: cdk.Duration.days(7),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3, // move to DLQ after 3 failed attempts
      },
    });

    // The processing Lambda function
    const processor = new lambda.Function(this, 'OrderProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/processor'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    // Connect SQS to Lambda
    processor.addEventSource(
      new eventsources.SqsEventSource(processingQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
        maxConcurrency: 50, // limit concurrent Lambda invocations
      })
    );
  }
}
```

The `maxConcurrency` setting is important. Without it, Lambda can scale to thousands of concurrent executions when the queue fills up, which might overwhelm your downstream services. Set this based on what your database or API can handle.

## The Visibility Timeout Rule

This one's critical: your queue's visibility timeout must be at least 6 times your Lambda function's timeout. Here's why:

When Lambda receives a batch of messages, the messages become invisible to other consumers for the visibility timeout period. If your Lambda function takes longer than the visibility timeout to process, the messages become visible again and another Lambda invocation picks them up. Now you have duplicate processing.

The 6x recommendation accounts for Lambda's retry behavior and internal processing overhead.

## Writing the Lambda Handler

The SQS event contains an array of records. Each record has the message body, attributes, and metadata.

This handler processes SQS messages with partial batch failure reporting:

```javascript
exports.handler = async (event) => {
  console.log(`Received ${event.Records.length} messages`);

  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const messageId = record.messageId;

      console.log(`Processing message ${messageId}:`, body);

      // Your processing logic
      await processOrder(body);

      console.log(`Successfully processed message ${messageId}`);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      // Report this specific message as failed
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  // Return partial failures - Lambda will only retry these messages
  return { batchItemFailures };
};

async function processOrder(order) {
  // Validate the order
  if (!order.orderId || !order.items) {
    throw new Error('Invalid order: missing required fields');
  }

  // Process the order
  // Save to database, charge payment, send confirmation, etc.
  console.log(`Processing order ${order.orderId} with ${order.items.length} items`);
}
```

The `batchItemFailures` response is crucial for efficiency. Without it, if one message in a batch of 10 fails, all 10 get retried. With it, only the failed message goes back to the queue.

## FIFO Queue Integration

FIFO queues guarantee message ordering and exactly-once processing. The Lambda integration works similarly, with a few differences.

This CDK configuration sets up a FIFO queue with Lambda:

```typescript
const fifoQueue = new sqs.Queue(this, 'OrderFifoQueue', {
  queueName: 'order-processing.fifo',
  fifo: true,
  contentBasedDeduplication: true,
  visibilityTimeout: cdk.Duration.seconds(90),
  deadLetterQueue: {
    queue: fifoDlq,
    maxReceiveCount: 3,
  },
});

processor.addEventSource(
  new eventsources.SqsEventSource(fifoQueue, {
    batchSize: 10,
    maxBatchingWindow: cdk.Duration.seconds(0), // no batching window for FIFO
    reportBatchItemFailures: true,
  })
);
```

With FIFO queues, Lambda processes messages in order per message group ID. If a message fails, it blocks subsequent messages in the same group until the failed message is resolved or moved to the DLQ. Messages in other groups continue to process normally.

## Sending Messages to the Queue

Here's how to put messages into the queue for processing.

This Node.js code sends order messages to the SQS queue:

```javascript
const { SQSClient, SendMessageCommand, SendMessageBatchCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({});
const QUEUE_URL = process.env.QUEUE_URL;

// Send a single message
async function enqueueOrder(order) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(order),
    MessageAttributes: {
      OrderType: {
        DataType: 'String',
        StringValue: order.type,
      },
    },
  }));
}

// Send messages in batches (up to 10 at a time)
async function enqueueOrders(orders) {
  const batches = [];
  for (let i = 0; i < orders.length; i += 10) {
    const batch = orders.slice(i, i + 10).map((order, idx) => ({
      Id: String(idx),
      MessageBody: JSON.stringify(order),
    }));

    batches.push(
      sqs.send(new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: batch,
      }))
    );
  }

  await Promise.all(batches);
}
```

## Scaling Behavior

Lambda scales up aggressively to drain your queue. Here's how it works:

1. Lambda starts with 5 concurrent invocations
2. It adds 60 more concurrent invocations per minute
3. It keeps scaling until the queue is drained or the concurrency limit is reached

For standard queues, Lambda can scale to over 1,000 concurrent invocations. For FIFO queues, the maximum is equal to the number of active message groups.

If this scaling is too aggressive for your downstream services, use `maxConcurrency` on the event source mapping:

```bash
# Limit to 10 concurrent Lambda invocations
aws lambda update-event-source-mapping \
  --uuid abc-123-def-456 \
  --scaling-config MaxConcurrency=10
```

## Monitoring SQS-Lambda Pipelines

Watch these metrics:

- **ApproximateNumberOfMessagesVisible** - queue depth. If it's growing, you're not processing fast enough.
- **ApproximateAgeOfOldestMessage** - how long messages are waiting. This is your processing latency.
- **NumberOfMessagesSent to DLQ** - if messages are landing in the DLQ, something is consistently failing.
- **Lambda ConcurrentExecutions** - how many workers are active.

Set up alerts on all of these. A growing queue depth combined with stable concurrency usually means your Lambda function is hitting a bottleneck. For monitoring patterns, see [Lambda extensions for monitoring](https://oneuptime.com/blog/post/2026-02-12-lambda-extensions-monitoring/view).

## Idempotency

SQS guarantees at-least-once delivery, which means your function might receive the same message more than once. Your processing logic must be idempotent.

A common approach is to use DynamoDB as an idempotency store:

```javascript
async function processOrderIdempotent(messageId, order) {
  const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  try {
    // Try to claim this message
    await client.send(new PutItemCommand({
      TableName: 'processed-messages',
      Item: {
        messageId: { S: messageId },
        processedAt: { S: new Date().toISOString() },
        ttl: { N: String(Math.floor(Date.now() / 1000) + 86400) }, // 24h TTL
      },
      ConditionExpression: 'attribute_not_exists(messageId)',
    }));

    // First time processing this message
    await processOrder(order);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log(`Message ${messageId} already processed, skipping`);
      return; // don't report as failure
    }
    throw error;
  }
}
```

## Wrapping Up

SQS-to-Lambda is one of the most reliable processing patterns on AWS. The queue gives you durability and buffering, Lambda gives you scale. Use `reportBatchItemFailures` for efficient error handling, set your visibility timeout correctly, and monitor your queue depth. Add a DLQ so failed messages don't get lost, and make your processing idempotent because messages can arrive more than once. That's really all there is to it.
