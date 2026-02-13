# How to Trigger Lambda Functions from Kinesis Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Kinesis, Streaming, Real-Time Processing

Description: Learn how to process real-time streaming data by connecting Amazon Kinesis Data Streams to AWS Lambda for analytics, monitoring, and event processing.

---

Kinesis Data Streams handles real-time data at scale - clickstreams, IoT telemetry, application logs, financial transactions. When you connect a Lambda function to a Kinesis stream, Lambda automatically reads batches of records from the stream and invokes your function with them. You get real-time processing without managing any consumer infrastructure.

This pattern works well when you need sub-second processing of streaming data but don't want the complexity of running a Kinesis Client Library (KCL) application on EC2 or ECS.

## How Kinesis-Lambda Integration Works

Lambda uses an Event Source Mapping to poll your Kinesis stream. The Lambda service maintains a shard iterator for each shard in the stream and polls for new records. When records are available, Lambda invokes your function with a batch.

Key characteristics:
- One Lambda invocation per shard (by default)
- Records within a shard are processed in order
- You can increase parallelism with the `parallelizationFactor` setting
- Failed batches block the shard until resolved (unless you configure error handling)
- Lambda reads at up to 2 MB/sec per shard or up to 5 read transactions/sec per shard

## Setting Up with AWS CDK

Here's a complete setup with proper scaling and error handling.

This CDK stack creates a Kinesis stream with a Lambda consumer and error handling configuration:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class KinesisLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Kinesis stream
    const clickstream = new kinesis.Stream(this, 'Clickstream', {
      streamName: 'user-clickstream',
      shardCount: 4,
      retentionPeriod: cdk.Duration.hours(48),
    });

    // DLQ for failed records
    const dlq = new sqs.Queue(this, 'StreamDLQ', {
      queueName: 'clickstream-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Lambda processor
    const processor = new lambda.Function(this, 'StreamProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/stream-processor'),
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      environment: {
        OUTPUT_TABLE: 'click-aggregates',
      },
    });

    // Connect Kinesis to Lambda
    processor.addEventSource(
      new eventsources.KinesisEventSource(clickstream, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 500,
        maxBatchingWindow: cdk.Duration.seconds(5),
        parallelizationFactor: 4,
        retryAttempts: 3,
        bisectBatchOnError: true,
        reportBatchItemFailures: true,
        onFailure: new eventsources.SqsDestination(dlq),
        maxRecordAge: cdk.Duration.hours(24),
      })
    );

    // Grant read access to the stream
    clickstream.grantRead(processor);
  }
}
```

Let me explain the configuration:

- `startingPosition: LATEST` - only process new records. Use `TRIM_HORIZON` to start from the oldest available record.
- `batchSize: 500` - up to 500 records per invocation (max is 10,000).
- `maxBatchingWindow: 5 seconds` - wait up to 5 seconds to fill the batch.
- `parallelizationFactor: 4` - process up to 4 batches concurrently per shard.
- `bisectBatchOnError: true` - split failed batches to isolate bad records.
- `reportBatchItemFailures: true` - report individual record failures.
- `onFailure` - send records that fail all retries to an SQS DLQ.

## Writing the Stream Processor

Kinesis records contain base64-encoded data. You need to decode them before processing.

This handler decodes and processes Kinesis stream records with partial batch failure reporting:

```javascript
exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} Kinesis records`);

  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      // Decode the base64-encoded data
      const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
      const data = JSON.parse(payload);

      const sequenceNumber = record.kinesis.sequenceNumber;
      const partitionKey = record.kinesis.partitionKey;
      const shardId = record.eventID.split(':')[0];

      console.log(`Shard: ${shardId}, Sequence: ${sequenceNumber}, Key: ${partitionKey}`);

      // Process the click event
      await processClickEvent(data);
    } catch (error) {
      console.error(`Failed to process record ${record.kinesis.sequenceNumber}:`, error);
      batchItemFailures.push({
        itemIdentifier: record.kinesis.sequenceNumber,
      });
    }
  }

  // Return partial failures
  return { batchItemFailures };
};

async function processClickEvent(clickData) {
  const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  const { userId, page, action, timestamp } = clickData;

  // Aggregate clicks per user per page
  await client.send(new UpdateItemCommand({
    TableName: process.env.OUTPUT_TABLE,
    Key: {
      pk: { S: `USER#${userId}` },
      sk: { S: `PAGE#${page}#${new Date(timestamp).toISOString().split('T')[0]}` },
    },
    UpdateExpression: 'ADD clickCount :one SET lastAction = :action, lastSeen = :ts',
    ExpressionAttributeValues: {
      ':one': { N: '1' },
      ':action': { S: action },
      ':ts': { S: timestamp },
    },
  }));
}
```

## Putting Records into the Stream

Here's how producers send data to your Kinesis stream.

This code sends click events to the Kinesis stream:

```javascript
const { KinesisClient, PutRecordsCommand } = require('@aws-sdk/client-kinesis');

const kinesis = new KinesisClient({});
const STREAM_NAME = 'user-clickstream';

async function sendClickEvents(events) {
  // Kinesis supports batch puts of up to 500 records
  const records = events.map(event => ({
    Data: Buffer.from(JSON.stringify(event)),
    PartitionKey: event.userId, // partition by user for ordering
  }));

  // Split into batches of 500
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);

    const result = await kinesis.send(new PutRecordsCommand({
      StreamName: STREAM_NAME,
      Records: batch,
    }));

    // Check for failures
    if (result.FailedRecordCount > 0) {
      console.warn(`${result.FailedRecordCount} records failed`);
      // Retry failed records
      const failedRecords = result.Records
        .map((r, idx) => r.ErrorCode ? batch[idx] : null)
        .filter(Boolean);
      // Implement retry logic here
    }
  }
}

// Usage
await sendClickEvents([
  { userId: 'user-123', page: '/products', action: 'view', timestamp: new Date().toISOString() },
  { userId: 'user-456', page: '/checkout', action: 'click', timestamp: new Date().toISOString() },
]);
```

## Scaling and Performance

### Parallelization Factor

By default, Lambda processes one batch per shard at a time. With 4 shards, you get 4 concurrent invocations. The `parallelizationFactor` (1-10) multiplies this:

- 4 shards x 1 parallelization = 4 concurrent invocations
- 4 shards x 4 parallelization = 16 concurrent invocations
- 4 shards x 10 parallelization = 40 concurrent invocations

Higher parallelization means faster processing but potentially out-of-order records within a shard. Use it when ordering within a shard isn't critical.

### Enhanced Fan-Out

Standard consumers share the 2 MB/sec read throughput per shard. Enhanced Fan-Out gives each consumer its own dedicated 2 MB/sec throughput via HTTP/2 push.

```typescript
const consumer = new kinesis.CfnStreamConsumer(this, 'LambdaConsumer', {
  consumerName: 'lambda-processor',
  streamArn: clickstream.streamArn,
});

// Use the consumer ARN in your event source mapping
```

## Kinesis vs. DynamoDB Streams vs. SQS

Choosing the right event source depends on your use case:

| Feature | Kinesis | DynamoDB Streams | SQS |
|---------|---------|-----------------|-----|
| Ordering | Per shard (partition key) | Per partition key | FIFO only |
| Retention | 24h - 365 days | 24 hours | 4 - 14 days |
| Throughput | 1 MB/sec/shard write, 2 MB/sec/shard read | Tied to table capacity | Nearly unlimited |
| Multiple consumers | Yes (enhanced fan-out) | Yes (up to 2) | No (single consumer) |
| Data source | Any producer | DynamoDB table changes | Any producer |

Use Kinesis for high-throughput streaming from external sources. Use DynamoDB Streams for change data capture. Use SQS for work queues. For DynamoDB Stream triggers, see our post on [triggering Lambda from DynamoDB Streams](https://oneuptime.com/blog/post/2026-02-12-trigger-lambda-dynamodb-streams/view).

## Error Handling Deep Dive

The biggest risk with Kinesis-Lambda is a "poison pill" record that fails every time and blocks the entire shard. Here's how to prevent that:

1. **`bisectBatchOnError`**: Splits failed batches in half to isolate the bad record
2. **`reportBatchItemFailures`**: Report specific failed sequence numbers
3. **`maxRetryAttempts`**: Limit how many times a record is retried
4. **`maxRecordAge`**: Skip records older than this age
5. **`onFailure` destination**: Send failed records to SQS for later analysis

All five should be configured in production. Without them, a single bad record can block your entire shard for hours.

## Monitoring Kinesis-Lambda Processing

Watch these CloudWatch metrics:

- **IteratorAge** - the age of the last record processed. If this grows, you're falling behind.
- **GetRecords.IteratorAgeMilliseconds** - similar but from the Kinesis side.
- **ReadProvisionedThroughputExceeded** - you're hitting the shard's read limit.

Set alarms on IteratorAge. If it exceeds a few seconds, consider increasing shards, parallelization factor, or optimizing your function. For monitoring strategies, check out [Lambda extensions for monitoring](https://oneuptime.com/blog/post/2026-02-12-lambda-extensions-monitoring/view).

## Wrapping Up

Kinesis-to-Lambda is the go-to pattern for real-time stream processing on AWS. The event source mapping handles all the complexity of shard management, checkpointing, and scaling. Configure your error handling carefully - especially `bisectBatchOnError` and `reportBatchItemFailures` - to prevent poison pill records from blocking your pipeline. And monitor IteratorAge religiously, because falling behind on a stream means losing real-time processing guarantees.
