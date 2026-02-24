# How to Configure Protocol Detection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol Detection, Envoy, Kubernetes, Service Mesh

Description: A guide to understanding and configuring protocol detection in Istio to ensure your services get the right traffic handling based on their application protocol.

---

Istio needs to know what protocol your service uses to apply the right traffic management policies. HTTP services get features like retries, header-based routing, and detailed metrics with response codes. TCP services get connection-level metrics and basic load balancing. If Istio detects the wrong protocol, you end up with broken routing or missing telemetry.

Protocol detection is how Istio figures out what protocol a connection uses. You can configure it explicitly (the recommended approach) or let Istio try to detect it automatically (protocol sniffing). Understanding how this works saves you from hours of debugging mysterious connection failures.

## How Istio Determines the Protocol

Istio uses three methods to determine the protocol, checked in this order:

### 1. Explicit Port Naming

The most reliable method. Name your Service port with the protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  ports:
    - name: http-api     # Istio sees "http" prefix
      port: 8080
      targetPort: 8080
    - name: grpc-service  # Istio sees "grpc" prefix
      port: 9090
      targetPort: 9090
    - name: tcp-metrics   # Istio sees "tcp" prefix
      port: 9091
      targetPort: 9091
```

The recognized prefixes are:
- `http`, `http2` - HTTP/1.1 and HTTP/2
- `https` - HTTPS (TLS-terminated by the application)
- `grpc`, `grpc-web` - gRPC
- `tcp` - Raw TCP
- `tls` - TLS connections
- `mongo` - MongoDB protocol
- `mysql` - MySQL protocol
- `redis` - Redis protocol

The prefix must be followed by a dash, or it can be the entire name. Both `http` and `http-api` work, but `httpapi` does not.

### 2. AppProtocol Field

Kubernetes 1.20+ supports the `appProtocol` field on service ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  ports:
    - name: web
      port: 8080
      targetPort: 8080
      appProtocol: http
    - name: api
      port: 9090
      targetPort: 9090
      appProtocol: grpc
```

This is cleaner than port naming conventions because it separates the protocol declaration from the port name. Istio respects `appProtocol` and uses it for protocol determination.

### 3. Automatic Protocol Sniffing

If neither port naming nor appProtocol specifies the protocol, Istio falls back to protocol sniffing. The sidecar inspects the first few bytes of the connection to determine if it is HTTP or not.

For server-side protocol detection, the sidecar waits for the client to send data. If the initial bytes look like an HTTP request (start with a valid HTTP method), it treats the connection as HTTP. Otherwise, it falls back to TCP.

## Configuring Protocol Detection Behavior

### Setting Detection Timeout

When Istio sniffs the protocol, it needs to wait for the client to send data. The detection timeout controls how long it waits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
```

The default timeout is relatively short. If your clients have a slow start or the protocol uses server-speaks-first behavior, the detection might time out and default to TCP.

### Disabling Protocol Sniffing

If you want to disable automatic protocol detection and require explicit protocol declaration, you cannot do it globally in MeshConfig. But you can ensure all your services use explicit port naming or appProtocol, which effectively bypasses sniffing.

For strict environments, enforce port naming conventions through admission webhooks or policy tools like OPA/Gatekeeper:

```yaml
# OPA constraint example (conceptual)
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredServicePortProtocol
metadata:
  name: require-protocol-prefix
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Service"]
    namespaces:
      - "mesh-*"
  parameters:
    allowedPrefixes:
      - "http"
      - "grpc"
      - "tcp"
      - "https"
      - "tls"
```

## Common Protocol Detection Problems

### Problem: HTTP Service Treated as TCP

Symptoms: No HTTP metrics (only TCP-level), no HTTP-based routing, VirtualService rules ignored.

Cause: The service port does not have an HTTP prefix and protocol sniffing failed.

Fix: Add the protocol prefix to the port name:

```yaml
# Before (broken)
ports:
  - name: api
    port: 8080

# After (fixed)
ports:
  - name: http-api
    port: 8080
```

### Problem: Server-Speaks-First Protocol Fails

Some protocols (like MySQL, SMTP) have the server send data before the client. Protocol sniffing does not work for these because the sidecar is waiting for client data that never comes.

Fix: Use explicit protocol naming:

```yaml
ports:
  - name: mysql
    port: 3306
  - name: tcp-smtp
    port: 25
```

### Problem: TLS-Originated Connections Detected as TCP

If your application handles its own TLS (instead of letting the sidecar handle it), the sidecar sees encrypted bytes and cannot detect HTTP. This is expected behavior.

Fix: If you want HTTP features, let the sidecar handle TLS (use ISTIO_MUTUAL or SIMPLE TLS mode) and have the application speak plain HTTP to the sidecar. Or use `https` or `tls` as the port prefix:

```yaml
ports:
  - name: https-api
    port: 443
```

## Verifying Protocol Detection

Check what protocol Istio assigned to a service port:

```bash
istioctl proxy-config listeners deploy/sleep -n sample --port 8080 -o json
```

Look at the `filterChains` section. HTTP services will have `http_connection_manager` filters, while TCP services will have `tcp_proxy` filters.

You can also check the clusters:

```bash
istioctl proxy-config clusters deploy/sleep -n sample | grep my-service
```

The output includes a column showing the detected protocol type.

## Best Practices

1. Always use explicit port naming or appProtocol. Do not rely on protocol sniffing in production.
2. For HTTP/2 and gRPC, use the specific prefixes (`http2`, `grpc`) rather than just `http`. This ensures proper HTTP/2 connection handling.
3. For server-speaks-first protocols, always use explicit naming because sniffing will not work.
4. When migrating existing services to Istio, audit all Service port names and add protocol prefixes before enabling sidecar injection.

Protocol detection is one of those things that works invisibly when configured correctly and causes confusing problems when it is not. Take the time to name your ports properly, and you will avoid a whole category of Istio debugging sessions.
