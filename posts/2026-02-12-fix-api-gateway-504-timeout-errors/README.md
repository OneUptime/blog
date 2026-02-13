# How to Fix API Gateway 504 Gateway Timeout Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Lambda, Performance, Troubleshooting

Description: Fix API Gateway 504 timeout errors by understanding the 29-second limit, optimizing backend performance, and implementing async patterns for long-running tasks.

---

Your API Gateway endpoint returns a 504 Gateway Timeout after about 30 seconds of waiting. The response looks like:

```json
{ "message": "Endpoint request timed out" }
```

This happens when your backend (Lambda, HTTP endpoint, or other integration) takes longer than API Gateway's hard timeout limit. Let's figure out why and what you can do about it.

## The Hard Truth: API Gateway's Timeout Limit

API Gateway has a maximum integration timeout that you cannot increase:

- **REST API**: 29 seconds (configurable from 50ms to 29s)
- **HTTP API**: 30 seconds (configurable from 50ms to 30s)

That's it. There's no way to extend these limits. If your backend needs more than 29-30 seconds to respond, API Gateway will cut it off with a 504.

Check your current timeout setting:

```bash
# For REST APIs - check the integration timeout
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method POST \
  --query 'timeoutInMillis'

# For HTTP APIs
aws apigatewayv2 get-integration \
  --api-id abc123 \
  --integration-id def456 \
  --query 'TimeoutInMillis'
```

If you've set it lower than the maximum, increase it:

```bash
# Set REST API integration timeout to maximum (29 seconds)
aws apigateway update-integration \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method POST \
  --patch-operations '[{"op":"replace","path":"/timeoutInMillis","value":"29000"}]'
```

## Why Is Your Backend Slow?

Before implementing workarounds, figure out why the request takes so long.

### Check Lambda Duration

```bash
# Look at recent Lambda invocation durations
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern "REPORT" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --query 'events[*].message' \
  --output text | head -10
```

Look at the `Duration` field. If it's consistently near 29 seconds, your function is the bottleneck.

### Common Backend Bottlenecks

1. **Cold starts** - Lambda cold starts can eat several seconds (see our [cold start guide](https://oneuptime.com/blog/post/2026-02-12-fix-lambda-cold-start-performance-issues/view))
2. **Slow database queries** - Unoptimized queries or missing indexes
3. **External API calls** - Waiting on third-party services
4. **Large data processing** - Trying to process too much data synchronously
5. **Connection setup** - Creating new database connections on every request

## Fix 1: Optimize Your Backend

Start by making your backend faster so it responds within the timeout:

```python
import boto3
import time

# Initialize outside the handler (reused across invocations)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('my-table')

def lambda_handler(event, context):
    start = time.time()

    # Add timeouts to external calls
    import requests
    response = requests.get('https://api.example.com/data', timeout=10)

    # Check remaining time
    remaining = context.get_remaining_time_in_millis()
    if remaining < 5000:
        # Less than 5 seconds left, return what we have
        return {
            'statusCode': 200,
            'body': json.dumps({'partial': True, 'data': partial_result})
        }

    # Continue processing...
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

## Fix 2: Async Pattern - Return Immediately, Process Later

For operations that genuinely take more than 29 seconds, switch to an asynchronous pattern. The API returns immediately with a job ID, and the client polls for the result.

```python
import json
import boto3
import uuid

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('async-jobs')
lambda_client = boto3.client('lambda')

def submit_handler(event, context):
    """API endpoint: Submit a job and return immediately."""
    job_id = str(uuid.uuid4())

    # Store job status
    jobs_table.put_item(Item={
        'job_id': job_id,
        'status': 'PENDING',
        'created_at': int(time.time())
    })

    # Invoke the worker asynchronously
    lambda_client.invoke(
        FunctionName='my-worker-function',
        InvocationType='Event',  # Async invocation
        Payload=json.dumps({
            'job_id': job_id,
            'request': json.loads(event.get('body', '{}'))
        })
    )

    return {
        'statusCode': 202,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'job_id': job_id,
            'status': 'PENDING',
            'poll_url': f'/jobs/{job_id}'
        })
    }

def status_handler(event, context):
    """API endpoint: Check job status."""
    job_id = event['pathParameters']['job_id']

    response = jobs_table.get_item(Key={'job_id': job_id})
    item = response.get('Item')

    if not item:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Job not found'})
        }

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'job_id': item['job_id'],
            'status': item['status'],
            'result': item.get('result')
        })
    }
```

The worker function can run for up to 15 minutes (Lambda's max timeout):

```python
def worker_handler(event, context):
    """Worker: Processes the job (can take up to 15 minutes)."""
    job_id = event['job_id']

    try:
        # Do the long-running work
        result = process_data(event['request'])

        # Update job status
        jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET #s = :status, #r = :result',
            ExpressionAttributeNames={'#s': 'status', '#r': 'result'},
            ExpressionAttributeValues={':status': 'COMPLETED', ':result': result}
        )
    except Exception as e:
        jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET #s = :status, #e = :error',
            ExpressionAttributeNames={'#s': 'status', '#e': 'error'},
            ExpressionAttributeValues={':status': 'FAILED', ':error': str(e)}
        )
```

## Fix 3: Use Step Functions for Complex Workflows

If your async job has multiple steps, AWS Step Functions is a better fit:

```bash
# Create a state machine for multi-step processing
aws stepfunctions create-state-machine \
  --name my-workflow \
  --definition '{
    "Comment": "Long-running job workflow",
    "StartAt": "ProcessData",
    "States": {
      "ProcessData": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-data",
        "TimeoutSeconds": 300,
        "Next": "NotifyCompletion"
      },
      "NotifyCompletion": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123456789012:function:send-notification",
        "End": true
      }
    }
  }' \
  --role-arn arn:aws:iam::123456789012:role/step-functions-role
```

## Fix 4: Use WebSocket API for Real-Time Updates

Instead of polling, use API Gateway WebSocket APIs to push updates to the client:

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('wss://abc123.execute-api.us-east-1.amazonaws.com/prod');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.status === 'COMPLETED') {
    console.log('Job completed:', data.result);
    ws.close();
  } else {
    console.log('Job status:', data.status);
  }
};

// Submit the job
ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'submitJob',
    data: { /* your request data */ }
  }));
};
```

## Fix 5: Use SQS for Decoupling

Put requests into an SQS queue and process them asynchronously:

```python
import json
import boto3

sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'

def api_handler(event, context):
    """API endpoint: Queue the request."""
    message_body = event.get('body', '{}')

    sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=message_body
    )

    return {
        'statusCode': 202,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'message': 'Request queued for processing'})
    }
```

## Monitoring Timeouts

Set up alarms to know when timeouts are happening:

```bash
# CloudWatch alarm for API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name "api-gateway-5xx-errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ApiName,Value=my-api \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

Use [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) for comprehensive API monitoring that tracks response times, error rates, and timeout patterns across all your endpoints.

## Summary

The 504 timeout from API Gateway is a hard limit you can't override. Your options are:

1. **Make it faster** - Optimize your backend to respond within 29 seconds
2. **Go async** - Accept the request immediately, process in the background
3. **Use Step Functions** - For multi-step long-running workflows
4. **Use WebSockets** - For real-time progress updates
5. **Use SQS** - For fire-and-forget processing

The async pattern is the most common solution and works well for most use cases.
