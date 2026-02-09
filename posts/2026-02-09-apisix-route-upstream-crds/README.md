# How to Configure APISIX Route and Upstream CRDs for Dynamic API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: APISIX, Kubernetes, API Gateway

Description: Learn how to use APISIX's Kubernetes CRDs to declaratively configure routes and upstreams, enabling GitOps-driven API management with advanced traffic control and service discovery.

---

APISIX Ingress Controller extends Kubernetes with Custom Resource Definitions that represent API Gateway concepts as native Kubernetes objects. The ApisixRoute and ApisixUpstream CRDs enable declarative configuration of routes, traffic splitting, canary deployments, and upstream health checks using familiar kubectl workflows and GitOps practices.

## Understanding APISIX CRDs

The main CRDs for routing configuration are:

**ApisixRoute** - Defines how requests match and route to services, including path matching, header routing, and traffic splits.

**ApisixUpstream** - Configures backend service pools with load balancing, health checks, and retry policies.

**ApisixTls** - Manages TLS certificates for HTTPS endpoints.

**ApisixPluginConfig** - Groups plugins for reuse across multiple routes.

These CRDs translate to APISIX configuration in etcd, providing a Kubernetes-native management experience.

## Creating Basic Routes

Deploy a simple route that forwards requests to a backend service:

```yaml
# basic-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: api-route
  namespace: default
spec:
  http:
  - name: api-endpoint
    match:
      paths:
      - /api/*
      methods:
      - GET
      - POST
    backends:
    - serviceName: backend-api
      servicePort: 8080
```

Apply the route:

```bash
kubectl apply -f basic-route.yaml

# Verify route creation
kubectl get apisixroute
kubectl describe apisixroute api-route
```

## Path-Based Routing

Configure multiple paths with different backends:

```yaml
# multi-path-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: microservices-routes
  namespace: default
spec:
  http:
  - name: users-service
    match:
      paths:
      - /api/users/*
    backends:
    - serviceName: users-service
      servicePort: 8080

  - name: orders-service
    match:
      paths:
      - /api/orders/*
    backends:
    - serviceName: orders-service
      servicePort: 8080

  - name: products-service
    match:
      paths:
      - /api/products/*
    backends:
    - serviceName: products-service
      servicePort: 8080
```

## Traffic Splitting for Canary Deployments

Split traffic between service versions:

```yaml
# canary-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: api-canary
  namespace: default
spec:
  http:
  - name: api-canary-split
    match:
      paths:
      - /api/*
    backends:
    - serviceName: api-v1
      servicePort: 8080
      weight: 90  # 90% to stable version
    - serviceName: api-v2
      servicePort: 8080
      weight: 10  # 10% to canary version
```

Gradually shift traffic:

```bash
# Increase canary traffic to 30%
kubectl patch apisixroute api-canary --type=json -p='[
  {"op": "replace", "path": "/spec/http/0/backends/0/weight", "value": 70},
  {"op": "replace", "path": "/spec/http/0/backends/1/weight", "value": 30}
]'

# Full cutover to v2
kubectl patch apisixroute api-canary --type=json -p='[
  {"op": "replace", "path": "/spec/http/0/backends/0/weight", "value": 0},
  {"op": "replace", "path": "/spec/http/0/backends/1/weight", "value": 100}
]'
```

## Header-Based Routing

Route based on HTTP headers:

```yaml
# header-routing.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: header-based-routing
  namespace: default
spec:
  http:
  - name: mobile-route
    match:
      paths:
      - /api/*
      exprs:
      - subject:
          scope: Header
          name: X-Client-Type
        op: Equal
        value: mobile
    backends:
    - serviceName: mobile-backend
      servicePort: 8080

  - name: web-route
    match:
      paths:
      - /api/*
      exprs:
      - subject:
          scope: Header
          name: X-Client-Type
        op: Equal
        value: web
    backends:
    - serviceName: web-backend
      servicePort: 8080

  - name: default-route
    match:
      paths:
      - /api/*
    priority: 1  # Lower priority as fallback
    backends:
    - serviceName: default-backend
      servicePort: 8080
```

## Advanced Expression Matching

Use complex matching expressions:

```yaml
# complex-matching.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: advanced-matching
  namespace: default
spec:
  http:
  - name: api-key-route
    match:
      paths:
      - /api/*
      exprs:
      - subject:
          scope: Header
          name: X-API-Key
        op: RegexMatch
        value: "^[a-zA-Z0-9]{32}$"
      - subject:
          scope: Query
          name: version
        op: In
        set:
        - v1
        - v2
    backends:
    - serviceName: authenticated-api
      servicePort: 8080
```

## Configuring Upstreams

Define upstream configuration with health checks:

```yaml
# upstream-config.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixUpstream
metadata:
  name: backend-upstream
  namespace: default
spec:
  loadbalancer:
    type: roundrobin  # Options: roundrobin, chash, ewma, least_conn

  scheme: http
  timeout:
    connect: 6s
    send: 6s
    read: 6s

  retries: 2
  passHost: pass  # Options: pass, node, rewrite

  healthCheck:
    active:
      type: http
      httpPath: /health
      healthy:
        interval: 2s
        successes: 2
      unhealthy:
        interval: 1s
        httpFailures: 2
    passive:
      healthy:
        successes: 3
      unhealthy:
        httpFailures: 3
        tcpFailures: 3
```

Reference upstream in routes:

```yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: api-with-upstream
  namespace: default
spec:
  http:
  - name: api-route
    match:
      paths:
      - /api/*
    upstreamName: backend-upstream
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

## Load Balancing with Consistent Hashing

Configure consistent hashing for session affinity:

```yaml
# consistent-hash-upstream.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixUpstream
metadata:
  name: session-upstream
  namespace: default
spec:
  loadbalancer:
    type: chash
    hashOn: header
    key: X-Session-ID
```

## Weighted Round Robin

Distribute traffic with weights:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-weighted
  namespace: default
spec:
  selector:
    app: backend
  ports:
  - port: 8080
---
apiVersion: apisix.apache.org/v2
kind: ApisixUpstream
metadata:
  name: weighted-upstream
  namespace: default
spec:
  loadbalancer:
    type: roundrobin

  # Define specific node weights if needed
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Retries and Circuit Breaking

Configure retry logic and circuit breakers:

```yaml
# resilience-upstream.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixUpstream
metadata:
  name: resilient-upstream
  namespace: default
spec:
  retries: 3
  timeout:
    connect: 3s
    send: 3s
    read: 3s

  scheme: http
  passHost: pass

  # Health check for circuit breaking behavior
  healthCheck:
    active:
      type: http
      httpPath: /health
      timeout: 1s
      healthy:
        interval: 3s
        successes: 2
      unhealthy:
        interval: 1s
        httpFailures: 3
```

## TLS Configuration

Configure HTTPS with TLS:

```yaml
# tls-config.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixTls
metadata:
  name: api-tls
  namespace: default
spec:
  hosts:
  - api.example.com
  secret:
    name: api-tls-secret
    namespace: default
---
apiVersion: v1
kind: Secret
metadata:
  name: api-tls-secret
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: secure-api
  namespace: default
spec:
  http:
  - name: https-route
    match:
      hosts:
      - api.example.com
      paths:
      - /api/*
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

## Testing Routes and Upstreams

Test the configured routes:

```bash
# Get APISIX gateway IP
APISIX_IP=$(kubectl get svc apisix-gateway -n apisix -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test basic route
curl http://${APISIX_IP}/api/test

# Test with headers
curl -H "X-Client-Type: mobile" http://${APISIX_IP}/api/data

# Test canary deployment multiple times
for i in {1..20}; do
  curl -s http://${APISIX_IP}/api/version
done | sort | uniq -c
```

## Monitoring Route Health

Check route status:

```bash
# View route status
kubectl get apisixroute -o wide

# Describe route for events
kubectl describe apisixroute api-route

# Check upstream health
kubectl get apisixupstream -o yaml
```

## Best Practices

**Use namespaces for isolation** - Organize routes and upstreams by team or environment using Kubernetes namespaces.

**Enable health checks** - Active health checks prevent routing to failed backends.

**Start with conservative timeouts** - Set generous timeouts initially and tune based on monitoring data.

**Version your CRDs** - Store route definitions in Git for audit trails and rollback capability.

**Test traffic splits in non-production** - Validate canary configurations before applying to production.

**Monitor upstream metrics** - Track backend response times and error rates to inform routing decisions.

**Use priority for fallback routes** - Set lower priorities on catch-all routes to ensure specific routes match first.

## Conclusion

APISIX's Kubernetes CRDs provide declarative, GitOps-friendly API management that integrates naturally with Kubernetes workflows. The ApisixRoute and ApisixUpstream resources enable sophisticated traffic management including canary deployments, A/B testing, and circuit breaking without manual Admin API calls. By representing routing configuration as Kubernetes objects, teams gain version control, automated deployment pipelines, and consistency across environments while leveraging APISIX's performance and feature-rich plugin ecosystem.
