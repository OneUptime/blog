# How to Handle Port Naming Conventions in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Port Naming, Protocol Detection, Kubernetes, Service Mesh

Description: Understanding Istio's port naming conventions and why getting them right matters for proper protocol handling and traffic management.

---

Port naming in Istio is one of those small details that has outsized consequences. If you name your service ports incorrectly - or don't name them at all - Istio can't determine the protocol of the traffic. When that happens, all traffic on that port gets treated as opaque TCP, which means you lose HTTP routing, retries, metrics, and all the Layer 7 features you deployed a service mesh for.

## Why Port Names Matter

Istio uses the service port name to determine the protocol of the traffic. This is because Kubernetes services don't have a protocol field for application-layer protocols - only transport-layer (TCP/UDP). Istio leverages a naming convention to fill this gap.

When Istio knows the protocol:
- HTTP traffic gets proper route matching, retries, fault injection, and detailed metrics
- gRPC traffic gets stream-aware load balancing and proper error handling
- TLS traffic gets SNI-based routing without termination
- TCP traffic gets basic connection-level metrics and routing

Without protocol information, everything is TCP.

## The Naming Convention

Port names must follow the format `<protocol>` or `<protocol>-<suffix>`. The protocol prefix tells Istio how to handle the traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: http          # HTTP traffic
      port: 80
      targetPort: 8080
    - name: http-api      # Also HTTP traffic (suffix is ignored)
      port: 8080
      targetPort: 8080
    - name: https         # HTTPS/TLS traffic
      port: 443
      targetPort: 8443
    - name: grpc          # gRPC traffic
      port: 9090
      targetPort: 9090
    - name: grpc-web      # gRPC-Web traffic
      port: 9091
      targetPort: 9091
    - name: http2          # HTTP/2 traffic
      port: 8082
      targetPort: 8082
    - name: tcp            # Plain TCP traffic
      port: 5432
      targetPort: 5432
    - name: tls            # TLS traffic (SNI passthrough)
      port: 6443
      targetPort: 6443
    - name: mongo          # MongoDB protocol
      port: 27017
      targetPort: 27017
    - name: mysql          # MySQL protocol
      port: 3306
      targetPort: 3306
    - name: redis          # Redis protocol
      port: 6379
      targetPort: 6379
```

The recognized protocol prefixes are:
- `http` - HTTP/1.1
- `http2` - HTTP/2
- `https` - HTTPS (TLS-terminated externally)
- `grpc` - gRPC (which uses HTTP/2)
- `grpc-web` - gRPC-Web
- `tls` - TLS passthrough
- `tcp` - Raw TCP
- `mongo` - MongoDB
- `mysql` - MySQL
- `redis` - Redis

## The appProtocol Alternative

Starting with Kubernetes 1.20, you can use the `appProtocol` field instead of port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: web
      port: 80
      targetPort: 8080
      appProtocol: http
    - name: api
      port: 8080
      targetPort: 8080
      appProtocol: http2
    - name: rpc
      port: 9090
      targetPort: 9090
      appProtocol: grpc
```

The `appProtocol` field is the cleaner approach because it separates the protocol declaration from the port name. You can name your ports whatever makes sense for your application while still telling Istio the protocol.

## What Happens with Wrong or Missing Names

If you name a port incorrectly, here's what happens:

```yaml
# BAD: Port name doesn't follow convention
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: web-server     # "web" is not a recognized protocol
      port: 80
      targetPort: 8080
    - name: backend        # "backend" is not a recognized protocol
      port: 8080
      targetPort: 8080
    - port: 9090           # No name at all
      targetPort: 9090
```

All three of these ports will be treated as plain TCP. That means:

- No HTTP-level routing with VirtualService
- No automatic retries on 5xx errors
- No HTTP metrics (request count, latency histograms, etc.)
- No fault injection
- No request-level access logs (only connection-level)

## Finding Misconfigured Ports

Istio's analysis tool catches port naming issues:

```bash
istioctl analyze -n default
```

Look for messages like:

```text
Warning [IST0118] (Service my-service.default) Port name backend
(on service my-service.default) doesn't follow the naming convention
of Istio port.
```

You can also check all services in your cluster:

```bash
# Find services with potentially unnamed or misnamed ports
kubectl get services -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
protocols = ['http', 'http2', 'https', 'grpc', 'grpc-web', 'tls', 'tcp', 'mongo', 'mysql', 'redis']
for svc in data['items']:
  ns = svc['metadata']['namespace']
  name = svc['metadata']['name']
  for port in svc['spec'].get('ports', []):
    pname = port.get('name', '')
    app_proto = port.get('appProtocol', '')
    prefix = pname.split('-')[0] if pname else ''
    if not app_proto and prefix not in protocols:
      print(f'{ns}/{name}: port {port[\"port\"]} name=\"{pname}\" - may need fixing')
"
```

## Fixing Existing Services

If you have services with incorrectly named ports, rename them:

```yaml
# Before
spec:
  ports:
    - name: web
      port: 80

# After
spec:
  ports:
    - name: http-web
      port: 80
```

Or add `appProtocol`:

```yaml
spec:
  ports:
    - name: web
      port: 80
      appProtocol: http
```

The change takes effect immediately - Envoy picks up the new configuration from Istio's control plane.

## Protocol Detection as Fallback

If automatic protocol detection is enabled (it is by default), Istio tries to sniff the protocol for unnamed ports:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 100ms
```

Envoy waits up to `protocolDetectionTimeout` (default 100ms) for the first bytes of data. If it looks like HTTP, Envoy treats it as HTTP. Otherwise, it falls back to TCP.

This detection has limitations:
- It adds latency (up to the timeout value) for the first request on a connection
- It doesn't work for server-first protocols (like MySQL) where the server speaks first
- It's not 100% reliable

Relying on protocol detection is a workaround, not a solution. Always name your ports properly or set `appProtocol`.

## Server-First Protocols

Some protocols have the server send the first message (MySQL, PostgreSQL, SMTP). These break protocol detection because Envoy is waiting for client data that never comes (the server sends first but Envoy is proxying, so it looks like a stall).

For server-first protocols, you must either:

1. Name the port correctly: `name: mysql`, `name: tcp-postgres`
2. Use `appProtocol: tcp`
3. Exclude the port from interception

```yaml
# Correct: Named as TCP
spec:
  ports:
    - name: tcp-postgres
      port: 5432

# Or exclude from interception entirely
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
```

## ServiceEntry Port Names

The same naming convention applies to ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
```

Note that ServiceEntry has an explicit `protocol` field in addition to the port name. Use both for clarity.

Getting port naming right is a one-time investment that unlocks the full power of your service mesh. Take the time to audit your services and fix any misnamed ports - the improvement in observability and traffic management is worth the effort.
