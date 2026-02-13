# How to Use Lambda Recursive Invocation Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Security

Description: Learn how AWS Lambda recursive invocation detection works to prevent runaway loops that can spike your bill and how to configure it properly.

---

A Lambda function that accidentally triggers itself can burn through your AWS budget in minutes. It's one of the most common serverless anti-patterns, and it's surprisingly easy to create. AWS added recursive invocation detection to catch these loops automatically, but you need to understand how it works and where it has blind spots.

## How Recursive Loops Happen

The classic scenario goes like this: a Lambda function reads from an S3 bucket, processes the file, and writes the result back to the same bucket. That write triggers the function again, which reads the new file, processes it, writes it back, and the cycle repeats forever.

Here are the most common recursive patterns:

```
S3 bucket -> Lambda -> writes to same S3 bucket -> triggers Lambda again
SQS queue -> Lambda -> sends message to same SQS queue -> triggers Lambda again
SNS topic -> Lambda -> publishes to same SNS topic -> triggers Lambda again
DynamoDB stream -> Lambda -> writes to same DynamoDB table -> triggers Lambda again
```

These loops don't just waste compute. They can generate thousands of invocations per second, and your bill grows exponentially. Some teams have reported $10,000+ charges from a single recursive bug that ran for an hour.

## What Lambda's Detection Does

AWS Lambda automatically detects recursive loops involving SQS, SNS, and Lambda itself. When it detects that a function has been invoked recursively 16 times in a chain, it stops the loop by dropping the event.

The detection works by tracking a special header that gets passed through the chain. Each invocation increments a counter, and when it hits the threshold, Lambda breaks the cycle.

Here's what it covers:

- Lambda -> SQS -> Lambda (same or different function)
- Lambda -> SNS -> Lambda (same or different function)
- Lambda -> Lambda (direct invocation chains)

## Checking Your Detection Settings

You can check and modify recursive loop detection using the AWS CLI.

View the current setting for your function:

```bash
# Check if recursive loop detection is enabled
aws lambda get-function-recursive-config \
  --function-name my-function

# The response shows the detection status
# {
#     "Arn": "arn:aws:lambda:us-east-1:123456789012:function:my-function",
#     "RecursiveLoop": "Terminate"
# }
```

The `RecursiveLoop` setting has two values:
- `Terminate` - Lambda stops the recursive loop (default for new functions)
- `Allow` - Lambda lets the recursion continue (you take the risk)

## Configuring Detection

For most functions, the default `Terminate` setting is what you want. But if your architecture intentionally uses recursive patterns, you can change it.

Update the recursive loop handling for a function:

```bash
# Set to Terminate (recommended - stops recursive loops)
aws lambda put-function-recursive-config \
  --function-name my-function \
  --recursive-loop Terminate

# Set to Allow (only if you intentionally use recursion)
aws lambda put-function-recursive-config \
  --function-name my-function \
  --recursive-loop Allow
```

In CloudFormation:

```yaml
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-safe-function
      Runtime: python3.12
      Handler: index.handler
      Code:
        S3Bucket: my-bucket
        S3Key: function.zip
      RecursiveLoop: Terminate  # Explicitly set the safety
```

## What Detection Doesn't Cover

Here's the important part: Lambda's built-in detection only covers SQS, SNS, and Lambda-to-Lambda invocation chains. It does NOT detect recursion through:

- S3 event notifications
- DynamoDB Streams
- EventBridge
- Kinesis
- Step Functions
- API Gateway
- Any other event source

For these services, you need to build your own protection.

## Protecting Against S3 Recursive Loops

S3-triggered recursion is the most common case that detection doesn't cover. Here are several strategies.

The simplest fix is to use separate buckets for input and output:

```python
import boto3

s3 = boto3.client("s3")

INPUT_BUCKET = "my-app-input"
OUTPUT_BUCKET = "my-app-output"  # Different bucket!


def lambda_handler(event, context):
    for record in event["Records"]:
        source_bucket = record["s3"]["bucket"]["name"]
        source_key = record["s3"]["object"]["key"]

        # Read from input bucket
        response = s3.get_object(Bucket=source_bucket, Key=source_key)
        data = response["Body"].read()

        # Process the data
        result = process_data(data)

        # Write to a DIFFERENT bucket
        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=f"processed/{source_key}",
            Body=result,
        )
```

If you must use the same bucket, use prefix-based filtering:

```python
import boto3

s3 = boto3.client("s3")


def lambda_handler(event, context):
    for record in event["Records"]:
        source_key = record["s3"]["object"]["key"]

        # Only process files in the "uploads/" prefix
        if not source_key.startswith("uploads/"):
            print(f"Skipping non-upload file: {source_key}")
            return

        response = s3.get_object(
            Bucket=record["s3"]["bucket"]["name"],
            Key=source_key,
        )
        data = response["Body"].read()
        result = process_data(data)

        # Write to a different prefix that won't trigger this function
        s3.put_object(
            Bucket=record["s3"]["bucket"]["name"],
            Key=f"processed/{source_key.replace('uploads/', '')}",
            Body=result,
        )
```

## Building a Custom Recursion Guard

For event sources that Lambda's detection doesn't cover, build your own guard using a marker in the event payload or DynamoDB.

This helper tracks invocation chains and stops them if they get too deep:

```python
import boto3
import os
import json
from datetime import datetime, timedelta

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["RECURSION_TABLE"])

MAX_DEPTH = 5


def check_recursion(event_id: str) -> bool:
    """
    Returns True if it's safe to proceed, False if we're in a loop.
    """
    try:
        response = table.get_item(Key={"event_id": event_id})

        if "Item" in response:
            depth = response["Item"]["depth"]
            if depth >= MAX_DEPTH:
                print(f"Recursion detected! Depth: {depth}, Event: {event_id}")
                return False

            # Increment depth
            table.update_item(
                Key={"event_id": event_id},
                UpdateExpression="SET depth = depth + :inc",
                ExpressionAttributeValues={":inc": 1},
            )
        else:
            # First time seeing this event
            table.put_item(
                Item={
                    "event_id": event_id,
                    "depth": 1,
                    "ttl": int((datetime.now() + timedelta(hours=1)).timestamp()),
                }
            )

        return True

    except Exception as e:
        print(f"Recursion check failed: {e}")
        # Fail open or closed depending on your risk tolerance
        return True


def lambda_handler(event, context):
    event_id = event.get("id") or context.aws_request_id

    if not check_recursion(event_id):
        print("Stopping recursive invocation")
        return {"status": "recursion_detected"}

    # Safe to proceed with business logic
    process_event(event)
```

## Setting Up CloudWatch Alarms

Even with detection enabled, you should monitor for unusual invocation patterns. A spike in concurrent executions is the telltale sign of a recursive loop.

Create a CloudWatch alarm that fires when invocations spike abnormally:

```bash
# Create an alarm for unusually high invocations
aws cloudwatch put-metric-alarm \
  --alarm-name "lambda-recursion-alarm" \
  --alarm-description "Possible recursive Lambda invocation" \
  --namespace "AWS/Lambda" \
  --metric-name "Invocations" \
  --dimensions Name=FunctionName,Value=my-function \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:alerts"
```

Also set a concurrency limit on functions that could potentially recurse:

```bash
# Limit concurrent executions to contain the blast radius
aws lambda put-function-concurrency \
  --function-name my-risky-function \
  --reserved-concurrent-executions 10
```

This acts as a circuit breaker. Even if a loop starts, it can't scale beyond 10 concurrent executions. Your bill stays manageable while you investigate.

## EventBridge Dead Letter Queues

For event-driven architectures using EventBridge, set up dead letter queues to catch events that are dropped by recursion detection:

```yaml
Resources:
  RecursionDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: recursion-dlq
      MessageRetentionPeriod: 1209600  # 14 days

  MyEventRule:
    Type: AWS::Events::Rule
    Properties:
      EventPattern:
        source: ["my-app"]
      Targets:
        - Arn: !GetAtt MyFunction.Arn
          Id: MyTarget
          DeadLetterConfig:
            Arn: !GetAtt RecursionDLQ.Arn
```

## Testing for Recursive Patterns

Before deploying, audit your architecture for potential recursive paths. Here's a checklist:

1. Does your function write to the same service that triggers it?
2. Could a downstream service route events back to your function?
3. Are there circular dependencies in your event-driven workflows?
4. Did you configure S3 event filters to exclude your output prefix?

You can also write integration tests that deliberately create recursive conditions in a staging environment with tight concurrency limits.

For monitoring recursive invocation patterns and setting up proper alerting, check out our guide on [Lambda monitoring best practices](https://oneuptime.com/blog/post/2026-02-12-logging-monitoring-best-practices-aws/view).

## Wrapping Up

Lambda's recursive invocation detection is a solid safety net, but it's not comprehensive. It catches loops through SQS, SNS, and direct Lambda invocations, which covers many common patterns. For S3, DynamoDB Streams, EventBridge, and other triggers, you need your own protections. Use separate buckets or prefixes, set concurrency limits, add CloudWatch alarms, and audit your event flows for circular paths. A few minutes of prevention is worth hours of debugging - and thousands of dollars in unexpected charges.
