# How to Use ServiceEntry with VirtualService for External APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, VirtualService, Traffic Management, Kubernetes, Service Mesh

Description: Combine Istio ServiceEntry with VirtualService to add advanced traffic management like routing, retries, fault injection, and traffic mirroring to external APIs.

---

ServiceEntry registers an external service in Istio's registry. VirtualService tells Envoy how to handle traffic to that service. When you pair them together, you get fine-grained traffic management for external APIs that would normally require custom application code.

Think about what you can do: add timeouts without changing app code, retry failed requests automatically, inject faults for testing, mirror production traffic to a test endpoint, or route different request paths to different backends. All of this works for external APIs just like it works for internal services.

## The Basic Pattern

The pattern is always the same:

1. Create a ServiceEntry to register the external host
2. Create a VirtualService that targets the same host
3. The VirtualService rules apply to all traffic going to that host

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
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Step 2: Add traffic management
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
              number: 443
```

The `hosts` field in the VirtualService must match a host in the ServiceEntry. That connection is what makes the VirtualService apply to external traffic.

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
              number: 443
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
              number: 443
    # Default for everything else
    - timeout: 5s
      route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 443
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
              number: 443
    - route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

Note: this requires a separate ServiceEntry for `api-v2.example.com` as well.

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
              number: 443
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
              number: 443
    - route:
        - destination:
            host: api.payment-provider.com
            port:
              number: 443
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
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
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
              number: 443
      mirror:
        host: api-test.example.com
        port:
          number: 443
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
              number: 443
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
              number: 443
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
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
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
              number: 443
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: critical-api-dr
spec:
  host: api.critical-service.com
  trafficPolicy:
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
```

The ServiceEntry registers the host. The VirtualService handles routing, timeouts, and retries. The DestinationRule manages connection pools and circuit breaking. Together they provide comprehensive traffic management for the external API.

## Verifying VirtualService Configuration

Check that your VirtualService rules are applied:

```bash
# View routes for the host
istioctl proxy-config routes deploy/my-app | grep critical-service

# View detailed route configuration
istioctl proxy-config routes deploy/my-app \
  --name "443" -o json | grep -A20 "critical-service"
```

The combination of ServiceEntry and VirtualService gives you production-grade traffic management for external APIs. You get the same power and flexibility that Istio provides for internal services, without any changes to your application code.
