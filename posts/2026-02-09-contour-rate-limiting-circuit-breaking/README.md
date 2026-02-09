# How to Use Contour HTTPProxy Rate Limiting and Circuit Breaking Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Contour, Rate Limiting

Description: Learn how to implement rate limiting and circuit breaking in Contour Ingress Controller using HTTPProxy resources to protect your Kubernetes services from overload and cascading failures.

---

Contour Ingress Controller provides robust rate limiting and circuit breaking features through its HTTPProxy CRD and integration with Envoy's rate limiting service. These features protect your services from abuse, prevent cascading failures, and ensure system stability under load. This guide explores how to configure both local and global rate limiting, along with circuit breaking patterns.

## Understanding Rate Limiting in Contour

Contour supports two types of rate limiting:

- **Local Rate Limiting**: Enforced at each Envoy proxy instance independently, suitable for simple scenarios
- **Global Rate Limiting**: Enforced using a centralized rate limit service, ensuring accurate limits across all proxies

Rate limits can be applied based on:
- Request path or route
- Source IP address
- Request headers
- Generic descriptors for complex scenarios

## Setting Up Global Rate Limiting

Global rate limiting requires deploying the Envoy rate limit service.

### Deploy Rate Limit Service

Create the rate limit service deployment:

```yaml
# ratelimit-service.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: projectcontour
data:
  ratelimit-config.yaml: |
    domain: contour
    descriptors:
      # 100 requests per minute per IP
      - key: generic_key
        value: global
        rate_limit:
          unit: minute
          requests_per_unit: 100

      # 1000 requests per minute for authenticated users
      - key: header_match
        value: authenticated
        rate_limit:
          unit: minute
          requests_per_unit: 1000

      # Path-specific limits
      - key: generic_key
        value: api_v1
        rate_limit:
          unit: second
          requests_per_unit: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: projectcontour
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
          name: http
        - containerPort: 8080
          name: grpc
        env:
        - name: USE_STATSD
          value: "false"
        - name: LOG_LEVEL
          value: "debug"
        - name: REDIS_SOCKET_TYPE
          value: "tcp"
        - name: REDIS_URL
          value: "redis-service:6379"
        - name: RUNTIME_ROOT
          value: "/data"
        - name: RUNTIME_SUBDIRECTORY
          value: "ratelimit"
        - name: RUNTIME_WATCH_ROOT
          value: "false"
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
  namespace: projectcontour
spec:
  selector:
    app: ratelimit
  ports:
  - name: http
    port: 8081
    targetPort: 8081
  - name: grpc
    port: 8080
    targetPort: 8080
```

### Deploy Redis for Rate Limit State

```yaml
# redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: projectcontour
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
  name: redis-service
  namespace: projectcontour
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### Configure Contour to Use Rate Limit Service

Update Contour configuration:

```yaml
# contour-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: contour
  namespace: projectcontour
data:
  contour.yaml: |
    rateLimitService:
      extensionService: projectcontour/ratelimit
      domain: contour
      failOpen: false
      enableXRateLimitHeaders: true
---
apiVersion: projectcontour.io/v1alpha1
kind: ExtensionService
metadata:
  name: ratelimit
  namespace: projectcontour
spec:
  protocol: h2
  services:
  - name: ratelimit
    port: 8080
```

Apply the configuration:

```bash
kubectl apply -f redis.yaml
kubectl apply -f ratelimit-service.yaml
kubectl apply -f contour-config.yaml

# Restart Contour to pick up config changes
kubectl rollout restart deployment/contour -n projectcontour
```

## Configuring Rate Limits in HTTPProxy

### Basic Global Rate Limiting

Apply rate limiting to an HTTPProxy:

```yaml
# global-rate-limit.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: rate-limited-api
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
    rateLimitPolicy:
      global:
        descriptors:
        # 100 requests per minute globally
        - entries:
          - genericKey:
              value: global
  routes:
  - conditions:
    - prefix: /
    services:
    - name: backend-service
      port: 80
```

### Per-Route Rate Limiting

Different limits for different routes:

```yaml
# per-route-rate-limit.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: tiered-rate-limits
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # Strict limit for expensive endpoint
  - conditions:
    - prefix: /api/expensive
    rateLimitPolicy:
      global:
        descriptors:
        - entries:
          - genericKey:
              value: expensive_endpoint
    services:
    - name: backend-service
      port: 80

  # Generous limit for read-only endpoint
  - conditions:
    - prefix: /api/read
    rateLimitPolicy:
      global:
        descriptors:
        - entries:
          - genericKey:
              value: read_endpoint
    services:
    - name: backend-service
      port: 80
```

Update the rate limit configuration:

```yaml
# Update ratelimit-config ConfigMap
data:
  ratelimit-config.yaml: |
    domain: contour
    descriptors:
      - key: generic_key
        value: expensive_endpoint
        rate_limit:
          unit: minute
          requests_per_unit: 10

      - key: generic_key
        value: read_endpoint
        rate_limit:
          unit: minute
          requests_per_unit: 1000
```

### IP-Based Rate Limiting

Rate limit by client IP address:

```yaml
# ip-rate-limit.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: ip-limited-api
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /api
    rateLimitPolicy:
      global:
        descriptors:
        # Rate limit per IP
        - entries:
          - remoteAddress: {}
    services:
    - name: backend-service
      port: 80
```

Configure the limit in rate limit service:

```yaml
descriptors:
  - key: remote_address
    rate_limit:
      unit: minute
      requests_per_unit: 100
```

### Header-Based Rate Limiting

Rate limit based on header values:

```yaml
# header-rate-limit.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: header-limited-api
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /api
    rateLimitPolicy:
      global:
        descriptors:
        # Rate limit by API key
        - entries:
          - requestHeader:
              headerName: X-API-Key
              descriptorKey: api_key
    services:
    - name: backend-service
      port: 80
```

Configure per-key limits:

```yaml
descriptors:
  - key: api_key
    value: premium-key-12345
    rate_limit:
      unit: hour
      requests_per_unit: 10000

  - key: api_key
    value: basic-key-67890
    rate_limit:
      unit: hour
      requests_per_unit: 1000

  # Default for unknown keys
  - key: api_key
    rate_limit:
      unit: hour
      requests_per_unit: 100
```

## Local Rate Limiting

Local rate limiting is simpler but less accurate in multi-replica deployments:

```yaml
# local-rate-limit.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: local-limited-api
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /api
    rateLimitPolicy:
      local:
        # 100 requests per second per Envoy instance
        requests: 100
        unit: second
        # Burst allowance
        burst: 200
        # Return 429 when limited
        responseStatusCode: 429
    services:
    - name: backend-service
      port: 80
```

## Circuit Breaking Configuration

Circuit breaking prevents cascading failures by limiting connections and requests to unhealthy services.

### Connection Limits

Configure maximum connections and requests:

```yaml
# circuit-breaker.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: circuit-breaking
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: backend-service
      port: 80
    # Circuit breaker configuration
    loadBalancerPolicy:
      strategy: RoundRobin
      circuitBreaker:
        # Maximum connections
        maxConnections: 1024
        # Maximum pending requests
        maxPendingRequests: 512
        # Maximum requests
        maxRequests: 1024
        # Maximum retries
        maxRetries: 3
```

### Outlier Detection

Automatically remove unhealthy backends:

```yaml
# outlier-detection.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: outlier-detection
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    healthCheckPolicy:
      path: /healthz
      intervalSeconds: 5
      timeoutSeconds: 2
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
    loadBalancerPolicy:
      strategy: RoundRobin
      # Outlier detection settings
      circuitBreaker:
        maxConnections: 2048
        maxPendingRequests: 1024
        maxRequests: 2048
        maxRetries: 3
```

### Per-Route Circuit Breaking

Different limits for different routes:

```yaml
# per-route-circuit-breaker.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: multi-route-circuit-breaker
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # Strict limits for resource-intensive endpoint
  - conditions:
    - prefix: /api/heavy
    services:
    - name: heavy-service
      port: 80
    loadBalancerPolicy:
      circuitBreaker:
        maxConnections: 256
        maxPendingRequests: 128
        maxRequests: 256
        maxRetries: 1

  # Generous limits for lightweight endpoint
  - conditions:
    - prefix: /api/light
    services:
    - name: light-service
      port: 80
    loadBalancerPolicy:
      circuitBreaker:
        maxConnections: 4096
        maxPendingRequests: 2048
        maxRequests: 4096
        maxRetries: 5
```

## Combining Rate Limiting and Circuit Breaking

Use both features together for comprehensive protection:

```yaml
# combined-protection.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: protected-api
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
    # Global rate limiting
    rateLimitPolicy:
      global:
        descriptors:
        - entries:
          - remoteAddress: {}
  routes:
  - conditions:
    - prefix: /api
    # Additional per-route rate limiting
    rateLimitPolicy:
      local:
        requests: 50
        unit: second
        burst: 100
    services:
    - name: backend-service
      port: 80
    # Circuit breaking
    loadBalancerPolicy:
      circuitBreaker:
        maxConnections: 1024
        maxPendingRequests: 512
        maxRequests: 1024
        maxRetries: 3
    # Health checking
    healthCheckPolicy:
      path: /health
      intervalSeconds: 10
      timeoutSeconds: 3
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
    # Timeouts
    timeoutPolicy:
      response: 30s
      idle: 300s
    # Retry policy
    retryPolicy:
      numRetries: 3
      perTryTimeout: 10s
      retryOn:
      - 5xx
      - gateway-error
```

## Monitoring and Testing

Test rate limiting:

```bash
# Generate load to trigger rate limit
for i in {1..200}; do
  curl -i https://api.example.com/api/test
  sleep 0.1
done

# Check for 429 responses
curl -i https://api.example.com/api/test
```

Check rate limit headers:

```bash
curl -v https://api.example.com/api/test 2>&1 | grep -i x-ratelimit
# Should see headers like:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1612345678
```

Monitor rate limit service:

```bash
# Check rate limit service logs
kubectl logs -n projectcontour -l app=ratelimit --follow

# Check Redis for rate limit state
kubectl exec -n projectcontour -it deployment/redis -- redis-cli
> KEYS *
> GET <key>
```

View circuit breaker stats:

```bash
# Access Envoy admin interface
kubectl port-forward -n projectcontour <envoy-pod> 9001:9001

# View cluster stats including circuit breaker status
curl http://localhost:9001/stats | grep circuit_breakers
```

## Troubleshooting

Common issues:

**Rate limits not working**: Check rate limit service connectivity:
```bash
kubectl logs -n projectcontour -l app.kubernetes.io/name=contour | grep ratelimit
```

**Circuit breaker always open**: Check if limits are too strict:
```bash
curl http://localhost:9001/stats | grep cx_open
```

**Redis connection failed**: Verify Redis service:
```bash
kubectl get svc -n projectcontour redis-service
kubectl logs -n projectcontour -l app=redis
```

## Conclusion

Contour's rate limiting and circuit breaking features provide robust protection for your Kubernetes services. Global rate limiting ensures accurate enforcement across all proxies, while circuit breaking prevents cascading failures. By combining these features with health checking and retry policies, you can build resilient applications that gracefully handle overload and failures. The integration with Envoy's rate limit service provides enterprise-grade capabilities suitable for production environments.
