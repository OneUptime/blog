# How to Implement Rate Limiting at the Kubernetes Ingress Layer for Production API Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rate Limiting, Ingress, API Security

Description: Protect production APIs from abuse and overload by implementing rate limiting at the Kubernetes ingress layer, ensuring fair resource usage and preventing denial of service attacks.

---

Your API can handle a certain amount of traffic before performance degrades or systems fail. Rate limiting at the ingress layer establishes that boundary, protecting backend services from excessive load while ensuring fair access for legitimate users. Without rate limiting, a single misbehaving client or malicious actor can consume resources intended for all users.

Implementing rate limiting at the ingress controller rather than in application code centralizes this protection and reduces the burden on backend services. The ingress controller sits at the edge of your cluster, making it the ideal enforcement point for rate limits before requests ever reach your applications.

Different ingress controllers provide various rate limiting capabilities, from simple request-per-second limits to sophisticated token bucket algorithms with burst handling. Choosing the right approach depends on your traffic patterns and protection requirements.

## Rate Limiting with NGINX Ingress Controller

NGINX Ingress Controller provides robust rate limiting through annotations that configure limits per IP address, per service, or using custom keys. The rate limiting uses a leaky bucket algorithm that allows controlled bursts while enforcing average rate limits.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    # Limit to 10 requests per second per IP
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Allow burst of 20 requests
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
    # Return 429 Too Many Requests when exceeded
    nginx.ingress.kubernetes.io/limit-connections: "10"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This configuration limits each IP address to 10 requests per second with bursts up to 20 requests. When a client exceeds these limits, NGINX returns HTTP 429 status codes.

The `limit-burst-multiplier` annotation defines how many requests can arrive in a burst before rate limiting kicks in. A multiplier of 2 means the burst can be twice the base rate, allowing 20 requests in a short period followed by sustained rate of 10 per second.

For more sophisticated rate limiting based on request headers or paths:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-advanced-limiting
  namespace: production
  annotations:
    # Rate limit using API key header instead of IP
    nginx.ingress.kubernetes.io/limit-rate-after: "100"
    nginx.ingress.kubernetes.io/limit-rate: "500"
    # Custom rate limit zone
    nginx.ingress.kubernetes.io/configuration-snippet: |
      limit_req_zone $http_x_api_key zone=api_key_limit:10m rate=100r/s;
      limit_req zone=api_key_limit burst=20 nodelay;
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This configuration creates a custom rate limit zone based on the `X-API-Key` header rather than IP address, useful for APIs that authenticate clients via API keys.

## Rate Limiting with Traefik Ingress

Traefik provides rate limiting through middleware that you attach to ingress routes. Traefik's approach offers flexible configuration through separate middleware objects.

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-api
  namespace: production
spec:
  rateLimit:
    average: 100
    burst: 50
    period: 1s
    sourceCriterion:
      ipStrategy:
        depth: 1
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: production-rate-limit-api@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This configuration limits requests to an average of 100 per second with bursts of 50 requests. The `sourceCriterion` defines how to identify unique clients, using IP address by default.

For header-based rate limiting:

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-by-token
  namespace: production
spec:
  rateLimit:
    average: 1000
    burst: 200
    period: 1m
    sourceCriterion:
      requestHeaderName: X-Auth-Token
```

This middleware uses the `X-Auth-Token` header to identify clients, allowing different rate limits based on authentication tokens rather than IP addresses.

## Rate Limiting with Istio Gateway

Istio provides rate limiting through its Envoy-based gateways, offering sophisticated distributed rate limiting capabilities. Istio rate limiting integrates with external rate limit services for cluster-wide enforcement.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
  namespace: production
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: "/api"
    route:
    - destination:
        host: api-service
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-filter
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
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: http_local_rate_limiter
          token_bucket:
            max_tokens: 100
            tokens_per_fill: 100
            fill_interval: 1s
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

This EnvoyFilter configuration implements local rate limiting at the ingress gateway using a token bucket algorithm. Each gateway instance enforces limits independently.

For distributed rate limiting across multiple gateway instances:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: production
data:
  config.yaml: |
    domain: production-api
    descriptors:
      - key: remote_address
        rate_limit:
          unit: second
          requests_per_unit: 10
      - key: header_match
        value: "premium"
        rate_limit:
          unit: second
          requests_per_unit: 100
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: production
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
        env:
        - name: USE_STATSD
          value: "false"
        - name: LOG_LEVEL
          value: "debug"
        - name: REDIS_SOCKET_TYPE
          value: "tcp"
        - name: REDIS_URL
          value: "redis:6379"
        volumeMounts:
        - name: config
          mountPath: /data/ratelimit/config
      volumes:
      - name: config
        configMap:
          name: ratelimit-config
```

This deployment runs the Envoy rate limit service that maintains distributed counters in Redis, providing consistent rate limiting across all gateway instances.

## Path-Specific Rate Limits

Different API endpoints often require different rate limits. Public endpoints might need aggressive limiting while authenticated endpoints can be more permissive. Configure path-specific limits to balance protection with usability.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-public
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "5"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /public
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-authenticated
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

Public endpoints receive strict 5 requests per second limits while authenticated API endpoints allow 100 requests per second. This approach protects public resources from abuse while not constraining legitimate authenticated usage.

## Custom Rate Limit Responses

When clients exceed rate limits, provide helpful responses that explain the limitation and when they can retry. Standard rate limiting middleware returns 429 status codes, but custom response bodies improve the developer experience.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      location / {
        limit_req zone=default burst=20 nodelay;
        limit_req_status 429;
        add_header X-RateLimit-Limit 10 always;
        add_header X-RateLimit-Remaining $limit_req_remaining always;
        add_header Retry-After 60 always;
      }

      error_page 429 = @ratelimit;
      location @ratelimit {
        default_type application/json;
        return 429 '{"error":"Rate limit exceeded","message":"Too many requests. Please retry after 60 seconds.","limit":10,"period":"second"}';
      }
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This configuration adds rate limit headers to all responses and returns structured JSON error messages when limits are exceeded, helping API consumers understand and handle rate limits gracefully.

## Monitoring Rate Limit Effectiveness

After implementing rate limiting, monitor its effectiveness to tune limits appropriately. Too restrictive limits frustrate legitimate users while too permissive limits fail to protect your services.

```bash
# Check rate limit metrics in NGINX
kubectl exec -n ingress-nginx deployment/ingress-nginx-controller -- \
  curl -s localhost:10254/metrics | grep nginx_ingress_controller_requests

# View rate limit denied requests
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | \
  grep "limiting requests"
```

Set up Prometheus queries to track rate limiting:

```promql
# Rate of 429 responses
rate(nginx_ingress_controller_requests{status="429"}[5m])

# Percentage of requests rate limited
rate(nginx_ingress_controller_requests{status="429"}[5m]) /
rate(nginx_ingress_controller_requests[5m]) * 100

# Top IPs being rate limited
topk(10, sum by (remote_addr) (
  rate(nginx_ingress_controller_requests{status="429"}[5m])
))
```

Create alerts for unusual rate limiting patterns:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  rate-limit-alerts.yaml: |
    groups:
    - name: rate-limit-alerts
      interval: 30s
      rules:
      - alert: HighRateLimitRejections
        expr: |
          rate(nginx_ingress_controller_requests{status="429"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of rate limit rejections"
          description: "{{ $value }} requests per second are being rate limited"

      - alert: SingleIPExcessiveRateLimit
        expr: |
          sum by (remote_addr) (
            rate(nginx_ingress_controller_requests{status="429"}[5m])
          ) > 5
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Single IP hitting rate limits excessively"
          description: "IP {{ $labels.remote_addr }} is being rate limited at {{ $value }} req/s"
```

Review rate limit logs regularly to identify patterns and adjust limits:

```bash
# Analyze rate limited IPs over the last hour
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --since=1h | \
  grep "limiting requests" | \
  awk '{print $NF}' | \
  sort | uniq -c | sort -rn | head -20

# Check rate limit timing patterns
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --since=24h | \
  grep "limiting requests" | \
  awk '{print $1" "$2}' | \
  cut -d: -f1 | \
  uniq -c
```

Rate limiting at the ingress layer provides essential protection for production APIs. By configuring appropriate limits based on client identity and API endpoint sensitivity, you prevent abuse and overload while maintaining service availability for legitimate users. This protection becomes more critical as your API scales and attracts more diverse usage patterns.
