# How to Create a Lambda Function from the AWS Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Console

Description: A visual walkthrough of creating, configuring, and testing an AWS Lambda function using the AWS Management Console, perfect for beginners.

---

While the CLI and infrastructure-as-code tools are great for production workflows, sometimes you just want to spin up a Lambda function quickly to test an idea. The AWS Console makes this dead simple. You can write code directly in the browser, test it, and see results in seconds.

Let's walk through creating a Lambda function entirely from the console.

## Step 1: Navigate to Lambda

Open the AWS Management Console and search for "Lambda" in the search bar, or find it under Compute services. Click "Create function."

You'll see three options:

- **Author from scratch** - Start with a blank function
- **Use a blueprint** - Start with a pre-built template
- **Container image** - Deploy a Docker container as a Lambda function

For this walkthrough, choose "Author from scratch."

## Step 2: Configure Basic Settings

Fill in the following:

- **Function name**: `process-order`
- **Runtime**: Python 3.12
- **Architecture**: x86_64 (or arm64 for Graviton - it's 20% cheaper)

Under Permissions, expand "Change default execution role" and select "Create a new role with basic Lambda permissions." This creates a role that lets Lambda write logs to CloudWatch.

Click "Create function."

## Step 3: Write Your Code

After creation, you'll see the code editor. Lambda provides an inline editor for small functions. Replace the default code with something more realistic.

Here's a function that processes an order event, validates it, and returns a response:

```python
# lambda_function.py - Order processing function
import json
from datetime import datetime


def validate_order(order):
    """Check that the order has all required fields."""
    required_fields = ['customer_id', 'items', 'total']
    missing = [f for f in required_fields if f not in order]

    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    if not isinstance(order['items'], list) or len(order['items']) == 0:
        return False, "Order must contain at least one item"

    if order['total'] <= 0:
        return False, "Order total must be positive"

    return True, "Valid"


def lambda_handler(event, context):
    """Process an incoming order."""
    print(f"Received event: {json.dumps(event)}")

    # Parse the order from the event
    try:
        if isinstance(event.get('body'), str):
            order = json.loads(event['body'])
        else:
            order = event
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }

    # Validate the order
    is_valid, message = validate_order(order)

    if not is_valid:
        print(f"Order validation failed: {message}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': message})
        }

    # Process the order
    order_id = f"ORD-{context.aws_request_id[:8].upper()}"
    processed_at = datetime.utcnow().isoformat()

    result = {
        'order_id': order_id,
        'status': 'confirmed',
        'customer_id': order['customer_id'],
        'item_count': len(order['items']),
        'total': order['total'],
        'processed_at': processed_at
    }

    print(f"Order processed successfully: {order_id}")

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result)
    }
```

Click "Deploy" to save your changes.

## Step 4: Create a Test Event

Click the "Test" tab (or the "Test" button). You need to create a test event that simulates the data your function will receive.

Select "Create new event" and enter the following:

- **Event name**: `valid-order`
- **Template**: Leave as default (hello-world)
- **Event JSON**:

```json
{
  "customer_id": "CUST-12345",
  "items": [
    {"product": "Widget A", "quantity": 2, "price": 9.99},
    {"product": "Widget B", "quantity": 1, "price": 24.99}
  ],
  "total": 44.97
}
```

Click "Save" then "Test."

You should see a green "Execution result: succeeded" banner with the function's response. The output will look something like:

```json
{
  "statusCode": 200,
  "headers": {"Content-Type": "application/json"},
  "body": "{\"order_id\": \"ORD-ABC12345\", \"status\": \"confirmed\", \"customer_id\": \"CUST-12345\", \"item_count\": 2, \"total\": 44.97, \"processed_at\": \"2026-02-12T10:30:45.123456\"}"
}
```

Create another test event for an invalid order to test error handling:

```json
{
  "customer_id": "CUST-12345",
  "items": [],
  "total": 0
}
```

## Step 5: Configure General Settings

Click the "Configuration" tab and then "General configuration." Here you can adjust:

**Memory**: The default is 128 MB. Lambda allocates CPU proportionally to memory, so bumping to 256 MB also doubles your CPU. For CPU-intensive functions, more memory means faster execution and sometimes lower cost.

**Timeout**: Default is 3 seconds. For simple API functions, that's usually fine. For functions that call external APIs or process files, you might need 30-60 seconds. The maximum is 15 minutes (900 seconds).

**Ephemeral storage**: Default is 512 MB in `/tmp`. Increase this if your function processes large files.

Click "Edit" to modify these settings:

```
Memory: 256 MB
Timeout: 30 seconds
Ephemeral storage: 512 MB
```

## Step 6: Add Environment Variables

Still in the Configuration tab, click "Environment variables" and then "Edit."

Add variables for your function's configuration:

```
ENVIRONMENT = production
LOG_LEVEL = INFO
MAX_ORDER_AMOUNT = 10000
```

These are accessible in your code via `os.environ`:

```python
import os

max_amount = int(os.environ.get('MAX_ORDER_AMOUNT', '10000'))
```

## Step 7: Add a Trigger

Your function needs something to invoke it. Click "Add trigger" from the function overview.

Common triggers include:

- **API Gateway** - HTTP endpoints
- **S3** - File upload events
- **SQS** - Message queue
- **EventBridge** - Scheduled events (cron jobs)
- **DynamoDB Streams** - Database change events

Let's add an API Gateway trigger:

1. Select "API Gateway"
2. Choose "Create a new API"
3. Select "HTTP API" (simpler and cheaper than REST API)
4. Security: "Open" (for testing - use IAM or JWT auth in production)
5. Click "Add"

Lambda creates an API Gateway endpoint automatically. You'll see the URL in the trigger configuration. Something like:

```
https://abc123.execute-api.us-east-1.amazonaws.com/default/process-order
```

Test it with curl:

```bash
# Test the API endpoint
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/default/process-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-12345",
    "items": [{"product": "Widget A", "quantity": 1, "price": 9.99}],
    "total": 9.99
  }'
```

## Step 8: Monitor Your Function

Click the "Monitor" tab to see metrics:

- **Invocations** - How many times the function ran
- **Duration** - How long each invocation took
- **Errors** - Failed invocations
- **Throttles** - Invocations that were throttled due to concurrency limits
- **Concurrent executions** - How many instances are running simultaneously

Click "View CloudWatch logs" to see the actual log output from your function. Every `print()` statement appears here.

## Step 9: Add Resource Permissions

If your function needs to access other AWS services (S3, DynamoDB, SQS, etc.), you need to add permissions to the execution role.

Go to Configuration > Permissions and click the role name to open it in IAM. Then attach the policies you need:

- `AmazonS3ReadOnlyAccess` - Read objects from S3
- `AmazonDynamoDBFullAccess` - Read/write to DynamoDB
- `AmazonSQSFullAccess` - Send/receive SQS messages

Better yet, create a custom policy with only the specific permissions your function needs (least privilege).

## Step 10: Enable Versioning and Aliases

For production functions, use versions and aliases to manage deployments safely.

Click "Versions" in the sidebar and publish a version. Versions are immutable snapshots of your function. You can create an alias (like "production" or "staging") that points to a specific version.

This lets you deploy new versions without affecting production traffic until you're ready to switch the alias.

## Console Limitations

The console code editor works great for small functions, but it has limits:

- File size limit of about 3 MB for inline editing
- Can't manage external dependencies (no pip install or npm install)
- No version control integration
- Not suitable for multi-file projects

For anything beyond quick prototyping, you'll want to switch to CLI-based or SAM-based deployments. See our guides on [deploying with the AWS CLI](https://oneuptime.com/blog/post/2026-02-12-deploy-lambda-functions-aws-cli/view) and [deploying with AWS SAM](https://oneuptime.com/blog/post/2026-02-12-deploy-lambda-functions-aws-sam/view).

## Wrapping Up

The AWS Console is the fastest way to get a Lambda function running. It's perfect for learning, prototyping, and quick one-off functions. The inline editor, built-in test events, and integrated monitoring make the development loop incredibly tight. Once your function grows beyond a simple script, graduate to infrastructure-as-code tools - but there's nothing wrong with starting in the console.
