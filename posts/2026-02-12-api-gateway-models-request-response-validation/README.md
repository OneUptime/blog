# How to Use API Gateway Models for Request/Response Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Serverless

Description: Learn how to define API Gateway models using JSON Schema to validate request bodies and response payloads before they reach your backend.

---

If you're not validating request bodies at the API Gateway level, every malformed request hits your Lambda function, wastes compute, and forces you to write validation code in every handler. API Gateway models let you define the expected shape of requests and responses using JSON Schema. Invalid requests get rejected with a 400 error before they ever reach your backend.

## Why Validate at the Gateway

There are three good reasons to validate at API Gateway instead of (or in addition to) your backend:

1. **Cost savings** - Invalid requests are rejected immediately. No Lambda invocation, no compute charges.
2. **Consistency** - One validation definition covers all integrations behind that endpoint. You don't need to duplicate validation logic in every handler.
3. **Documentation** - Models serve double duty as API documentation. They describe exactly what your API expects.

## Creating a Model

Models in API Gateway are JSON Schema definitions attached to your API. You define them once and reference them in request validators.

Create a model for an order request:

```bash
# Create a model for order creation
aws apigateway create-model \
  --rest-api-id abc123api \
  --name "CreateOrderRequest" \
  --content-type "application/json" \
  --schema '{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "CreateOrderRequest",
    "type": "object",
    "properties": {
      "customer_id": {
        "type": "string",
        "pattern": "^CUST-[0-9]{6}$"
      },
      "items": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "properties": {
            "product_id": {"type": "string"},
            "quantity": {"type": "integer", "minimum": 1, "maximum": 100},
            "unit_price": {"type": "number", "minimum": 0.01}
          },
          "required": ["product_id", "quantity", "unit_price"]
        }
      },
      "shipping_address": {
        "type": "object",
        "properties": {
          "street": {"type": "string", "minLength": 1},
          "city": {"type": "string", "minLength": 1},
          "state": {"type": "string", "pattern": "^[A-Z]{2}$"},
          "zip": {"type": "string", "pattern": "^[0-9]{5}$"}
        },
        "required": ["street", "city", "state", "zip"]
      },
      "notes": {
        "type": "string",
        "maxLength": 500
      }
    },
    "required": ["customer_id", "items", "shipping_address"]
  }'
```

Note that API Gateway uses JSON Schema draft-04, not the latest draft. Some newer features like `if/then/else` aren't supported.

## Creating a Request Validator

Models alone don't validate anything. You need to create a request validator and attach it to your method.

Create a validator that checks request bodies:

```bash
# Create a request validator
aws apigateway create-request-validator \
  --rest-api-id abc123api \
  --name "ValidateBody" \
  --validate-request-body \
  --no-validate-request-parameters

# You can also validate query parameters and headers
aws apigateway create-request-validator \
  --rest-api-id abc123api \
  --name "ValidateAll" \
  --validate-request-body \
  --validate-request-parameters
```

## Attaching Validation to a Method

Now wire the model and validator to a specific API method.

Set up validation on the POST method:

```bash
# Update the method to use the validator and model
aws apigateway update-method \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method POST \
  --patch-operations \
    op=replace,path=/requestValidatorId,value=validator789 \
    op=replace,path=/requestModels/application~1json,value=CreateOrderRequest

# Deploy the changes
aws apigateway create-deployment \
  --rest-api-id abc123api \
  --stage-name prod
```

The `~1` in the path is the JSON Pointer encoding for `/` in `application/json`.

## CloudFormation Example

Here's a complete CloudFormation template that sets up an API with model validation:

```yaml
Resources:
  MyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: validated-api

  OrdersResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref MyApi
      ParentId: !GetAtt MyApi.RootResourceId
      PathPart: orders

  # Define the request model
  OrderModel:
    Type: AWS::ApiGateway::Model
    Properties:
      RestApiId: !Ref MyApi
      ContentType: application/json
      Name: CreateOrderRequest
      Schema:
        $schema: "http://json-schema.org/draft-04/schema#"
        title: CreateOrderRequest
        type: object
        properties:
          customer_id:
            type: string
          items:
            type: array
            minItems: 1
            items:
              type: object
              properties:
                product_id:
                  type: string
                quantity:
                  type: integer
                  minimum: 1
              required:
                - product_id
                - quantity
        required:
          - customer_id
          - items

  # Define the response model
  OrderResponseModel:
    Type: AWS::ApiGateway::Model
    Properties:
      RestApiId: !Ref MyApi
      ContentType: application/json
      Name: OrderResponse
      Schema:
        $schema: "http://json-schema.org/draft-04/schema#"
        title: OrderResponse
        type: object
        properties:
          order_id:
            type: string
          status:
            type: string
          created_at:
            type: string

  # Create the validator
  BodyValidator:
    Type: AWS::ApiGateway::RequestValidator
    Properties:
      RestApiId: !Ref MyApi
      Name: ValidateBody
      ValidateRequestBody: true
      ValidateRequestParameters: false

  # Method with validation
  PostOrderMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MyApi
      ResourceId: !Ref OrdersResource
      HttpMethod: POST
      AuthorizationType: NONE
      RequestValidatorId: !Ref BodyValidator
      RequestModels:
        application/json: !Ref OrderModel
      MethodResponses:
        - StatusCode: "200"
          ResponseModels:
            application/json: !Ref OrderResponseModel
        - StatusCode: "400"
          ResponseModels:
            application/json: Error
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateOrderFunction.Arn}/invocations"
```

## Referencing Other Models

You can reference models from other models using the `$ref` keyword. This helps you reuse common schemas.

Create a shared address model and reference it from other models:

```bash
# Create a reusable address model
aws apigateway create-model \
  --rest-api-id abc123api \
  --name "Address" \
  --content-type "application/json" \
  --schema '{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "Address",
    "type": "object",
    "properties": {
      "street": {"type": "string"},
      "city": {"type": "string"},
      "state": {"type": "string"},
      "zip": {"type": "string"}
    },
    "required": ["street", "city", "state", "zip"]
  }'

# Reference it from another model
aws apigateway create-model \
  --rest-api-id abc123api \
  --name "Customer" \
  --content-type "application/json" \
  --schema '{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "Customer",
    "type": "object",
    "properties": {
      "name": {"type": "string"},
      "email": {"type": "string"},
      "billing_address": {
        "$ref": "https://apigateway.amazonaws.com/restapis/abc123api/models/Address"
      },
      "shipping_address": {
        "$ref": "https://apigateway.amazonaws.com/restapis/abc123api/models/Address"
      }
    },
    "required": ["name", "email"]
  }'
```

The `$ref` URL format is specific to API Gateway. It uses the API ID and model name to resolve references.

## Customizing Error Responses

When validation fails, API Gateway returns a generic 400 error. You can customize this with a Gateway Response.

Configure a custom validation error response:

```bash
# Customize the validation error response
aws apigateway put-gateway-response \
  --rest-api-id abc123api \
  --response-type BAD_REQUEST_BODY \
  --response-templates '{
    "application/json": "{\"error\": \"Validation failed\", \"details\": \"$context.error.validationErrorString\"}"
  }' \
  --status-code 400
```

In CloudFormation:

```yaml
ValidationErrorResponse:
  Type: AWS::ApiGateway::GatewayResponse
  Properties:
    RestApiId: !Ref MyApi
    ResponseType: BAD_REQUEST_BODY
    StatusCode: "400"
    ResponseTemplates:
      application/json: |
        {
          "error": "Request validation failed",
          "message": "$context.error.validationErrorString",
          "request_id": "$context.requestId"
        }
```

## Validating Query Parameters and Headers

Models handle body validation, but you can also validate required query parameters and headers using request parameters.

Require specific query parameters and headers:

```yaml
GetOrderMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    RestApiId: !Ref MyApi
    ResourceId: !Ref OrderResource
    HttpMethod: GET
    AuthorizationType: NONE
    RequestValidatorId: !Ref ParamValidator
    RequestParameters:
      method.request.querystring.status: true     # Required query param
      method.request.querystring.page: false       # Optional query param
      method.request.header.X-Request-Id: true     # Required header
    Integration:
      Type: AWS_PROXY
      IntegrationHttpMethod: POST
      Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetOrderFunction.Arn}/invocations"
```

## Testing Validation

Test your validation setup by sending invalid requests:

```bash
# Valid request - should return 200
curl -X POST \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-123456",
    "items": [{"product_id": "PROD-1", "quantity": 2, "unit_price": 29.99}],
    "shipping_address": {"street": "123 Main St", "city": "Springfield", "state": "IL", "zip": "62701"}
  }'

# Invalid request - missing required field, should return 400
curl -X POST \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "CUST-123456"}'

# Invalid request - wrong type, should return 400
curl -X POST \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-123456",
    "items": [{"product_id": "PROD-1", "quantity": "not-a-number", "unit_price": 29.99}],
    "shipping_address": {"street": "123 Main St", "city": "Springfield", "state": "IL", "zip": "62701"}
  }'
```

For monitoring validation failure rates and tracking API health metrics, check out our guide on [API monitoring best practices](https://oneuptime.com/blog/post/2026-01-26-restful-api-best-practices/view).

## Wrapping Up

API Gateway models give you a declarative way to validate request payloads before they reach your backend. It's a free optimization - you save on Lambda invocations for invalid requests and get consistent validation without writing code. The main limitation is the JSON Schema draft-04 restriction, which means you can't use some newer schema features. But for most validation needs, draft-04 covers everything you'll need. Define your models, create a validator, attach them to your methods, and deploy.
