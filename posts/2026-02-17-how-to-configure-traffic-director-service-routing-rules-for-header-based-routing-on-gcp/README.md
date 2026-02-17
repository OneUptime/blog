# How to Configure Traffic Director Service Routing Rules for Header-Based Routing on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Traffic Director, Header-Based Routing, Service Mesh, GKE, Google Cloud

Description: Configure Google Cloud Traffic Director to route service-to-service traffic based on HTTP headers for A/B testing, feature flags, and environment routing on GCP.

---

Header-based routing is one of those capabilities that seems niche until you need it, and then it becomes indispensable. Route internal traffic to a debug version of a service by adding a header. Direct beta users to a new feature backend based on a header their client sends. Test a new version of a downstream dependency by injecting a routing header in your request chain.

Google Cloud Traffic Director makes header-based routing straightforward for services running on GKE. Since Traffic Director configures Envoy sidecars, you get full access to Envoy's request matching capabilities through a managed control plane.

## When to Use Header-Based Routing

Header-based routing shines in several scenarios. A/B testing where you want specific user cohorts to hit different backends. Debug routing where developers can target a specific service version in staging or production by adding a header. Feature flag routing where a feature flag service sets a header that determines which backend handles the request. And version pinning where an API client specifies which version of a backend it is compatible with.

## Setting Up the Backend Services

You need at least two versions of a service to route between. Let us set up a primary backend and an alternative backend.

```yaml
# primary-deployment.yaml
# The default version of the service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
      version: v1
  template:
    metadata:
      labels:
        app: api-service
        version: v1
    spec:
      containers:
        - name: api-service
          image: gcr.io/my-project/api-service:v1
          ports:
            - containerPort: 8080
---
# alternative-deployment.yaml
# The alternative version used for header-based routing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service-v2
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-service
      version: v2
  template:
    metadata:
      labels:
        app: api-service
        version: v2
    spec:
      containers:
        - name: api-service
          image: gcr.io/my-project/api-service:v2
          ports:
            - containerPort: 8080
---
# Separate Kubernetes services for each version
apiVersion: v1
kind: Service
metadata:
  name: api-service-v1
  namespace: production
spec:
  selector:
    app: api-service
    version: v1
  ports:
    - port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-service-v2
  namespace: production
spec:
  selector:
    app: api-service
    version: v2
  ports:
    - port: 8080
```

Apply these resources.

```bash
kubectl apply -f primary-deployment.yaml
kubectl apply -f alternative-deployment.yaml
```

## Configuring Header-Based Routing with Traffic Director

### Using the URL Map Approach

Create backend services in Traffic Director and a URL map with header-based routing rules.

```bash
# Create health check
gcloud compute health-checks create http api-service-hc \
  --port=8080 \
  --request-path=/health \
  --project=my-project

# Create backend services for each version
gcloud compute backend-services create api-service-v1-backend \
  --load-balancing-scheme=INTERNAL_SELF_MANAGED \
  --protocol=HTTP \
  --health-checks=api-service-hc \
  --project=my-project \
  --global

gcloud compute backend-services create api-service-v2-backend \
  --load-balancing-scheme=INTERNAL_SELF_MANAGED \
  --protocol=HTTP \
  --health-checks=api-service-hc \
  --project=my-project \
  --global
```

Now create a URL map with header-based routing rules.

```yaml
# url-map-header-routing.yaml
# Routes traffic based on the X-Service-Version header
name: api-service-url-map
defaultService: projects/my-project/global/backendServices/api-service-v1-backend
hostRules:
  - hosts:
      - "api-service.production.svc.cluster.local"
      - "api-service"
    pathMatcher: api-service-matcher
pathMatchers:
  - name: api-service-matcher
    # Default route goes to v1
    defaultService: projects/my-project/global/backendServices/api-service-v1-backend
    routeRules:
      # Rule 1: Route to v2 when X-Service-Version header equals "v2"
      - priority: 1
        matchRules:
          - headerMatches:
              - headerName: X-Service-Version
                exactMatch: "v2"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-service-v2-backend
              weight: 100

      # Rule 2: Route to v2 when X-Beta-User header is present
      - priority: 2
        matchRules:
          - headerMatches:
              - headerName: X-Beta-User
                presentMatch: true
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-service-v2-backend
              weight: 100

      # Rule 3: Route to debug backend when X-Debug header matches a regex
      - priority: 3
        matchRules:
          - headerMatches:
              - headerName: X-Debug
                regexMatch: "^(true|1|yes)$"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-service-v2-backend
              weight: 100
          # Add a response header to confirm debug routing
          responseHeadersToAdd:
            - headerName: X-Routed-To
              headerValue: "v2-debug"
```

Import the URL map.

```bash
gcloud compute url-maps import api-service-url-map \
  --source=url-map-header-routing.yaml \
  --project=my-project \
  --global
```

### Using Gateway API (Kubernetes-Native Approach)

If you prefer the Kubernetes Gateway API, header-based routing is expressed through HTTPRoute resources.

```yaml
# httproute-header-routing.yaml
# HTTPRoute with header-based matching rules
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-service-header-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
      namespace: production
  hostnames:
    - "api-service.production.svc.cluster.local"
  rules:
    # Rule 1: Route to v2 when X-Service-Version is "v2"
    - matches:
        - headers:
            - name: X-Service-Version
              value: "v2"
      backendRefs:
        - name: api-service-v2
          port: 8080

    # Rule 2: Route to v2 when X-Beta-User header is present
    - matches:
        - headers:
            - name: X-Beta-User
              type: RegularExpression
              value: ".+"
      backendRefs:
        - name: api-service-v2
          port: 8080

    # Default: all other traffic goes to v1
    - backendRefs:
        - name: api-service-v1
          port: 8080
```

```bash
kubectl apply -f httproute-header-routing.yaml
```

## Header Propagation Across Services

For header-based routing to work across a service chain, headers need to propagate through each hop. If Service A calls Service B which calls Service C, and you want all three to route to their v2 versions, the routing header must be forwarded at each step.

Envoy can be configured to automatically propagate specific headers.

```yaml
# Envoy configuration for header propagation
# Add this to your Envoy sidecar config to forward routing headers
route_config:
  request_headers_to_add:
    - header:
        key: X-Request-Id
        value: "%REQ(X-Request-Id)%"
  # Headers to propagate to upstream services
  internal_redirect_policy:
    max_internal_redirects: 1
  request_headers_to_remove: []
```

In your application code, forward the routing headers when making downstream calls.

```python
# Python example - propagate routing headers to downstream services
import requests
from flask import Flask, request

app = Flask(__name__)

# Headers to propagate through the service chain
PROPAGATION_HEADERS = [
    "X-Service-Version",
    "X-Beta-User",
    "X-Debug",
    "X-Request-Id",
]

def get_propagation_headers():
    """Extract routing headers from the incoming request."""
    headers = {}
    for header in PROPAGATION_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value
    return headers

@app.route("/api/orders")
def get_orders():
    # Forward routing headers to the order service
    headers = get_propagation_headers()
    response = requests.get(
        "http://order-service:8080/api/orders",
        headers=headers
    )
    return response.json()
```

## Combining Header Routing with Traffic Splitting

You can combine header-based routing with percentage-based traffic splitting. For example, send all beta users to v2, and split the remaining traffic 90/10.

```yaml
# Combined header routing and traffic splitting
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-service-combined-routes
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
  rules:
    # Beta users always go to v2
    - matches:
        - headers:
            - name: X-Beta-User
              value: "true"
      backendRefs:
        - name: api-service-v2
          port: 8080

    # All other traffic: 90% v1, 10% v2
    - backendRefs:
        - name: api-service-v1
          port: 8080
          weight: 90
        - name: api-service-v2
          port: 8080
          weight: 10
```

## Testing Header-Based Routing

Verify the routing rules work by sending requests with and without the routing headers.

```bash
# Test default routing (should go to v1)
curl -s http://api-service:8080/api/version
# Expected: {"version": "v1"}

# Test header-based routing to v2
curl -s -H "X-Service-Version: v2" http://api-service:8080/api/version
# Expected: {"version": "v2"}

# Test beta user routing
curl -s -H "X-Beta-User: true" http://api-service:8080/api/version
# Expected: {"version": "v2"}

# Test debug routing
curl -s -H "X-Debug: true" http://api-service:8080/api/version
# Expected: {"version": "v2"} with X-Routed-To: v2-debug response header
```

## Monitoring and Observability

Add the routing version as a label in your metrics so you can compare performance between routed and non-routed traffic. Cloud Monitoring dashboards can then show you latency and error rates broken down by which version handled the request.

Header-based routing with Traffic Director gives you fine-grained control over traffic flow without modifying your application's core logic. The combination of managed Envoy configuration, Kubernetes-native Gateway API, and Google Cloud's global network makes it a practical approach for A/B testing, feature flags, and staged rollouts on GCP.
