# How to Configure Contour Ingress Controller with HTTPProxy for Advanced Traffic Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Contour, Traffic Management

Description: Master Contour's HTTPProxy CRD to implement advanced traffic management including load balancing strategies, health checks, timeout configuration, and sophisticated routing patterns for Kubernetes applications.

---

Contour is a Kubernetes Ingress controller built on Envoy Proxy that uses the HTTPProxy Custom Resource Definition for advanced traffic management. HTTPProxy provides capabilities beyond standard Ingress including weighted load balancing, multi-cluster routing, request mirroring, and sophisticated health checking. This guide explores how to leverage HTTPProxy for production-grade traffic management.

## Understanding Contour HTTPProxy

The HTTPProxy CRD is Contour's answer to the limitations of standard Kubernetes Ingress. It provides:

- Multi-service routing with traffic splitting
- Request mirroring for testing
- Path and header-based routing
- Load balancing policies
- Health checking and circuit breaking
- TLS configuration including client certificate validation
- Cross-namespace routing with delegation

HTTPProxy resources are designed to be composable, allowing you to build complex routing hierarchies.

## Installing Contour

Install Contour in your Kubernetes cluster:

```bash
# Using kubectl
kubectl apply -f https://projectcontour.io/quickstart/contour.yaml

# Or using Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install contour bitnami/contour \
  --namespace projectcontour \
  --create-namespace \
  --set envoy.service.type=LoadBalancer
```

Verify installation:

```bash
kubectl get pods -n projectcontour
kubectl get svc -n projectcontour
kubectl get crd | grep contour
```

## Basic HTTPProxy Configuration

Start with a simple HTTPProxy:

```yaml
# basic-httpproxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: basic-app
  namespace: default
spec:
  # Virtual host configuration
  virtualhost:
    fqdn: app.example.com

  # Route configuration
  routes:
  - conditions:
    - prefix: /
    services:
    - name: backend-service
      port: 80
```

Apply the HTTPProxy:

```bash
kubectl apply -f basic-httpproxy.yaml
```

## Load Balancing Strategies

Contour supports multiple load balancing policies for distributing traffic across backend pods.

### Round Robin Load Balancing

The default round-robin strategy:

```yaml
# round-robin.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: round-robin-app
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: api-service
      port: 8080
      # Default load balancer policy
      strategy: RoundRobin
```

### Weighted Round Robin

Distribute traffic based on weights:

```yaml
# weighted-routing.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: weighted-app
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /api
    services:
    # 70% traffic to v1
    - name: api-v1
      port: 8080
      weight: 70
    # 30% traffic to v2
    - name: api-v2
      port: 8080
      weight: 30
```

This configuration is perfect for canary deployments or gradual rollouts.

### Least Request Load Balancing

Route to the service with the fewest active requests:

```yaml
# least-request.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: least-request-app
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
      strategy: LeastRequest
```

### Random Load Balancing

Randomly distribute requests:

```yaml
# random-lb.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: random-app
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
      strategy: Random
```

### Cookie-Based Session Affinity

Implement sticky sessions using cookies:

```yaml
# session-affinity.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: sticky-sessions
  namespace: default
spec:
  virtualhost:
    fqdn: app.example.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: stateful-app
      port: 8080
      strategy: Cookie
      cookieName: session-affinity
      cookieMaxAge: 3600
```

## Health Check Configuration

Configure active and passive health checking to ensure traffic only goes to healthy backends.

### HTTP Health Checks

Active health checking via HTTP:

```yaml
# http-health-check.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: health-checked-app
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: backend-service
      port: 8080
    healthCheckPolicy:
      # Path to health check endpoint
      path: /healthz
      # Host header for health check
      host: backend-service
      # Check interval
      intervalSeconds: 10
      # Timeout for health check
      timeoutSeconds: 5
      # Unhealthy threshold
      unhealthyThresholdCount: 3
      # Healthy threshold
      healthyThresholdCount: 2
```

### TCP Health Checks

For non-HTTP services:

```yaml
# tcp-health-check.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: tcp-health-check
  namespace: default
spec:
  virtualhost:
    fqdn: service.example.com
  routes:
  - services:
    - name: tcp-service
      port: 9000
    healthCheckPolicy:
      # TCP health check
      intervalSeconds: 5
      timeoutSeconds: 2
      unhealthyThresholdCount: 2
      healthyThresholdCount: 2
```

### Custom Health Check Headers

Send specific headers during health checks:

```yaml
# custom-health-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: custom-health-check
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    healthCheckPolicy:
      path: /health
      intervalSeconds: 10
      timeoutSeconds: 5
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
      # Custom headers for health check
      expectedStatuses:
      - min: 200
        max: 299
      - min: 300
        max: 399
```

## Timeout Configuration

Configure request and idle timeouts to handle slow or stalled connections.

### Request Timeout

Set overall request timeout:

```yaml
# request-timeout.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: timeout-config
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
    # Timeout for entire request
    timeoutPolicy:
      response: 30s
      idle: 300s
```

### Per-Route Timeout Configuration

Different timeouts for different routes:

```yaml
# per-route-timeouts.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: multi-timeout
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # Fast API endpoint
  - conditions:
    - prefix: /api/fast
    services:
    - name: fast-service
      port: 80
    timeoutPolicy:
      response: 5s
      idle: 60s

  # Slow batch processing endpoint
  - conditions:
    - prefix: /api/batch
    services:
    - name: batch-service
      port: 80
    timeoutPolicy:
      response: 300s
      idle: 600s

  # WebSocket endpoint
  - conditions:
    - prefix: /ws
    services:
    - name: websocket-service
      port: 8080
    timeoutPolicy:
      idle: 3600s
```

## Advanced Routing Patterns

### Path-Based Routing

Route based on request path:

```yaml
# path-routing.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: path-router
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # User service
  - conditions:
    - prefix: /users
    services:
    - name: user-service
      port: 8080
    pathRewritePolicy:
      replacePrefix:
      - replacement: /api/v1/users

  # Order service
  - conditions:
    - prefix: /orders
    services:
    - name: order-service
      port: 8080

  # Default catch-all
  - conditions:
    - prefix: /
    services:
    - name: default-service
      port: 80
```

### Header-Based Routing

Route based on request headers:

```yaml
# header-routing.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: header-router
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # Beta users get new version
  - conditions:
    - header:
        name: X-Beta-User
        present: true
    services:
    - name: beta-service
      port: 8080

  # Mobile clients get optimized version
  - conditions:
    - header:
        name: User-Agent
        contains: Mobile
    services:
    - name: mobile-optimized-service
      port: 8080

  # Default routing
  - conditions:
    - prefix: /
    services:
    - name: standard-service
      port: 8080
```

### Request Mirroring

Mirror traffic to a test service without affecting production:

```yaml
# traffic-mirroring.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: mirrored-traffic
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /api
    services:
    # Production service receives actual traffic
    - name: production-service
      port: 8080
    # Test service receives mirrored traffic
    - name: test-service
      port: 8080
      mirror: true
```

## Retry and Circuit Breaking

Configure retry policies and circuit breakers for resilience.

### Retry Policy

Automatically retry failed requests:

```yaml
# retry-policy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: retry-config
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
    retryPolicy:
      # Number of retries
      numRetries: 3
      # Per-try timeout
      perTryTimeout: 5s
      # Retry on these conditions
      retryOn:
      - 5xx
      - gateway-error
      - reset
      - connect-failure
      - retriable-4xx
```

### Connection Pool Settings

Control connection pooling for better resource management:

```yaml
# connection-pool.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: connection-pooling
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    # Circuit breaker settings
    connectionPoolSettings:
      maxConnections: 2048
      maxPendingRequests: 1024
      maxRequests: 1024
      maxRetries: 3
```

## Multi-Cluster and Delegation

Route traffic across multiple clusters or delegate routing to other HTTPProxy resources.

### HTTPProxy Delegation

Delegate routing to team-specific HTTPProxy resources:

```yaml
# root-proxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: root-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  includes:
  # Delegate /users to users team
  - name: users-proxy
    namespace: users-team
    conditions:
    - prefix: /users

  # Delegate /orders to orders team
  - name: orders-proxy
    namespace: orders-team
    conditions:
    - prefix: /orders
---
# users-proxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: users-proxy
  namespace: users-team
spec:
  routes:
  - services:
    - name: user-service
      port: 8080
```

## Monitoring and Debugging

Check HTTPProxy status:

```bash
# List HTTPProxies
kubectl get httpproxies -A

# Describe HTTPProxy
kubectl describe httpproxy basic-app

# Check status conditions
kubectl get httpproxy basic-app -o jsonpath='{.status.conditions}'
```

View Contour logs:

```bash
kubectl logs -n projectcontour -l app=contour --follow
```

Enable debug logging:

```yaml
# Enable debug mode
apiVersion: v1
kind: ConfigMap
metadata:
  name: contour
  namespace: projectcontour
data:
  contour.yaml: |
    debug: true
```

## Conclusion

Contour's HTTPProxy CRD provides powerful traffic management capabilities that go far beyond standard Kubernetes Ingress. By leveraging load balancing strategies, health checks, timeouts, and advanced routing patterns, you can build resilient, production-grade applications. The delegation model allows teams to manage their own routing while maintaining central control, making HTTPProxy ideal for large organizations with multiple teams.
