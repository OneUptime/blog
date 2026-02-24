# How to Configure Rate Limiting per User ID in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, User ID, Envoy, Authentication

Description: How to set up per-user rate limiting in Istio by extracting user identity from JWT tokens or custom headers for fine-grained control.

---

Rate limiting per user is essential when your API serves authenticated users with different usage tiers. Unlike API key rate limiting where the key is in a plain header, user IDs typically come from JWT tokens or are injected by an authentication layer. Istio gives you several ways to extract user identity and use it as a rate limit descriptor.

## Approaches to User Identification

There are two main ways to get the user ID for rate limiting:

1. Extract it from a JWT token claim after Istio validates the token
2. Read it from a header that your auth service sets

Both approaches work with the global rate limiting infrastructure. The difference is in how Envoy gets the user ID before sending it to the rate limit service.

## Approach 1: Using JWT Claims

If your API uses JWT authentication, Istio can validate the token and make claims available as headers. First, set up RequestAuthentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    outputClaimToHeaders:
    - header: x-user-id
      claim: sub
```

The `outputClaimToHeaders` field is the important part. It takes the `sub` (subject) claim from the validated JWT and puts it into the `x-user-id` request header. This header is then available for the rate limit action to read.

Apply it:

```bash
kubectl apply -f jwt-auth.yaml
```

## Approach 2: Using Auth Service Headers

If you have an external auth service or an Istio external authorization provider, it can set the user ID header directly:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-auth
  namespace: default
spec:
  action: CUSTOM
  provider:
    name: ext-auth-provider
  rules:
  - {}
```

Your external auth service should return the `x-user-id` header in the check response. Configure the ext-auth provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: ext-auth-provider
      envoyExtAuthzHttp:
        service: auth-service.auth.svc.cluster.local
        port: 8080
        headersToUpstreamOnAllow:
        - x-user-id
        includeRequestHeadersInCheck:
        - authorization
```

The `headersToUpstreamOnAllow` ensures that the `x-user-id` header set by the auth service flows through to the rate limit check.

## Setting Up the Rate Limit Service

Configure the rate limit service with per-user limits:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: user-ratelimit
    descriptors:
    - key: user_id
      rate_limit:
        unit: minute
        requests_per_unit: 60
```

This applies a blanket 60 requests per minute limit to every user. If you need different limits for different users or tiers, you can use nested descriptors:

```yaml
domain: user-ratelimit
descriptors:
- key: user_tier
  value: "premium"
  descriptors:
  - key: user_id
    rate_limit:
      unit: minute
      requests_per_unit: 500
- key: user_tier
  value: "standard"
  descriptors:
  - key: user_id
    rate_limit:
      unit: minute
      requests_per_unit: 60
- key: user_tier
  value: "free"
  descriptors:
  - key: user_id
    rate_limit:
      unit: minute
      requests_per_unit: 10
- key: user_id
  rate_limit:
    unit: minute
    requests_per_unit: 30
```

The last entry catches users without a tier header.

## Configuring Envoy Rate Limit Actions

Set up the EnvoyFilter to extract the user ID and optionally the user tier:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-filter-user
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
          domain: user-ratelimit
          failure_mode_deny: false
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    match:
      context: GATEWAY
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 0.5s
        lb_policy: ROUND_ROBIN
        protocol_selection: USE_CONFIGURED_PROTOCOL
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
```

Now add the rate limit actions that extract headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-actions-user
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
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
              header_name: x-user-tier
              descriptor_key: user_tier
          - request_headers:
              header_name: x-user-id
              descriptor_key: user_id
        - actions:
          - request_headers:
              header_name: x-user-id
              descriptor_key: user_id
```

The first action sends both tier and user ID (matching the nested descriptors). The second action sends just the user ID as a fallback if the tier header is missing.

## Ensuring Header Order

There is a subtlety here. The JWT validation and header extraction must happen before the rate limit check. In Istio, RequestAuthentication runs before HTTP filters in the filter chain, so the `x-user-id` header from JWT claim extraction will be available when the rate limit filter runs.

Verify the filter chain order:

```bash
istioctl proxy-config listener deploy/istio-ingressgateway -n istio-system -o json | grep -A 5 "name.*ratelimit\|name.*jwt"
```

## Testing Per-User Rate Limiting

Generate a test JWT token and send requests:

```bash
# Using a valid JWT with sub="user-123"
TOKEN="eyJ..."  # Your test JWT

for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "Authorization: Bearer $TOKEN" \
    http://gateway-ip/api/endpoint
done
echo
```

With a limit of 60 per minute, you should see 429 responses starting at the 61st request.

Test with a different user token to confirm independent counters:

```bash
TOKEN2="eyJ..."  # JWT with sub="user-456"

for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "Authorization: Bearer $TOKEN2" \
    http://gateway-ip/api/endpoint
done
echo
```

This should also return 200s for the first 60 requests, independent of the first user's counter.

## Handling Unauthenticated Requests

For requests without a valid JWT (and therefore no user ID), add a fallback rate limit:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: x-user-id
      descriptor_key: user_id
- actions:
  - generic_key:
      descriptor_value: anonymous
```

And in the rate limit config:

```yaml
descriptors:
- key: generic_key
  value: "anonymous"
  rate_limit:
    unit: minute
    requests_per_unit: 5
```

Anonymous users get 5 requests per minute total (shared across all anonymous traffic).

## Monitoring Per-User Limits

Check Redis to see per-user counters:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli keys "*user_id*"
```

Each user will have their own counter key. You can inspect individual counters:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli get "user-ratelimit_user_id_user-123_1708819200"
```

## Summary

Per-user rate limiting in Istio combines JWT validation (or external auth) with the global rate limiting infrastructure. The JWT claim extraction puts the user ID into a header, and the rate limit filter sends that header value as a descriptor to the rate limit service. You can set up tiered limits by combining user tier and user ID descriptors, and always include a fallback for unauthenticated requests. The rate limit service backed by Redis ensures each user's counter is consistent across all gateway and sidecar instances.
