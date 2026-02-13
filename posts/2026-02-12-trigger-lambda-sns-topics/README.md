# How to Trigger Lambda Functions from SNS Topics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SNS, Messaging

Description: Learn how to subscribe Lambda functions to SNS topics for fan-out messaging, event notifications, and building decoupled microservice architectures.

---

SNS (Simple Notification Service) is AWS's pub/sub messaging service. Publish a message to an SNS topic, and it gets delivered to all subscribers - Lambda functions, SQS queues, HTTP endpoints, email addresses, you name it. When you subscribe a Lambda function to an SNS topic, every message published to that topic triggers your function. It's one of the simplest event-driven patterns on AWS and the backbone of fan-out architectures.

Let's walk through the setup and the patterns that work well in production.

## How SNS-Lambda Integration Works

Unlike SQS (where Lambda polls for messages), SNS actively pushes messages to Lambda. When a message is published to a topic, SNS invokes your Lambda function asynchronously for each subscribed function. That means:

- Lambda's built-in retry mechanism applies (2 retries by default)
- You can configure Lambda Destinations for success/failure handling
- You can set up a DLQ on the Lambda function for failed invocations

SNS also has its own retry policy for Lambda delivery. If the initial invocation fails, SNS retries according to its delivery policy before giving up.

## Setting Up with AWS CDK

Here's a complete setup that creates a topic, a Lambda subscriber, and proper error handling.

This CDK stack creates an SNS topic and subscribes a Lambda function to process published messages:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class SnsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the SNS topic
    const orderTopic = new sns.Topic(this, 'OrderTopic', {
      topicName: 'order-events',
      displayName: 'Order Events',
    });

    // DLQ for failed Lambda invocations
    const dlq = new sqs.Queue(this, 'ProcessorDLQ', {
      queueName: 'order-processor-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Lambda function to process order events
    const orderProcessor = new lambda.Function(this, 'OrderProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/order-processor'),
      timeout: cdk.Duration.seconds(30),
      deadLetterQueue: dlq,
      retryAttempts: 2,
    });

    // Lambda function for sending notifications
    const notifier = new lambda.Function(this, 'Notifier', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/notifier'),
      timeout: cdk.Duration.seconds(15),
    });

    // Subscribe both functions to the topic (fan-out)
    orderTopic.addSubscription(
      new subs.LambdaSubscription(orderProcessor)
    );

    orderTopic.addSubscription(
      new subs.LambdaSubscription(notifier)
    );

    // Output the topic ARN for other services to publish to
    new cdk.CfnOutput(this, 'TopicArn', {
      value: orderTopic.topicArn,
    });
  }
}
```

## Setting Up with the AWS CLI

For manual setup, you need to add Lambda permissions and create the subscription.

These commands set up Lambda as an SNS subscriber:

```bash
# Grant SNS permission to invoke the Lambda function
aws lambda add-permission \
  --function-name order-processor \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789012:order-events

# Subscribe the Lambda function to the SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:order-events \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:order-processor
```

## The SNS Event Format

When SNS invokes your Lambda function, the event contains one or more SNS records.

Here's what the event looks like:

```json
{
  "Records": [
    {
      "EventSource": "aws:sns",
      "EventVersion": "1.0",
      "EventSubscriptionArn": "arn:aws:sns:us-east-1:123456789012:order-events:abc-123",
      "Sns": {
        "Type": "Notification",
        "MessageId": "msg-abc-123",
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:order-events",
        "Subject": "New Order",
        "Message": "{\"orderId\":\"ORD-001\",\"status\":\"created\",\"total\":99.99}",
        "Timestamp": "2026-02-12T10:00:00.000Z",
        "MessageAttributes": {
          "eventType": {
            "Type": "String",
            "Value": "ORDER_CREATED"
          }
        }
      }
    }
  ]
}
```

The `Message` field is a string - even if you published a JSON object, it arrives as a stringified version. You'll need to parse it.

## Writing the Lambda Handler

This handler processes SNS messages and handles different event types:

```javascript
exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} SNS messages`);

  for (const record of event.Records) {
    const snsMessage = record.Sns;
    const message = JSON.parse(snsMessage.Message);
    const eventType = snsMessage.MessageAttributes?.eventType?.Value || 'unknown';

    console.log(`Event type: ${eventType}, Message ID: ${snsMessage.MessageId}`);

    switch (eventType) {
      case 'ORDER_CREATED':
        await handleOrderCreated(message);
        break;
      case 'ORDER_SHIPPED':
        await handleOrderShipped(message);
        break;
      case 'ORDER_CANCELLED':
        await handleOrderCancelled(message);
        break;
      default:
        console.warn(`Unknown event type: ${eventType}`);
    }
  }
};

async function handleOrderCreated(order) {
  console.log(`New order: ${order.orderId}, total: $${order.total}`);
  // Process new order - reserve inventory, start fulfillment, etc.
}

async function handleOrderShipped(order) {
  console.log(`Order shipped: ${order.orderId}`);
  // Update tracking, send shipping notification email
}

async function handleOrderCancelled(order) {
  console.log(`Order cancelled: ${order.orderId}`);
  // Release inventory, process refund
}
```

## Publishing Messages to SNS

Here's how to publish messages from other services.

This code publishes structured messages to the SNS topic with message attributes:

```javascript
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({});
const TOPIC_ARN = process.env.ORDER_TOPIC_ARN;

async function publishOrderEvent(eventType, order) {
  await sns.send(new PublishCommand({
    TopicArn: TOPIC_ARN,
    Subject: `Order Event: ${eventType}`,
    Message: JSON.stringify(order),
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: eventType,
      },
      orderId: {
        DataType: 'String',
        StringValue: order.orderId,
      },
    },
  }));

  console.log(`Published ${eventType} event for order ${order.orderId}`);
}

// Usage
await publishOrderEvent('ORDER_CREATED', {
  orderId: 'ORD-001',
  customerId: 'CUST-123',
  items: [{ productId: 'PROD-1', quantity: 2 }],
  total: 99.99,
});
```

## Message Filtering

SNS supports subscription filter policies that let you route specific messages to specific subscribers. Instead of having every subscriber receive every message and filter in code, you can filter at the SNS level.

This CDK configuration creates filtered subscriptions:

```typescript
// Only receives ORDER_CREATED events
orderTopic.addSubscription(
  new subs.LambdaSubscription(fulfillmentProcessor, {
    filterPolicy: {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['ORDER_CREATED'],
      }),
    },
  })
);

// Only receives ORDER_SHIPPED events
orderTopic.addSubscription(
  new subs.LambdaSubscription(notificationProcessor, {
    filterPolicy: {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['ORDER_SHIPPED', 'ORDER_DELIVERED'],
      }),
    },
  })
);

// Only receives high-value orders
orderTopic.addSubscription(
  new subs.LambdaSubscription(vipProcessor, {
    filterPolicyScope: sns.FilterOrPolicy.policy({
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['ORDER_CREATED'],
      }),
    }),
  })
);
```

Filter policies save you Lambda invocations and make your architecture cleaner. Instead of processing and discarding irrelevant messages, you just don't receive them.

## SNS vs. SQS as Lambda Triggers

This is a common question. Here's the quick comparison:

**Use SNS when:**
- You need fan-out (one message to multiple consumers)
- You want push-based delivery
- You don't need message persistence (SNS doesn't retain messages)
- You're building pub/sub patterns

**Use SQS when:**
- You need guaranteed message delivery with persistence
- You want to control processing concurrency
- You need message batching
- You need to buffer messages during traffic spikes

**Use SNS + SQS together when:**
- You need both fan-out and guaranteed delivery
- You want each subscriber to process at its own pace

The SNS-to-SQS-to-Lambda pattern is extremely common. SNS fans out to multiple SQS queues, and each queue has its own Lambda consumer. For SQS trigger setup, see our guide on [triggering Lambda from SQS queues](https://oneuptime.com/blog/post/2026-02-12-trigger-lambda-sqs-queues/view).

## FIFO Topics

SNS supports FIFO topics that guarantee message ordering and deduplication. They pair with FIFO SQS queues.

```typescript
const fifoTopic = new sns.Topic(this, 'OrderFifoTopic', {
  topicName: 'order-events.fifo',
  fifo: true,
  contentBasedDeduplication: true,
});
```

Note: SNS FIFO topics don't support Lambda subscriptions directly. You need to subscribe a FIFO SQS queue and trigger Lambda from the queue.

## Error Handling and Delivery Policies

SNS has its own delivery retry policy. For Lambda targets, the default is 3 retries with an exponential backoff. You can customize this:

```bash
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:order-events:abc-123 \
  --attribute-name DeliveryPolicy \
  --attribute-value '{
    "healthyRetryPolicy": {
      "numRetries": 5,
      "minDelayTarget": 1,
      "maxDelayTarget": 60,
      "backoffFunction": "exponential"
    }
  }'
```

After SNS exhausts its retries, the Lambda service's own retry mechanism kicks in (if the invocation fails). So you effectively get two layers of retries. Make sure your processing is idempotent.

## Wrapping Up

SNS-to-Lambda is the simplest fan-out pattern on AWS. Publish once, process in multiple subscribers. Use filter policies to route messages efficiently, configure DLQs to catch failures, and remember that SNS doesn't persist messages - if you need that guarantee, put an SQS queue between SNS and Lambda. It's a few extra components, but the reliability is worth it.
