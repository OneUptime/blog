# How to Configure Dead Letter Queues for Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SQS, Error Handling

Description: A complete guide to setting up Dead Letter Queues for AWS Lambda functions to capture and handle failed asynchronous invocations effectively.

---

Every Lambda function fails eventually. Maybe it's a transient network error, a downstream service outage, or a bug that only shows up under specific conditions. When you invoke Lambda asynchronously, those failures can vanish into thin air unless you've set up a Dead Letter Queue (DLQ). A DLQ catches failed invocations after Lambda exhausts its retry attempts, giving you a chance to inspect, debug, and reprocess them.

Let's dig into how DLQs work with Lambda and how to configure them properly.

## How Lambda Handles Async Failures

When Lambda processes an asynchronous invocation and the function throws an error, it doesn't just give up. The service retries automatically - twice by default. Here's the sequence:

1. First invocation attempt fails
2. Lambda waits about one minute, then retries
3. If the second attempt fails, Lambda waits about two minutes, then retries again
4. If all three attempts fail, the event goes to the DLQ (if configured)

Without a DLQ, that event is simply discarded after the retries. Gone. No trace of it beyond whatever logs the failed invocations left in CloudWatch.

## Choosing Between SQS and SNS for Your DLQ

Lambda supports two services as DLQ targets:

**Amazon SQS** is the better choice when you want to:
- Reprocess failed events later (messages stay in the queue)
- Build automated retry mechanisms
- Inspect individual failed events

**Amazon SNS** is better when you want to:
- Fan out failure notifications to multiple subscribers
- Trigger alerts immediately upon failure
- Send failures to email, SMS, or other notification channels

For most use cases, SQS is the practical choice. You can always add an SNS subscription later if you need notifications too.

## Setting Up a DLQ with CloudFormation

Let's start with a CloudFormation template that creates everything you need.

This template creates an SQS queue as the DLQ and a Lambda function configured to use it:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Lambda function with Dead Letter Queue

Resources:
  # The DLQ itself
  FailedInvocationsDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-processor-dlq
      MessageRetentionPeriod: 1209600  # 14 days
      VisibilityTimeout: 300

  # Lambda execution role with DLQ permissions
  ProcessorRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: DLQAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: sqs:SendMessage
                Resource: !GetAtt FailedInvocationsDLQ.Arn

  # The Lambda function
  OrderProcessor:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: order-processor
      Runtime: nodejs20.x
      Handler: index.handler
      Role: !GetAtt ProcessorRole.Arn
      DeadLetterConfig:
        TargetArn: !GetAtt FailedInvocationsDLQ.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            // Process the order
            console.log('Processing order:', JSON.stringify(event));
            // Your business logic here
          };
```

## Setting Up a DLQ with AWS CDK

If you're using CDK, the setup is more concise.

This CDK stack creates a Lambda function with an SQS-based DLQ and a CloudWatch alarm for monitoring:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class DLQStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DLQ with a generous retention period
    const dlq = new sqs.Queue(this, 'ProcessorDLQ', {
      queueName: 'order-processor-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create the Lambda function and attach the DLQ
    const processor = new lambda.Function(this, 'OrderProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/processor'),
      deadLetterQueue: dlq,
      retryAttempts: 2,  // default is 2, but being explicit
      maxEventAge: cdk.Duration.hours(6),
    });

    // Alert when messages land in the DLQ
    const dlqAlarm = new cloudwatch.Alarm(this, 'DLQAlarm', {
      metric: dlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Messages detected in order processor DLQ',
    });
  }
}
```

## Setting Up a DLQ with the AWS CLI

For quick configuration on an existing function, use the CLI.

This command attaches an SQS DLQ to an existing Lambda function:

```bash
# First, make sure your Lambda role has sqs:SendMessage permission
# Then configure the DLQ
aws lambda update-function-configuration \
  --function-name order-processor \
  --dead-letter-config TargetArn=arn:aws:sqs:us-east-1:123456789012:order-processor-dlq
```

To verify the configuration:

```bash
# Check the current DLQ configuration
aws lambda get-function-configuration \
  --function-name order-processor \
  --query 'DeadLetterConfig'
```

## What's in a DLQ Message?

When Lambda sends a failed event to your DLQ, the message body is the original event payload. But the interesting stuff is in the message attributes:

- `RequestID` - the Lambda request ID for correlation with CloudWatch Logs
- `ErrorCode` - the HTTP status code (usually 200 for handled errors, or 5xx for crashes)
- `ErrorMessage` - the error message from the function

Here's a Python script that reads and processes DLQ messages.

This script pulls messages from the DLQ, logs the error details, and optionally reprocesses them:

```python
import boto3
import json

sqs = boto3.client('sqs')
lambda_client = boto3.client('lambda')

QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/order-processor-dlq'

def process_dlq_messages():
    while True:
        # Pull up to 10 messages at a time
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=10,
            MessageAttributeNames=['All'],
            WaitTimeSeconds=5
        )

        messages = response.get('Messages', [])
        if not messages:
            print('No more messages in DLQ')
            break

        for message in messages:
            body = json.loads(message['Body'])
            attrs = message.get('MessageAttributes', {})

            request_id = attrs.get('RequestID', {}).get('StringValue', 'unknown')
            error_msg = attrs.get('ErrorMessage', {}).get('StringValue', 'unknown')

            print(f'Failed invocation {request_id}: {error_msg}')
            print(f'Original payload: {json.dumps(body, indent=2)}')

            # Decide whether to retry
            if should_retry(body, error_msg):
                # Re-invoke the Lambda function
                lambda_client.invoke(
                    FunctionName='order-processor',
                    InvocationType='Event',  # async again
                    Payload=json.dumps(body)
                )
                print(f'Retried invocation for request {request_id}')

            # Delete the message from the DLQ
            sqs.delete_message(
                QueueUrl=QUEUE_URL,
                ReceiptHandle=message['ReceiptHandle']
            )

def should_retry(payload, error_message):
    # Add your retry logic here
    # For example, don't retry validation errors
    if 'ValidationError' in error_message:
        return False
    return True

if __name__ == '__main__':
    process_dlq_messages()
```

## Monitoring Your DLQ

Setting up a DLQ without monitoring it is like installing a smoke detector without batteries. You need to know when messages arrive.

The most important CloudWatch metrics for your DLQ are:
- `ApproximateNumberOfMessagesVisible` - messages waiting to be processed
- `ApproximateAgeOfOldestMessage` - how long messages have been sitting there

Set alarms on both. If messages are piling up, something is systematically wrong. If the oldest message is getting stale, your reprocessing pipeline isn't keeping up.

For a deeper look at monitoring Lambda failures, check out [debugging Lambda functions with CloudWatch Logs](https://oneuptime.com/blog/post/2026-02-12-debug-lambda-functions-cloudwatch-logs/view).

## DLQ vs. Lambda Destinations

Lambda Destinations were introduced after DLQs and offer more capabilities. Here's the quick comparison:

| Feature | DLQ | Destinations |
|---------|-----|-------------|
| Success handling | No | Yes |
| Failure handling | Yes | Yes |
| Payload richness | Original event only | Event + response + metadata |
| Target types | SQS, SNS | SQS, SNS, EventBridge, Lambda |
| Invocation scope | Async only | Async only |

For new projects, consider using Destinations instead. Read more in our guide on [Lambda Destinations for asynchronous invocation](https://oneuptime.com/blog/post/2026-02-12-lambda-destinations-asynchronous-invocation/view). That said, DLQs are still perfectly valid, widely used, and simpler to reason about.

## Common Mistakes to Avoid

**Missing IAM permissions.** The number one issue. Your Lambda execution role needs `sqs:SendMessage` (or `sns:Publish` for SNS) on the DLQ resource. Without it, Lambda silently drops the failed event.

**Not monitoring the DLQ.** If nobody's watching, failed events pile up and expire. Set up alarms and build a reprocessing pipeline.

**Setting retention too low.** The default SQS retention is 4 days. For a DLQ, you probably want 14 days (the maximum) to give yourself time to investigate and reprocess.

**Confusing DLQ sources.** If your Lambda function is triggered by an SQS queue, there are actually two DLQ configurations at play - one on the source SQS queue and one on the Lambda function. They serve different purposes. The source queue's DLQ catches messages that couldn't be delivered to Lambda, while Lambda's DLQ catches function execution failures.

## Automating Reprocessing with a DLQ Redrive

AWS added the SQS DLQ redrive feature, which lets you move messages from a DLQ back to the original source queue. But for Lambda DLQs, you'll typically want custom reprocessing logic since there's no "source queue" to redrive to.

A common pattern is to have a second Lambda function on a schedule that reads from the DLQ and re-invokes the original function. You can learn more about scheduled Lambda invocations in our post on [triggering Lambda functions on a schedule](https://oneuptime.com/blog/post/2026-02-12-trigger-lambda-schedule-cron/view).

## Final Thoughts

DLQs are non-negotiable for production Lambda functions that handle asynchronous invocations. They're your safety net against data loss when things go wrong. Set them up, monitor them, and build reprocessing pipelines. Your future self will thank you when that 2 AM incident happens and you can recover every failed event from the queue instead of losing them forever.
