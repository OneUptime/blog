# How to Enable CORS for Cloud Endpoints APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, CORS, API Gateway, Google Cloud

Description: Learn how to enable and configure Cross-Origin Resource Sharing (CORS) for your Cloud Endpoints APIs on Google Cloud Platform to allow browser-based API calls.

---

If you have ever built a frontend application that calls a backend API hosted on Cloud Endpoints, you have probably run into the dreaded CORS error. The browser blocks the request, your console fills up with red text, and nothing works. It is one of those problems that seems simple but can eat up hours if you do not know exactly where to configure things.

In this post, I will walk you through enabling CORS for Cloud Endpoints APIs on GCP, covering both the OpenAPI specification approach and the ESP (Extensible Service Proxy) configuration.

## What Is CORS and Why Does It Matter?

Cross-Origin Resource Sharing is a security mechanism built into web browsers. When your frontend at `https://app.example.com` tries to call an API at `https://api.example.com`, the browser first sends a preflight OPTIONS request to check whether the API server allows requests from that origin. If the server does not respond with the right headers, the browser blocks the actual request.

For Cloud Endpoints, you need to handle this at the proxy level. The ESP or ESPv2 proxy sits in front of your backend and handles authentication, rate limiting, and - relevant here - CORS headers.

## Option 1: Configuring CORS in the OpenAPI Specification

The most straightforward approach is to add CORS configuration directly in your OpenAPI spec file. This is what Cloud Endpoints uses to configure the ESP proxy.

Here is a basic OpenAPI spec with CORS enabled for a simple API:

```yaml
# openapi-spec.yaml - OpenAPI spec with CORS configuration for Cloud Endpoints
swagger: "2.0"
info:
  title: "My API"
  version: "1.0.0"
host: "api.example.com"
basePath: "/"
schemes:
  - "https"
x-google-endpoints:
  - name: "api.example.com"
    allowCors: true
paths:
  /items:
    get:
      operationId: "getItems"
      produces:
        - "application/json"
      responses:
        200:
          description: "List of items"
    options:
      operationId: "corsItems"
      responses:
        200:
          description: "CORS preflight response"
```

The key part here is `allowCors: true` under the `x-google-endpoints` section. This tells ESP to handle CORS preflight requests automatically.

## Option 2: Configuring CORS in ESPv2

If you are using ESPv2 (the newer version of the proxy), you have more granular control over CORS settings. You can pass CORS flags when starting the ESPv2 container.

Here is how to configure ESPv2 with specific CORS settings in your Cloud Run deployment:

```bash
# Deploy ESPv2 to Cloud Run with custom CORS configuration
gcloud run deploy my-api-gateway \
  --image="gcr.io/endpoints-release/endpoints-runtime-serverless:2" \
  --set-env-vars="ESPv2_ARGS=--cors_preset=basic \
    --cors_allow_origin=https://app.example.com \
    --cors_allow_methods=GET,POST,PUT,DELETE,OPTIONS \
    --cors_allow_headers=Content-Type,Authorization \
    --cors_max_age=3600" \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated
```

The `--cors_preset=basic` flag enables basic CORS handling. If you want to allow all origins during development, you can use `--cors_preset=cors_with_regex` along with a pattern.

## Handling Preflight Requests

Even with `allowCors: true`, you sometimes need to explicitly handle OPTIONS requests in your API spec. This is especially true if your API requires custom headers or uses non-simple HTTP methods.

Here is an expanded example that explicitly defines the OPTIONS method:

```yaml
# Explicit OPTIONS handler for endpoints that need custom CORS headers
paths:
  /items/{id}:
    get:
      operationId: "getItem"
      parameters:
        - name: id
          in: path
          required: true
          type: string
      security:
        - api_key: []
      responses:
        200:
          description: "Item details"
    put:
      operationId: "updateItem"
      parameters:
        - name: id
          in: path
          required: true
          type: string
      security:
        - api_key: []
      responses:
        200:
          description: "Updated item"
    options:
      # No security requirement on OPTIONS - preflight must be unauthenticated
      operationId: "corsItemById"
      parameters:
        - name: id
          in: path
          required: true
          type: string
      responses:
        200:
          description: "CORS preflight"
```

Notice that the OPTIONS method does not have a `security` section. This is important because preflight requests never include authentication headers. If you require auth on OPTIONS, the preflight will fail and your actual request will never go through.

## Deploying the Configuration

After updating your OpenAPI spec, deploy it to Cloud Endpoints:

```bash
# Deploy the updated OpenAPI spec to Cloud Endpoints
gcloud endpoints services deploy openapi-spec.yaml

# Verify the service configuration was applied
gcloud endpoints services describe api.example.com
```

Then redeploy your backend service to pick up the new configuration:

```bash
# Redeploy the backend to apply the new endpoint configuration
gcloud app deploy  # for App Engine
# or
gcloud run deploy my-api --image=gcr.io/my-project/my-api  # for Cloud Run
```

## Testing CORS Configuration

You can verify your CORS setup using curl to simulate a preflight request:

```bash
# Simulate a CORS preflight request to verify headers
curl -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v https://api.example.com/items
```

A successful response should include these headers:

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

If you are not seeing these headers, check the ESP logs in Cloud Logging:

```bash
# Check ESP proxy logs for CORS-related issues
gcloud logging read "resource.type=cloud_run_revision AND textPayload:cors" \
  --project=my-project \
  --limit=20 \
  --format="table(timestamp,textPayload)"
```

## Common Pitfalls

There are a few things that trip people up regularly.

First, forgetting to allow the OPTIONS method in your firewall or IAM policies. The preflight request needs to reach your ESP proxy without authentication.

Second, using wildcards in production. Setting `Access-Control-Allow-Origin: *` works for development, but in production you should specify exact origins. Some browsers also refuse to send credentials with wildcard origins.

Third, caching issues. Browsers cache preflight responses based on the `Access-Control-Max-Age` header. If you change your CORS configuration and it does not seem to take effect, try clearing the browser cache or testing in an incognito window.

Fourth, not including all required headers in `Access-Control-Allow-Headers`. If your API expects a custom header like `X-Request-ID`, you need to include it in the allowed headers list, otherwise the preflight will fail.

## Advanced: Per-Route CORS Configuration

If different endpoints need different CORS policies, you can handle this at the backend level instead of the proxy level. In this case, set `allowCors: false` in your OpenAPI spec and manage CORS in your application code.

For a Python Flask backend, this looks like:

```python
# Flask backend with per-route CORS configuration
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Apply different CORS policies to different routes
CORS(app, resources={
    r"/public/*": {"origins": "*"},  # Public endpoints allow all origins
    r"/api/*": {"origins": ["https://app.example.com", "https://admin.example.com"]}
})

@app.route("/api/items")
def get_items():
    return {"items": []}
```

This gives you fine-grained control but means you are responsible for handling preflight requests yourself.

## Wrapping Up

Enabling CORS for Cloud Endpoints is mostly about getting the `allowCors: true` flag in your OpenAPI spec and making sure OPTIONS requests are not blocked by authentication requirements. For ESPv2 deployments, you get additional flags to control specific origins, methods, and headers. Start with the basic configuration, test with curl, and then tighten down the allowed origins for production.
