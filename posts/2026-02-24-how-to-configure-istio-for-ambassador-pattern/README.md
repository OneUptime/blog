# How to Configure Istio for Ambassador Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambassador Pattern, Service Mesh, Proxy, Kubernetes, Architecture

Description: Implement the ambassador pattern in Istio with dedicated proxy containers that handle cross-cutting concerns like authentication, logging, and protocol translation for your services.

---

The ambassador pattern places a proxy between your application and the external services it communicates with. The ambassador handles cross-cutting concerns - retries, circuit breaking, logging, authentication, protocol translation - so your application code stays simple and focused on business logic.

If this sounds a lot like what Envoy already does in Istio, you are right. Envoy is essentially an ambassador for all mesh traffic. But the ambassador pattern extends beyond what Envoy handles. You might need a specialized proxy for a specific external API, a protocol translator for a legacy system, or a custom authentication flow that does not fit into Envoy's filter chain.

The key difference is scope. Envoy (as deployed by Istio) is a general-purpose L7 proxy for all traffic. An ambassador sidecar is a purpose-built proxy for a specific external dependency.

## When You Need an Ambassador Beyond Envoy

Some scenarios where a dedicated ambassador makes sense:

- **External API with complex auth**: An external API that requires OAuth token exchange with specific parameters that do not fit Envoy's ext-authz model
- **Protocol translation**: Your app speaks HTTP but the external service uses a proprietary protocol
- **Request enrichment**: Adding business-specific headers, transforming payloads, or signing requests before they reach the external service
- **Connection pooling**: Managing a pool of connections to a rate-limited API
- **Custom retry logic**: The external API needs backoff patterns that do not match Envoy's retry policies

## Basic Ambassador Setup

Here is a pod with an application container and an ambassador that handles communication with an external payment API:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: my-registry/order-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: PAYMENT_API_URL
          value: "http://localhost:9090/api/payments"
      - name: payment-ambassador
        image: my-registry/payment-ambassador:latest
        ports:
        - containerPort: 9090
        env:
        - name: PAYMENT_PROVIDER_URL
          value: "https://api.paymentprovider.com"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: payment-api-credentials
              key: api-key
        - name: SIGNING_SECRET
          valueFrom:
            secretKeyRef:
              name: payment-api-credentials
              key: signing-secret
```

The order-service talks to localhost:9090 (the ambassador). The ambassador handles authentication, request signing, and forwarding to the actual payment provider.

## The Ambassador Code

Here is what the payment ambassador looks like:

```python
import hmac
import hashlib
import time
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

PAYMENT_URL = os.environ['PAYMENT_PROVIDER_URL']
API_KEY = os.environ['API_KEY']
SIGNING_SECRET = os.environ['SIGNING_SECRET']

def sign_request(body, timestamp):
    """Create HMAC signature for the payment provider."""
    message = f"{timestamp}.{body}"
    signature = hmac.new(
        SIGNING_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

@app.route('/api/payments/<path:subpath>', methods=['GET', 'POST', 'PUT'])
def proxy_payment(subpath):
    timestamp = str(int(time.time()))
    body = request.get_data(as_text=True)

    signature = sign_request(body, timestamp)

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': request.content_type or 'application/json',
    }

    resp = requests.request(
        method=request.method,
        url=f"{PAYMENT_URL}/{subpath}",
        headers=headers,
        data=body,
        timeout=15,
    )

    return (resp.content, resp.status_code, dict(resp.headers))
```

The ambassador adds authentication headers and request signing that the payment provider requires. The order-service does not need to know anything about payment API authentication.

## Configuring Istio Around the Ambassador

Since the ambassador talks to an external service, configure a ServiceEntry so Istio knows about it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-provider
  namespace: production
spec:
  hosts:
  - api.paymentprovider.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
```

Apply traffic policies for the external connection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-provider
  namespace: production
spec:
  host: api.paymentprovider.com
  trafficPolicy:
    tls:
      mode: SIMPLE
    connectionPool:
      tcp:
        maxConnections: 20
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 20
```

## Excluding Ambassador Ports from Envoy

Traffic between the app and the ambassador on localhost should not go through Envoy. Exclude the ambassador port:

```yaml
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "9090"
```

Without this annotation, Envoy intercepts the localhost traffic to port 9090 and tries to route it, which can cause issues.

## Ambassador for Protocol Translation

A common use case is translating between protocols. Your app speaks HTTP, but the external system uses gRPC, SOAP, or a custom binary protocol:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reporting-service
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: reporting-service
        image: my-registry/reporting-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: LEGACY_SYSTEM_URL
          value: "http://localhost:9091/api"
      - name: soap-ambassador
        image: my-registry/soap-translator:latest
        ports:
        - containerPort: 9091
        env:
        - name: SOAP_ENDPOINT
          value: "https://legacy.corp.example.com/ws/ReportService"
        - name: WSDL_URL
          value: "https://legacy.corp.example.com/ws/ReportService?wsdl"
```

The reporting-service makes REST calls to localhost:9091. The SOAP ambassador translates those REST calls into SOAP XML requests and forwards them to the legacy system. It translates the SOAP responses back to JSON for the reporting-service.

## Ambassador for Rate-Limited APIs

When you call a rate-limited external API from multiple pods, you need centralized rate limit tracking. An ambassador can manage this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-enrichment
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: enrichment-app
        image: my-registry/data-enrichment:latest
        env:
        - name: GEOCODING_URL
          value: "http://localhost:9092/geocode"
      - name: geocoding-ambassador
        image: my-registry/rate-limited-proxy:latest
        ports:
        - containerPort: 9092
        env:
        - name: TARGET_URL
          value: "https://maps.googleapis.com/maps/api/geocode/json"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: google-maps-key
              key: api-key
        - name: RATE_LIMIT_PER_SECOND
          value: "10"
        - name: RATE_LIMIT_REDIS
          value: "redis-rate-limit:6379"
```

The ambassador uses Redis to coordinate rate limits across all pods. Even if you have 20 pods running, the combined request rate stays within the API's limits.

## Ambassador for Connection Pooling

Some external services limit the number of concurrent connections. An ambassador can manage a connection pool:

```python
import queue
import threading
import requests
from flask import Flask, request as flask_request

app = Flask(__name__)

# Pool of 5 connections to the external service
connection_pool = queue.Queue(maxsize=5)
for _ in range(5):
    session = requests.Session()
    connection_pool.put(session)

@app.route('/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(subpath):
    session = connection_pool.get(timeout=10)
    try:
        resp = session.request(
            method=flask_request.method,
            url=f"https://external-api.example.com/{subpath}",
            headers=dict(flask_request.headers),
            data=flask_request.get_data(),
            timeout=30,
        )
        return (resp.content, resp.status_code, dict(resp.headers))
    finally:
        connection_pool.put(session)
```

The ambassador limits concurrent connections to 5, queuing additional requests. This prevents your service from overwhelming the external API.

## Monitoring Ambassadors

Track ambassador health and performance alongside the application:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service-ambassador-metrics
  namespace: production
spec:
  hosts:
  - order-service
  http:
  - match:
    - uri:
        prefix: /ambassador/metrics
    rewrite:
      uri: /metrics
    route:
    - destination:
        host: order-service
        port:
          number: 9090
```

Or scrape metrics directly through Prometheus pod annotations:

```yaml
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
```

Monitor connection pool usage, request latency through the ambassador, error rates from the external API, and rate limit hits.

## Ambassador vs. EnvoyFilter

Before building a custom ambassador, consider whether an EnvoyFilter could handle your use case. EnvoyFilter can:

- Add custom headers
- Modify request/response bodies (with Lua or Wasm)
- Implement simple authentication

Build a custom ambassador when you need:

- Complex business logic in the proxy
- Protocol translation
- Stateful connection management
- Custom retry/backoff algorithms
- Integration with specific SDK libraries

## Summary

The ambassador pattern in Istio adds purpose-built proxy containers alongside the standard Envoy sidecar. Use ambassadors for external API authentication, protocol translation, rate limiting, and connection pooling. The application talks to the ambassador on localhost, and the ambassador handles the complexity of communicating with external services. Configure ServiceEntry for external dependencies, exclude ambassador ports from Envoy interception, and monitor ambassador performance through metrics endpoints. The ambassador pattern keeps your application code clean while the sidecar handles the messy details of external integrations.
