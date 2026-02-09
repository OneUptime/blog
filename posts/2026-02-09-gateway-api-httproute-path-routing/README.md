# How to Set Up Kubernetes Gateway API HTTPRoute for Path-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Networking

Description: Configure HTTPRoute resources in the Kubernetes Gateway API to implement path-based routing, header matching, query parameter routing, and traffic splitting with practical examples for modern application delivery.

---

The Kubernetes Gateway API provides HTTPRoute as a powerful, expressive resource for HTTP traffic routing. Unlike Ingress, which has limited routing capabilities, HTTPRoute supports sophisticated matching rules including path prefixes, regular expressions, headers, query parameters, and weighted traffic distribution. This guide shows you how to leverage HTTPRoute for complex routing scenarios.

## Installing Gateway API

First, install the Gateway API CRDs in your cluster:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

Install a Gateway controller. This example uses Kong as the controller:

```bash
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong kong/ingress --namespace kong --create-namespace \
  --set gateway.enabled=true
```

Verify the installation:

```bash
kubectl get gatewayclass
kubectl get gateway -A
```

## Creating a Basic Gateway

Define a Gateway that HTTPRoutes will attach to:

```yaml
# gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    allowedRoutes:
      namespaces:
        from: All
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: production-tls
```

Apply the Gateway:

```bash
kubectl apply -f gateway.yaml
```

Wait for the Gateway to be ready:

```bash
kubectl wait --for=condition=Programmed gateway/production-gateway --timeout=300s
```

## Basic Path-Based Routing

Create HTTPRoute resources for different services based on URL paths:

```yaml
# basic-httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: default
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Route /users/* to user service
  - matches:
    - path:
        type: PathPrefix
        value: /users
    backendRefs:
    - name: user-service
      port: 8080
  # Route /products/* to product service
  - matches:
    - path:
        type: PathPrefix
        value: /products
    backendRefs:
    - name: product-service
      port: 8080
  # Route /orders/* to order service
  - matches:
    - path:
        type: PathPrefix
        value: /orders
    backendRefs:
    - name: order-service
      port: 8080
  # Default route for everything else
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: default-service
      port: 8080
```

Deploy the backend services:

```yaml
# backend-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-api
  ports:
  - port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: product-api
  ports:
  - port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-api
  ports:
  - port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: default-service
spec:
  selector:
    app: frontend
  ports:
  - port: 8080
```

Apply both manifests:

```bash
kubectl apply -f backend-services.yaml
kubectl apply -f basic-httproute.yaml
```

Test the routing:

```bash
# Get gateway IP
GATEWAY_IP=$(kubectl get gateway production-gateway -o jsonpath='{.status.addresses[0].value}')

# Test different paths
curl -H "Host: api.example.com" http://$GATEWAY_IP/users
curl -H "Host: api.example.com" http://$GATEWAY_IP/products
curl -H "Host: api.example.com" http://$GATEWAY_IP/orders
curl -H "Host: api.example.com" http://$GATEWAY_IP/other
```

## Exact Path Matching

Use exact path matching for specific endpoints:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: exact-path-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Exact match for health check endpoint
  - matches:
    - path:
        type: Exact
        value: /health
    backendRefs:
    - name: health-service
      port: 8080
  # Exact match for metrics
  - matches:
    - path:
        type: Exact
        value: /metrics
    backendRefs:
    - name: metrics-service
      port: 9090
```

## Regular Expression Path Matching

Some Gateway implementations support regex matching (check your controller's documentation):

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: regex-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Match paths like /api/v1/*, /api/v2/*
  - matches:
    - path:
        type: RegularExpression
        value: /api/v[0-9]+/.*
    backendRefs:
    - name: versioned-api-service
      port: 8080
```

## Header-Based Routing

Route traffic based on HTTP headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-based-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Route requests with "X-API-Version: v2" header
  - matches:
    - headers:
      - type: Exact
        name: X-API-Version
        value: v2
    backendRefs:
    - name: api-v2-service
      port: 8080
  # Route requests with "X-API-Version: v1" header
  - matches:
    - headers:
      - type: Exact
        name: X-API-Version
        value: v1
    backendRefs:
    - name: api-v1-service
      port: 8080
  # Default route for requests without version header
  - backendRefs:
    - name: api-v1-service
      port: 8080
```

Test header-based routing:

```bash
curl -H "Host: api.example.com" -H "X-API-Version: v2" http://$GATEWAY_IP/
curl -H "Host: api.example.com" -H "X-API-Version: v1" http://$GATEWAY_IP/
```

## Query Parameter Routing

Route based on query parameters:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: query-param-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Route requests with ?version=beta
  - matches:
    - queryParams:
      - type: Exact
        name: version
        value: beta
    backendRefs:
    - name: beta-service
      port: 8080
  # Route requests with ?version=stable
  - matches:
    - queryParams:
      - type: Exact
        name: version
        value: stable
    backendRefs:
    - name: stable-service
      port: 8080
```

## HTTP Method Matching

Route based on HTTP methods:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: method-based-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Route GET requests to read service
  - matches:
    - method: GET
      path:
        type: PathPrefix
        value: /data
    backendRefs:
    - name: read-service
      port: 8080
  # Route POST/PUT requests to write service
  - matches:
    - method: POST
      path:
        type: PathPrefix
        value: /data
    - method: PUT
      path:
        type: PathPrefix
        value: /data
    backendRefs:
    - name: write-service
      port: 8080
```

## Traffic Splitting (Canary Deployments)

Split traffic between multiple backend versions:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    # Send 90% of traffic to stable version
    - name: api-stable
      port: 8080
      weight: 90
    # Send 10% of traffic to canary version
    - name: api-canary
      port: 8080
      weight: 10
```

Gradually increase canary weight:

```bash
# Increase to 25%
kubectl patch httproute canary-routes --type=json -p='[
  {"op": "replace", "path": "/spec/rules/0/backendRefs/0/weight", "value": 75},
  {"op": "replace", "path": "/spec/rules/0/backendRefs/1/weight", "value": 25}
]'

# Increase to 50%
kubectl patch httproute canary-routes --type=json -p='[
  {"op": "replace", "path": "/spec/rules/0/backendRefs/0/weight", "value": 50},
  {"op": "replace", "path": "/spec/rules/0/backendRefs/1/weight", "value": 50}
]'
```

## Request/Response Header Modification

Add, set, or remove headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-manipulation
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    filters:
    # Add response headers
    - type: ResponseHeaderModifier
      responseHeaderModifier:
        add:
        - name: X-Frame-Options
          value: DENY
        - name: X-Content-Type-Options
          value: nosniff
        set:
        - name: Cache-Control
          value: no-cache, no-store
        remove:
        - X-Powered-By
    # Add request headers before sending to backend
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Forwarded-Proto
          value: https
    backendRefs:
    - name: api-service
      port: 8080
```

## URL Rewriting

Rewrite request paths before forwarding to backends:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: url-rewrite-routes
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Rewrite /v1/users to /users
  - matches:
    - path:
        type: PathPrefix
        value: /v1/users
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /users
    backendRefs:
    - name: user-service
      port: 8080
```

## Request Mirroring (Traffic Shadowing)

Mirror traffic to a secondary service for testing:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: traffic-mirroring
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    filters:
    - type: RequestMirror
      requestMirror:
        backendRef:
          name: test-service
          port: 8080
    backendRefs:
    - name: production-service
      port: 8080
```

Production traffic goes to `production-service` while copies go to `test-service` (responses from test-service are ignored).

## Combining Multiple Match Conditions

Combine path, header, and query parameter matches:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: complex-matching
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Match requires ALL conditions to be true
  - matches:
    - path:
        type: PathPrefix
        value: /api
      headers:
      - type: Exact
        name: X-API-Key
        value: secret-key
      queryParams:
      - type: Exact
        name: format
        value: json
    backendRefs:
    - name: authenticated-api
      port: 8080
```

## Monitoring HTTPRoute Status

Check the status of your HTTPRoute:

```bash
kubectl describe httproute api-routes
```

Look for conditions:

```yaml
status:
  parents:
  - parentRef:
      name: production-gateway
    conditions:
    - type: Accepted
      status: "True"
      reason: Accepted
    - type: ResolvedRefs
      status: "True"
      reason: ResolvedRefs
```

HTTPRoute provides powerful, declarative HTTP routing that surpasses traditional Ingress capabilities. Use path-based routing for microservices, header matching for API versioning, traffic splitting for canary deployments, and request mirroring for safe testing. The Gateway API's expressiveness and type safety make it the future of Kubernetes ingress and traffic management.
