# How to Configure TLS for gRPC Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, TLS, Security, Service Mesh

Description: How to properly configure TLS for gRPC services running in Istio including mTLS, gateway configuration, and troubleshooting gRPC-specific TLS issues.

---

gRPC runs over HTTP/2 and uses TLS heavily in production environments. When you bring gRPC services into Istio, the service mesh handles TLS for you through its sidecar proxies. But gRPC has some specific requirements around protocol detection, port naming, and TLS configuration that you need to get right. Otherwise you end up with confusing connection errors that are hard to trace.

## How Istio Handles gRPC Traffic

Istio's Envoy sidecars natively understand HTTP/2 and gRPC. When a gRPC request goes through the mesh:

1. The client application sends a gRPC request (HTTP/2) to localhost
2. The source sidecar intercepts the request
3. The sidecar establishes mTLS with the destination sidecar
4. The request is forwarded over the encrypted HTTP/2 connection
5. The destination sidecar terminates TLS and forwards the request to the application

The key thing is that Istio preserves the HTTP/2 framing throughout. It does not downgrade gRPC to HTTP/1.1.

## Port Naming Requirements

Istio uses port names to detect protocols. For gRPC services, the port name must start with `grpc`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
spec:
  selector:
    app: grpc-service
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
```

Valid port name prefixes for gRPC: `grpc`, `grpc-web`. You can also use the `appProtocol` field:

```yaml
ports:
  - name: my-port
    port: 50051
    targetPort: 50051
    appProtocol: grpc
```

If you get the port naming wrong, Istio treats the traffic as raw TCP and you lose HTTP/2-level features like header-based routing, retries, and proper load balancing.

## mTLS for gRPC Services

mTLS for gRPC works exactly like it does for HTTP services. Istio handles it automatically. Verify it is active:

```bash
istioctl proxy-config cluster <pod-name> -o json | \
  jq '.[] | select(.name | contains("grpc-service")) | {name: .name, transport: .transportSocket.name}'
```

If the transport shows `envoy.transport_sockets.tls`, mTLS is active.

For strict mTLS enforcement on gRPC services:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: grpc-strict-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: grpc-service
  mtls:
    mode: STRICT
```

## Exposing gRPC Through the Ingress Gateway

To expose a gRPC service externally through the Istio ingress gateway with TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: grpc-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: grpc-tls
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: grpc-tls-cert
      hosts:
        - "grpc.example.com"
```

Note: Use `HTTPS` as the protocol for the gateway, not `GRPC`. The gateway detects HTTP/2 and gRPC within the HTTPS connection automatically.

Create the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-routing
  namespace: default
spec:
  hosts:
    - "grpc.example.com"
  gateways:
    - istio-system/grpc-gateway
  http:
    - route:
        - destination:
            host: grpc-service
            port:
              number: 50051
```

Yes, gRPC routing goes under the `http` section, not a separate gRPC section. This is because gRPC runs on top of HTTP/2.

## gRPC-Specific Routing

You can route gRPC traffic based on the service and method name. gRPC uses the path format `/<package>.<ServiceName>/<MethodName>`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-method-routing
  namespace: default
spec:
  hosts:
    - grpc-service
  http:
    - match:
        - uri:
            prefix: /mypackage.UserService/GetUser
      route:
        - destination:
            host: user-service-v2
            port:
              number: 50051
    - route:
        - destination:
            host: grpc-service
            port:
              number: 50051
```

## Removing Application-Level TLS

If your gRPC service currently handles TLS at the application level (using `grpc.Creds()` in Go or `SslCredentials` in Python), you should remove it when running in Istio. The sidecar handles TLS, and having both the application and sidecar do TLS creates double encryption overhead.

Before (Go example with application TLS):

```go
creds, _ := credentials.NewServerTLSFromFile("server.crt", "server.key")
server := grpc.NewServer(grpc.Creds(creds))
```

After (plain gRPC with Istio handling TLS):

```go
server := grpc.NewServer()
```

On the client side:

Before:

```go
creds, _ := credentials.NewClientTLSFromFile("ca.crt", "")
conn, _ := grpc.Dial("grpc-service:50051", grpc.WithTransportCredentials(creds))
```

After:

```go
conn, _ := grpc.Dial("grpc-service:50051", grpc.WithInsecure())
```

The `WithInsecure()` might look concerning, but remember that the sidecar is transparently adding mTLS. The "insecure" connection only goes from the application to the local sidecar within the same pod.

## gRPC Health Checks with TLS

Kubernetes gRPC health checks need special attention with Istio. If you use the native Kubernetes gRPC health check:

```yaml
livenessProbe:
  grpc:
    port: 50051
  initialDelaySeconds: 10
  periodSeconds: 5
```

The kubelet sends the health check directly to the pod. With strict mTLS, this can fail because the kubelet does not have an Istio certificate. Solutions:

1. Use a separate health check port with permissive mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: grpc-health
  namespace: default
spec:
  selector:
    matchLabels:
      app: grpc-service
  mtls:
    mode: STRICT
  portLevelMtls:
    50052:
      mode: PERMISSIVE
```

2. Use Istio's built-in health check rewriting. Add this annotation to the pod:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

## gRPC-Web Through the Gateway

If you need to support gRPC-Web clients (typically browser-based):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: grpc-web-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: grpc-web-tls
      hosts:
        - "api.example.com"
```

Envoy natively supports gRPC-Web transcoding, converting gRPC-Web requests to standard gRPC.

## Debugging gRPC TLS Issues

gRPC TLS issues often manifest as cryptic error codes. Here are common ones:

**UNAVAILABLE (code 14)**: Usually means the connection could not be established. Check TLS configuration and port naming:

```bash
# Verify protocol detection
istioctl proxy-config listener <pod-name> -o json | \
  jq '.[] | select(.name | contains("50051")) | .filterChains[].filters[].typedConfig.httpProtocolOptions'
```

**Check Envoy access logs for gRPC status**:

```bash
kubectl logs <pod-name> -c istio-proxy | grep "grpc-service"
```

**Test gRPC connectivity with grpcurl**:

```bash
# From a pod inside the mesh
kubectl exec <test-pod> -- grpcurl -plaintext grpc-service:50051 list

# Test through the gateway
grpcurl -d '{}' grpc.example.com:443 mypackage.MyService/MyMethod
```

**HTTP/2 negotiation failure**: If the client cannot negotiate HTTP/2, check that the gateway and sidecar are configured for HTTP/2:

```bash
istioctl proxy-config cluster <pod-name> -o json | \
  jq '.[] | select(.name | contains("grpc")) | .typedExtensionProtocolOptions'
```

Look for `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` with `h2_protocol_options` to confirm HTTP/2 is enabled.

gRPC and Istio work well together once the port naming and protocol detection are set up correctly. The main gotcha is getting rid of application-level TLS configuration and letting Istio handle it. After that, gRPC services get the same mTLS, observability, and traffic management benefits as HTTP services.
