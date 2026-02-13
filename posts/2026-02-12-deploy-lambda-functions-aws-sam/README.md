# How to Deploy Lambda Functions with AWS SAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SAM, Serverless, Infrastructure as Code

Description: Learn how to use AWS SAM (Serverless Application Model) to define, build, test locally, and deploy Lambda functions with infrastructure as code.

---

The AWS CLI works fine for deploying individual Lambda functions, but once you have multiple functions, API Gateway routes, DynamoDB tables, and SQS queues all working together, managing everything with raw CLI commands gets painful. AWS SAM (Serverless Application Model) solves this. It's an infrastructure-as-code framework specifically designed for serverless applications.

SAM extends CloudFormation with simplified syntax for serverless resources. You define your entire application in a template file, and SAM handles packaging, deployment, and resource creation.

## Installing SAM CLI

The SAM CLI is separate from the AWS CLI. Install it based on your platform:

```bash
# macOS (using Homebrew)
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Verify installation
sam --version
```

## Your First SAM Project

The fastest way to start is with `sam init`:

```bash
# Create a new SAM project
sam init \
  --runtime python3.12 \
  --app-template hello-world \
  --name my-serverless-app \
  --package-type Zip
```

This generates a project structure:

```
my-serverless-app/
  - template.yaml        # SAM template (infrastructure definition)
  - hello_world/
    - app.py             # Lambda function code
    - requirements.txt   # Python dependencies
  - tests/
    - unit/
      - test_handler.py  # Unit tests
  - events/
    - event.json         # Sample test event
```

## Understanding the SAM Template

The template is where the magic happens. Here's a real-world example with multiple resources:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Order processing API

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: python3.12
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        LOG_LEVEL: INFO

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, production]

Resources:
  # API Gateway
  OrderApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment
      TracingEnabled: true

  # Lambda function for creating orders
  CreateOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/create_order/
      Handler: app.lambda_handler
      Description: Creates a new order
      Events:
        CreateOrder:
          Type: Api
          Properties:
            RestApiId: !Ref OrderApi
            Path: /orders
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable

  # Lambda function for getting orders
  GetOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/get_order/
      Handler: app.lambda_handler
      Description: Retrieves an order by ID
      Events:
        GetOrder:
          Type: Api
          Properties:
            RestApiId: !Ref OrderApi
            Path: /orders/{orderId}
            Method: get
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref OrdersTable

  # Lambda function for processing order queue
  ProcessOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/process_order/
      Handler: app.lambda_handler
      Description: Processes orders from SQS queue
      Events:
        OrderQueue:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable

  # DynamoDB table
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${Environment}-orders"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH

  # SQS queue
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "${Environment}-order-queue"
      VisibilityTimeout: 60

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${OrderApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}"
  CreateOrderFunctionArn:
    Description: Create Order Lambda Function ARN
    Value: !GetAtt CreateOrderFunction.Arn
```

Notice how much simpler this is compared to raw CloudFormation. SAM's `AWS::Serverless::Function` type automatically creates the IAM role, log group, and event source mappings.

## Writing the Function Code

Create the source code for each function:

```python
# src/create_order/app.py
import json
import os
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('ORDERS_TABLE', 'orders'))


def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
    except (json.JSONDecodeError, TypeError, KeyError):
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid request body'})
        }

    order_id = str(uuid.uuid4())

    item = {
        'orderId': order_id,
        'customerId': body.get('customer_id'),
        'items': body.get('items', []),
        'total': str(body.get('total', 0)),
        'status': 'created',
        'createdAt': datetime.utcnow().isoformat()
    }

    table.put_item(Item=item)

    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'order_id': order_id,
            'status': 'created'
        })
    }
```

And the requirements file:

```
# src/create_order/requirements.txt
boto3>=1.28.0
```

## Building the Project

SAM build compiles your code, installs dependencies, and prepares a deployment package:

```bash
# Build the project
sam build

# Build with a specific Python version using a container
sam build --use-container
```

The `--use-container` flag builds inside a Docker container that matches the Lambda runtime environment. This is essential when your dependencies include compiled libraries (like numpy or psycopg2).

The build output goes to `.aws-sam/build/`.

## Local Testing

One of SAM's best features is local testing. You can run your Lambda functions locally without deploying to AWS.

### Invoke a Single Function

```bash
# Invoke locally with a test event
sam local invoke CreateOrderFunction \
  --event events/create-order.json
```

Create a test event file:

```json
{
  "httpMethod": "POST",
  "path": "/orders",
  "headers": {"Content-Type": "application/json"},
  "body": "{\"customer_id\": \"CUST-123\", \"items\": [{\"product\": \"Widget\", \"quantity\": 1}], \"total\": 29.99}"
}
```

### Start a Local API

Run the entire API locally:

```bash
# Start local API on port 3000
sam local start-api --port 3000

# Test with curl
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "CUST-123", "items": [{"product": "Widget"}], "total": 29.99}'
```

### Generate Sample Events

SAM can generate sample events for different trigger types:

```bash
# Generate an API Gateway event
sam local generate-event apigateway aws-proxy \
  --method POST \
  --path /orders \
  --body '{"customer_id": "123"}' > events/api-event.json

# Generate an SQS event
sam local generate-event sqs receive-message \
  --body '{"orderId": "ORD-123"}' > events/sqs-event.json

# Generate an S3 event
sam local generate-event s3 put > events/s3-event.json
```

## Deploying

Deploy to AWS with guided mode the first time:

```bash
# First deployment - interactive mode
sam deploy --guided
```

This walks you through:
- Stack name
- AWS region
- Parameter values
- IAM capability confirmation
- Whether to save settings for future deployments

The settings get saved to `samconfig.toml`:

```toml
# samconfig.toml
version = 0.1

[default.deploy.parameters]
stack_name = "my-serverless-app"
resolve_s3 = true
s3_prefix = "my-serverless-app"
region = "us-east-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=\"production\""
```

Subsequent deployments are simpler:

```bash
# Deploy using saved settings
sam deploy

# Deploy to a different environment
sam deploy --parameter-overrides Environment=staging
```

## Viewing Logs

Stream Lambda logs in real time:

```bash
# Tail logs for a specific function
sam logs --name CreateOrderFunction --stack-name my-serverless-app --tail

# Filter logs
sam logs --name CreateOrderFunction --stack-name my-serverless-app \
  --filter "ERROR"
```

## Cleanup

Remove the entire stack:

```bash
# Delete the stack and all resources
sam delete --stack-name my-serverless-app
```

## CI/CD Pipeline

Here's a GitHub Actions workflow for automated SAM deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy Serverless App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: aws-actions/setup-sam@v2

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - run: sam build --use-container
      - run: sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
```

## Wrapping Up

SAM takes the complexity out of serverless deployments. The template syntax is cleaner than raw CloudFormation, local testing catches bugs before they hit production, and the deploy command handles packaging and uploading automatically. If you're building anything beyond a single Lambda function, SAM should be your go-to deployment tool.

For managing dependencies in your Lambda packages, check out our guide on [packaging Lambda functions with dependencies](https://oneuptime.com/blog/post/2026-02-12-package-lambda-functions-dependencies/view). And for optimizing function performance after deployment, see [configuring Lambda memory and timeout settings](https://oneuptime.com/blog/post/2026-02-12-configure-lambda-memory-timeout-settings/view).
