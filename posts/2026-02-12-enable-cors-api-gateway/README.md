# How to Enable CORS Properly on API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, CORS, Web Development

Description: A practical guide to correctly configuring CORS on AWS API Gateway for both REST and HTTP APIs, including common pitfalls and debugging tips.

---

CORS issues are the bane of every web developer's existence. You build a frontend, point it at your API Gateway backend, and immediately get "Access to XMLHttpRequest has been blocked by CORS policy." Getting CORS right on API Gateway requires configuring it in multiple places, and missing any one of them breaks the whole thing.

## What CORS Actually Does

CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When your frontend at `https://app.example.com` makes a request to your API at `https://api.example.com`, the browser checks if the API explicitly allows requests from that origin. If the API doesn't include the right headers in its response, the browser blocks the request.

There are two types of CORS requests:
- **Simple requests** - GET, HEAD, POST with standard content types. The browser sends the request and checks the response headers.
- **Preflight requests** - For anything else (PUT, DELETE, custom headers, JSON content type). The browser sends an OPTIONS request first to check if the actual request is allowed.

## Configuring CORS on REST API

For REST APIs, you need to configure both an OPTIONS method (for preflight) and the response headers on your actual methods.

### Step 1: Enable CORS via Console or CLI

The quickest way is using the AWS CLI to add CORS headers:

```bash
# Add an OPTIONS method for preflight handling
aws apigateway put-method \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method OPTIONS \
  --authorization-type NONE

# Set up the mock integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}'

# Configure the OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers": false,
    "method.response.header.Access-Control-Allow-Methods": false,
    "method.response.header.Access-Control-Allow-Origin": false
  }'

# Set the actual CORS header values in the integration response
aws apigateway put-integration-response \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization,X-Amz-Date,X-Api-Key'\''",
    "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,PUT,DELETE,OPTIONS'\''",
    "method.response.header.Access-Control-Allow-Origin": "'\''https://app.example.com'\''"
  }'
```

### Step 2: Add CORS Headers to Your Actual Methods

The OPTIONS method handles preflight, but your actual GET/POST/etc methods also need to return CORS headers. If you're using Lambda proxy integration, your Lambda function must include these headers.

Return CORS headers from your Lambda function:

```python
import json


def lambda_handler(event, context):
    # Your business logic here
    data = get_data()

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "https://app.example.com",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(data),
    }
```

This is the part people often miss. The OPTIONS response handles the preflight check, but the actual response also needs the `Access-Control-Allow-Origin` header or the browser will block the response.

## CORS on HTTP API (Much Easier)

HTTP APIs have built-in CORS support that's way simpler to configure. No OPTIONS method needed - API Gateway handles it automatically.

Configure CORS on HTTP API:

```bash
# Enable CORS on HTTP API
aws apigatewayv2 update-api \
  --api-id httpapi123 \
  --cors-configuration '{
    "AllowOrigins": ["https://app.example.com", "https://staging.example.com"],
    "AllowMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowHeaders": ["Content-Type", "Authorization", "X-Request-Id"],
    "ExposeHeaders": ["X-Total-Count", "X-Request-Id"],
    "MaxAge": 86400,
    "AllowCredentials": true
  }'
```

That's it. HTTP API handles the OPTIONS preflight automatically and adds CORS headers to all responses. Your Lambda function doesn't need to return any CORS headers.

## CloudFormation for REST API CORS

Here's a complete CloudFormation setup for CORS on a REST API resource:

```yaml
Resources:
  OptionsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MyApi
      ResourceId: !Ref ItemsResource
      HttpMethod: OPTIONS
      AuthorizationType: NONE
      Integration:
        Type: MOCK
        RequestTemplates:
          application/json: '{"statusCode": 200}'
        IntegrationResponses:
          - StatusCode: "200"
            ResponseParameters:
              method.response.header.Access-Control-Allow-Headers: "'Content-Type,Authorization,X-Amz-Date'"
              method.response.header.Access-Control-Allow-Methods: "'GET,POST,PUT,DELETE,OPTIONS'"
              method.response.header.Access-Control-Allow-Origin: "'https://app.example.com'"
            ResponseTemplates:
              application/json: ""
      MethodResponses:
        - StatusCode: "200"
          ResponseModels:
            application/json: Empty
          ResponseParameters:
            method.response.header.Access-Control-Allow-Headers: true
            method.response.header.Access-Control-Allow-Methods: true
            method.response.header.Access-Control-Allow-Origin: true
```

## CloudFormation for HTTP API CORS

Much simpler:

```yaml
Resources:
  HttpApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: my-http-api
      ProtocolType: HTTP
      CorsConfiguration:
        AllowOrigins:
          - "https://app.example.com"
          - "https://staging.example.com"
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
        AllowHeaders:
          - Content-Type
          - Authorization
        MaxAge: 86400
```

## SAM Template with CORS

AWS SAM has a shorthand for CORS configuration:

```yaml
Resources:
  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'https://app.example.com'"
        MaxAge: "'86400'"

  # SAM can also do it on individual functions
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: python3.12
      Events:
        GetItems:
          Type: Api
          Properties:
            RestApiId: !Ref MyApi
            Path: /items
            Method: get
```

## Multiple Origins

REST APIs don't natively support multiple origins in the `Access-Control-Allow-Origin` header - it only accepts a single value or `*`. To support multiple specific origins, you need to check the request's `Origin` header and respond dynamically.

Handle multiple origins in your Lambda function:

```python
import json

ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://staging.example.com",
    "http://localhost:3000",
]


def lambda_handler(event, context):
    # Check the request origin
    headers = event.get("headers", {})
    origin = headers.get("origin") or headers.get("Origin", "")

    # Use the origin if it's allowed, otherwise don't set the header
    cors_origin = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]

    data = get_data()

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Vary": "Origin",  # Important for caching
        },
        "body": json.dumps(data),
    }
```

## Common CORS Mistakes

Here are the issues that cause 90% of CORS headaches:

1. **Missing headers on actual response** - The OPTIONS preflight works, but your GET/POST response doesn't include `Access-Control-Allow-Origin`. The browser blocks it.

2. **Wildcard with credentials** - If you set `Access-Control-Allow-Origin: *` but your frontend sends cookies or auth headers, the browser rejects it. You must specify the exact origin when using credentials.

3. **Missing Content-Type in allowed headers** - If your frontend sends `Content-Type: application/json`, you need `Content-Type` in `Access-Control-Allow-Headers`.

4. **Forgetting to deploy** - REST API changes require redeployment. Your CORS config sits idle until you deploy.

5. **API Gateway errors bypass CORS** - If API Gateway returns a 4xx or 5xx error (like missing auth, throttling, or WAF blocking), it doesn't include CORS headers. The browser shows a CORS error instead of the actual error.

Fix Gateway error responses to include CORS headers:

```yaml
# Add CORS headers to Gateway Responses
GatewayResponse4xx:
  Type: AWS::ApiGateway::GatewayResponse
  Properties:
    RestApiId: !Ref MyApi
    ResponseType: DEFAULT_4XX
    ResponseParameters:
      gatewayresponse.header.Access-Control-Allow-Origin: "'https://app.example.com'"
      gatewayresponse.header.Access-Control-Allow-Headers: "'Content-Type,Authorization'"

GatewayResponse5xx:
  Type: AWS::ApiGateway::GatewayResponse
  Properties:
    RestApiId: !Ref MyApi
    ResponseType: DEFAULT_5XX
    ResponseParameters:
      gatewayresponse.header.Access-Control-Allow-Origin: "'https://app.example.com'"
```

## Debugging CORS Issues

When CORS isn't working, check these things in order:

```bash
# 1. Test the OPTIONS preflight directly
curl -v -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/items

# 2. Check the actual request headers
curl -v -X GET \
  -H "Origin: https://app.example.com" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/items

# 3. Look for Access-Control-Allow-Origin in BOTH responses
```

If the OPTIONS response doesn't have CORS headers, your OPTIONS method is misconfigured. If the GET response doesn't have them, your Lambda needs to return them (for REST API proxy integration).

For tracking CORS errors and API health across environments, see our guide on [monitoring web applications](https://oneuptime.com/blog/post/api-monitoring-best-practices/view).

## Wrapping Up

CORS on API Gateway boils down to this: HTTP API handles it automatically with a simple configuration block. REST API requires manual OPTIONS method setup and CORS headers in your Lambda responses. If you're starting a new project, use HTTP API to save yourself the headache. If you're stuck with REST API, remember the three places CORS headers need to exist: OPTIONS method response, Lambda function response, and Gateway error responses.
