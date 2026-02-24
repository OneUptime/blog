# How to Configure Rate Limiting per User in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Per-User, JWT, Envoy, Kubernetes

Description: How to set up per-user rate limiting in Istio by extracting user identity from JWTs and applying individual rate limit rules.

---

Rate limiting on a per-user basis is essential when you want to give each user their own request budget. A blanket rate limit treats all traffic the same, which means one heavy user can eat into the capacity meant for everyone else. Per-user rate limiting solves this by tracking and enforcing limits for each user independently.

## The Challenge of Per-User Limits

The tricky part is figuring out who the user is. In a service mesh, requests arrive at Envoy proxies as HTTP traffic. You need to extract something from the request that uniquely identifies the user. The most common approaches are:

- Extracting the user ID from a JWT token
- Using an API key header
- Using a session cookie

Once you have the user identifier, you send it as a descriptor to the rate limit service, which maintains separate counters for each user.

## Prerequisites

You need the global rate limiting infrastructure in place:

- Redis deployed for counter storage
- Envoy rate limit service deployed
- The rate limit cluster registered in your Envoy configuration

If you do not have these yet, set them up first. The focus here is on the per-user configuration specifically.

## Extracting User Identity from JWT

If your services use JWT for authentication (which is common with Istio's RequestAuthentication), you can extract the user ID claim and use it for rate limiting.

First, make sure JWT authentication is configured:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    outputClaimToHeaders:
    - header: "x-user-id"
      claim: "sub"
```

The `outputClaimToHeaders` field is the key piece here. It tells Istio to extract the `sub` (subject) claim from the JWT and put it in an `x-user-id` header. This header is then available for the rate limit filter to use.

## Configuring the Rate Limit Service

Set up the rate limit service config with per-user descriptors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: per-user-ratelimit
    descriptors:
    # Per-user limit: 100 requests per minute per user
    - key: user_id
      rate_limit:
        unit: minute
        requests_per_unit: 100

    # Specific user override (e.g., for a known heavy client)
    - key: user_id
      value: "user-heavy-client-123"
      rate_limit:
        unit: minute
        requests_per_unit: 500
```

This creates a default limit of 100 requests per minute for every user, with an override of 500 for a specific user. The rate limit service automatically creates separate counters for each unique `user_id` value.

Restart the rate limit service to pick up the new configuration:

```bash
kubectl rollout restart deployment ratelimit -n rate-limit
```

## Configuring Envoy to Send User Descriptors

Now tell Envoy to extract the `x-user-id` header and send it as a descriptor:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-user-ratelimit-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
          domain: per-user-ratelimit
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
          - request_headers:
              header_name: "x-user-id"
              descriptor_key: user_id
```

The `request_headers` action extracts the value of the `x-user-id` header and uses it as the `user_id` descriptor key. Since each user has a different JWT subject, each user gets their own rate limit counter.

## Using API Keys Instead of JWTs

If your API uses API keys rather than JWTs, the approach is similar but you need a different way to extract the user identity:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: apikey-user-ratelimit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
          domain: per-user-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-api-key"
              descriptor_key: user_id
```

Here the API key itself becomes the rate limit key. Each unique API key gets its own counter.

## Combining Per-User with Global Limits

A good practice is to have both per-user and global limits. Per-user limits prevent individual abuse, while global limits protect the service from aggregate overload:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: combined-ratelimit
    descriptors:
    # Global limit for the entire service
    - key: global
      value: "all-users"
      rate_limit:
        unit: minute
        requests_per_unit: 10000

    # Per-user limit
    - key: user_id
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

Configure the EnvoyFilter to send both descriptors:

```yaml
rate_limits:
- actions:
  - generic_key:
      descriptor_value: "all-users"
      descriptor_key: global
- actions:
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: user_id
```

Each `actions` list produces a separate rate limit check. Both the global and per-user limits must pass for the request to proceed.

## Handling Missing User Identity

What happens when a request does not have a user ID? Maybe the JWT is missing or the API key header is not present. By default, if a descriptor key cannot be populated, the rate limit action is skipped for that request.

If you want to rate limit anonymous requests too, add a fallback:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: user_id
- actions:
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: user_id
      skip_if_absent: true
  - generic_key:
      descriptor_value: "anonymous"
      descriptor_key: user_id
```

## Testing Per-User Rate Limits

Test with different users to verify independent tracking:

```bash
# User A - should have their own limit
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "Authorization: Bearer $USER_A_JWT" \
    http://my-api.default:8080/api/data
done
echo "User A done"

# User B - should be unaffected by User A's usage
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "Authorization: Bearer $USER_B_JWT" \
    http://my-api.default:8080/api/data
done
echo "User B done"
```

User A should start getting 429s after 100 requests, but User B should be completely unaffected and get their full 100 requests.

## Monitoring Per-User Usage

Check the rate limit service metrics:

```bash
kubectl exec my-api-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

You can also check Redis to see individual user counters:

```bash
kubectl exec -n rate-limit redis-pod -- redis-cli keys "*user_id*"
```

## Summary

Per-user rate limiting in Istio works by extracting a unique user identifier from the request - typically from a JWT claim or API key header - and using it as a descriptor for the global rate limit service. Each user gets their own counter, so one user's heavy usage does not impact others. Combine per-user limits with global limits for comprehensive protection, and always have a plan for handling requests where the user identity cannot be determined.
