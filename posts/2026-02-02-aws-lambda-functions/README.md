# How to Create AWS Lambda Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Cloud, Python

Description: Learn how to create, configure, and deploy AWS Lambda functions with practical examples covering triggers, environment variables, and production best practices.

---

> AWS Lambda lets you run code without provisioning servers. You upload your code, and Lambda handles everything else, scaling, patching, and high availability. It's the backbone of modern serverless architectures.

Lambda works on a simple model: your code runs in response to events. Those events can be HTTP requests via API Gateway, file uploads to S3, messages from SQS, or scheduled cron jobs. You pay only for the compute time you actually use.

---

## Understanding Lambda Basics

Before writing your first function, let's understand the core concepts:

```mermaid
flowchart LR
    subgraph Triggers
        A[API Gateway]
        B[S3 Events]
        C[SQS Messages]
        D[CloudWatch Events]
    end

    subgraph Lambda
        E[Handler Function]
        F[Runtime Environment]
    end

    subgraph Destinations
        G[DynamoDB]
        H[SNS/SQS]
        I[S3]
        J[Other Services]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> G
    E --> H
    E --> I
    E --> J
```

Lambda functions have three main components:
- **Handler**: The entry point that Lambda calls when your function runs
- **Event**: The data passed to your function (varies by trigger type)
- **Context**: Runtime information about the invocation

---

## Your First Lambda Function

Let's start with a basic Python function. Every Lambda function needs a handler that accepts an event and context parameter.

This function simply echoes back the event data it receives, which is useful for understanding what data different triggers send:

```python
# lambda_function.py
import json

def handler(event, context):
    """
    Basic Lambda handler that returns the incoming event.

    Args:
        event: dict containing the trigger data (structure varies by source)
        context: LambdaContext object with runtime info like request_id, memory_limit

    Returns:
        API Gateway compatible response with statusCode and body
    """
    # Log the incoming event for debugging
    print(f"Received event: {json.dumps(event)}")

    # Return a properly formatted API Gateway response
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'message': 'Hello from Lambda!',
            'event': event
        })
    }
```

---

## Creating Lambda via AWS Console

The quickest way to get started is through the AWS Console:

1. Navigate to Lambda in the AWS Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Enter a function name
5. Select your runtime (Python 3.12, Node.js 20.x, etc.)
6. Click "Create function"

The console gives you an inline code editor for quick testing, but real applications should use infrastructure as code.

---

## Creating Lambda with AWS CLI

For repeatable deployments, use the AWS CLI. First, create your deployment package.

Zip your function code. Lambda expects a zip file containing your handler and any dependencies:

```bash
# Create a zip file containing your Lambda code
zip function.zip lambda_function.py
```

Create the Lambda function using the AWS CLI. The role ARN must reference an IAM role with Lambda execution permissions:

```bash
# Create the Lambda function
aws lambda create-function \
    --function-name my-first-lambda \
    --runtime python3.12 \
    --role arn:aws:iam::123456789012:role/lambda-execution-role \
    --handler lambda_function.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256
```

Test your function by invoking it with a sample event:

```bash
# Invoke the function with a test payload
aws lambda invoke \
    --function-name my-first-lambda \
    --payload '{"name": "Lambda"}' \
    response.json

# View the response
cat response.json
```

---

## Handler Patterns for Different Triggers

Different event sources send different event structures. Here are common patterns:

### API Gateway Handler

API Gateway events include HTTP method, path, headers, and body. This handler parses JSON bodies and routes based on HTTP method:

```python
# api_handler.py
import json

def handler(event, context):
    """
    Handle API Gateway requests with proper error handling.

    The event structure from API Gateway includes:
    - httpMethod: GET, POST, PUT, DELETE, etc.
    - path: The URL path
    - headers: HTTP headers as a dict
    - body: Request body as a string (needs JSON parsing)
    - queryStringParameters: URL query params
    - pathParameters: URL path parameters
    """
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # Parse body if present (API Gateway sends body as string)
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }

    # Route based on method
    if http_method == 'GET':
        return handle_get(event)
    elif http_method == 'POST':
        return handle_post(body)
    else:
        return {
            'statusCode': 405,
            'body': json.dumps({'error': f'Method {http_method} not allowed'})
        }

def handle_get(event):
    """Handle GET requests, typically for fetching data."""
    query_params = event.get('queryStringParameters') or {}

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'GET request received',
            'params': query_params
        })
    }

def handle_post(body):
    """Handle POST requests, typically for creating resources."""
    # Validate required fields
    if 'name' not in body:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: name'})
        }

    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'Resource created',
            'data': body
        })
    }
```

### S3 Event Handler

S3 triggers Lambda when objects are created, modified, or deleted. The event contains bucket and object details:

```python
# s3_handler.py
import json
import boto3
import urllib.parse

# Initialize S3 client outside handler for connection reuse
s3_client = boto3.client('s3')

def handler(event, context):
    """
    Process S3 events when files are uploaded.

    S3 event structure includes:
    - Records: Array of S3 event records
    - Each record has s3.bucket.name and s3.object.key
    - Object key is URL-encoded (spaces become +, etc.)
    """
    # S3 events can contain multiple records (batch processing)
    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        # URL decode the key (S3 encodes special characters)
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        event_name = record['eventName']

        print(f"Processing {event_name} for s3://{bucket}/{key}")

        # Only process new uploads, not deletions
        if event_name.startswith('ObjectCreated'):
            process_upload(bucket, key)

    return {'statusCode': 200, 'body': 'Processed'}

def process_upload(bucket, key):
    """
    Process a newly uploaded file.

    Common use cases:
    - Image resizing/thumbnail generation
    - CSV/data file parsing
    - Video transcoding triggers
    - Log file processing
    """
    # Get object metadata without downloading full content
    response = s3_client.head_object(Bucket=bucket, Key=key)
    size = response['ContentLength']
    content_type = response.get('ContentType', 'unknown')

    print(f"File size: {size} bytes, type: {content_type}")

    # Example: Only process images
    if content_type.startswith('image/'):
        # Download and process image
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = obj['Body'].read()
        # ... process image
        print(f"Processed image: {key}")
```

### SQS Event Handler

SQS triggers are great for decoupling services and handling background work. Lambda automatically deletes successfully processed messages:

```python
# sqs_handler.py
import json

def handler(event, context):
    """
    Process SQS messages in batch.

    SQS event structure:
    - Records: Array of SQS messages
    - Each record has body (your message), messageId, receiptHandle

    Important: Lambda auto-deletes successfully processed messages.
    For partial batch failures, use ReportBatchItemFailures.
    """
    failed_message_ids = []

    for record in event.get('Records', []):
        message_id = record['messageId']

        try:
            # Parse the message body (typically JSON)
            body = json.loads(record['body'])

            # Process the message
            process_message(body, message_id)
            print(f"Successfully processed message: {message_id}")

        except Exception as e:
            # Log failure but continue processing other messages
            print(f"Failed to process message {message_id}: {str(e)}")
            failed_message_ids.append(message_id)

    # Return partial batch failure response
    # Lambda will retry only the failed messages
    if failed_message_ids:
        return {
            'batchItemFailures': [
                {'itemIdentifier': msg_id} for msg_id in failed_message_ids
            ]
        }

    return {'statusCode': 200}

def process_message(body, message_id):
    """
    Process a single SQS message.

    This is where your business logic goes:
    - Send emails
    - Update databases
    - Call external APIs
    - Trigger other workflows
    """
    action = body.get('action')
    data = body.get('data', {})

    print(f"Processing action '{action}' from message {message_id}")

    # Route to appropriate handler based on action type
    if action == 'send_email':
        send_email(data)
    elif action == 'process_order':
        process_order(data)
    else:
        raise ValueError(f"Unknown action: {action}")
```

---

## Environment Variables

Lambda functions should read configuration from environment variables, not hardcoded values. This keeps sensitive data out of your code and allows different configs per environment.

Configure environment variables when creating or updating your function:

```bash
# Set environment variables via CLI
aws lambda update-function-configuration \
    --function-name my-lambda \
    --environment "Variables={
        DATABASE_URL=postgres://user:pass@host/db,
        API_KEY=your-api-key,
        LOG_LEVEL=INFO,
        ENVIRONMENT=production
    }"
```

Access environment variables in your code using os.environ. Always provide sensible defaults for non-critical settings:

```python
# config.py
import os

def handler(event, context):
    """
    Lambda handler that reads configuration from environment variables.

    Benefits of env vars:
    - Keep secrets out of code
    - Different values per stage (dev/staging/prod)
    - Easy to update without redeploying code
    """
    # Required settings (will raise KeyError if missing)
    database_url = os.environ['DATABASE_URL']
    api_key = os.environ['API_KEY']

    # Optional settings with defaults
    log_level = os.environ.get('LOG_LEVEL', 'INFO')
    environment = os.environ.get('ENVIRONMENT', 'development')

    # Numeric settings need type conversion
    timeout = int(os.environ.get('TIMEOUT_SECONDS', '30'))

    print(f"Running in {environment} environment with log level {log_level}")

    # Your business logic here
    return {'statusCode': 200, 'body': 'OK'}
```

For sensitive values like API keys and database credentials, use AWS Secrets Manager instead of plain environment variables:

```python
# secrets.py
import boto3
import json
from functools import lru_cache

# Initialize Secrets Manager client
secrets_client = boto3.client('secretsmanager')

@lru_cache(maxsize=1)
def get_secret(secret_name):
    """
    Fetch a secret from AWS Secrets Manager.

    Uses lru_cache to avoid repeated API calls during the same
    Lambda execution. Cache is cleared between invocations.
    """
    response = secrets_client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

def handler(event, context):
    """Handler that uses secrets from Secrets Manager."""
    # Fetch database credentials securely
    db_secret = get_secret('prod/database/credentials')

    db_host = db_secret['host']
    db_user = db_secret['username']
    db_pass = db_secret['password']

    # Connect to database with retrieved credentials
    # ...

    return {'statusCode': 200}
```

---

## Lambda Layers

Layers let you package libraries and dependencies separately from your function code. This reduces deployment package size and enables code reuse across functions.

Create a layer with shared dependencies. Layers must follow a specific directory structure for Python:

```bash
# Create layer directory structure (Python requires python/ prefix)
mkdir -p python/lib/python3.12/site-packages

# Install dependencies into the layer
pip install requests boto3 -t python/lib/python3.12/site-packages/

# Create the layer zip
zip -r layer.zip python/
```

Publish the layer to AWS. You can share layers across functions and even across accounts:

```bash
# Publish the layer
aws lambda publish-layer-version \
    --layer-name common-dependencies \
    --description "Common Python libraries for our Lambda functions" \
    --zip-file fileb://layer.zip \
    --compatible-runtimes python3.12 python3.11
```

Attach the layer to your function. A function can use up to 5 layers:

```bash
# Add layer to your function
aws lambda update-function-configuration \
    --function-name my-lambda \
    --layers arn:aws:lambda:us-east-1:123456789012:layer:common-dependencies:1
```

---

## Error Handling and Retries

Robust error handling is essential for production Lambda functions. Different patterns work for synchronous vs asynchronous invocations.

Implement structured error handling with custom exception classes for different failure types:

```python
# error_handling.py
import json
import traceback

class ValidationError(Exception):
    """Raised when input validation fails."""
    pass

class ExternalServiceError(Exception):
    """Raised when an external service call fails."""
    pass

def handler(event, context):
    """
    Lambda handler with comprehensive error handling.

    Error handling strategy:
    - ValidationError: Return 400, don't retry
    - ExternalServiceError: Return 503, retry is appropriate
    - Unexpected errors: Return 500, log full traceback
    """
    try:
        # Validate input
        validated_data = validate_input(event)

        # Process the request
        result = process_request(validated_data)

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

    except ValidationError as e:
        # Client error, no retry needed
        print(f"Validation error: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': 'Validation failed',
                'message': str(e)
            })
        }

    except ExternalServiceError as e:
        # External service issue, retry may help
        print(f"External service error: {str(e)}")
        return {
            'statusCode': 503,
            'body': json.dumps({
                'error': 'Service temporarily unavailable',
                'message': str(e)
            })
        }

    except Exception as e:
        # Unexpected error, log full traceback for debugging
        print(f"Unexpected error: {str(e)}")
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'request_id': context.aws_request_id
            })
        }

def validate_input(event):
    """Validate incoming event data."""
    body = event.get('body')
    if not body:
        raise ValidationError("Request body is required")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise ValidationError("Invalid JSON in request body")

    if 'email' not in data:
        raise ValidationError("Email field is required")

    return data

def process_request(data):
    """Process the validated request."""
    # Your business logic here
    return {'processed': True, 'email': data['email']}
```

---

## Cold Starts and Performance

Cold starts occur when Lambda creates a new execution environment. Understanding and optimizing for cold starts improves user experience.

```mermaid
sequenceDiagram
    participant Client
    participant Lambda
    participant Container

    Note over Lambda: Cold Start Path
    Client->>Lambda: First Request
    Lambda->>Container: Create new container
    Container->>Container: Download code
    Container->>Container: Initialize runtime
    Container->>Container: Run init code
    Container->>Client: Response (slow)

    Note over Lambda: Warm Path
    Client->>Lambda: Subsequent Request
    Lambda->>Container: Reuse existing container
    Container->>Client: Response (fast)
```

Optimize cold starts by initializing connections and heavy objects outside the handler. Code outside the handler runs once per container:

```python
# optimized_handler.py
import boto3
import os

# OPTIMIZATION: Initialize clients outside the handler
# This code runs ONCE when the container starts, not on every invocation
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

# OPTIMIZATION: Pre-load configuration
CONFIG = {
    'max_items': int(os.environ.get('MAX_ITEMS', '100')),
    'timeout': int(os.environ.get('TIMEOUT', '30'))
}

def handler(event, context):
    """
    Optimized handler that reuses initialized resources.

    Performance tips:
    1. Initialize AWS clients outside handler (reused across invocations)
    2. Keep functions warm with provisioned concurrency for critical paths
    3. Minimize deployment package size
    4. Use ARM64 (Graviton2) for better price/performance
    """
    # The table connection is already established
    # No cold start penalty for DynamoDB client initialization

    user_id = event.get('user_id')

    # Fast query using pre-initialized table
    response = table.get_item(Key={'user_id': user_id})

    return {
        'statusCode': 200,
        'body': response.get('Item', {})
    }
```

For functions that need consistently fast response times, use provisioned concurrency:

```bash
# Enable provisioned concurrency to eliminate cold starts
aws lambda put-provisioned-concurrency-config \
    --function-name my-critical-function \
    --qualifier prod \
    --provisioned-concurrent-executions 5
```

---

## Deploying with SAM (Serverless Application Model)

SAM simplifies Lambda deployment with infrastructure as code. Define your function, triggers, and permissions in a single template.

Create a SAM template that defines your function with all its configuration:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Lambda function with API Gateway trigger

Globals:
  Function:
    # Default settings applied to all functions
    Timeout: 30
    MemorySize: 256
    Runtime: python3.12
    Architectures:
      - arm64  # Use Graviton2 for better price/performance

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api-function
      CodeUri: src/
      Handler: app.handler
      Description: API handler for user operations

      # Environment variables
      Environment:
        Variables:
          TABLE_NAME: !Ref UsersTable
          LOG_LEVEL: INFO

      # IAM permissions
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable

      # API Gateway trigger
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /users/{id}
            Method: ANY
            RestApiId: !Ref MyApi

  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowOrigin: "'*'"
        AllowMethods: "'GET,POST,PUT,DELETE'"
        AllowHeaders: "'Content-Type,Authorization'"

  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: users
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: user_id
          AttributeType: S
      KeySchema:
        - AttributeName: user_id
          KeyType: HASH

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${MyApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
  FunctionArn:
    Description: Lambda function ARN
    Value: !GetAtt MyFunction.Arn
```

Deploy using the SAM CLI. The guided flag walks you through configuration options:

```bash
# Build the application (installs dependencies, packages code)
sam build

# Deploy with guided prompts for first deployment
sam deploy --guided

# Subsequent deployments can skip prompts
sam deploy
```

---

## Testing Lambda Locally

SAM lets you test Lambda functions locally before deploying. This speeds up development significantly.

Invoke your function locally with a test event:

```bash
# Invoke locally with a test event
sam local invoke MyFunction --event events/test-event.json

# Start a local API Gateway for testing HTTP triggers
sam local start-api
```

Create test events that match what your triggers will send:

```json
// events/api-gateway-event.json
{
  "httpMethod": "POST",
  "path": "/users/123",
  "headers": {
    "Content-Type": "application/json"
  },
  "pathParameters": {
    "id": "123"
  },
  "body": "{\"name\": \"John Doe\", \"email\": \"john@example.com\"}"
}
```

---

## Monitoring and Logging

Lambda automatically sends logs to CloudWatch. Structure your logs for easier debugging and analysis.

Use structured logging with consistent fields. JSON logs are easier to query in CloudWatch Logs Insights:

```python
# logging_handler.py
import json
import logging
import os

# Configure structured logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

def handler(event, context):
    """
    Handler with structured logging for observability.

    Good logging practices:
    - Include request_id in all logs for correlation
    - Use consistent field names across functions
    - Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
    - Include relevant context without sensitive data
    """
    # Create a log context with request metadata
    log_context = {
        'request_id': context.aws_request_id,
        'function_name': context.function_name,
        'remaining_time_ms': context.get_remaining_time_in_millis()
    }

    logger.info(json.dumps({
        **log_context,
        'message': 'Processing request',
        'event_type': event.get('httpMethod', 'unknown')
    }))

    try:
        result = process(event)

        logger.info(json.dumps({
            **log_context,
            'message': 'Request completed successfully',
            'result_size': len(str(result))
        }))

        return {'statusCode': 200, 'body': json.dumps(result)}

    except Exception as e:
        logger.error(json.dumps({
            **log_context,
            'message': 'Request failed',
            'error': str(e),
            'error_type': type(e).__name__
        }))
        raise

def process(event):
    """Your business logic here."""
    return {'processed': True}
```

Query your logs using CloudWatch Logs Insights:

```sql
-- Find all errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- Calculate average duration by function
fields @timestamp, @duration, @requestId
| stats avg(@duration), max(@duration), count(*) by bin(5m)

-- Find slow invocations
fields @timestamp, @duration, @requestId
| filter @duration > 1000
| sort @duration desc
| limit 50
```

---

## Best Practices Summary

| Practice | Why It Matters |
|----------|---------------|
| Initialize outside handler | Reuse connections across invocations |
| Use environment variables | Keep config separate from code |
| Implement proper error handling | Return appropriate status codes |
| Set memory appropriately | CPU scales with memory |
| Use ARM64 architecture | 20% better price/performance |
| Keep functions focused | Single responsibility, easier testing |
| Use layers for dependencies | Faster deployments, code reuse |
| Enable X-Ray tracing | Debug distributed systems |
| Set up Dead Letter Queues | Capture failed async invocations |
| Use provisioned concurrency | Eliminate cold starts for critical paths |

---

## Conclusion

AWS Lambda removes server management overhead so you can focus on business logic. Key takeaways:

- **Start simple**: A basic handler with proper error handling gets you far
- **Optimize initialization**: Move client creation outside the handler
- **Use IAC**: SAM or Terraform makes deployments repeatable
- **Monitor everything**: CloudWatch logs and X-Ray traces are your friends
- **Handle failures gracefully**: Dead letter queues catch what error handling misses

Lambda's pay-per-use model makes it cost-effective for variable workloads, and its integration with the AWS ecosystem makes it a natural choice for serverless architectures.

---

*Building serverless applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Lambda functions, including cold start tracking, error rate alerting, and cost analysis across your serverless infrastructure.*
