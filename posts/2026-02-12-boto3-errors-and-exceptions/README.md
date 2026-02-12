# How to Handle Boto3 Errors and Exceptions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Boto3, Python, Error Handling

Description: A practical guide to handling Boto3 errors and exceptions in Python, covering client exceptions, service errors, retry strategies, and best practices.

---

Working with AWS services through Boto3 means dealing with a lot of things that can go wrong. Network timeouts, permission errors, throttling, resource conflicts - the list goes on. If you don't handle these errors properly, your scripts will crash at the worst possible time. Let's walk through every major error category in Boto3 and how to handle each one.

## The Basics of Boto3 Exceptions

Boto3 exceptions come from the `botocore.exceptions` module. The most common ones you'll encounter are `ClientError`, `NoCredentialsError`, `EndpointConnectionError`, and `ParamValidationError`.

Here's a quick overview of catching the most common exception type.

```python
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3')

try:
    s3.get_object(Bucket='my-bucket', Key='nonexistent-file.txt')
except ClientError as e:
    error_code = e.response['Error']['Code']
    error_message = e.response['Error']['Message']
    print(f"Error code: {error_code}")
    print(f"Error message: {error_message}")
```

## Understanding ClientError Structure

When a `ClientError` is raised, it carries a response dictionary with detailed information about what went wrong. Knowing this structure is critical for writing targeted error handlers.

```python
from botocore.exceptions import ClientError
import boto3

s3 = boto3.client('s3')

try:
    s3.head_bucket(Bucket='nonexistent-bucket-xyz123')
except ClientError as e:
    # The full error response structure
    error_response = e.response

    # HTTP status code (404, 403, 500, etc.)
    status_code = error_response['ResponseMetadata']['HTTPStatusCode']

    # AWS error code (NoSuchBucket, AccessDenied, etc.)
    error_code = error_response['Error']['Code']

    # Human-readable error message
    error_message = error_response['Error']['Message']

    # Request ID for AWS support tickets
    request_id = error_response['ResponseMetadata']['RequestId']

    print(f"Status: {status_code}")
    print(f"Code: {error_code}")
    print(f"Message: {error_message}")
    print(f"Request ID: {request_id}")
```

## Handling Specific Error Codes

Rather than catching all `ClientError` exceptions the same way, you should branch on the error code. Different errors need different responses.

This pattern lets you handle each failure mode appropriately.

```python
from botocore.exceptions import ClientError
import boto3

dynamodb = boto3.client('dynamodb')

try:
    dynamodb.put_item(
        TableName='users',
        Item={
            'user_id': {'S': 'user-123'},
            'email': {'S': 'user@example.com'}
        },
        ConditionExpression='attribute_not_exists(user_id)'
    )
except ClientError as e:
    code = e.response['Error']['Code']

    if code == 'ConditionalCheckFailedException':
        print("User already exists, skipping insert")
    elif code == 'ResourceNotFoundException':
        print("Table doesn't exist - check your table name")
    elif code == 'ProvisionedThroughputExceededException':
        print("Table throughput exceeded - back off and retry")
    elif code == 'ValidationException':
        print("Invalid request parameters")
    else:
        # Re-raise unexpected errors
        raise
```

## Using Service-Specific Exceptions

Boto3 also exposes service-specific exception classes on the client object. These let you catch errors in a more Pythonic way.

```python
import boto3

s3 = boto3.client('s3')

try:
    s3.get_object(Bucket='my-bucket', Key='missing-key.txt')
except s3.exceptions.NoSuchKey:
    print("The object doesn't exist")
except s3.exceptions.NoSuchBucket:
    print("The bucket doesn't exist")

# Works with resource interface too
sqs = boto3.resource('sqs')
try:
    queue = sqs.get_queue_by_name(QueueName='nonexistent-queue')
except boto3.client('sqs').exceptions.QueueDoesNotExist:
    print("Queue not found")
```

## Credential and Connection Errors

These are the errors that hit you before you even reach AWS. They're usually configuration issues.

```python
from botocore.exceptions import (
    NoCredentialsError,
    PartialCredentialsError,
    EndpointConnectionError,
    ConnectTimeoutError,
    ReadTimeoutError
)
import boto3

try:
    s3 = boto3.client('s3')
    s3.list_buckets()
except NoCredentialsError:
    print("No AWS credentials found. Check your ~/.aws/credentials file "
          "or environment variables.")
except PartialCredentialsError:
    print("Incomplete credentials - missing access key or secret key")
except EndpointConnectionError:
    print("Could not connect to the AWS endpoint. Check your network "
          "and region settings.")
except ConnectTimeoutError:
    print("Connection timed out - network issue or firewall blocking")
except ReadTimeoutError:
    print("Read timed out - the request was sent but response took too long")
```

## Implementing Retry Logic

AWS services can return transient errors, especially throttling errors (HTTP 429) and internal server errors (HTTP 500/503). While Boto3 has built-in retry logic, you'll sometimes need more control.

This example implements exponential backoff for operations that are throttled.

```python
import boto3
from botocore.exceptions import ClientError
import time
import random

def call_with_retry(func, max_retries=5, base_delay=1.0):
    """Call a Boto3 function with exponential backoff on retryable errors."""
    retryable_codes = [
        'Throttling',
        'ThrottlingException',
        'RequestLimitExceeded',
        'ProvisionedThroughputExceededException',
        'TooManyRequestsException',
        'InternalError',
        'ServiceUnavailable'
    ]

    for attempt in range(max_retries + 1):
        try:
            return func()
        except ClientError as e:
            error_code = e.response['Error']['Code']
            status_code = e.response['ResponseMetadata']['HTTPStatusCode']

            is_retryable = (
                error_code in retryable_codes or
                status_code in (429, 500, 502, 503, 504)
            )

            if not is_retryable or attempt == max_retries:
                raise

            # Exponential backoff with jitter
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            print(f"Retryable error ({error_code}). "
                  f"Retrying in {delay:.1f}s (attempt {attempt + 1})")
            time.sleep(delay)

# Usage
dynamodb = boto3.client('dynamodb')
result = call_with_retry(
    lambda: dynamodb.scan(TableName='my-table')
)
```

## Configuring Built-In Retries

Boto3 has built-in retry behavior that you can configure. The default mode retries a few times, but the "adaptive" mode is smarter about throttling.

```python
import boto3
from botocore.config import Config

# Standard mode - retries up to 3 times (default)
config_standard = Config(
    retries={
        'mode': 'standard',
        'max_attempts': 5
    }
)

# Adaptive mode - adds client-side rate limiting for throttling
config_adaptive = Config(
    retries={
        'mode': 'adaptive',
        'max_attempts': 10
    }
)

# Apply config when creating the client
dynamodb = boto3.client('dynamodb', config=config_adaptive)
```

## Building an Error Handler Decorator

For larger projects, a decorator keeps error handling consistent across your codebase.

```python
import functools
import logging
from botocore.exceptions import ClientError, BotoCoreError

logger = logging.getLogger(__name__)

def handle_aws_errors(service_name='AWS'):
    """Decorator that catches and logs Boto3 errors."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ClientError as e:
                code = e.response['Error']['Code']
                message = e.response['Error']['Message']
                request_id = e.response['ResponseMetadata']['RequestId']
                logger.error(
                    f"{service_name} ClientError in {func.__name__}: "
                    f"[{code}] {message} (RequestId: {request_id})"
                )
                raise
            except BotoCoreError as e:
                logger.error(
                    f"{service_name} BotoCoreError in {func.__name__}: {e}"
                )
                raise
        return wrapper
    return decorator

# Usage
@handle_aws_errors('S3')
def download_file(bucket, key, local_path):
    s3 = boto3.client('s3')
    s3.download_file(bucket, key, local_path)
    return local_path
```

## Common Error Codes by Service

Here's a quick reference of error codes you'll see most often, organized by service.

**S3**: `NoSuchBucket`, `NoSuchKey`, `BucketAlreadyExists`, `AccessDenied`, `SlowDown`

**DynamoDB**: `ConditionalCheckFailedException`, `ResourceNotFoundException`, `ProvisionedThroughputExceededException`, `ValidationException`, `TransactionConflictException`

**Lambda**: `ResourceNotFoundException`, `InvalidParameterValueException`, `TooManyRequestsException`, `ServiceException`

**EC2**: `InvalidInstanceID.NotFound`, `UnauthorizedOperation`, `DryRunOperation`, `InstanceLimitExceeded`

**STS**: `ExpiredTokenException`, `AccessDenied`, `RegionDisabledException`

## Validating Parameters Before Calling

You can avoid some errors entirely by validating inputs before making API calls.

```python
from botocore.exceptions import ParamValidationError
import boto3

s3 = boto3.client('s3')

try:
    # This will raise ParamValidationError before making any network call
    s3.get_object(Bucket='', Key='test.txt')
except ParamValidationError as e:
    print(f"Invalid parameters: {e}")
```

## Best Practices

A few guidelines that'll save you headaches:

- **Always catch specific errors first.** Catch `NoSuchKey` before `ClientError`, and `ClientError` before `Exception`.
- **Log the request ID.** When you contact AWS support, the request ID is the fastest way to trace what happened.
- **Don't swallow errors silently.** Even if you handle an error gracefully, log it so you know it happened.
- **Use adaptive retry mode** for services with heavy throttling (DynamoDB, API Gateway, Lambda).
- **Test error paths.** Use [moto for mocking AWS errors](https://oneuptime.com/blog/post/moto-mocking-aws-services-python-tests/view) in your unit tests so you know your error handling actually works.

Error handling isn't the fun part of AWS development, but it's what separates scripts that work in demos from code that works in production.
