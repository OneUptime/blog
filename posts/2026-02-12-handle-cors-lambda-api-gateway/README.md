# How to Handle CORS in Lambda Behind API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, API Gateway, CORS, Serverless

Description: Complete guide to properly configuring Cross-Origin Resource Sharing (CORS) for Lambda functions behind API Gateway, covering both REST and HTTP APIs.

---

CORS errors are probably the most common headache when building serverless APIs with Lambda and API Gateway. You deploy your API, try to call it from your frontend, and get slapped with: "Access to XMLHttpRequest has been blocked by CORS policy." It's frustrating because the fix seems simple, but there are multiple places where CORS configuration needs to happen, and getting any one of them wrong means the browser blocks your request.

Let's sort this out once and for all.

## What CORS Actually Does

Cross-Origin Resource Sharing is a browser security mechanism. When your frontend at `https://app.example.com` makes a request to your API at `https://api.example.com`, the browser considers that a cross-origin request. Before sending the actual request, the browser might send a preflight OPTIONS request to ask the API: "Are you okay receiving requests from this origin?"

The API needs to respond with the right headers:
- `Access-Control-Allow-Origin` - which origins are allowed
- `Access-Control-Allow-Methods` - which HTTP methods are allowed
- `Access-Control-Allow-Headers` - which headers the client can send
- `Access-Control-Max-Age` - how long the browser can cache the preflight response

If these headers are missing or wrong, the browser refuses to process the response. Your API might be returning data perfectly fine, but the browser throws it away.

## The Two-Part Problem

With Lambda proxy integration, CORS configuration has two parts:

1. **The OPTIONS preflight request** - needs to return CORS headers
2. **The actual request (GET, POST, etc.)** - also needs to return CORS headers

Many tutorials only show you one or the other. You need both.

## Part 1: Handling the Preflight OPTIONS Request

The browser sends an OPTIONS request before any "non-simple" request. This includes requests with custom headers (like Authorization), non-standard Content-Type values, or methods like PUT and DELETE.

Your Lambda function needs to handle OPTIONS requests and return the right headers.

This handler demonstrates proper OPTIONS preflight handling alongside regular API responses:

```javascript
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://app.example.com',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Max-Age': '86400',  // cache preflight for 24 hours
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Your actual business logic here
  try {
    const data = await processRequest(event);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,  // include CORS headers in every response
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,  // even error responses need CORS headers
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
```

The critical detail: CORS headers must be present on every response, including error responses. If your function returns a 500 without CORS headers, the browser shows a CORS error instead of the actual error, which makes debugging a nightmare.

## Part 2: API Gateway CORS Configuration

For REST APIs, you also need to configure the OPTIONS method on each resource in API Gateway. With Lambda proxy integration, you have two approaches.

### Approach A: Let Lambda Handle Everything

Route the OPTIONS method to your Lambda function just like any other method. The Lambda code above handles it.

This CDK configuration routes OPTIONS requests to the same Lambda function:

```typescript
const api = new apigateway.RestApi(this, 'MyApi', {
  restApiName: 'My Service',
});

const items = api.root.addResource('items');
const lambdaIntegration = new apigateway.LambdaIntegration(handler, {
  proxy: true,
});

// Add all methods including OPTIONS
items.addMethod('GET', lambdaIntegration);
items.addMethod('POST', lambdaIntegration);
items.addMethod('OPTIONS', lambdaIntegration);
```

### Approach B: Use API Gateway's Built-in CORS (Mock Integration)

API Gateway can handle OPTIONS preflight requests itself without invoking Lambda. This saves you a Lambda invocation.

This CDK configuration uses API Gateway's built-in CORS support for REST APIs:

```typescript
const api = new apigateway.RestApi(this, 'MyApi', {
  restApiName: 'My Service',
  defaultCorsPreflightOptions: {
    allowOrigins: ['https://app.example.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
    maxAge: cdk.Duration.days(1),
  },
});
```

With this approach, API Gateway handles the OPTIONS preflight, but you still need to include CORS headers in your Lambda function responses for the actual requests.

## HTTP API (API Gateway v2) CORS Configuration

If you're using HTTP APIs instead of REST APIs, CORS configuration is simpler. HTTP APIs have built-in CORS support that automatically adds headers to all responses.

This CDK configuration sets up CORS for an HTTP API:

```typescript
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const httpApi = new apigatewayv2.HttpApi(this, 'MyHttpApi', {
  corsPreflight: {
    allowOrigins: ['https://app.example.com'],
    allowMethods: [
      apigatewayv2.CorsHttpMethod.GET,
      apigatewayv2.CorsHttpMethod.POST,
      apigatewayv2.CorsHttpMethod.PUT,
      apigatewayv2.CorsHttpMethod.DELETE,
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: cdk.Duration.days(1),
    allowCredentials: true,
  },
});

httpApi.addRoutes({
  path: '/items',
  methods: [apigatewayv2.HttpMethod.GET],
  integration: new integrations.HttpLambdaIntegration('GetItems', handler),
});
```

With HTTP APIs, the CORS headers are added by the gateway itself, so you don't need to add them in your Lambda function. That's a nice improvement over REST APIs.

## SAM Template CORS Configuration

For SAM templates, you configure CORS at the API level.

This SAM template sets up CORS for both preflight and actual responses:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Api:
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'https://app.example.com'"
      MaxAge: "'86400'"

Resources:
  ItemsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Events:
        GetItems:
          Type: Api
          Properties:
            Path: /items
            Method: get
        CreateItem:
          Type: Api
          Properties:
            Path: /items
            Method: post
```

Note the nested quotes - SAM needs both single and double quotes for CORS values. It's a common source of confusion.

## Handling Multiple Origins

The `Access-Control-Allow-Origin` header only accepts a single origin or the wildcard `*`. If you need to support multiple specific origins, you have to check the request's `Origin` header dynamically.

This function dynamically sets the allowed origin based on a whitelist:

```javascript
const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://staging.example.com',
  'http://localhost:3000',  // for local development
];

function getCorsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',  // important for caching when origin varies
  };
}
```

The `Vary: Origin` header is important. It tells caches (including CloudFront) that the response varies based on the Origin header, so they don't serve a cached response with the wrong origin.

## CORS with Credentials

If your frontend sends cookies or Authorization headers, you need `Access-Control-Allow-Credentials: true`. But here's the catch - you can't use `Access-Control-Allow-Origin: *` with credentials. You must specify the exact origin.

```javascript
// This will NOT work with credentials
headers['Access-Control-Allow-Origin'] = '*';
headers['Access-Control-Allow-Credentials'] = 'true';

// This WILL work
headers['Access-Control-Allow-Origin'] = 'https://app.example.com';
headers['Access-Control-Allow-Credentials'] = 'true';
```

## Debugging CORS Issues

When you hit a CORS error, here's a systematic approach to debug it:

1. Open browser DevTools, go to the Network tab
2. Look for the OPTIONS preflight request - is it returning 200?
3. Check the response headers on the OPTIONS request - are all CORS headers present?
4. Check the response headers on the actual request - are CORS headers present there too?
5. Compare the `Origin` in your request with `Access-Control-Allow-Origin` in the response

If the OPTIONS request is returning 403, you probably don't have the OPTIONS method configured in API Gateway. If it's returning 500, your Lambda function might be crashing when it receives the OPTIONS request.

For deeper debugging with CloudWatch, check out our post on [debugging Lambda functions with CloudWatch Logs](https://oneuptime.com/blog/post/debug-lambda-functions-cloudwatch-logs/view).

## A Complete CORS Middleware Pattern

For production code, create a reusable CORS wrapper.

This middleware function handles CORS for any Lambda handler:

```javascript
function withCors(handler, options = {}) {
  const allowedOrigins = options.origins || ['*'];

  return async (event) => {
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    const corsOrigin = isAllowed ? (allowedOrigins.includes('*') ? '*' : origin) : '';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      ...(allowedOrigins.includes('*') ? {} : { 'Vary': 'Origin' }),
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    // Call the actual handler
    const response = await handler(event);
    response.headers = { ...response.headers, ...corsHeaders };
    return response;
  };
}

// Usage
const myHandler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello' }),
  };
};

exports.handler = withCors(myHandler, {
  origins: ['https://app.example.com', 'http://localhost:3000'],
});
```

## Wrapping Up

CORS with API Gateway and Lambda boils down to three things: handle the OPTIONS preflight, include CORS headers on every response (including errors), and match your origin configuration to your frontend domains. Get those right, and you'll never see a CORS error again. Well, almost never.
