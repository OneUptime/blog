# How to Write DestinationRule YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, YAML, Cheat Sheet, Traffic Management, Kubernetes

Description: Complete cheat sheet for Istio DestinationRule YAML covering subsets, load balancing, circuit breaking, and connection pools.

---

DestinationRule is the Istio resource that defines traffic policies for a service after routing has occurred. While VirtualService controls where traffic goes, DestinationRule controls how that traffic gets there. It handles load balancing, connection pool settings, circuit breaking, outlier detection, and TLS settings for upstream connections.

Here is a complete reference with practical YAML examples.

## Basic Structure

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp: {}
      http: {}
    loadBalancer: {}
    outlierDetection: {}
    tls: {}
  subsets: []
```

The `host` field specifies which service this rule applies to. It can be a short name (resolved in the same namespace) or a full FQDN like `my-service.default.svc.cluster.local`.

## Subsets

Subsets define named groups of service instances, typically representing different versions:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
    - name: v3
      labels:
        version: v3
```

Subsets are referenced in VirtualService routes:

```yaml
# In the VirtualService
- destination:
    host: reviews
    subset: v2
```

### Subsets with Specific Traffic Policies

Each subset can have its own traffic policy:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50  # Override for v2 only
```

## Load Balancing

### Round Robin (default)

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: round-robin-dr
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

### Random

```yaml
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
```

### Least Connections

```yaml
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

### Passthrough (let the OS decide)

```yaml
  trafficPolicy:
    loadBalancer:
      simple: PASSTHROUGH
```

### Consistent Hashing (Session Affinity)

Hash by HTTP header:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: sticky-dr
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Hash by cookie:

```yaml
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: session-id
          ttl: 3600s
```

Hash by source IP:

```yaml
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

Hash by query parameter:

```yaml
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpQueryParameterName: user
```

### Locality Load Balancing

Prefer endpoints in the same region or zone:

```yaml
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "us-west1/zone-a/*"
            to:
              "us-west1/zone-a/*": 80
              "us-west1/zone-b/*": 20
```

With failover:

```yaml
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-west1
            to: us-east1
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

Outlier detection is required for locality failover to work.

## Connection Pool Settings

### TCP Connection Pool

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: connpool-dr
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
```

### HTTP Connection Pool

```yaml
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 10
        maxRetries: 3
```

### Combined TCP and HTTP Settings

```yaml
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 100
        maxRetries: 3
```

## Circuit Breaking (Outlier Detection)

Outlier detection ejects unhealthy endpoints from the load balancing pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: circuit-breaker-dr
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

### Field Descriptions

- `consecutive5xxErrors`: Number of 5xx errors before ejection (default: 5)
- `interval`: How often to check for outliers (default: 10s)
- `baseEjectionTime`: Minimum ejection duration (increases with repeated ejections)
- `maxEjectionPercent`: Maximum % of hosts that can be ejected (default: 10)
- `minHealthPercent`: Below this threshold, outlier detection is disabled

### Aggressive Circuit Breaking

For services that should fail fast:

```yaml
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        maxRequestsPerConnection: 5
        maxRetries: 0
```

## TLS Settings

### mTLS (Istio managed)

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mtls-dr
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

### Disable TLS

```yaml
  trafficPolicy:
    tls:
      mode: DISABLE
```

### Simple TLS (one-way)

```yaml
  trafficPolicy:
    tls:
      mode: SIMPLE
```

### Mutual TLS with Custom Certificates

```yaml
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client-cert.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/ca-cert.pem
      sni: my-service.example.com
```

## Port-Level Settings

Apply different policies per port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: port-level-dr
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          tcp:
            maxConnections: 200
        outlierDetection:
          consecutive5xxErrors: 3
      - port:
          number: 8443
        tls:
          mode: ISTIO_MUTUAL
```

## Export To (Visibility)

Control which namespaces can see this DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: private-dr
  namespace: backend
spec:
  host: my-service
  exportTo:
    - "."       # Only visible in the same namespace
```

```yaml
  exportTo:
    - "*"       # Visible in all namespaces (default)
```

```yaml
  exportTo:
    - "."
    - "frontend"  # Visible in same namespace and frontend namespace
```

## Full Production Example

Here is a comprehensive DestinationRule for a production service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-server-dr
  namespace: backend
spec:
  host: api-server.backend.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
    loadBalancer:
      simple: LEAST_REQUEST
    tls:
      mode: ISTIO_MUTUAL
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50
```

This gives you a well-tuned DestinationRule with connection limits, circuit breaking, least-connection load balancing, mTLS, and separate subsets for stable and canary versions with different connection limits. Adjust the numbers based on your service's actual capacity and traffic patterns.
