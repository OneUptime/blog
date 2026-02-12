# How to Implement Request Validation with API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Validation, REST API, Serverless

Description: Implement request validation in AWS API Gateway using request models, validators, and JSON Schema to reject bad requests before they reach your Lambda functions.

---

Every request that reaches your Lambda function costs you money and compute time. If you're doing basic validation in your handler - checking required fields, validating data types, verifying formats - you're paying for work that API Gateway can do for free. Request validation in API Gateway rejects invalid requests at the gateway level, before they ever trigger your backend.

Let's set it up properly.

## Why Validate at the Gateway

There are several good reasons to validate in API Gateway:

- **Cost savings** - Invalid requests never invoke your Lambda function
- **Consistency** - Validation rules are defined in one place, not scattered across handlers
- **Speed** - API Gateway validation is faster than Lambda cold starts
- **Security** - Blocks malformed payloads before they touch your code

API Gateway supports validating request bodies, query string parameters, and headers using JSON Schema.

## Basic Request Validation

Here's a REST API with request validation using CDK.

```typescript
// CDK stack with API Gateway request validation
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApiValidationStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const api = new apigateway.RestApi(this, 'ValidatedApi', {
      restApiName: 'Validated API',
      description: 'API with request validation',
    });

    // Create a request validator
    const validator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: api,
      requestValidatorName: 'validate-body',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // Define the request model (JSON Schema)
    const createUserModel = api.addModel('CreateUserModel', {
      contentType: 'application/json',
      modelName: 'CreateUserModel',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['email', 'name'],
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING,
            format: 'email',
            minLength: 5,
            maxLength: 254,
          },
          name: {
            type: apigateway.JsonSchemaType.STRING,
            minLength: 1,
            maxLength: 100,
          },
          age: {
            type: apigateway.JsonSchemaType.INTEGER,
            minimum: 0,
            maximum: 150,
          },
          role: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['admin', 'user', 'moderator'],
          },
          preferences: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              newsletter: { type: apigateway.JsonSchemaType.BOOLEAN },
              theme: {
                type: apigateway.JsonSchemaType.STRING,
                enum: ['light', 'dark'],
              },
            },
          },
        },
        additionalProperties: false, // Reject unknown fields
      },
    });

    // Add the endpoint with validation
    const users = api.root.addResource('users');
    users.addMethod('POST', new apigateway.LambdaIntegration(handler), {
      requestValidator: validator,
      requestModels: {
        'application/json': createUserModel,
      },
    });
  }
}
```

When a request doesn't match the schema, API Gateway returns a 400 error without invoking Lambda.

```bash
# This gets rejected - missing required "name" field
curl -X POST https://api-id.execute-api.us-east-1.amazonaws.com/prod/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Response: {"message": "Invalid request body"}
```

## Validating Query String Parameters and Headers

You can also validate that required query parameters and headers are present.

```typescript
// Validate query string parameters and headers
const searchUsers = users.addResource('search');
searchUsers.addMethod('GET', new apigateway.LambdaIntegration(handler), {
  requestValidator: new apigateway.RequestValidator(this, 'ParamValidator', {
    restApi: api,
    requestValidatorName: 'validate-params',
    validateRequestParameters: true,
  }),
  requestParameters: {
    'method.request.querystring.q': true,            // Required
    'method.request.querystring.page': false,         // Optional
    'method.request.querystring.limit': false,        // Optional
    'method.request.header.X-Api-Key': true,          // Required header
  },
});
```

## Complex Schema Validation

JSON Schema supports sophisticated validation patterns. Here's a more complex example for an order creation endpoint.

```typescript
// Complex order validation schema
const createOrderModel = api.addModel('CreateOrderModel', {
  contentType: 'application/json',
  modelName: 'CreateOrderModel',
  schema: {
    type: apigateway.JsonSchemaType.OBJECT,
    required: ['items', 'shippingAddress', 'paymentMethod'],
    properties: {
      items: {
        type: apigateway.JsonSchemaType.ARRAY,
        minItems: 1,
        maxItems: 100,
        items: {
          type: apigateway.JsonSchemaType.OBJECT,
          required: ['productId', 'quantity'],
          properties: {
            productId: {
              type: apigateway.JsonSchemaType.STRING,
              pattern: '^[A-Z0-9]{8,12}$', // Matches product ID format
            },
            quantity: {
              type: apigateway.JsonSchemaType.INTEGER,
              minimum: 1,
              maximum: 999,
            },
            notes: {
              type: apigateway.JsonSchemaType.STRING,
              maxLength: 500,
            },
          },
        },
      },
      shippingAddress: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['street', 'city', 'state', 'zipCode', 'country'],
        properties: {
          street: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          city: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          state: { type: apigateway.JsonSchemaType.STRING, minLength: 2, maxLength: 2 },
          zipCode: {
            type: apigateway.JsonSchemaType.STRING,
            pattern: '^\\d{5}(-\\d{4})?$', // US zip code format
          },
          country: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['US', 'CA', 'GB', 'DE', 'FR'],
          },
        },
      },
      paymentMethod: {
        type: apigateway.JsonSchemaType.STRING,
        enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
      },
      couponCode: {
        type: apigateway.JsonSchemaType.STRING,
        pattern: '^[A-Z0-9]{6,10}$',
      },
    },
  },
});
```

## Custom Error Responses

The default validation error message from API Gateway is generic. Customize it with Gateway Responses.

```typescript
// Custom 400 error response
api.addGatewayResponse('ValidationError', {
  type: apigateway.ResponseType.BAD_REQUEST_BODY,
  statusCode: '400',
  responseHeaders: {
    'Access-Control-Allow-Origin': "'*'",
  },
  templates: {
    'application/json': JSON.stringify({
      error: 'Validation Error',
      message: "$context.error.validationErrorString",
      requestId: "$context.requestId",
    }),
  },
});
```

Now validation errors return more useful information.

```json
{
  "error": "Validation Error",
  "message": "[object has missing required properties ([\"name\"])]",
  "requestId": "abc123-def456"
}
```

## HTTP API vs REST API Validation

Note that HTTP APIs (the newer, cheaper API Gateway type) have limited built-in validation compared to REST APIs. If you need comprehensive request validation at the gateway level, REST APIs are the way to go.

For HTTP APIs, you'll need to handle validation in your Lambda function or use a Lambda authorizer for basic checks.

```javascript
// Lambda-based validation for HTTP APIs
exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}');

  // Validate with a library like Joi or Zod
  const { error, value } = schema.validate(body, { abortEarly: false });

  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      }),
    };
  }

  // Process validated data
  return processRequest(value);
};
```

## Combining Gateway and Application Validation

Gateway validation handles structural validation - are the right fields present, are they the right types. Business logic validation still belongs in your application.

```javascript
// Lambda handler - only business logic validation needed
exports.handler = async (event) => {
  // Structure is already validated by API Gateway
  const body = JSON.parse(event.body);

  // Business logic validation
  const product = await getProduct(body.items[0].productId);
  if (!product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  if (product.stock < body.items[0].quantity) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Insufficient stock' }) };
  }

  // All good - process the order
  return createOrder(body);
};
```

For monitoring validation errors and API health, take a look at our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Summary

Request validation in API Gateway is a low-effort, high-impact optimization. Define your request schemas with JSON Schema, attach validators to your endpoints, and let API Gateway reject bad requests before they cost you Lambda invocations. Use it for structural validation and keep business logic validation in your application code. It's one of those features that takes 30 minutes to set up but saves you time, money, and headaches for the life of your API.
