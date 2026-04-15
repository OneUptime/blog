# How to Implement API Rate Limiting with Dapr Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rate Limiting, Middleware, API, Security

Description: Learn how to implement API rate limiting using Dapr's middleware pipeline to protect your services from traffic spikes and abuse without changing application code.

---

Rate limiting protects your services from being overwhelmed by too many requests. Dapr provides middleware components that apply rate limiting at the sidecar level, meaning your application code stays unchanged while Dapr enforces the limits.

## Rate Limiting Middleware Component

Dapr supports rate limiting via the `middleware.http.ratelimit` component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
  namespace: default
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "100"
```

## Apply Middleware via Configuration

Reference the middleware in a Dapr Configuration to apply it to HTTP pipelines:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: api-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
  tracing:
    samplingRate: "1"
```

## Annotate Your Deployment

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
        dapr.io/config: "api-config"
```

## Combining with OAuth2 Middleware

You can chain multiple middleware components in the pipeline:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: secure-api-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
    - name: oauth2
      type: middleware.http.oauth2
```

## Custom Rate Limiting with Middleware Proxy

For per-user rate limiting, Dapr's built-in rate limiter only supports per-IP limits. You can implement custom logic in your application:

```python
from flask import Flask, request, jsonify, abort
import time
from collections import defaultdict

app = Flask(__name__)

# Simple in-memory rate limiter (use Redis in production)
request_counts = defaultdict(list)
RATE_LIMIT = 10  # requests per minute

def is_rate_limited(client_id: str) -> bool:
    now = time.time()
    minute_ago = now - 60
    request_counts[client_id] = [t for t in request_counts[client_id] if t > minute_ago]
    if len(request_counts[client_id]) >= RATE_LIMIT:
        return True
    request_counts[client_id].append(now)
    return False

@app.before_request
def check_rate_limit():
    client_id = request.headers.get('X-Client-ID', request.remote_addr)
    if is_rate_limited(client_id):
        abort(429, description="Rate limit exceeded. Try again in 60 seconds.")

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({"data": "your data here"})
```

## Testing Rate Limits

```bash
# Send requests rapidly to trigger rate limiting
for i in $(seq 1 200); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3500/v1.0/invoke/api-service/method/api/data)
  echo "Request $i: HTTP $STATUS"
done

# Check Dapr sidecar metrics for HTTP request counts
curl http://localhost:9090/metrics | grep "dapr_http_server_request_count"
```

## Summary

Dapr's rate limiting middleware enforces request limits at the sidecar level without modifying application code. Configure `maxRequestsPerSecond` in the middleware component and reference it in a Configuration resource. Chain multiple middleware handlers for defense-in-depth, combining rate limiting with authentication and authorization.
