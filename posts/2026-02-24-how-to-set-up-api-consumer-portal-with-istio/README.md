# How to Set Up API Consumer Portal with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Portal, Developer Experience, API Gateway, Documentation

Description: How to build and deploy an API consumer portal behind Istio with self-service documentation, key management, and usage dashboards.

---

An API consumer portal is where developers go to discover your APIs, get API keys, read documentation, and monitor their usage. While Istio is not a developer portal out of the box, you can use it as the infrastructure layer that ties together documentation services, key management, usage analytics, and self-service tools into a coherent portal experience.

## Architecture Overview

The portal consists of several components, each running as a service in your Kubernetes cluster:

- **Portal Frontend** - React or Vue app serving the developer portal UI
- **Documentation Service** - Swagger UI or Redoc for API reference
- **Key Management Service** - Issues and manages API keys
- **Analytics Service** - Exposes per-client usage data
- **Auth Service** - Handles developer login and registration

Istio routes requests to each component and provides security, observability, and traffic management.

## Deploying the Portal Frontend

Start with a simple portal frontend:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portal-frontend
  labels:
    app: portal-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: portal-frontend
  template:
    metadata:
      labels:
        app: portal-frontend
    spec:
      containers:
        - name: frontend
          image: myregistry/api-portal:latest
          ports:
            - containerPort: 3000
          env:
            - name: API_DOCS_URL
              value: "/portal/docs"
            - name: KEY_MGMT_URL
              value: "/portal/keys"
            - name: ANALYTICS_URL
              value: "/portal/analytics"
---
apiVersion: v1
kind: Service
metadata:
  name: portal-frontend
spec:
  selector:
    app: portal-frontend
  ports:
    - port: 3000
      targetPort: 3000
```

## Istio Routing for the Portal

Set up a gateway and VirtualService that routes all portal paths:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: portal-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: portal-tls-cert
      hosts:
        - "developers.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: portal-routes
spec:
  hosts:
    - developers.example.com
  gateways:
    - istio-system/portal-gateway
  http:
    # API Documentation
    - match:
        - uri:
            prefix: /portal/docs
      rewrite:
        uri: /
      route:
        - destination:
            host: swagger-ui
            port:
              number: 8080
      corsPolicy:
        allowOrigins:
          - exact: "https://developers.example.com"
        allowMethods:
          - GET
          - OPTIONS
        maxAge: "24h"
    # Key Management API
    - match:
        - uri:
            prefix: /portal/keys
      rewrite:
        uri: /keys
      route:
        - destination:
            host: key-management
            port:
              number: 8080
    # Usage Analytics
    - match:
        - uri:
            prefix: /portal/analytics
      rewrite:
        uri: /analytics
      route:
        - destination:
            host: analytics-service
            port:
              number: 8080
    # Portal Frontend (catch-all)
    - route:
        - destination:
            host: portal-frontend
            port:
              number: 3000
```

## API Key Self-Service

Deploy a key management service that lets developers create and manage their own API keys:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: key-management
  labels:
    app: key-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: key-management
  template:
    metadata:
      labels:
        app: key-management
    spec:
      containers:
        - name: key-mgmt
          image: myregistry/key-management:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
---
apiVersion: v1
kind: Service
metadata:
  name: key-management
spec:
  selector:
    app: key-management
  ports:
    - port: 8080
      targetPort: 8080
```

Protect the key management endpoints with JWT authentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: portal-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com/"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: portal-key-mgmt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    # Key management requires authentication
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/portal/keys*"]
            hosts: ["developers.example.com"]
    # Analytics requires authentication
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/portal/analytics*"]
            hosts: ["developers.example.com"]
    # Docs and frontend are public
    - to:
        - operation:
            paths: ["/portal/docs*", "/", "/static/*", "/assets/*"]
            hosts: ["developers.example.com"]
```

## Usage Analytics Dashboard

Create a service that queries Prometheus for per-client API usage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  labels:
    app: analytics-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
        - name: analytics
          image: myregistry/api-analytics:latest
          ports:
            - containerPort: 8080
          env:
            - name: PROMETHEUS_URL
              value: "http://prometheus.istio-system:9090"
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
spec:
  selector:
    app: analytics-service
  ports:
    - port: 8080
      targetPort: 8080
```

The analytics service queries Prometheus with client-specific metrics:

```
# Total requests for a specific client today
sum(increase(istio_requests_total{x_client_id="client-abc"}[24h]))

# Error rate for a client
sum(rate(istio_requests_total{x_client_id="client-abc", response_code=~"5.*"}[1h]))
/ sum(rate(istio_requests_total{x_client_id="client-abc"}[1h]))

# Latency percentiles for a client
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{x_client_id="client-abc"}[5m])) by (le))
```

## API Catalog

Serve an API catalog that lists all available APIs, their versions, and status:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-catalog
data:
  catalog.json: |
    {
      "apis": [
        {
          "name": "User Service",
          "basePath": "/api/v2/users",
          "version": "2.0.0",
          "status": "stable",
          "documentation": "/portal/docs#/User%20Service",
          "description": "Manage user accounts and profiles"
        },
        {
          "name": "Order Service",
          "basePath": "/api/v1/orders",
          "version": "1.3.0",
          "status": "stable",
          "documentation": "/portal/docs#/Order%20Service",
          "description": "Create and manage orders"
        },
        {
          "name": "Payment Service v1",
          "basePath": "/api/v1/payments",
          "version": "1.0.0",
          "status": "deprecated",
          "sunset": "2026-07-01",
          "successor": "/api/v2/payments",
          "documentation": "/portal/docs#/Payment%20Service%20v1",
          "description": "Process payments (deprecated, use v2)"
        },
        {
          "name": "Payment Service v2",
          "basePath": "/api/v2/payments",
          "version": "2.0.0",
          "status": "stable",
          "documentation": "/portal/docs#/Payment%20Service%20v2",
          "description": "Process payments with enhanced features"
        }
      ]
    }
```

Route the catalog endpoint:

```yaml
http:
  - match:
      - uri:
          exact: /portal/catalog
    route:
      - destination:
          host: portal-api
          port:
            number: 8080
```

## Rate Limit Visibility

Show developers their current rate limit status through response headers. Configure Istio to include quota information:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_response(response_handle)
                local tier = response_handle:headers():get("x-client-tier")
                if tier == "premium" then
                  response_handle:headers():add("x-ratelimit-limit", "10000/hour")
                elseif tier == "standard" then
                  response_handle:headers():add("x-ratelimit-limit", "1000/hour")
                else
                  response_handle:headers():add("x-ratelimit-limit", "100/hour")
                end
              end
```

## Health Status Page

Add a status page that shows the health of each API:

```yaml
http:
  - match:
      - uri:
          exact: /portal/status
    route:
      - destination:
          host: status-service
          port:
            number: 8080
        headers:
          response:
            set:
              cache-control: "no-cache"
```

The status service can aggregate health check results from all your API services and present them in a dashboard.

## Securing the Portal

Use Istio's mTLS to secure communication between portal components:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: portal-mtls
  namespace: default
spec:
  mtls:
    mode: STRICT
```

Add rate limiting to prevent abuse of the portal itself:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: portal-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: portal_rate_limit
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 50
              fill_interval: 60s
```

Building an API consumer portal with Istio means you are leveraging the same infrastructure that serves your APIs. The portal gets the same security, observability, and traffic management benefits. While it is more work than using a managed API portal service, it gives you full control over the developer experience and keeps everything within your Kubernetes cluster.
