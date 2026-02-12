# How to Create SQS Queues with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, SQS, Messaging

Description: A comprehensive guide to creating Amazon SQS queues with AWS CDK, covering standard queues, FIFO queues, dead letter queues, and encryption.

---

SQS queues are everywhere in AWS architectures. They decouple services, absorb traffic spikes, and provide reliable message delivery. If you're using CDK to manage your infrastructure, you'll want to define your queues as code alongside everything else. The good news is that CDK's SQS constructs are well-designed and handle most of the complexity for you.

Let's go through creating different types of SQS queues, configuring dead letter queues, setting up encryption, and connecting queues to other services.

## Standard Queue Basics

A standard SQS queue with sensible defaults takes just a few lines:

```typescript
// lib/queues-stack.ts - Basic SQS queue setup
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class QueuesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a standard SQS queue
    const orderQueue = new sqs.Queue(this, 'OrderQueue', {
      queueName: 'order-processing',
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(7),
      receiveMessageWaitTimeSeconds: 20,
    });
  }
}
```

Let me explain the key properties here:

- **visibilityTimeout** - How long a message stays invisible after a consumer picks it up. Set this to at least as long as your processing time, or messages will get processed twice.
- **retentionPeriod** - How long unprocessed messages stay in the queue. Default is 4 days, maximum is 14 days.
- **receiveMessageWaitTimeSeconds** - Setting this to 20 enables long polling, which reduces costs and latency compared to short polling.

## Dead Letter Queues

Every production SQS queue should have a dead letter queue (DLQ). When a message fails processing too many times, it gets moved to the DLQ instead of being retried forever.

```typescript
// Dead letter queue pattern - catch messages that fail processing
const orderDlq = new sqs.Queue(this, 'OrderDLQ', {
  queueName: 'order-processing-dlq',
  retentionPeriod: cdk.Duration.days(14), // Keep failed messages longer
});

const orderQueue = new sqs.Queue(this, 'OrderQueue', {
  queueName: 'order-processing',
  visibilityTimeout: cdk.Duration.seconds(300),
  deadLetterQueue: {
    queue: orderDlq,
    maxReceiveCount: 3, // Move to DLQ after 3 failed attempts
  },
});
```

The `maxReceiveCount` is important. Set it too low and transient failures will push messages to the DLQ unnecessarily. Set it too high and truly bad messages will clog up your queue. Three is a reasonable starting point for most workloads.

You should always monitor your DLQ. Set up a CloudWatch alarm to trigger when messages appear:

```typescript
// Alarm when messages land in the dead letter queue
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';

const alertTopic = new sns.Topic(this, 'AlertTopic');

const dlqAlarm = orderDlq.metricApproximateNumberOfMessagesVisible({
  period: cdk.Duration.minutes(5),
}).createAlarm(this, 'DLQAlarm', {
  alarmName: 'OrderDLQ-HasMessages',
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
});

dlqAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
```

## FIFO Queues

When message order matters, use FIFO queues. They guarantee that messages are processed exactly once and in the order they were sent.

```typescript
// FIFO queue with deduplication and message grouping
const paymentQueue = new sqs.Queue(this, 'PaymentQueue', {
  queueName: 'payment-processing.fifo',
  fifo: true,
  contentBasedDeduplication: true,
  visibilityTimeout: cdk.Duration.seconds(60),
  deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
  fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
});

// FIFO DLQ must also be FIFO
const paymentDlq = new sqs.Queue(this, 'PaymentDLQ', {
  queueName: 'payment-processing-dlq.fifo',
  fifo: true,
  retentionPeriod: cdk.Duration.days(14),
});
```

Two things to remember with FIFO queues. First, the queue name must end with `.fifo`. Second, if you set `fifoThroughputLimit` to `PER_MESSAGE_GROUP_ID`, you get higher throughput because SQS can parallelize across different message groups. This is really useful when different customers' messages don't need to be ordered relative to each other, but each customer's messages do.

## Encryption

For sensitive data, enable encryption. You've got two options: SSE-SQS (AWS managed) or SSE-KMS (customer managed).

```typescript
// Server-side encryption with AWS managed key
const encryptedQueue = new sqs.Queue(this, 'EncryptedQueue', {
  queueName: 'sensitive-data',
  encryption: sqs.QueueEncryption.SQS_MANAGED,
});

// Or use a customer managed KMS key for more control
import * as kms from 'aws-cdk-lib/aws-kms';

const queueKey = new kms.Key(this, 'QueueKey', {
  description: 'KMS key for SQS queue encryption',
  enableKeyRotation: true,
});

const kmsEncryptedQueue = new sqs.Queue(this, 'KmsEncryptedQueue', {
  queueName: 'highly-sensitive-data',
  encryption: sqs.QueueEncryption.KMS,
  encryptionMasterKey: queueKey,
  dataKeyReuse: cdk.Duration.hours(1),
});
```

The `dataKeyReuse` parameter controls how long SQS reuses a data key before requesting a new one from KMS. Longer durations mean fewer KMS API calls (and lower costs), but shorter durations are more secure.

## Queue Policies

Control who can send messages to and receive messages from your queues:

```typescript
// Grant specific IAM principals access to the queue
import * as iam from 'aws-cdk-lib/aws-iam';

const sharedQueue = new sqs.Queue(this, 'SharedQueue', {
  queueName: 'shared-events',
});

// Allow a Lambda function to consume messages
const consumerRole = new iam.Role(this, 'ConsumerRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});
sharedQueue.grantConsumeMessages(consumerRole);

// Allow another service to send messages
const producerRole = new iam.Role(this, 'ProducerRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
});
sharedQueue.grantSendMessages(producerRole);

// Allow cross-account access
sharedQueue.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountPrincipal('987654321098')],
  actions: ['sqs:SendMessage'],
  resources: [sharedQueue.queueArn],
}));
```

CDK's `grant*` methods are much cleaner than writing IAM policies by hand. They create least-privilege policies automatically.

## Lambda Event Source

The most common SQS pattern is a Lambda function consuming messages from a queue. CDK makes this trivial:

```typescript
// Wire a Lambda function to consume from the queue
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';

const processor = new lambda.Function(this, 'OrderProcessor', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/order-processor'),
  timeout: cdk.Duration.seconds(30),
});

// Add the SQS queue as an event source
processor.addEventSource(new eventsources.SqsEventSource(orderQueue, {
  batchSize: 10,
  maxBatchingWindow: cdk.Duration.seconds(5),
  reportBatchItemFailures: true,
}));
```

The `reportBatchItemFailures` flag is important. Without it, if one message in a batch fails, all messages get retried. With it enabled, only the failed messages go back to the queue. Your Lambda handler needs to return a specific response format to take advantage of this:

```typescript
// Lambda handler that reports individual item failures
export const handler = async (event: any) => {
  const failedItems: string[] = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      await processOrder(body);
    } catch (error) {
      failedItems.push(record.messageId);
    }
  }

  return {
    batchItemFailures: failedItems.map(id => ({
      itemIdentifier: id,
    })),
  };
};
```

## Queue Construct Pattern

For consistent queue configurations across your org, wrap the setup in a construct:

```typescript
// lib/standard-queue.ts - Reusable queue construct with DLQ and monitoring
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

interface StandardQueueProps {
  queueName: string;
  visibilityTimeout?: cdk.Duration;
  maxReceiveCount?: number;
  fifo?: boolean;
}

export class StandardQueue extends Construct {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: StandardQueueProps) {
    super(scope, id);

    const suffix = props.fifo ? '.fifo' : '';

    this.dlq = new sqs.Queue(this, 'DLQ', {
      queueName: `${props.queueName}-dlq${suffix}`,
      fifo: props.fifo,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: `${props.queueName}${suffix}`,
      fifo: props.fifo,
      visibilityTimeout: props.visibilityTimeout ?? cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(7),
      receiveMessageWaitTimeSeconds: 20,
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: props.maxReceiveCount ?? 3,
      },
    });
  }
}
```

For more on connecting queues to notification topics, check out our post on [creating SNS topics and subscriptions with CDK](https://oneuptime.com/blog/post/sns-topics-subscriptions-cdk/view). If you're building event-driven pipelines, you might also want to look at [Step Functions state machines with CDK](https://oneuptime.com/blog/post/step-functions-state-machines-cdk/view).

## Wrapping Up

SQS queues are foundational to any event-driven AWS architecture, and CDK makes them easy to define, configure, and deploy consistently. The patterns here - dead letter queues, encryption, FIFO ordering, Lambda event sources, and reusable constructs - cover the vast majority of production use cases. Start with the StandardQueue construct pattern and customize from there as your needs evolve.
