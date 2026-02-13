# How to Create SNS Topics and Subscriptions with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, SNS, Messaging

Description: Learn how to create and configure Amazon SNS topics, subscriptions, and access policies using AWS CDK with practical TypeScript examples.

---

Amazon SNS is the glue that connects AWS services together. Whether you're sending alert emails, fanning out messages to multiple SQS queues, or triggering Lambda functions, SNS topics are usually somewhere in the mix. Setting them up with CDK is straightforward, but there are enough configuration options and gotchas that it's worth walking through properly.

Let's build out SNS topics and subscriptions using CDK, covering everything from basic setups to FIFO topics, cross-account access, and message filtering.

## Basic Topic and Subscriptions

The simplest SNS setup is a topic with an email subscription. Here's what that looks like:

```typescript
// lib/sns-stack.ts - Basic SNS topic with subscriptions
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export class SnsStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a standard SNS topic
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'application-alerts',
      displayName: 'Application Alert Notifications',
    });

    // Email subscription
    this.alertTopic.addSubscription(
      new subscriptions.EmailSubscription('dev-team@company.com')
    );

    // SMS subscription
    this.alertTopic.addSubscription(
      new subscriptions.SmsSubscription('+15551234567')
    );

    // HTTP/HTTPS endpoint subscription
    this.alertTopic.addSubscription(
      new subscriptions.UrlSubscription('https://hooks.slack.com/services/xxx/yyy/zzz', {
        protocol: sns.SubscriptionProtocol.HTTPS,
      })
    );
  }
}
```

Each subscription type has its own class under `aws-cdk-lib/aws-sns-subscriptions`. CDK handles the underlying CloudFormation resources and permissions automatically.

## Lambda Subscriptions

Wiring a Lambda function to an SNS topic is one of the most common patterns. CDK handles the permissions for you, which is nice because getting the resource policies right manually is annoying.

```typescript
// Lambda subscription with automatic permission setup
import * as lambda from 'aws-cdk-lib/aws-lambda';

const processorFunction = new lambda.Function(this, 'Processor', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/processor'),
  functionName: 'alert-processor',
  timeout: cdk.Duration.seconds(30),
});

// This automatically grants SNS permission to invoke the Lambda
this.alertTopic.addSubscription(
  new subscriptions.LambdaSubscription(processorFunction)
);
```

When you add a Lambda subscription, CDK creates the `AWS::Lambda::Permission` resource that allows SNS to invoke the function. You don't need to manage this yourself.

## SQS Subscriptions

Fan-out to SQS queues is another bread-and-butter pattern. One topic, multiple queues, each processing messages independently.

```typescript
// Fan-out pattern: one topic to multiple SQS queues
import * as sqs from 'aws-cdk-lib/aws-sqs';

const orderQueue = new sqs.Queue(this, 'OrderQueue', {
  queueName: 'order-processing',
  visibilityTimeout: cdk.Duration.seconds(300),
});

const analyticsQueue = new sqs.Queue(this, 'AnalyticsQueue', {
  queueName: 'order-analytics',
  visibilityTimeout: cdk.Duration.seconds(300),
});

const notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
  queueName: 'order-notifications',
  visibilityTimeout: cdk.Duration.seconds(60),
});

// Subscribe all three queues to the same topic
const orderTopic = new sns.Topic(this, 'OrderTopic', {
  topicName: 'new-orders',
});

orderTopic.addSubscription(new subscriptions.SqsSubscription(orderQueue));
orderTopic.addSubscription(new subscriptions.SqsSubscription(analyticsQueue));
orderTopic.addSubscription(new subscriptions.SqsSubscription(notificationQueue));
```

CDK sets up the SQS queue policy to allow SNS to send messages. Without CDK, you'd need to manually configure `sqs:SendMessage` permissions on each queue.

## Message Filtering

Not every subscriber needs every message. SNS subscription filters let you route messages to the right consumers based on message attributes.

```typescript
// Subscription with message filtering based on attributes
const criticalAlertQueue = new sqs.Queue(this, 'CriticalAlertQueue', {
  queueName: 'critical-alerts',
});

const infoAlertQueue = new sqs.Queue(this, 'InfoAlertQueue', {
  queueName: 'info-alerts',
});

const alertTopic = new sns.Topic(this, 'FilteredAlertTopic', {
  topicName: 'filtered-alerts',
});

// Only critical and high severity go to this queue
alertTopic.addSubscription(
  new subscriptions.SqsSubscription(criticalAlertQueue, {
    filterPolicy: {
      severity: sns.SubscriptionFilter.stringFilter({
        allowlist: ['critical', 'high'],
      }),
      environment: sns.SubscriptionFilter.stringFilter({
        allowlist: ['production'],
      }),
    },
  })
);

// Info and low severity go to this queue
alertTopic.addSubscription(
  new subscriptions.SqsSubscription(infoAlertQueue, {
    filterPolicy: {
      severity: sns.SubscriptionFilter.stringFilter({
        allowlist: ['info', 'low'],
      }),
    },
  })
);
```

When you publish a message, include the attributes that match your filter:

```typescript
// Example: publishing with message attributes for filtering
// (This would be in your application code, not CDK)
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const client = new SNSClient({});
await client.send(new PublishCommand({
  TopicArn: 'arn:aws:sns:us-east-1:123456789012:filtered-alerts',
  Message: JSON.stringify({ error: 'Database connection timeout' }),
  MessageAttributes: {
    severity: { DataType: 'String', StringValue: 'critical' },
    environment: { DataType: 'String', StringValue: 'production' },
  },
}));
```

## FIFO Topics

When message ordering matters, use FIFO topics. They guarantee first-in-first-out delivery and exactly-once processing.

```typescript
// FIFO topic for ordered message delivery
const fifoTopic = new sns.Topic(this, 'OrderFifoTopic', {
  topicName: 'order-events.fifo',
  fifo: true,
  contentBasedDeduplication: true,
});

// FIFO topics can only have FIFO queue subscriptions
const fifoQueue = new sqs.Queue(this, 'OrderFifoQueue', {
  queueName: 'order-processing.fifo',
  fifo: true,
  contentBasedDeduplication: true,
});

fifoTopic.addSubscription(
  new subscriptions.SqsSubscription(fifoQueue)
);
```

Remember: FIFO topic names must end with `.fifo`, and they can only have FIFO SQS queues as subscribers. You can't mix standard and FIFO resources.

## Encryption and Access Policies

For sensitive data, encrypt your topic with a KMS key. You'll also want to control who can publish and subscribe.

```typescript
// Encrypted topic with custom access policy
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';

const topicKey = new kms.Key(this, 'TopicKey', {
  description: 'KMS key for SNS topic encryption',
  enableKeyRotation: true,
});

const secureTopic = new sns.Topic(this, 'SecureTopic', {
  topicName: 'secure-notifications',
  masterKey: topicKey,
});

// Allow a specific IAM role to publish
secureTopic.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.ArnPrincipal('arn:aws:iam::123456789012:role/PublisherRole')],
  actions: ['sns:Publish'],
  resources: [secureTopic.topicArn],
}));

// Allow another account to subscribe
secureTopic.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountPrincipal('987654321098')],
  actions: ['sns:Subscribe'],
  resources: [secureTopic.topicArn],
  conditions: {
    StringEquals: {
      'sns:Protocol': 'sqs',
    },
  },
}));
```

## Dead Letter Queues for Subscriptions

If a subscriber can't process a message, you don't want it lost forever. Attach a dead letter queue to your subscription.

```typescript
// Subscription with a dead letter queue for failed deliveries
const dlq = new sqs.Queue(this, 'SubscriptionDLQ', {
  queueName: 'order-processor-dlq',
  retentionPeriod: cdk.Duration.days(14),
});

const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
  queueName: 'order-processor',
});

orderTopic.addSubscription(
  new subscriptions.SqsSubscription(processingQueue, {
    deadLetterQueue: dlq,
  })
);
```

## Outputting Topic ARNs

You'll often need to reference the topic ARN in other stacks or for manual configuration.

```typescript
// Export the topic ARN for cross-stack references
new cdk.CfnOutput(this, 'AlertTopicArn', {
  value: this.alertTopic.topicArn,
  description: 'ARN of the alert notification topic',
  exportName: 'AlertTopicArn',
});
```

For a deeper dive into how these topics integrate with monitoring, see our guide on [creating CloudWatch alarms with CDK](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-alarms-cdk/view). And if you're building queue-based architectures, check out [creating SQS queues with CDK](https://oneuptime.com/blog/post/2026-02-12-sqs-queues-cdk/view).

## Wrapping Up

SNS topics are deceptively simple - the basic setup takes just a few lines. But production configurations involve encryption, access policies, message filtering, dead letter queues, and sometimes FIFO ordering. CDK makes all of this manageable by handling the permission plumbing automatically and keeping everything version-controlled. Start with a basic topic and email subscription, then layer on the advanced features as your architecture demands them.
