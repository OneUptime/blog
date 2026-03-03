# How to Configure API Rate Limiting by Consumer in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API Management, Kubernetes, Security

Description: Learn how to configure per-consumer API rate limiting in Istio using Envoy rate limit service and custom descriptors to enforce different limits for different API consumers.

---

Rate limiting is critical for any API that serves multiple consumers. You do not want one heavy client to exhaust your resources and degrade the experience for everyone else. While Istio supports basic rate limiting through local and global mechanisms, per-consumer rate limiting requires a bit more setup. This guide walks through configuring Istio to apply different rate limits based on who is making the request.

## The Architecture

Per-consumer rate limiting in Istio works through Envoy's rate limit service (RLS). The flow looks like this:

1. A request arrives at the Envoy proxy
2. Envoy extracts identifying information (API key, JWT claim, client header)
3. Envoy sends a rate limit check to an external rate limit service
4. The rate limit service decides whether to allow or reject the request
5. Envoy either forwards the request or returns a 429 response

You need three components: the rate limit service itself, an EnvoyFilter to configure Envoy to talk to the rate limit service, and the rate limit configuration that defines per-consumer limits.

## Step 1: Deploy the Rate Limit Service

The most commonly used rate limit service is Envoy's reference implementation. Deploy it along with Redis (which it uses as a backend):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: istio-system
spec:
  selector:
    app: redis
  ports:
    - port: 6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ratelimit
  template:
    metadata:
      labels:
        app: ratelimit
    spec:
      containers:
        - name: ratelimit
          image: envoyproxy/ratelimit:latest
          ports:
            - containerPort: 8081
              name: grpc
          env:
            - name: REDIS_SOCKET_TYPE
              value: tcp
            - name: REDIS_URL
              value: redis.istio-system.svc.cluster.local:6379
            - name: RUNTIME_ROOT
              value: /data
            - name: RUNTIME_SUBDIRECTORY
              value: ratelimit
            - name: USE_STATSD
              value: "false"
            - name: LOG_LEVEL
              value: debug
          volumeMounts:
            - name: config
              mountPath: /data/ratelimit/config
      volumes:
        - name: config
          configMap:
            name: ratelimit-config
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: istio-system
spec:
  selector:
    app: ratelimit
  ports:
    - port: 8081
      name: grpc
      targetPort: 8081
```

## Step 2: Define Per-Consumer Rate Limits

Create a ConfigMap with the rate limit rules. This is where you define different limits for different consumers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: api-ratelimit
    descriptors:
      # Premium tier: 1000 requests per minute
      - key: api_consumer
        value: premium
        rate_limit:
          unit: minute
          requests_per_unit: 1000
      # Standard tier: 100 requests per minute
      - key: api_consumer
        value: standard
        rate_limit:
          unit: minute
          requests_per_unit: 100
      # Free tier: 10 requests per minute
      - key: api_consumer
        value: free
        rate_limit:
          unit: minute
          requests_per_unit: 10
      # Default for unknown consumers
      - key: api_consumer
        rate_limit:
          unit: minute
          requests_per_unit: 5
```

This configuration defines four tiers: premium (1000/min), standard (100/min), free (10/min), and a default catch-all (5/min) for unidentified consumers.

## Step 3: Configure Envoy to Use the Rate Limit Service

Now you need to tell Envoy about the rate limit service and how to extract consumer information from requests. There are two EnvoyFilters needed.

First, register the rate limit service as a cluster:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-cluster
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: CLUSTER
      match:
        cluster:
          service: ratelimit.istio-system.svc.cluster.local
      patch:
        operation: ADD
        value:
          name: rate_limit_cluster
          type: STRICT_DNS
          connect_timeout: 10s
          lb_policy: ROUND_ROBIN
          http2_protocol_options: {}
          load_assignment:
            cluster_name: rate_limit_cluster
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: ratelimit.istio-system.svc.cluster.local
                          port_value: 8081
```

Second, add the rate limit filter and configure how to extract consumer information:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-filter
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
            domain: api-ratelimit
            failure_mode_deny: false
            timeout: 5s
            rate_limit_service:
              grpc_service:
                envoy_grpc:
                  cluster_name: rate_limit_cluster
              transport_api_version: V3
```

## Step 4: Extract Consumer Identity from Headers

You need to tell Envoy how to map incoming requests to consumer identifiers. If your API uses an `X-API-Tier` header (set by your authentication layer), configure route-level rate limit actions:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-actions
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
            name: "api.example.com:443"
      patch:
        operation: MERGE
        value:
          rate_limits:
            - actions:
                - request_headers:
                    header_name: x-api-tier
                    descriptor_key: api_consumer
```

This tells Envoy to take the value from the `X-API-Tier` header and use it as the `api_consumer` descriptor key when making rate limit checks.

## Using JWT Claims for Consumer Identity

A more secure approach is to extract the consumer identity from a JWT token. If your API uses JWT authentication through Istio's RequestAuthentication, you can extract claims using Istio's request identity:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputClaimToHeaders:
        - header: x-api-tier
          claim: tier
```

The `outputClaimToHeaders` field extracts the `tier` claim from the JWT and puts it in the `x-api-tier` header, which the rate limit filter then picks up.

## Per-Consumer Rate Limiting by API Key

If you use API keys instead of JWT tokens, you can rate limit by the API key directly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: api-ratelimit
    descriptors:
      - key: api_key
        value: "key-abc123"
        rate_limit:
          unit: minute
          requests_per_unit: 1000
      - key: api_key
        value: "key-def456"
        rate_limit:
          unit: minute
          requests_per_unit: 100
      - key: api_key
        rate_limit:
          unit: minute
          requests_per_unit: 10
```

And update the rate limit actions to use the API key header:

```yaml
rate_limits:
  - actions:
      - request_headers:
          header_name: x-api-key
          descriptor_key: api_key
```

## Testing the Rate Limits

Test that rate limiting works correctly by sending requests with different consumer identifiers:

```bash
# Test premium tier
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Tier: premium" \
    https://api.example.com/endpoint
done

# Test free tier (should get 429s after 10 requests)
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Tier: free" \
    https://api.example.com/endpoint
done
```

Check the rate limit service logs to see decisions:

```bash
kubectl logs -l app=ratelimit -n istio-system --tail=20
```

## Rate Limit Response Headers

By default, Envoy adds rate limit headers to the response. Clients can see their current limits:

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 60
```

## Handling Rate Limit Service Failures

The `failure_mode_deny` flag in the rate limit filter configuration controls what happens when the rate limit service is unreachable. Setting it to `false` (the default) means requests are allowed through if the rate limit service is down. Setting it to `true` means all requests are denied, which is safer but can cause outages if the rate limit service has issues.

For most production setups, `false` is the right choice. You do not want a rate limiting infrastructure failure to take down your entire API.

## Summary

Per-consumer rate limiting in Istio requires deploying an external rate limit service and configuring Envoy to extract consumer identifiers from requests. The consumer identity can come from custom headers, JWT claims, or API keys. Define your rate limit tiers in the rate limit service configuration, and Envoy handles the enforcement. Start with generous limits and tighten them based on actual usage patterns you observe in production.
