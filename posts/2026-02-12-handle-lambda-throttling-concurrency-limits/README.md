# How to Handle Lambda Throttling and Concurrency Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Throttling, Concurrency, Serverless

Description: Learn how to detect, handle, and prevent Lambda throttling when functions hit concurrency limits, including retry strategies and architecture patterns.

---

Lambda throttling happens when your function can't get an execution environment - either because you've hit your account's concurrency limit or your function's reserved concurrency cap. When throttled, Lambda returns a 429 "Too Many Requests" error. If you're not prepared for this, it means dropped requests, failed jobs, and unhappy users.

Let's understand how throttling works and build systems that handle it gracefully.

## What Triggers Throttling

Throttling kicks in when concurrent executions exceed available capacity. There are several scenarios:

**Account-level limit**: Your account has a default limit of 1,000 concurrent executions per region. If all your functions collectively reach 1,000, new invocations are throttled.

**Reserved concurrency limit**: If a function has reserved concurrency of 100, the 101st concurrent invocation is throttled.

**Burst limit**: Even within your concurrency limit, Lambda can only scale up at a certain rate. In most regions, the burst limit is 3,000 instances immediately, then 500 additional instances per minute.

## Detecting Throttling

### CloudWatch Metrics

Lambda reports throttling through the `Throttles` metric:

```bash
# Check throttle count for a specific function
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time $(date -u -v-1d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --output table
```

Set up an alarm to catch throttling early:

```bash
# Alert when throttling occurs
aws cloudwatch put-metric-alarm \
  --alarm-name "LambdaThrottling-my-function" \
  --metric-name Throttles \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=my-function \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:alerts"
```

### Check Account-Level Throttling

```bash
# Account-wide throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --start-time $(date -u -v-1d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --output table
```

## How Different Invocation Types Handle Throttling

The behavior when throttled depends on how the function was invoked:

### Synchronous Invocations (API Gateway, SDK)

The caller gets a `TooManyRequestsException` (429) immediately. No automatic retry happens. The caller is responsible for retrying.

### Asynchronous Invocations (S3, SNS, EventBridge)

Lambda retries automatically. The event goes into an internal queue and Lambda retries twice with delays between attempts. If all retries fail, the event either goes to a dead-letter queue (if configured) or is discarded.

### Stream-Based Invocations (SQS, Kinesis, DynamoDB Streams)

Lambda retries until the data expires. For SQS, the message becomes visible again after the visibility timeout. For Kinesis and DynamoDB Streams, Lambda retries the entire batch until it succeeds.

## Handling Synchronous Throttling

For functions behind API Gateway, implement retry logic in your client:

```javascript
// Client-side retry with exponential backoff
async function invokeWithRetry(url, payload, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                // Throttled - wait and retry
                const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
                console.log(`Throttled. Retrying in ${delay}ms (attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            return await response.json();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            const delay = Math.pow(2, attempt) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}
```

For SDK invocations, the AWS SDK has built-in retry logic, but you should configure it:

```python
# Python SDK with retry configuration
import boto3
from botocore.config import Config

# Configure aggressive retries for Lambda invocations
config = Config(
    retries={
        'max_attempts': 5,
        'mode': 'adaptive'  # Adaptive mode backs off based on throttling
    }
)

lambda_client = boto3.client('lambda', config=config)

response = lambda_client.invoke(
    FunctionName='my-function',
    Payload=json.dumps({'data': 'test'})
)
```

The `adaptive` retry mode is specifically designed for throttling scenarios. It uses a token bucket algorithm that backs off more aggressively as throttling increases.

## Handling Asynchronous Throttling

For async invocations, configure a dead-letter queue and a destination for failed events:

```bash
# Set up an SQS dead-letter queue for failed async invocations
aws lambda update-function-configuration \
  --function-name my-async-function \
  --dead-letter-config TargetArn=arn:aws:sqs:us-east-1:123456789012:failed-events

# Or use event invoke config for more control
aws lambda put-function-event-invoke-config \
  --function-name my-async-function \
  --maximum-retry-attempts 2 \
  --maximum-event-age-in-seconds 3600 \
  --destination-config '{
    "OnSuccess": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:success-events"
    },
    "OnFailure": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:failed-events"
    }
  }'
```

Then process the dead-letter queue separately:

```python
# DLQ processor - retry failed events with backoff
import json
import boto3
import time

lambda_client = boto3.client('lambda')
sqs = boto3.client('sqs')

DLQ_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/failed-events'


def lambda_handler(event, context):
    for record in event['Records']:
        original_event = json.loads(record['body'])

        try:
            # Retry the original function
            response = lambda_client.invoke(
                FunctionName='my-async-function',
                InvocationType='RequestResponse',
                Payload=json.dumps(original_event)
            )

            if response['StatusCode'] == 200:
                print(f"Successfully reprocessed: {record['messageId']}")
            else:
                print(f"Failed to reprocess: {response}")

        except lambda_client.exceptions.TooManyRequestsException:
            # Still throttled - leave in queue for next attempt
            raise  # SQS will retry after visibility timeout
```

## Architecture Pattern: SQS Buffer

The most reliable pattern for handling throttling is to put SQS between your API and your Lambda function:

```mermaid
graph LR
    Client[Client] --> APIGW[API Gateway]
    APIGW --> SQS[SQS Queue]
    SQS --> Lambda[Lambda Function]
    Lambda --> DB[Database]
```

The API immediately acknowledges the request by putting it in SQS. Lambda processes messages from SQS at whatever rate it can handle. If Lambda is throttled, messages stay in the queue and are processed later.

```python
# API function - puts message in SQS (fast, never throttled)
import json
import boto3
import uuid

sqs = boto3.client('sqs')
QUEUE_URL = os.environ['QUEUE_URL']


def api_handler(event, context):
    body = json.loads(event['body'])

    message_id = str(uuid.uuid4())

    sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps({
            'id': message_id,
            'data': body,
            'timestamp': datetime.utcnow().isoformat()
        })
    )

    return {
        'statusCode': 202,
        'body': json.dumps({
            'message': 'Request accepted',
            'tracking_id': message_id
        })
    }
```

```python
# Processor function - processes at controlled rate
def processor_handler(event, context):
    for record in event['Records']:
        message = json.loads(record['body'])
        process_order(message['data'])
```

## Architecture Pattern: Step Functions for Complex Workflows

For multi-step workflows that might experience throttling at any step, use Step Functions with built-in retry:

```json
{
  "StartAt": "ProcessOrder",
  "States": {
    "ProcessOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-order",
      "Retry": [
        {
          "ErrorEquals": ["Lambda.TooManyRequestsException"],
          "IntervalSeconds": 1,
          "MaxAttempts": 5,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "HandleFailure"
        }
      ],
      "Next": "SendConfirmation"
    },
    "SendConfirmation": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:send-confirmation",
      "Retry": [
        {
          "ErrorEquals": ["Lambda.TooManyRequestsException"],
          "IntervalSeconds": 1,
          "MaxAttempts": 5,
          "BackoffRate": 2
        }
      ],
      "End": true
    },
    "HandleFailure": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:handle-failure",
      "End": true
    }
  }
}
```

## Preventing Throttling

Better than handling throttling is preventing it. Here are proactive measures:

### Request a Limit Increase

If 1,000 concurrent executions isn't enough:

```bash
# Request higher concurrency limit
aws service-quotas request-service-quota-increase \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 5000
```

### Use Reserved Concurrency Strategically

Reserve capacity for critical functions so they're never starved:

```bash
# Guarantee 200 slots for payment processing
aws lambda put-function-concurrency \
  --function-name payment-processor \
  --reserved-concurrent-executions 200
```

For more on this, see our guide on [configuring Lambda reserved concurrency](https://oneuptime.com/blog/post/configure-lambda-reserved-concurrency/view).

### Optimize Function Duration

Faster functions free up concurrency slots sooner. A function that takes 100ms instead of 1000ms can handle 10x the throughput with the same concurrency limit.

```bash
# Check average duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time $(date -u -v-1d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average p99 \
  --output table
```

### Rate Limit at the API Layer

Add rate limiting to your API Gateway to prevent traffic spikes from overwhelming Lambda:

```bash
# Create a usage plan with rate limiting
aws apigateway create-usage-plan \
  --name "standard" \
  --throttle burstLimit=100,rateLimit=50 \
  --api-stages apiId=abc123,stage=production
```

## Monitoring Dashboard

Create a comprehensive throttling dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "Lambda-Throttling" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/Lambda", "Throttles", "FunctionName", "my-function"],
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", "my-function"],
            ["AWS/Lambda", "Invocations", "FunctionName", "my-function"]
          ],
          "period": 60,
          "stat": "Sum",
          "title": "Lambda Throttling Overview"
        }
      }
    ]
  }'
```

## Wrapping Up

Throttling is an inevitable part of working with Lambda at scale. The key is building systems that handle it gracefully. Use SQS buffers for write operations, implement proper retry logic for synchronous calls, configure dead-letter queues for async invocations, and monitor throttle metrics proactively.

Don't treat throttling as an error to eliminate. Treat it as a signal to manage. Sometimes the right answer is a higher concurrency limit. Sometimes it's better architecture. And sometimes it's reserved concurrency to protect what matters most.
