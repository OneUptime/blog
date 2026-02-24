# How to Configure Protocol Selection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol Selection, Service Mesh, Kubernetes, Envoy

Description: Learn how to configure protocol selection in Istio to ensure proper traffic handling for HTTP, TCP, gRPC, and other protocols in your service mesh.

---

Istio relies on knowing the protocol of your traffic to apply the right policies, routing rules, and telemetry collection. If Istio gets the protocol wrong, you can end up with broken connections, missing metrics, or routing rules that simply don't work. Protocol selection is one of those things that people often overlook until something goes wrong.

## How Istio Detects Protocols

By default, Istio tries to automatically detect the protocol of traffic passing through the sidecar proxy. For plain TCP connections, it sniffs the first few bytes of the connection to determine if it looks like HTTP. This works well for standard HTTP/1.1 and HTTP/2 traffic, but it has limitations.

The automatic detection process works like this:

1. A new connection arrives at the Envoy sidecar
2. Envoy buffers the initial bytes of the connection
3. It checks if the bytes match known protocol signatures
4. If it detects HTTP, it applies HTTP-level features (routing, retries, metrics)
5. If it cannot detect the protocol, it falls back to raw TCP handling

The sniffing introduces a small delay because Envoy needs to wait for the initial bytes. For protocols where the server speaks first (like MySQL), this detection can fail entirely because the client doesn't send data first.

## Explicit Protocol Selection via Service Port Naming

The most reliable way to tell Istio which protocol a port uses is through the Kubernetes Service port naming convention. Istio looks at the port name and extracts the protocol prefix.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - name: http-web
      port: 80
      targetPort: 8080
    - name: grpc-api
      port: 9090
      targetPort: 9090
    - name: tcp-db
      port: 3306
      targetPort: 3306
    - name: https-secure
      port: 443
      targetPort: 8443
```

The recognized protocol prefixes are:

- `http` - HTTP/1.1 traffic
- `http2` - HTTP/2 traffic
- `https` - HTTPS (TLS passthrough)
- `grpc` - gRPC traffic (HTTP/2 based)
- `grpc-web` - gRPC-Web traffic
- `tcp` - Raw TCP traffic
- `tls` - TLS encrypted traffic (passthrough)
- `mongo` - MongoDB protocol
- `mysql` - MySQL protocol
- `redis` - Redis protocol

The format is `<protocol>-<suffix>` where the suffix can be anything you want. It is just for human readability. So `http-api`, `http-frontend`, and `http-whatever` all tell Istio the same thing: this port carries HTTP traffic.

## Using the appProtocol Field

Starting with Kubernetes 1.19 and Istio 1.18+, you can use the `appProtocol` field instead of relying on naming conventions. This is cleaner and doesn't require you to change your port names.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - name: web
      port: 80
      targetPort: 8080
      appProtocol: http
    - name: api
      port: 9090
      targetPort: 9090
      appProtocol: grpc
    - name: database
      port: 3306
      targetPort: 3306
      appProtocol: tcp
```

The `appProtocol` field takes precedence over the port name convention. So if you have a port named `http-web` with `appProtocol: tcp`, Istio will treat it as TCP.

## Disabling Protocol Sniffing

If you want to turn off automatic protocol detection entirely, you can configure this at the mesh level. This forces Istio to treat all unnamed ports as plain TCP.

Edit your Istio mesh configuration:

```bash
kubectl edit configmap istio -n istio-system
```

Set the `protocolDetectionTimeout` to `0s`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    protocolDetectionTimeout: 0s
```

With this setting, any port that doesn't have an explicit protocol (either through naming or `appProtocol`) will be handled as raw TCP. No sniffing, no delay, no guessing.

You can also adjust the timeout instead of disabling it. The default is `100ms`. If you have slow clients that take a while to send the first bytes, you might need to increase it:

```yaml
data:
  mesh: |
    protocolDetectionTimeout: 500ms
```

## Protocol Selection with DestinationRule

For more fine-grained protocol control on the client side, you can use a DestinationRule to specify connection pool settings that are protocol-aware:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30s
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 1000
```

The `h2UpgradePolicy` field is particularly useful. It controls whether HTTP/1.1 connections should be upgraded to HTTP/2:

- `DEFAULT` - Use the global mesh setting
- `DO_NOT_UPGRADE` - Keep connections as HTTP/1.1
- `UPGRADE` - Upgrade connections to HTTP/2

## Troubleshooting Protocol Detection

When protocol detection goes wrong, the symptoms can be confusing. Here are common issues and how to diagnose them.

Check what protocol Istio thinks a port is using:

```bash
istioctl x describe service my-service -n default
```

Look at the Envoy configuration for your pod:

```bash
istioctl proxy-config listener <pod-name> -n default -o json
```

In the output, look for the `filterChains` section. If you see `envoy.filters.network.http_connection_manager`, Istio is treating the port as HTTP. If you see `envoy.filters.network.tcp_proxy`, it is treating it as TCP.

You can also check the cluster configuration:

```bash
istioctl proxy-config cluster <pod-name> -n default -o json | grep -A5 "my-service"
```

## Common Protocol Selection Mistakes

One of the most frequent mistakes is naming a port something like `metrics` without a protocol prefix. Istio will fall back to protocol sniffing for this port, which might work for HTTP but adds latency and uncertainty.

Another common issue is using `https` as the protocol for internal mTLS traffic. You don't need to do this. Istio's mTLS is handled at the sidecar level, separate from your application protocol. If your app serves plain HTTP on port 8080 and Istio handles the mTLS, name the port `http-web`, not `https-web`.

Also watch out for services that serve multiple protocols on the same port. This isn't supported by Istio. Each port should carry a single protocol. If you have a service that speaks both HTTP and gRPC on the same port, that actually works fine because gRPC is HTTP/2 - just label it as `grpc`.

## Applying Protocol Selection to Gateway Traffic

When configuring an Istio Gateway, you also specify protocols:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-secret
      hosts:
        - "*.example.com"
    - port:
        number: 9090
        name: grpc
        protocol: GRPC
      hosts:
        - "api.example.com"
```

The Gateway protocol field accepts `HTTP`, `HTTPS`, `GRPC`, `HTTP2`, `MONGO`, `TCP`, and `TLS`.

## Summary

Getting protocol selection right in Istio is straightforward once you know the rules. Use the port naming convention or `appProtocol` field for explicit control. Avoid relying on automatic sniffing for production services. And remember that the protocol you specify determines which Istio features are available for that traffic - HTTP features like retries, fault injection, and header-based routing only work when Istio knows the traffic is HTTP.
