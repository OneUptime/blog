# How to Configure Rate Limiting Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Rate Limiting, Security, HTTP

Description: Learn how to configure the Dapr rate limiting middleware to protect your services from traffic spikes and enforce request quotas at the sidecar level.

---

## Introduction

Dapr's rate limiting middleware (`middleware.http.ratelimit`) uses a token bucket algorithm to limit the number of requests your service receives per second. This protects your application from traffic spikes and abusive clients without adding any code to your service.

## Component Configuration

```yaml
# components/ratelimit.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
    - name: maxRequestsPerSecond
      value: "100"
```

## Pipeline Configuration

Apply the middleware to your app's HTTP pipeline:

```yaml
# config/ratelimit-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: ratelimit-pipeline
spec:
  httpPipeline:
    handlers:
      - name: ratelimit
        type: middleware.http.ratelimit
```

## Running with Rate Limiting

```bash
dapr run \
  --app-id api-service \
  --app-port 8080 \
  --config ./config/ratelimit-pipeline.yaml \
  --resources-path ./components \
  -- python api.py
```

## How It Works

The token bucket refills at `maxRequestsPerSecond` tokens per second. Each request consumes one token. When the bucket is empty, Dapr returns HTTP 429 (Too Many Requests) without forwarding the request to your app.

Example response when rate limit is exceeded:

```text
HTTP/1.1 429 Too Many Requests
X-Rate-Limit-Limit: 100
X-Rate-Limit-Duration: 1
Content-Type: text/plain; charset=utf-8

You have reached maximum request limit.
```

## Combining with Other Middleware

Rate limiting is most useful when combined with authentication middleware:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: full-pipeline
spec:
  httpPipeline:
    handlers:
      - name: bearerauth
        type: middleware.http.bearer
      - name: ratelimit
        type: middleware.http.ratelimit
```

## Testing Rate Limits

```bash
# Send 200 rapid requests and observe 429s
for i in $(seq 1 200); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/v1.0/invoke/api-service/method/hello)
  echo "Request $i: $STATUS"
done
```

## Application-Level Response

Your app does not need to handle rate limiting - Dapr returns 429 before requests reach your code. However, you can log rate limit events by monitoring Dapr metrics:

```bash
# Dapr exposes Prometheus metrics; filter for HTTP 429 responses
curl http://localhost:9090/metrics | grep 'dapr_http_server_request_count.*429'
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "ratelimit-pipeline"
```

## Summary

Dapr rate limiting middleware adds traffic control to your services without code changes. Set `maxRequestsPerSecond` in the component YAML and attach the middleware to your HTTP pipeline. Dapr handles the token bucket logic and returns 429 responses to excess requests, protecting your application from overload.
