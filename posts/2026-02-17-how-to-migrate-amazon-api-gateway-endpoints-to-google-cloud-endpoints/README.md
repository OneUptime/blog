# How to Migrate Amazon API Gateway Endpoints to Google Cloud Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Endpoints, API Gateway, AWS API Gateway, API Management, Cloud Migration

Description: A step-by-step guide for migrating REST and HTTP APIs from Amazon API Gateway to Google Cloud Endpoints, including OpenAPI spec conversion and authentication setup.

---

Amazon API Gateway and Google Cloud Endpoints both provide managed API hosting, but they take different approaches. AWS API Gateway is a standalone service that proxies requests to Lambda, HTTP backends, or other AWS services. Google Cloud Endpoints is built on top of the Extensible Service Proxy (ESP) that runs alongside your backend service, typically on Cloud Run, GKE, or Compute Engine.

There is also Google API Gateway (a separate product from Cloud Endpoints) that works more like AWS API Gateway as a fully managed proxy. This guide covers both options so you can pick what fits your architecture.

## Choosing Between Cloud Endpoints and API Gateway

| Feature | Cloud Endpoints | Google API Gateway |
|---------|-----------------|-------------------|
| Hosting model | ESP sidecar with your backend | Fully managed proxy |
| Backend support | Cloud Run, GKE, Compute Engine | Cloud Functions, Cloud Run, App Engine |
| API spec | OpenAPI 2.0 | OpenAPI 2.0 |
| Authentication | API keys, JWT, Google ID tokens | API keys, JWT, Google ID tokens |
| Rate limiting | Custom via ESP config | Built-in |
| Best for | Microservices on GKE/Cloud Run | Serverless backends |

## Step 1: Export Your API Gateway Configuration

Start by exporting your API definitions from AWS.

```bash
# List all REST APIs
aws apigateway get-rest-apis \
  --query 'items[*].{ID:id,Name:name,Endpoint:endpointConfiguration.types[0]}' \
  --output table

# Export the API as an OpenAPI spec (Swagger)
aws apigateway get-export \
  --rest-api-id abc123 \
  --stage-name prod \
  --export-type swagger \
  --accepts application/json \
  exported-api.json

# For HTTP APIs (API Gateway v2)
aws apigatewayv2 get-apis \
  --query 'Items[*].{ID:ApiId,Name:Name,Protocol:ProtocolType}' \
  --output table

aws apigatewayv2 export-api \
  --api-id def456 \
  --stage-name prod \
  --output-type JSON \
  --specification OAS30 \
  exported-api-v2.json
```

## Step 2: Convert the OpenAPI Spec

The exported spec will have AWS-specific extensions (x-amazon-apigateway-*). You need to replace these with GCP-compatible configuration.

Here is an example AWS API Gateway OpenAPI spec and its GCP conversion:

```yaml
# Original AWS API Gateway spec
swagger: "2.0"
info:
  title: "My API"
  version: "1.0"
basePath: "/prod"
paths:
  /users:
    get:
      x-amazon-apigateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456:function:getUsers/invocations
        httpMethod: POST
      responses:
        "200":
          description: "Success"
    post:
      x-amazon-apigateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456:function:createUser/invocations
        httpMethod: POST
      security:
        - api_key: []
securityDefinitions:
  api_key:
    type: apiKey
    name: x-api-key
    in: header
```

Converted for Google Cloud Endpoints:

```yaml
# Converted spec for Google Cloud Endpoints
swagger: "2.0"
info:
  title: "My API"
  version: "1.0"
host: "my-api-abc123.a.run.app"  # Your Cloud Run service URL
basePath: "/"
schemes:
  - "https"
produces:
  - "application/json"
paths:
  /users:
    get:
      operationId: "getUsers"
      # Backend routing handled by ESP to Cloud Run service
      x-google-backend:
        address: https://my-users-service-abc123.a.run.app
      responses:
        "200":
          description: "Success"
    post:
      operationId: "createUser"
      x-google-backend:
        address: https://my-users-service-abc123.a.run.app
      security:
        - api_key: []
      responses:
        "200":
          description: "User created"
securityDefinitions:
  api_key:
    type: "apiKey"
    name: "key"
    in: "query"
```

## Step 3: Deploy to Cloud Endpoints

Deploy the converted OpenAPI spec as a Cloud Endpoints service.

```bash
# Deploy the API configuration
gcloud endpoints services deploy openapi-spec.yaml

# Note the service name and config ID from the output
# Service: my-api-abc123.a.run.app
# Config ID: 2026-02-17r0
```

Deploy the ESP proxy alongside your backend on Cloud Run:

```bash
# Deploy ESP proxy as a Cloud Run service
gcloud run deploy my-api-gateway \
  --image="gcr.io/endpoints-release/endpoints-runtime-serverless:2" \
  --region=us-central1 \
  --set-env-vars="ENDPOINTS_SERVICE_NAME=my-api-abc123.a.run.app" \
  --allow-unauthenticated
```

## Step 4: Migrate Authentication

AWS API Gateway supports API keys, Cognito authorizers, and Lambda authorizers. Here is how to convert each:

### API Keys

```bash
# Create an API key in Cloud Endpoints
# API keys are managed through the Google Cloud Console or APIs
gcloud services api-keys create \
  --display-name="Mobile App Key" \
  --api-target=service=my-api-abc123.a.run.app
```

### JWT Authentication (replaces Cognito authorizer)

Add JWT validation to your OpenAPI spec:

```yaml
# JWT authentication configuration in the OpenAPI spec
securityDefinitions:
  firebase_auth:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/my-project"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    x-google-audiences: "my-project"

paths:
  /users/me:
    get:
      security:
        - firebase_auth: []
      x-google-backend:
        address: https://my-users-service-abc123.a.run.app
```

### Custom Authorizer (replaces Lambda authorizer)

For complex authorization logic, use a Cloud Function or Cloud Run service as a backend that handles auth:

```yaml
# Route through an auth service before reaching the backend
paths:
  /admin/settings:
    get:
      x-google-backend:
        address: https://my-auth-proxy-abc123.a.run.app
        path_translation: APPEND_PATH_TO_ADDRESS
```

## Step 5: Using Google API Gateway (Alternative)

If you prefer a fully managed proxy (closer to the AWS API Gateway experience), use Google API Gateway instead of Cloud Endpoints.

```bash
# Create an API
gcloud api-gateway apis create my-api

# Create an API config from the OpenAPI spec
gcloud api-gateway api-configs create my-api-config \
  --api=my-api \
  --openapi-spec=openapi-spec.yaml

# Create a gateway
gcloud api-gateway gateways create my-gateway \
  --api=my-api \
  --api-config=my-api-config \
  --location=us-central1
```

The gateway gives you a URL like `https://my-gateway-abc123.uc.gateway.dev` that acts as the entry point for your API.

## Step 6: Migrate Request/Response Transformations

AWS API Gateway supports request/response mapping templates (using VTL). GCP does not have a direct equivalent for inline transformations. Options include:

1. Move transformation logic into your backend service
2. Use a lightweight Cloud Run proxy that transforms requests
3. Use Apigee (Google's full API management platform) for advanced transformations

```python
# Simple Cloud Run proxy for request transformation
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

BACKEND_URL = 'https://my-backend-service.a.run.app'

@app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    """Transform requests before forwarding to the backend."""
    # Transform the request (equivalent to API Gateway mapping template)
    headers = dict(request.headers)
    headers['X-Request-Source'] = 'api-gateway'

    # Forward to the actual backend
    resp = requests.request(
        method=request.method,
        url=f'{BACKEND_URL}/{path}',
        headers=headers,
        json=request.get_json(silent=True),
        params=request.args
    )

    # Transform the response if needed
    return jsonify(resp.json()), resp.status_code
```

## Step 7: Set Up Custom Domains

```bash
# Map a custom domain to your Cloud Run ESP service
gcloud run domain-mappings create \
  --service=my-api-gateway \
  --domain=api.example.com \
  --region=us-central1

# Or for Google API Gateway, use a load balancer with a custom domain
gcloud compute ssl-certificates create api-cert \
  --domains=api.example.com \
  --global
```

## Step 8: Migrate Monitoring and Logging

Replace API Gateway CloudWatch metrics with Cloud Monitoring:

```bash
# View API metrics in Cloud Monitoring
gcloud monitoring metrics list \
  --filter='metric.type=starts_with("serviceruntime.googleapis.com")'

# Create an alert for high error rates
gcloud monitoring policies create \
  --display-name="API Error Rate" \
  --condition-display-name="High 5xx error rate" \
  --condition-filter='resource.type="api" AND metric.type="serviceruntime.googleapis.com/api/producer/request_count" AND metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=10 \
  --condition-threshold-comparison=COMPARISON_GT
```

## Summary

The API Gateway migration path depends on your architecture. If you are running backend services on Cloud Run or GKE, Cloud Endpoints with ESP gives you fine-grained control. If you want a fully managed proxy experience closer to AWS API Gateway, use Google API Gateway. The OpenAPI spec is the bridge between the two platforms - export from AWS, strip out the Amazon-specific extensions, add Google-specific ones, and deploy. The main gap is request/response transformations, which you will need to handle in your backend code or through a proxy layer.
