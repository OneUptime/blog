# How to Configure All Sidecar Resource Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Proxy Configuration, Kubernetes, Performance

Description: A detailed walkthrough of every field in the Istio Sidecar resource covering ingress and egress listeners, workload selectors, and outbound traffic policies.

---

The Sidecar resource in Istio gives you fine-grained control over the scope and behavior of the Envoy proxy sidecar attached to your workloads. By default, every sidecar in the mesh is configured to reach every other service and accept traffic on the ports associated with the workload. For large meshes, that is wasteful and noisy. The Sidecar resource lets you narrow things down.

## Why Use the Sidecar Resource

In a mesh with hundreds or thousands of services, each Envoy proxy maintains configuration for every service it could possibly talk to. That means every sidecar receives cluster, endpoint, and listener updates for every service in the mesh. This leads to high memory usage and slow configuration push times.

The Sidecar resource trims that down. You define exactly which services a workload needs to import into its outbound configuration, and Istio only pushes configuration for those services. The result is faster config updates, lower memory usage, and a smaller proxy configuration surface.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
  inboundConnectionPool:
    http:
      http1MaxPendingRequests: 1024
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

## Workload Selector

```yaml
spec:
  workloadSelector:
    labels:
      app: my-app
      version: v1
```

The `workloadSelector` determines which pods this Sidecar configuration applies to. It matches against pod labels. A few important rules:

- If `workloadSelector` is omitted, the Sidecar applies to all workloads in the namespace
- Only one Sidecar per namespace can omit the workload selector (it becomes the namespace default)
- If a workload matches both a specific Sidecar and a namespace-default Sidecar, the specific one wins
- A Sidecar in `istio-system` without a workload selector becomes the global default for all namespaces that do not have their own default

```yaml
# Namespace default sidecar (no workloadSelector)

apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: bookinfo
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

## Ingress Listeners

The `ingress` section defines how the sidecar handles incoming traffic to the workload.

```yaml
spec:
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http-inbound
      bind: 0.0.0.0
      defaultEndpoint: 127.0.0.1:8080
      captureMode: DEFAULT
      tls:
        mode: SIMPLE
        serverCertificate: /etc/certs/server.pem
        privateKey: /etc/certs/key.pem
      connectionPool:
        http:
          http1MaxPendingRequests: 1024
          maxRequestsPerConnection: 100
```

Each ingress listener has these fields:

### Port

```yaml
port:
  number: 8080
  protocol: HTTP
  name: http-inbound
```

The port the sidecar listens on for incoming traffic. The `protocol` determines how Envoy processes incoming requests (HTTP, HTTPS, HTTP2, GRPC, TCP, TLS, MONGO). The `name` is a human-readable label.

### Bind

```yaml
bind: 0.0.0.0
```

The IP address the listener binds to. Defaults to `0.0.0.0`. You might set this to `127.0.0.1` if you only want the listener to accept traffic from localhost.

### Default Endpoint

```yaml
defaultEndpoint: 127.0.0.1:8080
```

This tells the sidecar where to forward traffic after processing. The format is `IP:port` or `unix:///path/to/socket`. The IP is typically `127.0.0.1` since the application is in the same pod. The port is the port your application is actually listening on.

You can also use `0.0.0.0:PORT` to forward to the pod IP.

### Capture Mode

```yaml
captureMode: DEFAULT
```

Controls how traffic is intercepted:

- `DEFAULT` - uses the global setting from the mesh config
- `IPTABLES` - traffic is captured using iptables redirect
- `NONE` - no traffic interception; the listener must be explicitly addressed

### TLS Settings

```yaml
tls:
  mode: MUTUAL
  serverCertificate: /etc/certs/server.pem
  privateKey: /etc/certs/key.pem
  caCertificates: /etc/certs/ca.pem
  subjectAltNames:
    - client.example.com
  minProtocolVersion: TLSV1_2
  maxProtocolVersion: TLSV1_3
  cipherSuites:
    - ECDHE-RSA-AES256-GCM-SHA384
```

Sidecar ingress TLS termination is an experimental feature and must be enabled with `ENABLE_TLS_ON_SIDECAR_INGRESS`. It currently supports only `SIMPLE` and `MUTUAL` TLS modes. Unlike gateways, sidecar ingress TLS does not support `credentialName`; mount the certificate files into the sidecar and reference them with file paths.

### Connection Pool

```yaml
connectionPool:
  http:
    http1MaxPendingRequests: 1024
    http2MaxRequests: 1024
    maxRequestsPerConnection: 100
  tcp:
    maxConnections: 100
```

The `connectionPool` field controls inbound connection pool settings for this ingress port. It overrides the top-level `inboundConnectionPool` setting for the same port.

## Inbound Connection Pool

```yaml
spec:
  inboundConnectionPool:
    http:
      http1MaxPendingRequests: 1024
      http2MaxRequests: 1024
      maxRequestsPerConnection: 100
    tcp:
      maxConnections: 100
```

The top-level `inboundConnectionPool` field controls the connection volume Envoy accepts from the network for all inbound listeners. A per-port ingress `connectionPool` overrides this default.

## Egress Listeners

The `egress` section controls which outbound service configuration the sidecar imports. This is the most commonly configured part.

```yaml
spec:
  egress:
    - port:
        number: 80
        protocol: HTTP
        name: http-outbound
      bind: 0.0.0.0
      captureMode: DEFAULT
      hosts:
        - "./*"
        - "istio-system/*"
```

### Port

```yaml
port:
  number: 80
  protocol: HTTP
  name: http-outbound
```

When specified, the egress listener uses this as the default destination port for the imported hosts. If omitted, Istio infers listener ports from the imported hosts. You can have multiple egress entries for different ports.

### Bind

Same as ingress - the IP address for the outbound listener.

### Capture Mode

Same options as ingress: `DEFAULT`, `IPTABLES`, or `NONE`.

### Hosts

```yaml
hosts:
  - "./*"
  - "istio-system/*"
  - "bookinfo/reviews.bookinfo.svc.cluster.local"
```

The `hosts` field is the key part of egress configuration. It uses the format `namespace/dnsName`:

- `./*` means all services in the same namespace as the sidecar
- `istio-system/*` means all services in the istio-system namespace
- `*/reviews.bookinfo.svc.cluster.local` means the reviews service in any namespace
- `~/*` means no services are imported into the outbound configuration

You can be as broad or narrow as you want. The more specific your egress hosts list, the less configuration Envoy needs to maintain.

A common pattern is to have a namespace-level default that allows same-namespace services plus istio-system (for things like telemetry and policy), and then override at the workload level for services that need cross-namespace access:

```yaml
# Namespace default - restricted
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
---
# Override for specific workload that needs backend access
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: api-gateway-sidecar
  namespace: frontend
spec:
  workloadSelector:
    labels:
      app: api-gateway
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/*"
```

## Outbound Traffic Policy

```yaml
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

This controls what happens when a workload tries to reach a service that is not in the mesh registry:

- `ALLOW_ANY` - traffic to unknown services is allowed and passed through as-is
- `REGISTRY_ONLY` - traffic to unknown services is blocked

This setting on the Sidecar resource overrides the mesh-wide `outboundTrafficPolicy` setting from MeshConfig for the selected workload.

The Sidecar API does not have an `egressProxy` field. To route external traffic through an egress gateway, configure a `ServiceEntry`, egress `Gateway`, `VirtualService`, and usually a `DestinationRule`.

## Full Working Example

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: productpage-sidecar
  namespace: bookinfo
spec:
  workloadSelector:
    labels:
      app: productpage
  ingress:
    - port:
        number: 9080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:9080
  egress:
    - port:
        number: 9080
        protocol: HTTP
        name: reviews
      hosts:
        - "./reviews.bookinfo.svc.cluster.local"
    - port:
        number: 9080
        protocol: HTTP
        name: details
      hosts:
        - "./details.bookinfo.svc.cluster.local"
    - hosts:
        - "istio-system/*"
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

This Sidecar configuration for the productpage workload explicitly scopes outbound configuration to the reviews and details services on port 9080, plus anything in istio-system. Envoy will only maintain configuration for those imported services, keeping the proxy lean and efficient. The `REGISTRY_ONLY` policy drops unknown outbound destinations, but Sidecar egress scoping by itself is not an outbound firewall.

Using Sidecar resources across your mesh is one of the best ways to improve performance at scale. Start with namespace-level defaults and refine from there based on actual traffic patterns.
