# How to Test Lambda Functions Locally with SAM CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SAM, Testing, Local Development

Description: A practical guide to using AWS SAM CLI for local Lambda testing, including local API simulation, event generation, Docker-based invocation, and debugging workflows.

---

Deploying to AWS every time you want to test a Lambda function is slow and expensive. The AWS SAM CLI solves this by letting you invoke Lambda functions locally using Docker. You write your code, invoke it with a test event, see the output instantly, and iterate. No deployment, no waiting, no AWS charges.

SAM CLI simulates the Lambda execution environment on your machine, handles API Gateway emulation, and even supports local debugging with breakpoints. Let's get it set up and put it to work.

## Installing SAM CLI

SAM CLI requires Docker (for running the Lambda runtime locally) and Python.

These commands install SAM CLI on different platforms:

```bash
# macOS with Homebrew
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Windows with Chocolatey
choco install aws-sam-cli

# Verify installation
sam --version
```

Make sure Docker is running before you try to invoke functions locally.

## Project Setup

SAM uses a `template.yaml` file to define your serverless application. Here's a basic project structure:

```
my-api/
  template.yaml
  src/
    handlers/
      get-orders.js
      create-order.js
  events/
    get-orders.json
    create-order.json
  tests/
    unit/
      get-orders.test.js
```

This SAM template defines a simple API with two Lambda functions:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Orders API

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: orders
        STAGE: local

Resources:
  GetOrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/get-orders.handler
      Events:
        GetOrders:
          Type: Api
          Properties:
            Path: /orders
            Method: get
        GetOrder:
          Type: Api
          Properties:
            Path: /orders/{orderId}
            Method: get

  CreateOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/create-order.handler
      Events:
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
```

## Invoking Functions Locally

The simplest way to test is direct invocation with a JSON event file.

This command invokes a Lambda function locally with a test event:

```bash
# Create a test event
sam local generate-event apigateway aws-proxy \
  --method GET \
  --path /orders \
  --body '' > events/get-orders.json

# Invoke the function with the event
sam local invoke GetOrdersFunction \
  --event events/get-orders.json
```

You can also pass events inline:

```bash
# Inline event
sam local invoke GetOrdersFunction \
  --event - <<EOF
{
  "httpMethod": "GET",
  "path": "/orders",
  "queryStringParameters": {
    "status": "active",
    "limit": "10"
  },
  "pathParameters": null,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": null
}
EOF
```

## Running a Local API

SAM can emulate API Gateway locally, so you can test your API with curl, Postman, or your frontend.

This command starts a local API Gateway on port 3000:

```bash
# Start the local API
sam local start-api --port 3000 --warm-containers EAGER

# In another terminal, test it
curl http://localhost:3000/orders
curl http://localhost:3000/orders/ORD-001
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"item": "Widget", "quantity": 5}'
```

The `--warm-containers EAGER` flag keeps the Docker containers running between invocations, which eliminates cold start delays during development. Without it, SAM spins up a new container for every request.

## Generating Test Events

SAM CLI can generate sample events for many AWS services. This saves you from writing event JSON by hand.

These commands generate sample events for different trigger types:

```bash
# API Gateway event
sam local generate-event apigateway aws-proxy --method POST --path /orders --body '{"item":"test"}'

# S3 event
sam local generate-event s3 put --bucket my-bucket --key data/file.csv

# SQS event
sam local generate-event sqs receive-message --body '{"orderId":"123"}'

# DynamoDB stream event
sam local generate-event dynamodb update

# SNS event
sam local generate-event sns notification --message '{"type":"alert"}'

# Scheduled event (EventBridge)
sam local generate-event cloudwatch scheduled-event

# List all available event sources
sam local generate-event --help
```

## Environment Variables and Configuration

You can override environment variables during local invocation.

Create an `env.json` file for local testing:

```json
{
  "GetOrdersFunction": {
    "TABLE_NAME": "orders-local",
    "AWS_REGION": "us-east-1",
    "LOG_LEVEL": "DEBUG"
  },
  "CreateOrderFunction": {
    "TABLE_NAME": "orders-local",
    "AWS_REGION": "us-east-1",
    "LOG_LEVEL": "DEBUG"
  }
}
```

Then pass it to SAM:

```bash
sam local invoke GetOrdersFunction \
  --event events/get-orders.json \
  --env-vars env.json

# Or for the local API
sam local start-api --env-vars env.json
```

## Debugging with SAM CLI

SAM supports step debugging for Node.js, Python, Java, and Go. You attach your IDE's debugger to the running container.

For Node.js debugging:

```bash
# Start the function with debug port
sam local invoke GetOrdersFunction \
  --event events/get-orders.json \
  --debug-port 5858
```

For VS Code, add this debug configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to SAM CLI",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "${workspaceRoot}/src",
      "remoteRoot": "/var/task/src",
      "protocol": "inspector",
      "stopOnEntry": false
    }
  ]
}
```

Start the SAM invoke, then attach the debugger in VS Code. You can set breakpoints, inspect variables, and step through code just like local development.

## Testing with Local DynamoDB

For functions that use DynamoDB, you can run DynamoDB Local alongside SAM.

This docker-compose file runs DynamoDB Local for local testing:

```yaml
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb"]
```

Configure your Lambda function to use the local DynamoDB endpoint:

```javascript
// src/handlers/get-orders.js
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

// Use local endpoint when running locally
const isLocal = process.env.AWS_SAM_LOCAL === 'true';
const client = new DynamoDBClient(
  isLocal
    ? { endpoint: 'http://host.docker.internal:8000', region: 'us-east-1' }
    : {}
);

exports.handler = async (event) => {
  const tableName = process.env.TABLE_NAME;

  try {
    const result = await client.send(new ScanCommand({
      TableName: tableName,
      Limit: 10,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders: result.Items,
        count: result.Count,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch orders' }),
    };
  }
};
```

Note the `host.docker.internal` hostname - this is how Docker containers reach services running on the host machine.

Set up the local DynamoDB table:

```bash
# Create the table locally
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name orders-local \
  --attribute-definitions AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Insert test data
aws dynamodb put-item \
  --endpoint-url http://localhost:8000 \
  --table-name orders-local \
  --item '{"orderId":{"S":"ORD-001"},"status":{"S":"active"},"total":{"N":"99.99"}}'
```

## SAM Accelerate for Faster Iteration

`sam sync` watches your code for changes and deploys them instantly without a full CloudFormation deployment. It's faster than local testing for integration testing.

```bash
# Start watching for changes (deploys to AWS)
sam sync --stack-name my-api --watch

# Changes to function code are deployed in seconds
# Changes to infrastructure take a bit longer
```

This is great for testing integrations with real AWS services that are hard to emulate locally.

## Layer Testing

If your function uses Lambda layers, SAM CLI pulls them automatically during local invocation.

```yaml
Resources:
  SharedLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      ContentUri: layers/shared/
      CompatibleRuntimes:
        - nodejs20.x

  GetOrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/get-orders.handler
      Layers:
        - !Ref SharedLayer
```

SAM builds and includes the layer during `sam local invoke`.

## Combining with Unit Tests

SAM local testing is for integration-style testing. Combine it with proper unit tests for comprehensive coverage. For unit testing strategies, see our post on [writing unit tests for Lambda functions](https://oneuptime.com/blog/post/2026-02-12-write-unit-tests-lambda-functions/view).

A good testing pyramid for Lambda:
1. **Unit tests** - test business logic without AWS SDK calls (fastest)
2. **SAM local tests** - test with emulated Lambda runtime (medium)
3. **Integration tests** - test against real AWS services in a dev environment (slowest)

## Wrapping Up

SAM CLI transforms the Lambda development experience from "deploy and pray" to proper local development. Use `sam local invoke` for quick function tests, `sam local start-api` for API development, and the debugging features when you need to step through code. Combine it with DynamoDB Local for a fully offline development environment. Your deployment frequency will drop, your iteration speed will increase, and your AWS bill for development will shrink.
