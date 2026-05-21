# How to Configure Rate Limiting per Source Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Service Mesh, Envoy, Microservice

Description: How to configure rate limiting based on the calling service identity in Istio to protect downstream services from noisy neighbors.

---

In a microservices architecture, the "noisy neighbor" problem is real. One upstream service can flood a downstream service with requests, starving other consumers. Per-source-service rate limiting addresses this by tracking which service is making the call and enforcing separate limits for each. Istio makes this possible because it knows the identity of every service in the mesh through mTLS certificates.

## Why Per-Source Limits Matter

Say you have a payment service that three other services call: the checkout service, the reporting service, and the fraud detection service. The reporting service runs batch queries that generate heavy traffic. Without per-source limits, those batch queries can overwhelm the payment service and slow down real-time checkout requests.

With per-source limits, you can give the checkout service 500 requests per minute, the fraud service 200, and the reporting service only 50. Each service gets its own quota.

## How Source Identity Works in Istio

Istio automatically configures sidecars to use mTLS when calling other mesh workloads, while destination workloads default to `PERMISSIVE` mode unless you configure `STRICT` mTLS with a `PeerAuthentication` policy. When a request uses mTLS, the client certificate contains the service account identity in the SPIFFE format:

```text
spiffe://cluster.local/ns/default/sa/checkout-service
```

Envoy can expose this identity through the `x-forwarded-client-cert` (XFCC) header when the HTTP connection manager is configured to forward the URI SAN, or through connection attributes such as `connection.uri_san_peer_certificate`. You can use this to build rate limit descriptors.

## Preparing Source Headers

Before either local or global rate limiting can use source-specific descriptors, the destination proxy needs a stable value for the caller identity. First, your source services need to identify themselves. Istio configures Envoy to populate the `x-forwarded-client-cert` header for mesh mTLS traffic, but extracting the service identity from it for rate limiting requires some work.

A practical approach is to use a Lua filter to set a custom header based on the source identity. Apply an EnvoyFilter on the destination service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: source-identity-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          default_source_code:
            inline_string: |
              function envoy_on_request(request_handle)
                local xfcc = request_handle:headers():get("x-forwarded-client-cert")
                if xfcc then
                  local uri = string.match(xfcc, "URI=([^;,]+)")
                  if uri then
                    local sa = string.match(uri, "/sa/(.+)$")
                    if sa then
                      request_handle:headers():replace("x-source-service", sa)
                    end
                  end
                end
              end
```

This Lua filter extracts the service account name from the XFCC header and puts it in a simpler `x-source-service` header.

## Global Rate Limiting per Source Service

For production environments, use the global rate limiting approach. Configure the rate limit service with per-source limits:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: source-ratelimit
    descriptors:
    - key: source_service
      value: "checkout-service"
      rate_limit:
        unit: minute
        requests_per_unit: 500
    - key: source_service
      value: "reporting-service"
      rate_limit:
        unit: minute
        requests_per_unit: 50
    - key: source_service
      value: "fraud-detection"
      rate_limit:
        unit: minute
        requests_per_unit: 200
    - key: source_service
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

The catch-all entry at the bottom handles any service not explicitly listed.

## Setting Up the EnvoyFilter for Source-Based Actions

Configure the rate limit filter and actions on the destination service sidecar:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-source-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: source-ratelimit
          failure_mode_deny: false
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.rate-limit.svc.cluster.local
                authority: ratelimit.rate-limit.svc.cluster.local
            transport_api_version: V3
```

## Adding Rate Limit Actions with Source Header

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-source-actions
  namespace: default
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          name: ""
          route:
            action: ANY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: x-source-service
              descriptor_key: source_service
```

Apply all the filters:

```bash
kubectl apply -f source-identity-header.yaml
kubectl apply -f ratelimit-source-filter.yaml
kubectl apply -f ratelimit-source-actions.yaml
```

## Alternative: Using Connection Attributes

Instead of the Lua filter approach, you can use Envoy's computed descriptor extension with the documented downstream TLS connection attributes. This uses the full SPIFFE URI as the descriptor value, so the rate limit service descriptors must use full SPIFFE values instead of just service account names:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-connection-actions
  namespace: default
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          name: ""
          route:
            action: ANY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - extension:
              name: envoy.rate_limit_descriptors.expr
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.rate_limit_descriptors.expr.v3.Descriptor
                descriptor_key: source_service
                text: connection.uri_san_peer_certificate
```

This extracts the URI SAN directly from the downstream mTLS connection, avoiding the need for a Lua filter.

## Combining Source and Path Limits

For even more granular control, combine source service with request path:

```yaml
domain: source-ratelimit
descriptors:
- key: source_service
  value: "reporting-service"
  descriptors:
  - key: path
    value: "/api/v1/transactions"
    rate_limit:
      unit: minute
      requests_per_unit: 10
  - key: path
    rate_limit:
      unit: minute
      requests_per_unit: 50
```

Then send both descriptor entries from the route configuration:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: x-source-service
      descriptor_key: source_service
  - request_headers:
      header_name: ":path"
      descriptor_key: path
```

This limits the reporting service to only 10 requests per minute on the transactions endpoint while allowing 50 per minute on other endpoints.

## Testing

From inside the checkout service pod, send requests to the payment service:

```bash
kubectl exec deploy/checkout-service -- sh -c '
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code} " http://payment-service:8080/api/v1/charge
done
'
```

Then do the same from the reporting service and verify it gets limited at a lower threshold:

```bash
kubectl exec deploy/reporting-service -- sh -c '
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code} " http://payment-service:8080/api/v1/transactions
done
'
```

## Monitoring Source-Based Limits

Check rate limit stats on the payment service sidecar:

```bash
kubectl exec deploy/payment-service -c istio-proxy -- curl -s localhost:15000/stats | grep ratelimit
```

And verify Redis counters per source:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli keys "*source_service*"
```

## Summary

Per-source-service rate limiting in Istio protects downstream services from noisy upstream consumers. You extract the source service identity from the mTLS certificate chain (via the XFCC header or connection attributes) and use it as a rate limit descriptor. Different source services get different rate budgets, ensuring that critical real-time services are not starved by batch or analytics workloads. This pattern is one of the most valuable rate limiting configurations in a microservices mesh because it directly addresses the uneven traffic patterns that naturally emerge as systems grow.
