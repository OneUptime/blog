# How to Set Up API Key Validation with Google Cloud Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, API Key, API Security, Authentication

Description: A practical guide to setting up API key validation with Google Cloud Endpoints to control access, track usage, and enforce quotas on your APIs.

---

API keys are the simplest form of API authentication. They do not identify a user - they identify a project or application. When you want to track which applications are calling your API, apply per-application rate limits, or simply prevent anonymous access, API keys are a good starting point.

Cloud Endpoints supports API key validation natively through ESPv2. This guide shows you how to set it up, create and manage keys, and combine API keys with other authentication methods.

## When to Use API Keys vs JWT Authentication

API keys and JWT tokens serve different purposes:

- **API keys** identify the calling application. They answer "which app is making this request?"
- **JWT tokens** identify the calling user. They answer "who is making this request?"

Use API keys when you want to track and rate-limit by application. Use JWT when you need to know who the user is. For many APIs, you use both: an API key to identify the application and a JWT to identify the user.

## Prerequisites

- Cloud Endpoints deployed with an OpenAPI spec
- The Service Management API enabled
- gcloud CLI configured

```bash
# Enable required APIs
gcloud services enable \
  servicemanagement.googleapis.com \
  servicecontrol.googleapis.com \
  endpoints.googleapis.com \
  apikeys.googleapis.com \
  --project=my-project-id
```

## Step 1: Configure API Key Validation in the OpenAPI Spec

Add the API key security definition to your OpenAPI specification.

```yaml
# openapi-with-apikey.yaml
swagger: "2.0"
info:
  title: "Weather Data API"
  version: "1.0.0"
host: "weather-api.endpoints.my-project-id.cloud.goog"
basePath: "/"
schemes:
  - "https"

x-google-backend:
  address: "https://weather-backend-abc123-uc.a.run.app"

# Define the API key security scheme
securityDefinitions:
  api_key:
    type: "apiKey"
    name: "key"
    in: "query"

# Apply API key validation globally
security:
  - api_key: []

paths:
  /current:
    get:
      summary: "Get current weather"
      operationId: "getCurrentWeather"
      parameters:
        - name: "city"
          in: "query"
          type: "string"
          required: true
      responses:
        200:
          description: "Current weather data"
        401:
          description: "Invalid or missing API key"

  /forecast:
    get:
      summary: "Get weather forecast"
      operationId: "getWeatherForecast"
      parameters:
        - name: "city"
          in: "query"
          type: "string"
          required: true
        - name: "days"
          in: "query"
          type: "integer"
          default: 5
      responses:
        200:
          description: "Weather forecast"

  /health:
    get:
      summary: "Health check - no API key required"
      operationId: "healthCheck"
      # Override security for this endpoint
      security: []
      responses:
        200:
          description: "Service is healthy"
```

The API key can be passed in different ways. The configuration above expects it as a query parameter (`?key=YOUR_KEY`). You can also accept it in a header.

```yaml
# Accept API key in a custom header instead of query parameter
securityDefinitions:
  api_key_header:
    type: "apiKey"
    name: "x-api-key"
    in: "header"
```

## Step 2: Deploy the Updated Configuration

Deploy the OpenAPI spec with API key validation.

```bash
# Deploy the updated API configuration
gcloud endpoints services deploy openapi-with-apikey.yaml --project=my-project-id
```

## Step 3: Enable the API for Consumer Projects

Before a project can use your API, you need to enable the service for them. For your own project, this happens automatically when you deploy.

```bash
# Enable the API for a consumer project
gcloud services enable weather-api.endpoints.my-project-id.cloud.goog \
  --project=consumer-project-id
```

## Step 4: Create API Keys

Create API keys that consumers use to call your API.

```bash
# Create an API key for a consumer application
gcloud services api-keys create \
  --display-name="Weather App - Production" \
  --api-target=service=weather-api.endpoints.my-project-id.cloud.goog \
  --project=consumer-project-id
```

The `--api-target` flag restricts the key to only work with your specific API. Without it, the key would work with any API enabled in the consumer's project.

Get the key value.

```bash
# List API keys and their values
gcloud services api-keys list --project=consumer-project-id

# Get the key string for a specific key
gcloud services api-keys get-key-string KEY_ID --project=consumer-project-id
```

## Step 5: Restrict API Keys

API keys should always be restricted to minimize the impact if they leak.

```bash
# Restrict the key to specific APIs
gcloud services api-keys update KEY_ID \
  --api-target=service=weather-api.endpoints.my-project-id.cloud.goog \
  --project=consumer-project-id

# Restrict the key to specific IP addresses
gcloud services api-keys update KEY_ID \
  --allowed-ips="203.0.113.1,203.0.113.2" \
  --project=consumer-project-id

# Restrict the key to specific HTTP referrers (for browser-based apps)
gcloud services api-keys update KEY_ID \
  --allowed-referrers="*.example.com/*,example.com/*" \
  --project=consumer-project-id

# Restrict the key to specific Android apps
gcloud services api-keys update KEY_ID \
  --allowed-application=sha1_fingerprint=CERT_FINGERPRINT,package_name=com.example.app \
  --project=consumer-project-id
```

## Step 6: Test API Key Validation

Verify that API key validation works correctly.

```bash
# Test with a valid API key (as query parameter)
curl "https://weather-api.endpoints.my-project-id.cloud.goog/current?city=Seattle&key=YOUR_API_KEY"

# Test without an API key (should get 401)
curl -v "https://weather-api.endpoints.my-project-id.cloud.goog/current?city=Seattle"

# Test with an invalid API key (should get 401)
curl -v "https://weather-api.endpoints.my-project-id.cloud.goog/current?city=Seattle&key=invalid-key"

# Test the health endpoint without a key (should work)
curl "https://weather-api.endpoints.my-project-id.cloud.goog/health"
```

## Combining API Keys with JWT Authentication

For APIs that need both application identification and user identification, combine API keys with JWT authentication.

```yaml
# openapi-combined.yaml
securityDefinitions:
  api_key:
    type: "apiKey"
    name: "key"
    in: "query"
  google_jwt:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://accounts.google.com"
    x-google-jwks_uri: "https://www.googleapis.com/oauth2/v3/certs"
    x-google-audiences: "my-project-id.apps.googleusercontent.com"

paths:
  /public-data:
    get:
      summary: "Public data - only API key needed"
      security:
        - api_key: []
      responses:
        200:
          description: "Public data"

  /user-data:
    get:
      summary: "User data - API key AND JWT required"
      # Both must be satisfied
      security:
        - api_key: []
          google_jwt: []
      responses:
        200:
          description: "User-specific data"
```

When both are in the same security entry (same array element), both must be present. When they are in separate entries, either one is sufficient.

## Monitoring API Key Usage

Cloud Endpoints tracks usage by API key automatically.

```bash
# View the API usage dashboard in the Cloud Console
# Navigate to: APIs & Services > Endpoints > your service > Overview

# The dashboard shows:
# - Requests per API key
# - Error rates per key
# - Latency by key
```

You can also query usage through Cloud Monitoring.

```bash
# Create a dashboard showing usage by consumer
gcloud monitoring dashboards create --config='
{
  "displayName": "API Usage by Consumer",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Requests by API Key",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"serviceruntime.googleapis.com/api/producer/request_count\" AND resource.type=\"api\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "groupByFields": ["metric.labels.credential_id"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      }
    ]
  }
}' --project=my-project-id
```

## Revoking API Keys

When a key is compromised or a consumer should no longer have access.

```bash
# Delete an API key (immediately revokes access)
gcloud services api-keys delete KEY_ID --project=consumer-project-id

# Or disable it temporarily
gcloud services api-keys update KEY_ID \
  --clear-restrictions \
  --project=consumer-project-id
```

After revoking a key, requests using that key will receive a 401 error. There may be a brief propagation delay (usually under a minute).

## Best Practices

1. **Always restrict keys**: Never use unrestricted API keys. At minimum, restrict to your specific API service.
2. **Rotate regularly**: Create new keys and deprecate old ones on a regular schedule.
3. **Do not embed in source code**: Store API keys in environment variables or secret managers.
4. **Use separate keys per environment**: Development, staging, and production should have different keys.
5. **Monitor for anomalies**: Set up alerts for unusual usage patterns that might indicate a leaked key.
6. **Combine with JWT**: API keys alone do not provide user-level security. Use them alongside JWT for user identification.

## Summary

API key validation with Cloud Endpoints gives you a simple way to identify calling applications, track usage, and prevent anonymous access. Configure the key in your OpenAPI spec, create restricted keys for each consumer, and monitor usage through the Endpoints dashboard. For user-level authentication, combine API keys with JWT validation. The key validation happens entirely in ESPv2, so your backend does not need any additional code.
