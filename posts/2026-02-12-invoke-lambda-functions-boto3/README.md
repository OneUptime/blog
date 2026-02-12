# How to Invoke Lambda Functions with Boto3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Boto3, Python, Serverless

Description: Learn how to invoke AWS Lambda functions using Boto3, including synchronous and asynchronous invocations, passing payloads, handling responses, and error management.

---

Invoking Lambda functions from Python code is something you'll do a lot when building serverless architectures on AWS. Maybe you need one Lambda to call another, or a management script needs to trigger a function, or your application uses Lambda as a compute backend. Boto3 makes all of this straightforward. Let's walk through the different invocation patterns and how to handle the responses.

## Synchronous Invocation

The default invocation type is synchronous (RequestResponse). Your code blocks until the Lambda function finishes, and you get the result back.

```python
import boto3
import json

lambda_client = boto3.client('lambda')

# Invoke a Lambda function synchronously
response = lambda_client.invoke(
    FunctionName='my-data-processor',
    InvocationType='RequestResponse',
    Payload=json.dumps({
        'user_id': 'user-123',
        'action': 'generate_report'
    })
)

# Read the response payload
response_payload = json.loads(response['Payload'].read())
status_code = response['StatusCode']

print(f"Status: {status_code}")
print(f"Response: {response_payload}")
```

The `StatusCode` of 200 means the invocation itself succeeded. But the function could still return an error in its payload - always check both.

## Asynchronous Invocation

When you don't need to wait for the result, use the `Event` invocation type. Lambda queues the request and returns immediately.

```python
import boto3
import json

lambda_client = boto3.client('lambda')

# Fire and forget
response = lambda_client.invoke(
    FunctionName='my-email-sender',
    InvocationType='Event',
    Payload=json.dumps({
        'to': 'user@example.com',
        'subject': 'Your report is ready',
        'template': 'report-notification'
    })
)

# StatusCode 202 means the event was accepted for processing
print(f"Status: {response['StatusCode']}")  # 202
```

With async invocation, Lambda handles retries automatically. If the function fails, Lambda retries it twice by default. You can also configure a dead-letter queue for events that fail all retries.

## Dry Run Invocation

The `DryRun` invocation type validates that you have permission to invoke the function and that the payload is valid, without actually running it.

```python
import boto3
import json

lambda_client = boto3.client('lambda')

# Test that you can invoke the function
response = lambda_client.invoke(
    FunctionName='my-data-processor',
    InvocationType='DryRun',
    Payload=json.dumps({'test': True})
)

# StatusCode 204 means the dry run succeeded
print(f"Dry run status: {response['StatusCode']}")  # 204
```

## Invoking Specific Versions and Aliases

Lambda supports function versions and aliases. You can target a specific one in your invocation.

```python
import boto3
import json

lambda_client = boto3.client('lambda')

# Invoke a specific version
response = lambda_client.invoke(
    FunctionName='my-processor',
    Qualifier='42',  # version number
    Payload=json.dumps({'data': 'test'})
)

# Invoke an alias
response = lambda_client.invoke(
    FunctionName='my-processor',
    Qualifier='production',  # alias name
    Payload=json.dumps({'data': 'test'})
)

# Invoke using a full ARN with alias
response = lambda_client.invoke(
    FunctionName='arn:aws:lambda:us-east-1:123456789012:function:my-processor:staging',
    Payload=json.dumps({'data': 'test'})
)
```

## Handling Function Errors

When a Lambda function raises an exception, the invocation still returns a 200 status code. The error shows up in the `FunctionError` field of the response.

```python
import boto3
import json

lambda_client = boto3.client('lambda')

response = lambda_client.invoke(
    FunctionName='my-processor',
    Payload=json.dumps({'trigger_error': True})
)

# Check for function-level errors
if 'FunctionError' in response:
    error_type = response['FunctionError']  # 'Handled' or 'Unhandled'
    error_payload = json.loads(response['Payload'].read())

    print(f"Function error type: {error_type}")
    print(f"Error message: {error_payload.get('errorMessage')}")
    print(f"Error type: {error_payload.get('errorType')}")
    print(f"Stack trace: {error_payload.get('stackTrace')}")
else:
    result = json.loads(response['Payload'].read())
    print(f"Success: {result}")
```

## Robust Invocation Wrapper

For production use, wrap the invocation logic in a function that handles all the edge cases.

```python
import boto3
import json
import time
from botocore.exceptions import ClientError

lambda_client = boto3.client('lambda')

def invoke_lambda(function_name, payload, qualifier=None,
                  async_invoke=False, max_retries=3):
    """Invoke a Lambda function with error handling and retries."""

    invoke_args = {
        'FunctionName': function_name,
        'InvocationType': 'Event' if async_invoke else 'RequestResponse',
        'Payload': json.dumps(payload)
    }

    if qualifier:
        invoke_args['Qualifier'] = qualifier

    for attempt in range(1, max_retries + 1):
        try:
            response = lambda_client.invoke(**invoke_args)

            # For async invocations, just check the status code
            if async_invoke:
                if response['StatusCode'] == 202:
                    return {'success': True, 'async': True}
                raise Exception(f"Unexpected status: {response['StatusCode']}")

            # For sync invocations, check for function errors
            if 'FunctionError' in response:
                error_payload = json.loads(response['Payload'].read())
                raise Exception(
                    f"Lambda error ({response['FunctionError']}): "
                    f"{error_payload.get('errorMessage', 'Unknown error')}"
                )

            result = json.loads(response['Payload'].read())
            return {'success': True, 'data': result}

        except ClientError as e:
            code = e.response['Error']['Code']
            if code == 'TooManyRequestsException' and attempt < max_retries:
                wait_time = 2 ** attempt
                print(f"Throttled, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            raise
        except Exception as e:
            if attempt < max_retries:
                print(f"Attempt {attempt} failed: {e}")
                time.sleep(1)
                continue
            raise

# Usage
result = invoke_lambda('my-processor', {'user_id': '123'})
print(result)
```

## Invoking Lambda from Another Lambda

A common pattern is having one Lambda function call another. The code is the same, but keep a few things in mind.

```python
import boto3
import json
import os

lambda_client = boto3.client('lambda')

def handler(event, context):
    """Lambda that orchestrates other Lambda functions."""

    # Get the target function name from environment variable
    processor_fn = os.environ.get('PROCESSOR_FUNCTION_NAME', 'data-processor')

    # Process each record by invoking another Lambda
    results = []
    for record in event.get('records', []):
        response = lambda_client.invoke(
            FunctionName=processor_fn,
            InvocationType='RequestResponse',
            Payload=json.dumps(record)
        )

        if 'FunctionError' in response:
            results.append({
                'record_id': record['id'],
                'status': 'error',
                'error': json.loads(response['Payload'].read())
            })
        else:
            results.append({
                'record_id': record['id'],
                'status': 'success',
                'result': json.loads(response['Payload'].read())
            })

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'results': results
        })
    }
```

## Getting the Invocation Log

You can request the last 4 KB of the function's execution log to be included in the response. This is useful for debugging.

```python
import boto3
import json
import base64

lambda_client = boto3.client('lambda')

response = lambda_client.invoke(
    FunctionName='my-processor',
    Payload=json.dumps({'debug': True}),
    LogType='Tail'  # include execution log
)

# Decode the log (it's base64 encoded)
log_output = base64.b64decode(response['LogResult']).decode('utf-8')
print("Function log:")
print(log_output)
```

## Listing Available Functions

Before invoking, you might want to discover what functions are available.

```python
import boto3

lambda_client = boto3.client('lambda')

# List all functions
paginator = lambda_client.get_paginator('list_functions')
for page in paginator.paginate():
    for func in page['Functions']:
        print(f"{func['FunctionName']} - Runtime: {func['Runtime']} "
              f"- Memory: {func['MemorySize']}MB")
```

## Best Practices

- **Prefer async invocations** when you don't need the result immediately. They reduce latency for the caller and let Lambda handle retries.
- **Set up dead-letter queues** for async invocations so failed events don't disappear silently.
- **Watch for circular invocations.** If Function A calls Function B which calls Function A, you'll create an infinite loop that racks up charges fast.
- **Don't hardcode function names.** Use environment variables or parameter store, especially when the same code runs in multiple environments.
- **Monitor invocation metrics.** Keep an eye on error rates, duration, and throttling in CloudWatch.

For handling the various errors that can occur during invocation, check out the detailed guide on [Boto3 error handling](https://oneuptime.com/blog/post/boto3-errors-and-exceptions/view). And if you're managing the Lambda functions themselves through Boto3, see the guide on [managing EC2 instances](https://oneuptime.com/blog/post/manage-ec2-instances-boto3/view) for similar patterns of managing AWS resources programmatically.
