# How to Configure Rate Limiting per IP Address in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, IP Address, Envoy, Security, Kubernetes

Description: How to implement per-IP address rate limiting in Istio to protect services from individual client abuse and DDoS patterns.

---

Per-IP rate limiting is one of the most fundamental protections you can put in front of your services. It prevents any single IP address from overwhelming your backend, which is critical for defending against scrapers, brute-force attacks, and lightweight DDoS attempts. In Istio, you can implement this using either local rate limiting (per-proxy) or global rate limiting (centralized), and the IP address extraction is handled by Envoy.

## How IP Address Extraction Works in Envoy

Before you can rate limit by IP, you need to know where the client IP comes from. This depends on your network setup:

- **Direct connections**: The client IP is the remote address of the TCP connection.
- **Behind a load balancer**: The real client IP is typically in the `X-Forwarded-For` header.
- **Behind a CDN**: Similar to a load balancer, but the CDN might use a custom header.

Envoy can extract the client IP from either the connection itself or from trusted headers. The `remote_address` descriptor in Envoy uses the downstream direct remote address, while `request_headers` lets you pull from any header.

## Configuring Istio to Trust Proxy Headers

If your service sits behind a load balancer or CDN, you need to tell Istio how many proxy hops to trust. This is configured in the mesh config or through a Telemetry resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

With `numTrustedProxies: 1`, Envoy trusts one proxy hop and extracts the client IP from the second-to-last entry in the `X-Forwarded-For` header.

## Per-IP Local Rate Limiting

For local rate limiting (no external service required), you can use Envoy's local rate limit filter with descriptors. However, the standard local rate limit filter uses a single shared token bucket. To get per-IP behavior with local rate limiting, you need to use the connection-level approach.

A simpler approach uses the global rate limit service with per-IP descriptors. But if you really want local-only, here is how to use a Lua filter to set headers that the local rate limiter can use:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-ip-local-ratelimit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: per_ip_local_rate_limiter
          token_bucket:
            max_tokens: 1000
            tokens_per_fill: 1000
            fill_interval: 60s
          filter_enabled:
            runtime_key: local_rate_limit_enabled
            default_value:
              numerator: 100
              denominator: HUNDRED
          filter_enforced:
            runtime_key: local_rate_limit_enforced
            default_value:
              numerator: 100
              denominator: HUNDRED
```

## Per-IP Global Rate Limiting (Recommended)

The better approach for true per-IP rate limiting is using the global rate limit service. Each unique IP address gets its own counter in Redis.

First, configure the rate limit service rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: per-ip-ratelimit
    descriptors:
    # Default per-IP limit
    - key: remote_address
      rate_limit:
        unit: minute
        requests_per_unit: 60

    # Whitelist specific IPs with higher limits
    - key: remote_address
      value: "10.0.1.50"
      rate_limit:
        unit: minute
        requests_per_unit: 10000

    # Block known bad IPs
    - key: remote_address
      value: "192.168.1.100"
      rate_limit:
        unit: minute
        requests_per_unit: 0
```

Restart the rate limit service:

```bash
kubectl rollout restart deployment ratelimit -n rate-limit
```

## Configuring Envoy to Send IP Descriptors

Set up the EnvoyFilter to extract the client IP and send it to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-ip-ratelimit-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
          domain: per-ip-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
          enable_x_ratelimit_headers: DRAFT_VERSION_03
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - remote_address: {}
```

The `remote_address: {}` action tells Envoy to use the downstream client IP as the descriptor value. Envoy automatically populates the `remote_address` descriptor key with the client's IP.

## Using X-Forwarded-For for Real Client IP

If your services are behind a load balancer and the direct connection IP is always the load balancer's IP, you need to extract the real client IP from the `X-Forwarded-For` header instead:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: "x-forwarded-for"
      descriptor_key: remote_address
```

Be careful with this approach. The `X-Forwarded-For` header can be spoofed by clients unless your infrastructure strips or validates it. Make sure your load balancer overwrites the header rather than appending to it.

## Applying at the Ingress Gateway

Per-IP rate limiting is most effective at the ingress gateway where you see actual client IPs:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-per-ip-ratelimit
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
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: per-ip-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
          enable_x_ratelimit_headers: DRAFT_VERSION_03
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - remote_address: {}
```

## Testing Per-IP Rate Limiting

Send requests from different source IPs and verify each gets its own limit:

```bash
# From one IP
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code} " http://my-service.example.com/api/test
done
echo "IP 1 done"

# From a different IP (using a different pod)
kubectl exec different-pod -- bash -c '
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code} " http://my-service.default:8080/api/test
done
'
echo "IP 2 done"
```

After 60 requests from one IP, that IP should start getting 429s, but the other IP should still have its full quota.

## Monitoring IP-Based Rate Limits

Check rate limit stats in Envoy:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

You can query Redis to see which IPs are being tracked:

```bash
kubectl exec -n rate-limit redis-pod -- redis-cli keys "*remote_address*"
```

## Dealing with Shared IPs and NAT

One challenge with per-IP rate limiting is that many users might share the same IP address (corporate NATs, VPNs, mobile carriers). Setting limits too low can affect legitimate users behind shared IPs. Consider:

- Using higher per-IP limits if you expect shared IPs
- Combining per-IP with per-user rate limiting for authenticated endpoints
- Whitelisting known corporate IP ranges with higher limits
- Using different limits for different endpoints

## Summary

Per-IP rate limiting in Istio protects your services from individual client abuse. The recommended approach is using the global rate limit service with `remote_address` descriptors so each IP gets tracked independently across all service replicas. Apply it at the ingress gateway for the most accurate client IP detection, be careful about X-Forwarded-For header trust, and account for shared IP scenarios by setting appropriate limits and combining with other rate limiting dimensions.
