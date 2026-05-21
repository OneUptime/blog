# How to Use ServiceEntry with VirtualService for External APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, VirtualService, Traffic Management, Kubernetes, Service Mesh

Description: Combine Istio ServiceEntry with VirtualService to add advanced traffic management like routing, retries, fault injection, and traffic mirroring to external APIs.

---

ServiceEntry registers an external service in Istio's registry. VirtualService tells Envoy how to handle traffic to that service. When you pair them together, you get fine-grained traffic management for external APIs that would normally require custom application code.

Think about what you can do: add timeouts without changing app code, retry failed requests automatically, inject faults for testing, mirror production traffic to a test endpoint, or route different request paths to different backends. All of this works for external APIs just like it works for internal services.

For HTTPS APIs, the HTTP-level features below require Istio to see HTTP traffic before it originates TLS to the external service. The examples use a ServiceEntry on port 80 with `targetPort: 443` and a DestinationRule with TLS origination, so the request leaves the mesh encrypted.

## The Basic Pattern

The pattern is always the same:

1. Create a ServiceEntry to register the external host
2. For HTTPS backends, create a DestinationRule that originates TLS
3. Create a VirtualService that targets the same host
4. The VirtualService rules apply to HTTP traffic going to that host

```yaml
# Step 1: Register the external service
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: weather-api
spec:
  hosts:
    - api.weather.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
      targetPort: 443
  resolution: DNS
---
# Step 2: Originate TLS for the external HTTPS service
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: weather-api-dr
spec:
  host: api.weather.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
---
# Step 3: Add traffic management
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: weather-api-vs
spec:
  hosts:
    - api.weather.com
  http:
    - timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,connect-failure
      route:
        - destination:
            host: api.weather.com
            port:
              number: 80
```

The `hosts` field in the VirtualService must match a host in the ServiceEntry. That connection is what makes the VirtualService apply to external HTTP traffic.

## Route Matching for Different Endpoints

External APIs often have different endpoints with different characteristics. You can apply different rules to different paths:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-api-vs
spec:
  hosts:
    - api.payment-provider.com
  http:
    # Charge endpoint - strict timeout, limited retries
    - match:
        - uri:
            prefix: /v1/charges
      timeout: 10s
      retries:
        attempts: 1
        retryOn: connect-failure
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
    # Refund endpoint - longer timeout
    - match:
        - uri:
            prefix: /v1/refunds
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,connect-failure
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
    # Default for everything else
    - timeout: 5s
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
```

The charge endpoint gets minimal retries (because charging is not idempotent) while the refund endpoint gets more generous retry behavior.

## Header-Based Routing

You can route based on request headers. This is useful for A/B testing external API versions or routing based on tenant:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-header-routing
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - headers:
            x-api-version:
              exact: "v2"
      route:
        - destination:
            host: api-v2.example.com
            port:
              number: 80
    - route:
        - destination:
            host: api.example.com
            port:
              number: 80
```

Note: this requires a separate ServiceEntry and DestinationRule for `api-v2.example.com` as well.

## Fault Injection for Testing

Want to test how your application handles a slow or failing external API? Inject faults without actually breaking anything:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: fault-injection-test
spec:
  hosts:
    - api.payment-provider.com
  http:
    - fault:
        delay:
          percentage:
            value: 10
          fixedDelay: 5s
        abort:
          percentage:
            value: 5
          httpStatus: 503
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
```

This adds a 5-second delay to 10% of requests and returns a 503 error for 5% of requests. Use this during chaos engineering tests to verify your application handles external API failures gracefully.

To target fault injection at specific test traffic (so you do not affect production):

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: targeted-fault-injection
spec:
  hosts:
    - api.payment-provider.com
  http:
    - match:
        - headers:
            x-test-chaos:
              exact: "true"
      fault:
        abort:
          percentage:
            value: 100
          httpStatus: 500
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
    - route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 80
```

Only requests with the `x-test-chaos: true` header get the injected fault. Production traffic flows normally.

## Traffic Mirroring

Mirror production traffic to a test endpoint to validate a new API version or a different provider:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: test-api
spec:
  hosts:
    - api-test.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
      targetPort: 443
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: test-api-dr
spec:
  host: api-test.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: mirror-traffic
spec:
  hosts:
    - api.example.com
  http:
    - route:
        - destination:
            host: api.example.com
            port:
              number: 80
      mirror:
        host: api-test.example.com
        port:
          number: 80
      mirrorPercentage:
        value: 100
```

Every request to `api.example.com` gets mirrored to `api-test.example.com`. The mirrored request is fire-and-forget - the response is discarded. Your application only sees the response from the primary destination.

## Request Header Manipulation

Add, remove, or modify headers before they reach the external API:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: header-manipulation
spec:
  hosts:
    - api.example.com
  http:
    - headers:
        request:
          add:
            x-custom-header: "mesh-proxy"
            x-request-source: "kubernetes"
          remove:
            - x-internal-debug
      route:
        - destination:
            host: api.example.com
            port:
              number: 80
```

This adds tracking headers and removes internal debug headers before the request reaches the external API.

## URL Rewriting

Rewrite the URL path before sending it to the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: url-rewrite
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /legacy/
      rewrite:
        uri: /v2/
      route:
        - destination:
            host: api.example.com
            port:
              number: 80
```

Requests to `/legacy/users` get rewritten to `/v2/users` before reaching the external API. This is useful during API migrations.

## Combining VirtualService with DestinationRule

For the most complete traffic management, combine all three resources:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: critical-api
spec:
  hosts:
    - api.critical-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
      targetPort: 443
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: critical-api-dr
spec:
  host: api.critical-service.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        maxRequestsPerConnection: 10
        maxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: critical-api-vs
spec:
  hosts:
    - api.critical-service.com
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,connect-failure
      route:
        - destination:
            host: api.critical-service.com
            port:
              number: 80
```

The ServiceEntry registers the host. The DestinationRule originates TLS and manages connection pools and circuit breaking. The VirtualService handles routing, timeouts, and retries. Together they provide comprehensive traffic management for the external API.

## Verifying VirtualService Configuration

Check that your VirtualService rules are applied:

```bash
# View routes for the host
istioctl proxy-config routes deploy/my-app | grep critical-service

# View detailed route configuration
istioctl proxy-config routes deploy/my-app \
  --name "80" -o json | grep -A20 "critical-service"
```

The combination of ServiceEntry and VirtualService gives you production-grade traffic management for external APIs. You get the same power and flexibility that Istio provides for internal services when applications send HTTP through the mesh and Istio originates TLS to the external API.
