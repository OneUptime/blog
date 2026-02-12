# How to Use Lambda Destinations for Asynchronous Invocation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Event-Driven Architecture

Description: Learn how to configure Lambda Destinations to route the results of asynchronous invocations to downstream services like SQS, SNS, EventBridge, and other Lambda functions.

---

When you invoke a Lambda function asynchronously, you're essentially saying "run this and I don't need the response right now." That's fine for fire-and-forget workloads, but what happens when you actually need to know whether the function succeeded or failed? Before Lambda Destinations, the only option was a Dead Letter Queue (DLQ), and that only captured failures. Lambda Destinations changed the game by letting you route both successes and failures to different targets.

In this guide, we'll walk through everything you need to know about Lambda Destinations - what they are, why they matter, and how to set them up properly.

## What Are Lambda Destinations?

Lambda Destinations let you configure where the results of asynchronous invocations go after execution completes. You can set up separate destinations for successful invocations and failed invocations. The supported destination types are:

- Another Lambda function
- An SQS queue
- An SNS topic
- An EventBridge event bus

The key difference between Destinations and DLQs is that Destinations work for both success and failure cases. DLQs only capture failures after all retries are exhausted. Destinations also include richer context in the payload - you get the original event, the response (or error), and metadata about the invocation.

## When Should You Use Destinations?

Destinations shine in event-driven architectures where you need to chain workflows together. Here are some common use cases:

- **Processing pipelines**: Route successful image processing results to a notification service, and failures to an error handling queue.
- **Audit trails**: Send all invocation results to EventBridge for logging and monitoring.
- **Error handling**: Route failures to an SQS queue for manual review or automated retry logic.
- **Fan-out patterns**: Trigger different downstream processes based on success or failure.

If you're building monitoring around your Lambda functions, check out our guide on [Lambda extensions for monitoring](https://oneuptime.com/blog/post/lambda-extensions-monitoring/view) for complementary strategies.

## Setting Up Destinations with the AWS Console

The quickest way to get started is through the AWS Console. Navigate to your Lambda function, click on the "Configuration" tab, then "Destinations." You'll see options to add destinations for both "On success" and "On failure" conditions.

But let's be honest - the console is fine for learning, not for production. Let's look at Infrastructure as Code approaches.

## Setting Up Destinations with AWS CDK

Here's how to configure Lambda Destinations using the AWS CDK in TypeScript.

This CDK stack creates a Lambda function with an SQS success destination and another SQS failure destination:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as destinations from 'aws-cdk-lib/aws-lambda-destinations';
import { Construct } from 'constructs';

export class LambdaDestinationsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create queues for success and failure
    const successQueue = new sqs.Queue(this, 'SuccessQueue', {
      queueName: 'lambda-success-results',
      retentionPeriod: cdk.Duration.days(14),
    });

    const failureQueue = new sqs.Queue(this, 'FailureQueue', {
      queueName: 'lambda-failure-results',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create the Lambda function with destinations
    const processorFn = new lambda.Function(this, 'ProcessorFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/processor'),
      onSuccess: new destinations.SqsDestination(successQueue),
      onFailure: new destinations.SqsDestination(failureQueue),
      retryAttempts: 2, // number of retries before routing to failure destination
      maxEventAge: cdk.Duration.hours(1), // max age of event in the queue
    });
  }
}
```

## Setting Up Destinations with AWS CLI

If you prefer the CLI, you can configure destinations on an existing function.

This command sets up an SQS queue as the on-success destination for a Lambda function:

```bash
# Configure the success destination
aws lambda put-function-event-invoke-config \
  --function-name my-processor-function \
  --destination-config '{
    "OnSuccess": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:success-queue"
    },
    "OnFailure": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:failure-queue"
    }
  }' \
  --maximum-retry-attempts 2 \
  --maximum-event-age-in-seconds 3600
```

Don't forget that your Lambda function's execution role needs permission to write to whatever destination you're targeting.

This IAM policy grants the Lambda function permission to send messages to the destination queues:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": [
        "arn:aws:sqs:us-east-1:123456789012:success-queue",
        "arn:aws:sqs:us-east-1:123456789012:failure-queue"
      ]
    }
  ]
}
```

## Understanding the Destination Payload

One of the best things about Destinations is the rich payload they deliver. Here's what a success destination message looks like:

```json
{
  "version": "1.0",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "requestContext": {
    "requestId": "abc-123-def-456",
    "functionArn": "arn:aws:lambda:us-east-1:123456789012:function:my-processor",
    "condition": "Success",
    "approximateInvokeCount": 1
  },
  "requestPayload": {
    "key1": "value1",
    "key2": "value2"
  },
  "responseContext": {
    "statusCode": 200,
    "executedVersion": "$LATEST"
  },
  "responsePayload": {
    "result": "processed successfully",
    "itemCount": 42
  }
}
```

For failure cases, you'll get similar metadata but with error information instead of a response payload. The `approximateInvokeCount` field tells you how many times Lambda tried to run the function before giving up.

## Using EventBridge as a Destination

EventBridge is particularly powerful as a destination because it lets you create rules that route results to multiple downstream services.

This CDK snippet configures EventBridge as the success destination and sets up a rule to forward results:

```typescript
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

// Use the default event bus as a destination
const processorFn = new lambda.Function(this, 'ProcessorFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/processor'),
  onSuccess: new destinations.EventBridgeDestination(),
  onFailure: new destinations.SqsDestination(failureQueue),
});

// Create a rule to match successful Lambda destination events
const successRule = new events.Rule(this, 'SuccessRule', {
  eventPattern: {
    source: ['lambda'],
    detailType: ['Lambda Function Invocation Result - Success'],
  },
});

// Route to multiple targets
successRule.addTarget(new targets.LambdaFunction(notifierFn));
successRule.addTarget(new targets.SqsQueue(auditQueue));
```

## Destinations vs. DLQs - Which Should You Use?

This is a question that comes up a lot. Here's the breakdown:

**Use Destinations when:**
- You need to handle both success and failure cases
- You want richer invocation context in the payload
- You're building event-driven workflows
- You need to route to EventBridge or another Lambda function

**Use DLQs when:**
- You only care about failures
- You have existing infrastructure built around DLQs
- You need the DLQ behavior for Step Functions integration

You can actually use both simultaneously. The DLQ catches failures at the Lambda service level (before your code runs), while Destinations handle the results after execution. For more on DLQ configuration, see our post on [configuring Dead Letter Queues for Lambda](https://oneuptime.com/blog/post/configure-dead-letter-queues-lambda-functions/view).

## Common Pitfalls

**Forgetting IAM permissions.** Your Lambda execution role needs explicit permission to write to the destination. The error won't be obvious - the invocation succeeds, but the destination message silently fails.

**Expecting synchronous behavior.** Destinations only work with asynchronous invocations. If you're calling Lambda via the AWS SDK with `InvocationType: 'RequestResponse'`, destinations won't fire.

**Not setting retry limits.** By default, Lambda retries failed async invocations twice. If your function is idempotent, that's fine. If it's not, you might want to set `retryAttempts` to 0 and let your failure destination handle the retry logic.

**Payload size limits.** The destination payload includes both the request and response. If your function returns a large payload, you might hit the 256 KB limit for SQS messages. Consider returning a reference (like an S3 key) instead of the full data.

## Testing Destinations Locally

Testing destinations locally is tricky because it's a service-level feature. You can't really simulate it with SAM CLI. The best approach is to write your Lambda handler to return structured responses, test the handler logic locally, and then test the destination routing in a dev environment.

If you want to learn more about local testing strategies, our guide on [testing Lambda functions locally with SAM CLI](https://oneuptime.com/blog/post/test-lambda-functions-locally-sam-cli/view) covers the fundamentals.

## Monitoring Destinations

You should monitor your destination deliveries to make sure messages aren't getting lost. CloudWatch provides metrics for destination delivery:

- `DestinationDeliveryFailures` - number of times Lambda couldn't deliver to the destination
- `AsyncEventsDropped` - events dropped because they exceeded the max event age

Set up CloudWatch alarms on these metrics. If `DestinationDeliveryFailures` starts climbing, it usually means an IAM permission issue or the destination service is throttling you. For more on CloudWatch-based monitoring, check out [debugging Lambda functions with CloudWatch Logs](https://oneuptime.com/blog/post/debug-lambda-functions-cloudwatch-logs/view).

## Wrapping Up

Lambda Destinations are one of those features that quietly make serverless architectures much more robust. They give you visibility into async invocation results without bolting on extra infrastructure. If you're building anything event-driven on AWS, you should be using them.

Start simple - add success and failure destinations to your most critical async functions. Route failures to SQS for alerting, and successes to EventBridge for downstream processing. Once you see how clean the architecture becomes, you'll want to add them everywhere.
