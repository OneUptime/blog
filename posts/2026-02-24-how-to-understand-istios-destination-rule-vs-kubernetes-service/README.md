# How to Understand Istio's Destination Rule vs Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Kubernetes Service, Load Balancing, Traffic Policy

Description: A practical comparison of Istio DestinationRule and Kubernetes Service, explaining how they work together and what each one controls in your mesh.

---

Istio DestinationRule and Kubernetes Service both affect how traffic reaches your workloads, but they operate at different layers and control different things. Kubernetes Service defines what a service is and which pods back it. DestinationRule defines how traffic should behave when it reaches that service. They are not alternatives - they work together.

## Kubernetes Service: The Service Definition

A Kubernetes Service is the basic building block of service discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: default
spec:
  selector:
    app: product
  ports:
  - port: 8080
    targetPort: 8080
    name: http
```

What this gives you:
- A DNS name: `product-service.default.svc.cluster.local`
- A ClusterIP: `10.96.x.x`
- Automatic endpoint tracking (pods matching `app: product`)
- Round-robin load balancing (via kube-proxy)

The Service answers the question: "What pods make up this logical service?"

## Istio DestinationRule: Traffic Behavior

A DestinationRule tells Istio how to handle traffic after a routing decision has been made. It defines:

- Load balancing algorithm
- Connection pool settings
- Outlier detection (circuit breaking)
- TLS settings
- Subsets (named groups of pod versions)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
```

The DestinationRule answers the question: "How should traffic behave when going to this service?"

## How They Work Together

You always need a Kubernetes Service. The DestinationRule is optional and sits on top of it.

The flow is:

1. Kubernetes Service defines the service and its endpoints (pod IPs)
2. Istio picks up the Service from the Kubernetes API
3. DestinationRule configures how the sidecar connects to those endpoints

Without a DestinationRule, Istio uses defaults:
- Round-robin load balancing
- Default connection pool sizes
- No outlier detection
- mTLS based on mesh-wide settings

With a DestinationRule, you override those defaults.

## Feature Comparison

### Load Balancing

**Kubernetes Service** - Round-robin only. Handled by kube-proxy (iptables or IPVS mode).

**DestinationRule** - Multiple algorithms:

```yaml
# Least Request - sends to the backend with fewest active requests
trafficPolicy:
  loadBalancer:
    simple: LEAST_REQUEST

# Random
trafficPolicy:
  loadBalancer:
    simple: RANDOM

# Consistent Hash - session affinity based on header, cookie, or source IP
trafficPolicy:
  loadBalancer:
    consistentHash:
      httpHeaderName: x-user-id

# Cookie-based session affinity
trafficPolicy:
  loadBalancer:
    consistentHash:
      httpCookie:
        name: JSESSIONID
        ttl: 0s
```

When Istio is active, the sidecar handles load balancing instead of kube-proxy. The sidecar resolves the ClusterIP to individual pod IPs and applies the configured algorithm.

### Connection Management

**Kubernetes Service** - No connection pool configuration. kube-proxy does not maintain connections; it just rewrites packet destinations.

**DestinationRule** - Fine-grained connection pooling:

```yaml
trafficPolicy:
  connectionPool:
    tcp:
      maxConnections: 100
      connectTimeout: 30ms
      tcpKeepalive:
        time: 7200s
        interval: 75s
    http:
      http1MaxPendingRequests: 100
      http2MaxRequests: 1000
      maxRequestsPerConnection: 10
      maxRetries: 3
      idleTimeout: 60s
      h2UpgradePolicy: DEFAULT
```

This prevents any single service from overwhelming another with too many connections.

### Health Checking

**Kubernetes Service** - Uses readiness probes on individual pods. If a pod fails its readiness probe, it is removed from the Endpoints.

**DestinationRule** - Uses outlier detection, which is passive health checking based on actual request results:

```yaml
trafficPolicy:
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 10s
    baseEjectionTime: 30s
    maxEjectionPercent: 50
```

The difference is that Kubernetes readiness probes check a specific health endpoint periodically. Outlier detection watches real traffic and removes backends that are returning errors. They complement each other - readiness probes catch pods that are completely broken, outlier detection catches pods that are partially failing.

### Subsets (Version Grouping)

**Kubernetes Service** - Uses a single label selector. All matching pods get traffic equally. There is no concept of versions or subsets.

**DestinationRule** - Defines named subsets that group pods by labels:

```yaml
subsets:
- name: v1
  labels:
    version: v1
- name: v2
  labels:
    version: v2
- name: canary
  labels:
    version: canary
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 10
```

Subsets are referenced by VirtualService for traffic splitting:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
spec:
  hosts:
  - product-service
  http:
  - route:
    - destination:
        host: product-service
        subset: v1
      weight: 90
    - destination:
        host: product-service
        subset: v2
      weight: 10
```

Without DestinationRule subsets, you cannot do version-based traffic splitting.

### TLS Configuration

**Kubernetes Service** - No TLS configuration at the service level. Pods handle TLS themselves, or you rely on the cluster's networking.

**DestinationRule** - Configures how the sidecar initiates TLS connections:

```yaml
trafficPolicy:
  tls:
    mode: ISTIO_MUTUAL  # Use Istio's mTLS

# Or for external services:
trafficPolicy:
  tls:
    mode: SIMPLE
    caCertificates: /etc/certs/ca.pem
```

TLS modes:
- `DISABLE` - No TLS
- `SIMPLE` - Standard TLS (client verifies server)
- `MUTUAL` - mTLS with custom certificates
- `ISTIO_MUTUAL` - mTLS with Istio-managed certificates

### Port-Level Settings

**Kubernetes Service** - Same behavior for all ports.

**DestinationRule** - Per-port traffic policies:

```yaml
trafficPolicy:
  portLevelSettings:
  - port:
      number: 8080
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      http:
        http2MaxRequests: 500
  - port:
      number: 9090
    loadBalancer:
      simple: ROUND_ROBIN
```

## Common Mistakes

### Forgetting the DestinationRule When Using Subsets

If your VirtualService references a subset that does not exist in a DestinationRule, traffic will fail:

```yaml
# VirtualService referencing subset "v2"
- destination:
    host: product-service
    subset: v2

# But no DestinationRule defines subset "v2"
# Result: 503 errors
```

Always create the DestinationRule with subsets before referencing them in VirtualService.

### Host Mismatch

The `host` field in DestinationRule must match exactly what you use in VirtualService:

```yaml
# DestinationRule
spec:
  host: product-service  # Short name

# VirtualService destination
- destination:
    host: product-service.default.svc.cluster.local  # FQDN
```

These might not match in all configurations. Use consistent naming.

### Overriding mTLS Accidentally

If you set `tls.mode: DISABLE` in a DestinationRule, you will break mTLS for that service:

```yaml
# This disables mTLS for product-service
trafficPolicy:
  tls:
    mode: DISABLE
```

Only do this if you specifically need plaintext connections (e.g., to an external service without TLS).

## Debugging

Check what DestinationRule is applied to a service:

```bash
# View the cluster configuration (which includes DestinationRule settings)
istioctl proxy-config clusters deploy/frontend -n default | grep product-service
```

```text
product-service.default.svc.cluster.local   8080   -     outbound   EDS
product-service.default.svc.cluster.local   8080   v1    outbound   EDS
product-service.default.svc.cluster.local   8080   v2    outbound   EDS
```

Check the detailed cluster settings:

```bash
istioctl proxy-config clusters deploy/frontend -n default \
    --fqdn product-service.default.svc.cluster.local -o json | python3 -m json.tool
```

This shows the actual load balancing policy, circuit breaker thresholds, and TLS settings applied to the cluster.

Kubernetes Service and Istio DestinationRule are complementary pieces. The Service tells the mesh what exists. The DestinationRule tells the mesh how to get there safely and efficiently. You always need a Service. You add a DestinationRule when you need control over load balancing, connection management, health checking, or when you need to define version subsets for traffic splitting.
