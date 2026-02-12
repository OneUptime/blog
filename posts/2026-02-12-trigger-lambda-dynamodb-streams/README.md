# How to Trigger Lambda Functions from DynamoDB Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, DynamoDB, Event-Driven Architecture

Description: Learn how to set up DynamoDB Streams to trigger Lambda functions for real-time data processing, change data capture, and building reactive architectures.

---

DynamoDB Streams capture every change to your table - inserts, updates, and deletes - in an ordered, time-stamped sequence. Hook a Lambda function to that stream, and you've got real-time change data capture. Every time a row changes, your function fires with the old and new values. It's the foundation for building reactive systems, maintaining materialized views, syncing data across services, and triggering workflows based on data changes.

Let's set it up from scratch and cover the patterns that work well in production.

## How DynamoDB Streams Work

When you enable streams on a DynamoDB table, every modification generates a stream record. These records are organized into shards (like Kinesis), and Lambda polls the shards for new records. This is an important distinction from S3 triggers - Lambda isn't invoked by DynamoDB. Instead, the Lambda service polls the stream using an Event Source Mapping.

You choose what data the stream records contain:

- `KEYS_ONLY` - only the partition key and sort key
- `NEW_IMAGE` - the full item after the change
- `OLD_IMAGE` - the full item before the change
- `NEW_AND_OLD_IMAGES` - both before and after (most useful)

For most use cases, `NEW_AND_OLD_IMAGES` is what you want. It lets you see exactly what changed.

## Setting Up with AWS CDK

Here's a complete CDK stack that creates a DynamoDB table with streams and a Lambda trigger.

This CDK stack enables DynamoDB Streams and connects a Lambda function as the stream processor:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class DynamoStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB table with streams enabled
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'orders',
      partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create the stream processor Lambda
    const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/stream-processor'),
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        NOTIFICATION_TOPIC_ARN: 'arn:aws:sns:us-east-1:123456789012:order-notifications',
      },
    });

    // Connect the stream to the Lambda function
    streamProcessor.addEventSource(
      new eventsources.DynamoEventSource(ordersTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 100,
        maxBatchingWindow: cdk.Duration.seconds(5),
        retryAttempts: 3,
        bisectBatchOnError: true,
        reportBatchItemFailures: true,
        parallelizationFactor: 2,
      })
    );
  }
}
```

Let's break down those event source configuration options:

- `startingPosition: TRIM_HORIZON` - start reading from the oldest record in the stream. Use `LATEST` to only process new records.
- `batchSize: 100` - Lambda receives up to 100 records per invocation.
- `maxBatchingWindow: 5 seconds` - Lambda waits up to 5 seconds to fill the batch before invoking.
- `bisectBatchOnError: true` - if a batch fails, Lambda splits it in half and retries each half. This helps isolate the problematic record.
- `reportBatchItemFailures: true` - lets your function report which specific records failed, so Lambda only retries those.
- `parallelizationFactor: 2` - process up to 2 batches from the same shard concurrently.

## Writing the Stream Processor

The event payload from DynamoDB Streams contains the change records. Each record includes the event name (INSERT, MODIFY, REMOVE) and the DynamoDB images.

This handler processes stream records and reacts differently based on the change type:

```javascript
exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} stream records`);

  const failures = [];

  for (const [index, record] of event.Records.entries()) {
    try {
      const eventName = record.eventName; // INSERT, MODIFY, REMOVE
      const newImage = record.dynamodb.NewImage;
      const oldImage = record.dynamodb.OldImage;

      console.log(`Event: ${eventName}, Keys:`, JSON.stringify(record.dynamodb.Keys));

      switch (eventName) {
        case 'INSERT':
          await handleNewOrder(unmarshall(newImage));
          break;

        case 'MODIFY':
          await handleOrderUpdate(unmarshall(oldImage), unmarshall(newImage));
          break;

        case 'REMOVE':
          await handleOrderDeletion(unmarshall(oldImage));
          break;
      }
    } catch (error) {
      console.error(`Failed to process record ${index}:`, error);
      // Report this specific record as failed
      failures.push({ itemIdentifier: record.dynamodb.SequenceNumber });
    }
  }

  // Return partial batch failure response
  return { batchItemFailures: failures };
};

// Convert DynamoDB JSON to regular JavaScript objects
function unmarshall(dynamoItem) {
  if (!dynamoItem) return null;
  const { unmarshall } = require('@aws-sdk/util-dynamodb');
  return unmarshall(dynamoItem);
}

async function handleNewOrder(order) {
  console.log('New order created:', order.orderId);
  // Send notification, update analytics, sync to search index, etc.
}

async function handleOrderUpdate(oldOrder, newOrder) {
  // Check what changed
  if (oldOrder.status !== newOrder.status) {
    console.log(
      `Order ${newOrder.orderId} status changed: ${oldOrder.status} -> ${newOrder.status}`
    );

    if (newOrder.status === 'shipped') {
      // Send shipping notification
      await sendShippingNotification(newOrder);
    }
  }
}

async function handleOrderDeletion(order) {
  console.log('Order deleted:', order.orderId);
  // Clean up related resources
}
```

The `batchItemFailures` response is critical. When `reportBatchItemFailures` is enabled, returning a list of failed sequence numbers tells Lambda to only retry those specific records. Without this, a single failure causes the entire batch to be retried.

## The DynamoDB Stream Record Format

Here's what a typical stream record looks like:

```json
{
  "eventID": "abc123",
  "eventName": "MODIFY",
  "eventVersion": "1.1",
  "eventSource": "aws:dynamodb",
  "awsRegion": "us-east-1",
  "dynamodb": {
    "Keys": {
      "orderId": { "S": "ORD-001" },
      "createdAt": { "S": "2026-02-12T10:00:00Z" }
    },
    "NewImage": {
      "orderId": { "S": "ORD-001" },
      "createdAt": { "S": "2026-02-12T10:00:00Z" },
      "status": { "S": "shipped" },
      "total": { "N": "99.99" }
    },
    "OldImage": {
      "orderId": { "S": "ORD-001" },
      "createdAt": { "S": "2026-02-12T10:00:00Z" },
      "status": { "S": "processing" },
      "total": { "N": "99.99" }
    },
    "SequenceNumber": "111",
    "SizeBytes": 256,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

Notice the DynamoDB JSON format - attributes are wrapped in type descriptors like `{ "S": "value" }` for strings and `{ "N": "99.99" }` for numbers. Use the `unmarshall` utility from the AWS SDK to convert these to plain JavaScript objects.

## Common Patterns

### Materialized View Pattern

Use DynamoDB Streams to maintain a denormalized view of your data in another table or service.

```javascript
async function handleOrderUpdate(oldOrder, newOrder) {
  // Update the customer's order summary
  const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  if (oldOrder.status !== newOrder.status && newOrder.status === 'completed') {
    await client.send(new UpdateItemCommand({
      TableName: 'customer-summaries',
      Key: { customerId: { S: newOrder.customerId } },
      UpdateExpression: 'ADD completedOrders :one, totalSpent :amount',
      ExpressionAttributeValues: {
        ':one': { N: '1' },
        ':amount': { N: String(newOrder.total) },
      },
    }));
  }
}
```

### Search Index Sync

Keep an Elasticsearch or OpenSearch index in sync with your DynamoDB table.

```javascript
async function syncToSearch(eventName, newImage, oldImage) {
  const { Client } = require('@opensearch-project/opensearch');
  const client = new Client({ node: process.env.OPENSEARCH_ENDPOINT });

  if (eventName === 'REMOVE') {
    await client.delete({ index: 'orders', id: oldImage.orderId });
  } else {
    await client.index({
      index: 'orders',
      id: newImage.orderId,
      body: newImage,
    });
  }
}
```

## Error Handling and Retry Behavior

DynamoDB Streams are ordered per partition key. If a record fails and you don't use `reportBatchItemFailures`, Lambda retries the entire batch - and it blocks newer records on that shard until the batch succeeds or reaches the retry limit. This can cause a backlog.

To prevent this:

1. Enable `reportBatchItemFailures` to only retry failed records
2. Enable `bisectBatchOnError` to isolate problematic records
3. Configure `maxRetryAttempts` and set up a [destination for failures](https://oneuptime.com/blog/post/lambda-destinations-asynchronous-invocation/view)
4. Make your processing idempotent - records may be delivered more than once

## Monitoring Stream Processing

Monitor these CloudWatch metrics for your event source mapping:

- `IteratorAge` - the time between when a record is written and when Lambda processes it. If this is growing, you're falling behind.
- `ConcurrentExecutions` - how many instances of your function are running
- `Errors` - function invocation errors

Set a CloudWatch alarm on `IteratorAge`. If it exceeds a few seconds consistently, increase the `parallelizationFactor` or optimize your function's processing time. For monitoring strategies, check out our post on [debugging Lambda with CloudWatch Logs](https://oneuptime.com/blog/post/debug-lambda-functions-cloudwatch-logs/view).

## Wrapping Up

DynamoDB Streams plus Lambda gives you real-time change data capture with zero infrastructure to manage. Enable streams with `NEW_AND_OLD_IMAGES`, use `reportBatchItemFailures` for efficient error handling, and monitor `IteratorAge` to make sure you're keeping up. It's one of the most powerful event-driven patterns on AWS, and it's surprisingly simple to set up right.
