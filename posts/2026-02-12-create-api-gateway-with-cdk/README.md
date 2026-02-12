# How to Create an API Gateway with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, API Gateway, Serverless

Description: Step-by-step guide to building a REST API Gateway using AWS CDK with TypeScript, covering routes, Lambda integrations, CORS, and custom domains.

---

Building APIs on AWS usually means juggling API Gateway, Lambda functions, IAM roles, and deployment stages. Doing that through the console is tedious and error-prone. With CDK, you can define your entire API in TypeScript, catch mistakes at compile time, and deploy with a single command.

This guide walks through creating a REST API Gateway using CDK. We'll cover resource definitions, Lambda integrations, request validation, CORS, and custom domain setup. Everything you need to go from zero to a working API.

## REST API vs HTTP API

AWS offers two flavors of API Gateway: REST API and HTTP API. REST API is the older, more feature-rich option with request/response transformations, usage plans, and API keys. HTTP API is newer, cheaper, and faster, but has fewer features.

For most new projects, HTTP API is the better choice unless you specifically need REST API features like request validation or WAF integration. We'll cover REST API here since it's more complex and the patterns transfer easily to HTTP API.

## Project Setup

Start with a fresh CDK project.

```bash
# Initialize the project
mkdir api-gateway-cdk && cd api-gateway-cdk
cdk init app --language typescript

# Dependencies are included in aws-cdk-lib
npm install aws-cdk-lib constructs
```

## Defining the API

Let's build a simple CRUD API for managing items. Open `lib/api-gateway-stack.ts`.

First, create the REST API resource with sensible defaults.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the REST API with logging enabled
    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: 'Items Service',
      description: 'API for managing items',
      deployOptions: {
        stageName: 'prod',
        // Enable CloudWatch logging for debugging
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      // Enable CORS for browser-based clients
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
  }
}
```

## Creating Lambda Functions

Each API endpoint needs a handler. Let's define Lambda functions for our CRUD operations.

Create a `lambda` directory at the project root, then add this to your stack:

```typescript
// Lambda function for listing items
const listItemsHandler = new lambda.Function(this, 'ListItemsHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    exports.handler = async (event) => {
      // In production, this would query DynamoDB or another data store
      const items = [
        { id: '1', name: 'Widget', price: 9.99 },
        { id: '2', name: 'Gadget', price: 19.99 },
      ];
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      };
    };
  `),
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  logRetention: logs.RetentionDays.ONE_WEEK,
});

// Lambda function for creating an item
const createItemHandler = new lambda.Function(this, 'CreateItemHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    exports.handler = async (event) => {
      const body = JSON.parse(event.body || '{}');
      // Validate the incoming data
      if (!body.name || !body.price) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'name and price are required' }),
        };
      }
      // In production, save to DynamoDB here
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Date.now().toString(), ...body }),
      };
    };
  `),
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  logRetention: logs.RetentionDays.ONE_WEEK,
});

// Lambda for getting a single item by ID
const getItemHandler = new lambda.Function(this, 'GetItemHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    exports.handler = async (event) => {
      const id = event.pathParameters?.id;
      // In production, fetch from DynamoDB
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: 'Widget', price: 9.99 }),
      };
    };
  `),
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
});
```

## Wiring Up Routes

Now connect the Lambda functions to API Gateway resources and methods.

```typescript
// Create the /items resource
const items = api.root.addResource('items');

// GET /items - list all items
items.addMethod('GET', new apigateway.LambdaIntegration(listItemsHandler, {
  proxy: true, // Pass the full request to Lambda
}));

// POST /items - create a new item
items.addMethod('POST', new apigateway.LambdaIntegration(createItemHandler, {
  proxy: true,
}));

// Create /items/{id} resource for single-item operations
const singleItem = items.addResource('{id}');

// GET /items/{id} - get one item
singleItem.addMethod('GET', new apigateway.LambdaIntegration(getItemHandler, {
  proxy: true,
}));
```

The resource hierarchy maps directly to URL paths. `api.root` is `/`, adding `items` gives you `/items`, and `{id}` under that gives you `/items/{id}`.

## Adding Request Validation

REST API supports request validation, which saves you from writing boilerplate validation code in every Lambda.

```typescript
// Define a model for the create item request body
const itemModel = api.addModel('ItemModel', {
  contentType: 'application/json',
  modelName: 'ItemModel',
  schema: {
    type: apigateway.JsonSchemaType.OBJECT,
    required: ['name', 'price'],
    properties: {
      name: { type: apigateway.JsonSchemaType.STRING },
      price: { type: apigateway.JsonSchemaType.NUMBER },
      description: { type: apigateway.JsonSchemaType.STRING },
    },
  },
});

// Create a request validator
const validator = new apigateway.RequestValidator(this, 'ItemValidator', {
  restApi: api,
  validateRequestBody: true,
  validateRequestParameters: false,
});

// Apply validation to the POST method
items.addMethod('POST', new apigateway.LambdaIntegration(createItemHandler), {
  requestValidator: validator,
  requestModels: {
    'application/json': itemModel,
  },
});
```

When a request fails validation, API Gateway returns a 400 error before your Lambda even runs. That saves execution time and money.

## Adding API Keys and Usage Plans

If you need rate limiting or want to track usage per client, API keys and usage plans are the way to go.

```typescript
// Create an API key for a client
const apiKey = api.addApiKey('ClientApiKey', {
  apiKeyName: 'mobile-client-key',
  description: 'API key for the mobile client',
});

// Create a usage plan with throttling and quotas
const usagePlan = api.addUsagePlan('BasicPlan', {
  name: 'Basic',
  throttle: {
    rateLimit: 100,     // 100 requests per second
    burstLimit: 200,    // Allow short bursts up to 200
  },
  quota: {
    limit: 10000,       // 10,000 requests per day
    period: apigateway.Period.DAY,
  },
});

// Associate the API key with the usage plan
usagePlan.addApiKey(apiKey);

// Associate the usage plan with the API stage
usagePlan.addApiStage({
  stage: api.deploymentStage,
});
```

## Custom Domain Setup

For production APIs, you'll want a custom domain instead of the auto-generated API Gateway URL.

```typescript
// Assumes you have a certificate in ACM and a hosted zone in Route 53
// const certificate = acm.Certificate.fromCertificateArn(this, 'Cert', 'arn:...');

// const domainName = new apigateway.DomainName(this, 'CustomDomain', {
//   domainName: 'api.example.com',
//   certificate: certificate,
//   endpointType: apigateway.EndpointType.EDGE,
// });

// domainName.addBasePathMapping(api, {
//   basePath: 'v1', // Maps api.example.com/v1 to this API
// });
```

## Stack Outputs

Output the API URL so you can test it immediately after deployment.

```typescript
// Output the API endpoint URL
new cdk.CfnOutput(this, 'ApiUrl', {
  value: api.url,
  description: 'The URL of the API Gateway',
});
```

## Deploying and Testing

Deploy and test your API with curl.

```bash
# Deploy the stack
cdk deploy

# Test the endpoints (replace URL with your output)
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/items

curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/prod/items \
  -H "Content-Type: application/json" \
  -d '{"name": "New Widget", "price": 29.99}'
```

## Monitoring Your API

API Gateway provides built-in metrics for latency, error rates, and request counts. For production APIs, you'll want alerting when error rates spike or latency degrades. Consider pairing API Gateway's CloudWatch metrics with a monitoring tool like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) to get a complete picture of your API's health.

## Wrapping Up

CDK makes API Gateway manageable. You define routes, handlers, and policies in code, and CDK handles the CloudFormation complexity underneath. Start simple with Lambda proxy integrations, then layer on validation, API keys, and custom domains as your API matures.

If you're building the database layer too, check out our guide on [creating a DynamoDB table with CDK](https://oneuptime.com/blog/post/create-dynamodb-table-with-cdk/view) - it pairs perfectly with API Gateway and Lambda.
