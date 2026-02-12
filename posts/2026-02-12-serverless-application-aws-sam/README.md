# Build a Serverless Application with AWS SAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SAM, Serverless, Lambda, CloudFormation

Description: Complete guide to building, testing, and deploying serverless applications using AWS SAM with practical examples and local development workflows.

---

AWS SAM (Serverless Application Model) is the official tool for building serverless applications on AWS. It extends CloudFormation with a simplified syntax for defining Lambda functions, API Gateway endpoints, DynamoDB tables, and other serverless resources. More importantly, it gives you a local development experience - you can test your Lambda functions and APIs on your machine before deploying to AWS.

## Why SAM Over Plain CloudFormation?

CloudFormation works, but it's verbose. Defining a simple Lambda function with an API Gateway trigger takes dozens of lines. SAM reduces that to a handful. It also gives you `sam local` commands for local testing, `sam build` for packaging, and `sam deploy` for deployment. It's the full development lifecycle in one tool.

## Installing SAM CLI

If you haven't installed SAM yet, here's how.

Install SAM CLI on your system:

```bash
# macOS
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Verify installation
sam --version
```

## Project Structure

A typical SAM project looks like this:

```
my-app/
  template.yaml          # SAM template (infrastructure definition)
  samconfig.toml         # Deployment configuration
  src/
    handlers/
      createItem.js      # Lambda function code
      getItem.js
      listItems.js
    shared/
      db.js              # Shared utilities
  tests/
    unit/
      createItem.test.js
    integration/
      api.test.js
  events/
    create-event.json    # Test events for local invocation
```

## The SAM Template

Here's a complete SAM template for a CRUD API.

This template defines Lambda functions, API Gateway, and DynamoDB in about 80 lines:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Description: Item management API

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 10
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref ItemsTable
        REGION: !Ref AWS::Region
    Tracing: Active

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod

Resources:
  # API Gateway
  ItemsApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment
      TracingEnabled: true
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  # Lambda Functions
  CreateItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/createItem.handler
      Description: Creates a new item
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ItemsTable
      Events:
        CreateItem:
          Type: Api
          Properties:
            RestApiId: !Ref ItemsApi
            Path: /items
            Method: post

  GetItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/getItem.handler
      Description: Gets a single item by ID
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ItemsTable
      Events:
        GetItem:
          Type: Api
          Properties:
            RestApiId: !Ref ItemsApi
            Path: /items/{id}
            Method: get

  ListItemsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/listItems.handler
      Description: Lists all items with pagination
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ItemsTable
      Events:
        ListItems:
          Type: Api
          Properties:
            RestApiId: !Ref ItemsApi
            Path: /items
            Method: get

  DeleteItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/deleteItem.handler
      Description: Deletes an item
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ItemsTable
      Events:
        DeleteItem:
          Type: Api
          Properties:
            RestApiId: !Ref ItemsApi
            Path: /items/{id}
            Method: delete

  # DynamoDB Table
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${Environment}-items"
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${ItemsApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}"
  TableName:
    Description: DynamoDB table name
    Value: !Ref ItemsTable
```

Compare this to raw CloudFormation where you'd need separate `AWS::Lambda::Function`, `AWS::ApiGateway::RestApi`, `AWS::ApiGateway::Method`, `AWS::Lambda::Permission`, and `AWS::IAM::Role` resources for each function. SAM collapses all of that into `AWS::Serverless::Function` with an `Events` property.

## Writing the Lambda Functions

Here are the function implementations.

The create handler:

```javascript
// src/handlers/createItem.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    if (!body.name) {
      return response(400, { message: 'Name is required' });
    }

    const item = {
      id: randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return response(201, item);
  } catch (error) {
    console.error('Error creating item:', error);
    return response(500, { message: 'Internal server error' });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
```

The get handler:

```javascript
// src/handlers/getItem.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Item not found' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error getting item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
```

## Local Development

This is where SAM really shines. You can test your functions locally without deploying to AWS.

### Invoke a Single Function

Create a test event file:

```json
{
  "body": "{\"name\": \"Test Item\", \"price\": 9.99}",
  "httpMethod": "POST",
  "path": "/items"
}
```

Then invoke the function locally:

```bash
# Build the project first
sam build

# Invoke a function with a test event
sam local invoke CreateItemFunction --event events/create-event.json

# Or pass the event inline
echo '{"body": "{\"name\": \"Test\"}"}' | sam local invoke CreateItemFunction
```

### Start a Local API

Run your entire API locally:

```bash
# Start the local API on port 3000
sam local start-api --port 3000

# Test with curl
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "price": 9.99}'

curl http://localhost:3000/items
curl http://localhost:3000/items/some-id
```

The local API reloads automatically when you change your code, so you get a fast development loop.

### Local DynamoDB

For full local testing, run DynamoDB locally with Docker:

```bash
# Start local DynamoDB
docker run -p 8000:8000 amazon/dynamodb-local

# Create the table locally
aws dynamodb create-table \
  --table-name dev-items \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

Configure your functions to use the local endpoint in development:

```javascript
// Detect local environment and configure accordingly
const config = {};
if (process.env.AWS_SAM_LOCAL) {
  config.endpoint = 'http://host.docker.internal:8000';
}
const client = new DynamoDBClient(config);
```

## Building and Deploying

### Build

SAM build packages your code and resolves dependencies:

```bash
# Build all functions
sam build

# Build with a specific container image (for native dependencies)
sam build --use-container
```

### Deploy

The first deployment uses guided mode to set up configuration:

```bash
# First-time guided deployment
sam deploy --guided
```

This creates a `samconfig.toml` file with your deployment settings. Subsequent deployments just need:

```bash
sam deploy
```

The samconfig file looks like this:

```toml
# samconfig.toml
version = 0.1

[default.deploy.parameters]
stack_name = "items-api-dev"
resolve_s3 = true
s3_prefix = "items-api"
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=dev"
confirm_changeset = true
```

## Environment-Specific Deployments

Use parameters to deploy to different environments:

```bash
# Deploy to staging
sam deploy \
  --parameter-overrides Environment=staging \
  --stack-name items-api-staging

# Deploy to production
sam deploy \
  --parameter-overrides Environment=prod \
  --stack-name items-api-prod \
  --no-confirm-changeset
```

## Adding Layers

Lambda layers let you share code and dependencies across functions.

This adds a shared dependencies layer:

```yaml
Resources:
  SharedLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: shared-dependencies
      ContentUri: layers/shared/
      CompatibleRuntimes:
        - nodejs20.x
    Metadata:
      BuildMethod: nodejs20.x

  CreateItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/createItem.handler
      Layers:
        - !Ref SharedLayer
```

## Monitoring Your SAM Application

Once deployed, set up monitoring for your functions. SAM makes it easy to enable X-Ray tracing and CloudWatch logging through the `Globals` section. For production monitoring, consider integrating with a dedicated monitoring platform. Check out our post on [building a serverless CRUD API](https://oneuptime.com/blog/post/serverless-crud-api-lambda-api-gateway/view) for more on monitoring Lambda-based APIs.

## SAM Accelerate

For even faster development cycles, use `sam sync` which bypasses CloudFormation for code-only changes:

```bash
# Watch for changes and deploy automatically
sam sync --watch --stack-name items-api-dev
```

This syncs code changes in seconds instead of the minutes that a full `sam deploy` takes.

## Wrapping Up

SAM gives you a productive development experience for serverless applications. The simplified template syntax reduces boilerplate, local invoke and start-api let you test without deploying, and the build/deploy workflow handles packaging and CloudFormation under the hood. For most serverless projects on AWS, SAM is the fastest path from code to production. Start with `sam init` for a starter template, and build from there.
