# How to Use Custom Authorizers with API Gateway and Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Lambda, Security, Authentication

Description: Learn how to build custom Lambda authorizers for API Gateway to implement token-based and request-based authentication for your serverless APIs.

---

API security isn't optional, and hardcoding authentication logic into every Lambda handler is a maintenance nightmare. API Gateway Custom Authorizers (now officially called "Lambda Authorizers") let you centralize your authentication and authorization logic in a dedicated Lambda function. Every request hits the authorizer first, and only proceeds to your backend if it passes.

This approach is clean, reusable, and supports caching - so you're not running auth checks on every single request. Let's build one from scratch.

## Two Types of Lambda Authorizers

API Gateway supports two authorizer types:

**Token-based authorizers** receive the caller's identity in a bearer token (typically a JWT in the Authorization header). This is the most common type.

**Request-based authorizers** receive the caller's identity in a combination of headers, query string parameters, stage variables, and context variables. Use this when your auth scheme is more complex than a single token.

## Building a Token-Based Authorizer

Let's build an authorizer that validates JWTs. This is what you'll use 90% of the time.

This Lambda function validates a JWT token and returns an IAM policy document allowing or denying access:

```javascript
// authorizer/index.js
const jwt = require('jsonwebtoken');

// In production, fetch this from AWS Secrets Manager or Parameter Store
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  const token = event.authorizationToken;

  if (!token) {
    // Returning 'Unauthorized' string triggers a 401 response
    throw new Error('Unauthorized');
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(cleanToken, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'https://auth.example.com',
    });

    // Build the IAM policy
    const policy = generatePolicy(decoded.sub, 'Allow', event.methodArn, {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    });

    console.log('Auth successful for user:', decoded.sub);
    return policy;
  } catch (error) {
    console.error('Auth failed:', error.message);
    throw new Error('Unauthorized');
  }
};

function generatePolicy(principalId, effect, resource, context = {}) {
  // Extract the base ARN to create a wildcard policy
  // This allows the cached policy to work for all methods/resources
  const arnParts = resource.split(':');
  const apiGatewayArn = arnParts[5].split('/');
  const region = arnParts[3];
  const accountId = arnParts[4];
  const apiId = apiGatewayArn[0];
  const stage = apiGatewayArn[1];

  // Wildcard resource to cache across all endpoints
  const wildcardResource = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`;

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: wildcardResource,
        },
      ],
    },
    context: context,  // passed to downstream Lambda via requestContext
  };
}
```

A few things to note here. Throwing `new Error('Unauthorized')` tells API Gateway to return a 401. The `context` object gets passed through to your backend Lambda function in `event.requestContext.authorizer`. This is how you pass user information from the authorizer to your handlers without re-parsing the token.

## Building a Request-Based Authorizer

For more complex auth schemes - like API key validation combined with IP whitelisting - use a request-based authorizer.

This request-based authorizer checks both an API key header and the source IP address:

```javascript
// request-authorizer/index.js
exports.handler = async (event) => {
  console.log('Request authorizer event:', JSON.stringify(event, null, 2));

  const apiKey = event.headers['x-api-key'];
  const sourceIp = event.requestContext?.identity?.sourceIp;

  // Validate API key
  const keyRecord = await validateApiKey(apiKey);
  if (!keyRecord) {
    throw new Error('Unauthorized');
  }

  // Check IP whitelist if configured
  if (keyRecord.ipWhitelist && keyRecord.ipWhitelist.length > 0) {
    if (!keyRecord.ipWhitelist.includes(sourceIp)) {
      console.warn(`IP ${sourceIp} not in whitelist for key ${keyRecord.clientId}`);
      throw new Error('Unauthorized');
    }
  }

  // Check rate limits, scopes, etc.
  const allowedResources = keyRecord.allowedResources || ['*'];

  return {
    principalId: keyRecord.clientId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        },
      ],
    },
    context: {
      clientId: keyRecord.clientId,
      tier: keyRecord.tier,
    },
  };
};

async function validateApiKey(apiKey) {
  if (!apiKey) return null;

  // In production, look this up in DynamoDB or a cache
  const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  const result = await client.send(new GetItemCommand({
    TableName: 'api-keys',
    Key: { apiKey: { S: apiKey } },
  }));

  if (!result.Item) return null;

  return {
    clientId: result.Item.clientId.S,
    tier: result.Item.tier.S,
    ipWhitelist: result.Item.ipWhitelist?.SS || [],
  };
}
```

## Deploying with AWS CDK

Here's how to wire up a Lambda authorizer with API Gateway using CDK.

This CDK stack creates an API with a token-based Lambda authorizer and configures caching:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class AuthApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The authorizer Lambda function
    const authorizerFn = new lambda.Function(this, 'AuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/authorizer'),
      environment: {
        JWT_SECRET: 'your-secret-here', // use Secrets Manager in production
      },
    });

    // The business logic Lambda function
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
    });

    // Create the API
    const api = new apigateway.RestApi(this, 'SecureApi', {
      restApiName: 'Secure Service',
    });

    // Create the Lambda authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'JwtAuthorizer', {
      handler: authorizerFn,
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5), // cache auth results
    });

    // Attach the authorizer to API methods
    const items = api.root.addResource('items');
    items.addMethod('GET', new apigateway.LambdaIntegration(apiHandler), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    items.addMethod('POST', new apigateway.LambdaIntegration(apiHandler), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
  }
}
```

## Accessing Authorizer Context in Your Handler

The context values you set in the authorizer response are available in your backend Lambda.

This handler reads user information from the authorizer context:

```javascript
// api/index.js
exports.handler = async (event) => {
  // Access the authorizer context
  const userId = event.requestContext.authorizer.userId;
  const email = event.requestContext.authorizer.email;
  const role = event.requestContext.authorizer.role;

  console.log(`Request from user ${userId} (${email}), role: ${role}`);

  // Use the role for fine-grained authorization
  if (event.httpMethod === 'DELETE' && role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'Admin access required' }),
    };
  }

  // Process the request...
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Hello, ${email}` }),
  };
};
```

Note that all context values are strings. Even if you set a number in the authorizer context, it arrives as a string in the handler.

## Authorization Caching

Caching is one of the best features of Lambda authorizers. Instead of running the authorizer function on every request, API Gateway caches the generated policy for a configurable TTL.

For token-based authorizers, the cache key is the token itself. For request-based authorizers, you specify which identity sources form the cache key.

A few things to keep in mind with caching:

- The default TTL is 300 seconds (5 minutes). Set it to 0 to disable caching.
- The cached policy applies to all methods that use the same authorizer. If your policy uses a specific method ARN instead of a wildcard, cached results won't work for other endpoints.
- If a user's permissions change, they won't take effect until the cache expires. For security-sensitive applications, keep the TTL short.

## Handling Authorization Failures Gracefully

By default, a failed authorization returns a generic 401 or 403 with a minimal body. You can customize these responses with Gateway Responses.

This CDK configuration customizes the unauthorized response:

```typescript
api.addGatewayResponse('UnauthorizedResponse', {
  type: apigateway.ResponseType.UNAUTHORIZED,
  statusCode: '401',
  responseHeaders: {
    'Access-Control-Allow-Origin': "'*'",
  },
  templates: {
    'application/json': JSON.stringify({
      message: 'Authentication required. Please provide a valid token.',
      code: 'UNAUTHORIZED',
    }),
  },
});

api.addGatewayResponse('AccessDeniedResponse', {
  type: apigateway.ResponseType.ACCESS_DENIED,
  statusCode: '403',
  responseHeaders: {
    'Access-Control-Allow-Origin': "'*'",
  },
  templates: {
    'application/json': JSON.stringify({
      message: 'You do not have permission to access this resource.',
      code: 'FORBIDDEN',
    }),
  },
});
```

Don't forget the CORS headers in your gateway responses. If a preflight request succeeds but the authorizer fails, the browser needs CORS headers on the 401/403 response to show the actual error. For more on CORS, see our post on [handling CORS in Lambda behind API Gateway](https://oneuptime.com/blog/post/handle-cors-lambda-api-gateway/view).

## Wrapping Up

Lambda authorizers give you complete control over API authentication. You can validate JWTs, check API keys, query databases, call external identity providers - whatever your auth scheme requires. The caching layer keeps performance snappy, and the context passthrough eliminates redundant token parsing in your handlers.

Start with a token-based authorizer for JWT validation, enable caching with a reasonable TTL, and use the authorizer context to pass user information to your backend. It's a pattern that scales cleanly across dozens or hundreds of API endpoints.
