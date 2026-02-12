# How to Create Your First AWS Lambda Function

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless

Description: A beginner-friendly guide to creating your first AWS Lambda function, covering the basics of serverless computing, event handling, and testing.

---

AWS Lambda lets you run code without provisioning or managing servers. You write a function, upload it, and AWS handles everything else - the infrastructure, scaling, patching, and availability. You only pay for the compute time your function actually uses, down to the millisecond.

If you've never built a Lambda function before, this guide will get you from zero to a working function.

## What Lambda Actually Is

Lambda is a compute service. You give it a function (a piece of code), tell it what triggers the function (an event), and Lambda runs your code whenever that event occurs. Your code runs in a container managed by AWS, and the container is destroyed after the function finishes (or after a period of inactivity).

Think of it like this: instead of renting a server 24/7, you're renting compute time measured in milliseconds.

Lambda supports several runtimes:

- Python 3.9, 3.10, 3.11, 3.12, 3.13
- Node.js 18.x, 20.x, 22.x
- Java 11, 17, 21
- .NET 6, 8
- Go (via provided runtime)
- Ruby 3.2, 3.3
- Custom runtimes via Amazon Linux 2

## The Anatomy of a Lambda Function

Every Lambda function has three parts:

1. **Handler** - The entry point. Lambda calls this function when triggered.
2. **Event** - The data that triggered the function (JSON payload)
3. **Context** - Metadata about the invocation (request ID, remaining time, etc.)

Here's the simplest possible Lambda function in Python:

```python
# The handler function - Lambda calls this when triggered
def lambda_handler(event, context):
    # event contains the trigger data
    # context contains metadata about the invocation
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }
```

And the same thing in Node.js:

```javascript
// Handler function for Node.js
export const handler = async (event, context) => {
    return {
        statusCode: 200,
        body: 'Hello from Lambda!'
    };
};
```

## Creating Your First Function

Let's create a real function that does something useful - a simple API endpoint that processes a name and returns a greeting.

First, write the function code:

```python
# lambda_function.py
import json
from datetime import datetime

def lambda_handler(event, context):
    # Extract the name from the event
    # Works with both direct invocation and API Gateway
    body = event.get('body')
    if body:
        # API Gateway sends body as a string
        if isinstance(body, str):
            body = json.loads(body)
        name = body.get('name', 'World')
    else:
        name = event.get('name', 'World')

    # Get the current time
    current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Build the response
    response = {
        'message': f'Hello, {name}!',
        'timestamp': current_time,
        'request_id': context.aws_request_id
    }

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(response)
    }
```

## Deploying with the AWS CLI

Package and deploy the function:

```bash
# Zip the function code
zip function.zip lambda_function.py

# Create the IAM role for Lambda
aws iam create-role \
  --role-name my-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the basic execution policy (CloudWatch Logs access)
aws iam attach-role-policy \
  --role-name my-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Wait a few seconds for the role to propagate
sleep 10

# Create the Lambda function
aws lambda create-function \
  --function-name my-first-function \
  --runtime python3.12 \
  --handler lambda_function.lambda_handler \
  --role arn:aws:iam::123456789012:role/my-lambda-role \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 128
```

Let's break down the parameters:

- `--function-name` - The name of your function
- `--runtime` - Which language runtime to use
- `--handler` - The file name and function name (file.function)
- `--role` - The IAM role Lambda assumes when running
- `--zip-file` - Your packaged code
- `--timeout` - Maximum execution time in seconds (default: 3, max: 900)
- `--memory-size` - Memory allocation in MB (also determines CPU allocation)

## Testing Your Function

Invoke the function directly from the CLI:

```bash
# Invoke with a test payload
aws lambda invoke \
  --function-name my-first-function \
  --payload '{"name": "Alice"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check the response
cat response.json
```

You should see something like:

```json
{
  "statusCode": 200,
  "headers": {"Content-Type": "application/json"},
  "body": "{\"message\": \"Hello, Alice!\", \"timestamp\": \"2026-02-12 10:30:45 UTC\", \"request_id\": \"abc-123-def\"}"
}
```

## Understanding the Event Object

The event object is different depending on what triggers your function. Here are some common event shapes:

**Direct invocation** - Whatever JSON you pass in:

```json
{
  "name": "Alice",
  "action": "greet"
}
```

**API Gateway** - An HTTP request object:

```json
{
  "httpMethod": "POST",
  "path": "/greet",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"name\": \"Alice\"}"
}
```

**S3 trigger** - Details about the uploaded object:

```json
{
  "Records": [{
    "s3": {
      "bucket": {"name": "my-bucket"},
      "object": {"key": "uploads/photo.jpg"}
    }
  }]
}
```

**SQS trigger** - Messages from the queue:

```json
{
  "Records": [{
    "body": "{\"orderId\": 12345}",
    "messageId": "msg-abc123"
  }]
}
```

## Adding an API Gateway Trigger

To make your function accessible via HTTP, add an API Gateway trigger. The quickest way is with a Lambda Function URL:

```bash
# Create a function URL (simple HTTP endpoint)
aws lambda create-function-url-config \
  --function-name my-first-function \
  --auth-type NONE

# Grant public access to the function URL
aws lambda add-permission \
  --function-name my-first-function \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

This gives you a URL like `https://abc123.lambda-url.us-east-1.on.aws/` that you can call from anywhere.

## Viewing Logs

Lambda automatically sends logs to CloudWatch. Every `print()` statement (Python) or `console.log()` (Node.js) goes to a log group named `/aws/lambda/function-name`.

```bash
# View recent log events
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/my-first-function"

# Get the latest log stream
STREAM=$(aws logs describe-log-streams \
  --log-group-name "/aws/lambda/my-first-function" \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --query "logStreams[0].logStreamName" \
  --output text)

# Read the logs
aws logs get-log-events \
  --log-group-name "/aws/lambda/my-first-function" \
  --log-stream-name "$STREAM"
```

## Updating Your Function

When you make changes, redeploy:

```bash
# Update the code
zip function.zip lambda_function.py

aws lambda update-function-code \
  --function-name my-first-function \
  --zip-file fileb://function.zip
```

## Environment Variables

Store configuration in environment variables instead of hardcoding:

```bash
# Set environment variables
aws lambda update-function-configuration \
  --function-name my-first-function \
  --environment "Variables={
    DATABASE_HOST=mydb.cluster-abc123.us-east-1.rds.amazonaws.com,
    LOG_LEVEL=INFO,
    STAGE=production
  }"
```

Access them in your code:

```python
import os

def lambda_handler(event, context):
    db_host = os.environ['DATABASE_HOST']
    log_level = os.environ.get('LOG_LEVEL', 'WARNING')
    # ...
```

## Cleaning Up

If you want to remove the function:

```bash
# Delete the function
aws lambda delete-function --function-name my-first-function

# Delete the role
aws iam detach-role-policy \
  --role-name my-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role --role-name my-lambda-role
```

## What's Next

Now that you've got the basics down, there's a lot more to explore:

- [Creating a Lambda function from the AWS Console](https://oneuptime.com/blog/post/lambda-function-aws-console/view) - A visual walkthrough
- [Deploying Lambda functions with the AWS CLI](https://oneuptime.com/blog/post/deploy-lambda-functions-aws-cli/view) - Advanced CLI deployment patterns
- [Deploying Lambda functions with AWS SAM](https://oneuptime.com/blog/post/deploy-lambda-functions-aws-sam/view) - Infrastructure as code for serverless
- [Configuring Lambda memory and timeout](https://oneuptime.com/blog/post/configure-lambda-memory-timeout-settings/view) - Performance tuning

Lambda is one of those services that's simple to start with and deep enough to keep learning for years. Start with simple functions, get comfortable with the event model, and gradually take on more complex patterns.
