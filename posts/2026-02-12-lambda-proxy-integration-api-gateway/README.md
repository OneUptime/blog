# How to Set Up Lambda Proxy Integration with API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, API Gateway, Serverless

Description: Step-by-step guide to configuring Lambda Proxy Integration with API Gateway for building REST APIs with full control over HTTP requests and responses.

---

If you've ever built a REST API with AWS Lambda and API Gateway, you've probably encountered two integration types: Lambda integration and Lambda proxy integration. The proxy variant is by far the more popular choice, and for good reason. It gives your Lambda function direct access to the full HTTP request and expects a specific response format in return. No mapping templates, no velocity template language, no headaches.

Let's break down how Lambda proxy integration works and how to set it up properly.

## Lambda Proxy vs. Non-Proxy Integration

With standard Lambda integration (sometimes called "custom integration"), API Gateway transforms the incoming request using mapping templates before passing it to your Lambda function. You define how the request is shaped, and you define how the response is shaped on the way back out. It's powerful but verbose.

Lambda proxy integration skips all of that. API Gateway passes the entire HTTP request as a structured event to your Lambda function, and your function is responsible for returning a properly formatted HTTP response. It's simpler, more flexible, and lets you handle everything in your application code.

## The Proxy Integration Event Format

When API Gateway uses proxy integration, your Lambda function receives an event object that looks like this:

```json
{
  "resource": "/orders/{orderId}",
  "path": "/orders/12345",
  "httpMethod": "GET",
  "headers": {
    "Accept": "application/json",
    "Authorization": "Bearer eyJhbGciOi...",
    "Host": "api.example.com"
  },
  "queryStringParameters": {
    "status": "active",
    "limit": "10"
  },
  "pathParameters": {
    "orderId": "12345"
  },
  "body": null,
  "isBase64Encoded": false,
  "requestContext": {
    "accountId": "123456789012",
    "stage": "prod",
    "requestId": "abc-123",
    "identity": {
      "sourceIp": "203.0.113.1"
    }
  }
}
```

You get everything: headers, query parameters, path parameters, the body, and request context. No mapping templates needed.

## The Required Response Format

Your Lambda function must return a response in this exact format. API Gateway won't know what to do with anything else.

This response object tells API Gateway to return a 200 status with JSON body and CORS headers:

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"orderId\":\"12345\",\"status\":\"active\"}"
}
```

Note that `body` must be a string, not an object. This trips up a lot of people. You need to `JSON.stringify()` your response body.

## Building a Complete API Handler in Node.js

Here's a practical Lambda handler that demonstrates routing, error handling, and proper response formatting.

This handler implements a basic CRUD API for orders with proper HTTP method routing:

```javascript
// index.js - Lambda handler for orders API
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const { httpMethod, path, pathParameters, body } = event;

  try {
    let result;

    switch (httpMethod) {
      case 'GET':
        if (pathParameters && pathParameters.orderId) {
          result = await getOrder(pathParameters.orderId);
        } else {
          result = await listOrders(event.queryStringParameters);
        }
        break;

      case 'POST':
        const createPayload = JSON.parse(body || '{}');
        result = await createOrder(createPayload);
        return formatResponse(201, result);

      case 'PUT':
        const updatePayload = JSON.parse(body || '{}');
        result = await updateOrder(pathParameters.orderId, updatePayload);
        break;

      case 'DELETE':
        await deleteOrder(pathParameters.orderId);
        return formatResponse(204, null);

      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.name === 'NotFoundError') {
      return formatResponse(404, { message: error.message });
    }
    if (error.name === 'ValidationError') {
      return formatResponse(400, { message: error.message });
    }

    return formatResponse(500, { message: 'Internal server error' });
  }
};

// Helper to format responses consistently
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: body ? JSON.stringify(body) : '',
  };
}
```

## Setting Up with AWS CDK

CDK makes the API Gateway and Lambda integration clean and declarative.

This CDK stack creates an API Gateway REST API with Lambda proxy integration for an orders resource:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class OrdersApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const ordersHandler = new lambda.Function(this, 'OrdersHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/orders'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: 'orders-table',
      },
    });

    // Create the API Gateway REST API
    const api = new apigateway.RestApi(this, 'OrdersApi', {
      restApiName: 'Orders Service',
      description: 'API for managing orders',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
    });

    // Create the /orders resource with proxy integration
    const orders = api.root.addResource('orders');
    orders.addMethod('GET', new apigateway.LambdaIntegration(ordersHandler, {
      proxy: true,  // this enables proxy integration
    }));
    orders.addMethod('POST', new apigateway.LambdaIntegration(ordersHandler, {
      proxy: true,
    }));

    // Create /orders/{orderId} resource
    const singleOrder = orders.addResource('{orderId}');
    singleOrder.addMethod('GET', new apigateway.LambdaIntegration(ordersHandler, {
      proxy: true,
    }));
    singleOrder.addMethod('PUT', new apigateway.LambdaIntegration(ordersHandler, {
      proxy: true,
    }));
    singleOrder.addMethod('DELETE', new apigateway.LambdaIntegration(ordersHandler, {
      proxy: true,
    }));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
```

In CDK, `proxy: true` is actually the default for `LambdaIntegration`, so you can omit it. I'm including it here to be explicit about what's happening.

## Setting Up with SAM Template

AWS SAM provides an even more concise way to define this.

This SAM template defines an API with Lambda proxy integration using implicit API events:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 256
      Events:
        ListOrders:
          Type: Api
          Properties:
            Path: /orders
            Method: get
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
        GetOrder:
          Type: Api
          Properties:
            Path: /orders/{orderId}
            Method: get
        UpdateOrder:
          Type: Api
          Properties:
            Path: /orders/{orderId}
            Method: put
        DeleteOrder:
          Type: Api
          Properties:
            Path: /orders/{orderId}
            Method: delete
```

SAM uses Lambda proxy integration by default for API events. You don't even have to configure it.

## Handling Binary Data

Proxy integration can handle binary content too, but you need to configure API Gateway to recognize binary media types.

This CDK configuration enables binary support for image uploads:

```typescript
const api = new apigateway.RestApi(this, 'OrdersApi', {
  restApiName: 'Orders Service',
  binaryMediaTypes: ['image/png', 'image/jpeg', 'application/octet-stream'],
});
```

In your Lambda function, check `isBase64Encoded` on the incoming event and decode accordingly:

```javascript
if (event.isBase64Encoded) {
  const buffer = Buffer.from(event.body, 'base64');
  // Process the binary data
}
```

When returning binary data, set `isBase64Encoded: true` in your response and base64-encode the body.

## Common Gotchas

**Forgetting to stringify the body.** The response body must be a string. Returning a raw object will cause a 502 Bad Gateway error.

**Missing CORS headers.** Proxy integration means you're responsible for CORS. API Gateway won't add headers for you. Check out our guide on [handling CORS in Lambda behind API Gateway](https://oneuptime.com/blog/post/handle-cors-lambda-api-gateway/view) for details.

**502 errors with no obvious cause.** If your Lambda function throws an unhandled exception or returns a malformed response, API Gateway returns 502. Always wrap your handler in try/catch and return a proper error response.

**Null query parameters.** If no query string parameters are present, `queryStringParameters` will be `null`, not an empty object. Always use defensive coding: `event.queryStringParameters || {}`.

## Performance Considerations

Proxy integration has slightly less overhead than custom integration because API Gateway doesn't need to process mapping templates. The difference is small - a few milliseconds at most - but in latency-sensitive APIs, every bit counts.

For cold start optimization, keep your handler lean. The proxy integration event is larger than a custom-mapped event, but parsing it is negligible compared to typical cold start times. Focus your optimization efforts on the function initialization code instead.

## Wrapping Up

Lambda proxy integration is the path of least resistance for building REST APIs with API Gateway and Lambda. It trades the complexity of mapping templates for straightforward request/response handling in your application code. For most APIs, that's exactly the right tradeoff.

Start with proxy integration, and only switch to custom integration if you have a specific need for request transformation at the API Gateway layer.
