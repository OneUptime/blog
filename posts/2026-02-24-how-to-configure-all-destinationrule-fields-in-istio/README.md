# How to Configure All DestinationRule Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Traffic Management, Kubernetes, Load Balancing

Description: A detailed guide to every DestinationRule field in Istio covering subsets, load balancing, connection pools, outlier detection, and TLS settings.

---

DestinationRules define policies that get applied to traffic after routing has happened. They control things like load balancing strategy, connection pool sizes, outlier detection, and TLS settings for upstream connections. If VirtualService is about where traffic goes, DestinationRule is about how it gets there.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool: {}
    loadBalancer: {}
    outlierDetection: {}
    tls: {}
    portLevelSettings: []
    proxyProtocol: {}
    tunnel: {}
  subsets: []
  exportTo:
    - "."
  workloadSelector:
    matchLabels:
      app: my-service
```

The `host` field is required and specifies which service this rule applies to. It can be a short name, FQDN, or wildcard. The `exportTo` field controls namespace visibility, same as VirtualService. The `workloadSelector` allows you to apply the rule only to specific workloads (available in newer Istio versions).

## Traffic Policy

The `trafficPolicy` section is where most of the configuration lives. It applies to all subsets unless overridden at the subset level.

### Load Balancer Settings

```yaml
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

The `simple` load balancer supports these algorithms:

- `ROUND_ROBIN` - rotates through endpoints sequentially (the default)
- `LEAST_REQUEST` - picks the endpoint with the fewest active requests
- `RANDOM` - picks a random endpoint
- `PASSTHROUGH` - connects directly to the caller-requested address

For more advanced scenarios, you can use consistent hashing:

```yaml
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
        minimumRingSize: 1024
```

Consistent hashing supports several key sources:

```yaml
loadBalancer:
  consistentHash:
    httpHeaderName: x-session-id
    # OR
    httpCookie:
      name: JSESSIONID
      ttl: 0s
      path: /
    # OR
    useSourceIp: true
    # OR
    httpQueryParameterName: user_id
    # OR
    maglev: {}
    # OR
    ringHash:
      minimumRingSize: 1024
```

You pick one hash key source (header, cookie, source IP, or query parameter) and one hash algorithm (`maglev` or `ringHash`). The cookie option with a TTL greater than zero will set the cookie on the first request if it does not already exist.

There is also a `localityLbSetting` for controlling locality-aware load balancing:

```yaml
loadBalancer:
  localityLbSetting:
    enabled: true
    distribute:
      - from: "us-west/zone1/*"
        to:
          "us-west/zone1/*": 80
          "us-west/zone2/*": 20
    failover:
      - from: us-west
        to: us-east
    failoverPriority:
      - "topology.kubernetes.io/zone"
    enabled: true
```

The `distribute` field explicitly maps source localities to weighted destination localities. The `failover` field specifies which region to fail over to. The `failoverPriority` field allows prioritizing failover based on custom labels.

The `warmupDurationSecs` field on the load balancer tells Istio to gradually ramp up traffic to newly added endpoints:

```yaml
loadBalancer:
  simple: ROUND_ROBIN
  warmupDurationSecs: 60s
```

### Connection Pool Settings

```yaml
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          probes: 3
          time: 7200s
          interval: 75s
        maxConnectionDuration: 30m
        idleTimeout: 1h
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
        maxRequestsPerConnection: 10
        maxRetries: 3
        idleTimeout: 300s
        useClientProtocol: false
```

The TCP connection pool settings control connection-level behavior. `maxConnections` caps the total connections to the upstream host. The `tcpKeepalive` block configures TCP keep-alive probes. `maxConnectionDuration` limits how long a connection stays open. `idleTimeout` closes connections that have been idle too long.

The HTTP connection pool settings are layered on top. `h2UpgradePolicy` controls whether HTTP/1.1 connections should upgrade to HTTP/2 (options: `DEFAULT`, `DO_NOT_UPGRADE`, `UPGRADE`). The `useClientProtocol` flag, when true, tells Envoy to use whatever protocol the client sent. `http1MaxPendingRequests` is the max number of pending requests when there is no connection available. `http2MaxRequests` is the max concurrent requests to a host. `maxRetries` limits the number of concurrent retries across all hosts in the cluster.

### Outlier Detection

```yaml
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      consecutiveGatewayErrors: 3
      consecutiveLocalOriginFailures: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
      splitExternalLocalOriginErrors: true
```

Outlier detection is basically circuit breaking for individual endpoints. When an endpoint hits a threshold of errors, it gets ejected from the load balancing pool temporarily.

`consecutive5xxErrors` counts backend 5xx responses. `consecutiveGatewayErrors` is more specific, counting only 502, 503, and 504 errors. `consecutiveLocalOriginFailures` counts locally originated failures (connection errors, timeouts). The `interval` field is how often the ejection sweep runs. The `baseEjectionTime` is the base duration for ejection - it increases exponentially with each consecutive ejection. `maxEjectionPercent` prevents ejecting too many endpoints at once. `minHealthPercent` disables outlier detection entirely if the healthy percentage drops below this threshold.

### TLS Settings

```yaml
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/ca.pem
      credentialName: my-tls-secret
      subjectAltNames:
        - my-service.default.svc.cluster.local
      sni: my-service.example.com
      insecureSkipVerify: false
```

TLS modes include:

- `DISABLE` - no TLS
- `SIMPLE` - originate TLS to the upstream (one-way TLS)
- `MUTUAL` - mutual TLS with client certificates
- `ISTIO_MUTUAL` - mutual TLS using Istio's auto-generated certs

For `MUTUAL` mode, you provide `clientCertificate`, `privateKey`, and `caCertificates`. The `credentialName` field references a Kubernetes secret instead. The `subjectAltNames` field validates the server certificate SAN. The `sni` field overrides the SNI string.

### Port-Level Settings

```yaml
spec:
  host: my-service
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          http:
            h2UpgradePolicy: UPGRADE
        loadBalancer:
          simple: LEAST_REQUEST
        outlierDetection:
          consecutive5xxErrors: 3
        tls:
          mode: ISTIO_MUTUAL
```

Port-level settings let you override the top-level traffic policy for specific ports. This is useful when a service exposes multiple ports with different characteristics.

### Proxy Protocol

```yaml
spec:
  host: my-service
  trafficPolicy:
    proxyProtocol:
      version: V2
```

This enables PROXY protocol when connecting to the upstream. Versions `V1` and `V2` are supported.

### Tunnel Settings

```yaml
spec:
  host: external-db
  trafficPolicy:
    tunnel:
      protocol: CONNECT
      targetHost: db.external.com
      targetPort: 5432
```

Tunnel settings allow proxying TCP traffic through an HTTP tunnel using CONNECT or POST.

## Subsets

```yaml
spec:
  host: reviews
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          http:
            h2UpgradePolicy: UPGRADE
    - name: v3
      labels:
        version: v3
```

Subsets partition a service into groups based on pod labels. Each subset can override the top-level `trafficPolicy`. Subsets are referenced by VirtualService routes using the `subset` field.

## Full Working Example

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
      warmupDurationSecs: 30s
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 3s
      http:
        http2MaxRequests: 500
        maxRequestsPerConnection: 50
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
    tls:
      mode: ISTIO_MUTUAL
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
  exportTo:
    - "."
    - "istio-system"
```

This gives you a service with LEAST_REQUEST load balancing, connection limits, outlier detection, mutual TLS, and two subsets where v2 overrides the load balancer to ROUND_ROBIN. It is a solid starting point for production workloads. Knowing every field available in DestinationRule means you can tune your mesh traffic behavior to fit your exact needs.
