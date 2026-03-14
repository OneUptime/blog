# How to Set Up ServiceEntry for External gRPC Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, gRPC, Kubernetes, Service Mesh, HTTP2

Description: Configure Istio ServiceEntry for external gRPC services with proper HTTP/2 settings, TLS, and traffic management for reliable connectivity.

---

gRPC is showing up everywhere. Cloud provider APIs (Google Cloud, Firebase), machine learning inference endpoints, real-time communication services - many modern APIs now offer gRPC alongside REST. When your mesh workloads need to call external gRPC services, the ServiceEntry configuration has some specific requirements you need to get right.

gRPC runs over HTTP/2, which changes how you configure ports, protocols, and connection handling in Istio. Get the protocol wrong and your gRPC calls fail with cryptic error messages that are hard to debug.

## Understanding gRPC in Istio

Istio has native support for gRPC because Envoy understands HTTP/2 natively. When Envoy knows a connection is gRPC, it can:

- Parse gRPC status codes for better metrics
- Do header-based routing on gRPC metadata
- Apply per-method retries and timeouts
- Report gRPC-specific telemetry

For this to work, you need to tell Envoy that the traffic is gRPC by using the correct protocol in your ServiceEntry.

## Basic gRPC ServiceEntry

Here is how to register an external gRPC service. The critical detail is using `protocol: GRPC` in the port definition:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-grpc-api
spec:
  hosts:
    - grpc-api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: grpc
      protocol: GRPC
  resolution: DNS
```

Wait - there is a subtlety here. If the external gRPC service uses TLS (which most do), you should use `GRPC` only if Envoy is handling TLS termination or origination. If your application handles TLS directly, use `protocol: HTTPS` or `protocol: TLS` instead so Envoy passes through the encrypted traffic.

## gRPC with TLS Passthrough

For external gRPC services where your application initiates TLS (the common case with gRPC client libraries), configure the ServiceEntry for TLS passthrough:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: grpc-tls-passthrough
spec:
  hosts:
    - grpc-api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Your gRPC client code handles the TLS connection directly:

```python
import grpc

# Client handles TLS
channel = grpc.secure_channel(
    'grpc-api.example.com:443',
    grpc.ssl_channel_credentials()
)
```

Envoy passes the encrypted traffic through without inspecting it.

## gRPC with TLS Origination

If you want Envoy to handle TLS (so your application can use plaintext gRPC), set up TLS origination:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: grpc-tls-origination
spec:
  hosts:
    - grpc-api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: grpc-tls
      protocol: GRPC
    - number: 80
      name: grpc-plaintext
      protocol: GRPC
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-tls-origination-dr
spec:
  host: grpc-api.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: SIMPLE
          sni: grpc-api.example.com
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-redirect
spec:
  hosts:
    - grpc-api.example.com
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: grpc-api.example.com
            port:
              number: 443
```

Now your application uses a plaintext gRPC channel:

```python
import grpc

# No TLS needed - Envoy handles it
channel = grpc.insecure_channel('grpc-api.example.com:80')
```

## Google Cloud APIs over gRPC

Google Cloud client libraries use gRPC by default. Here is the ServiceEntry for Google Cloud APIs:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-cloud-grpc
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

Since Google Cloud has many different service endpoints (storage.googleapis.com, pubsub.googleapis.com, etc.), using a wildcard host with `resolution: NONE` is the practical approach.

## Firebase and Firestore gRPC

Firebase and Firestore use gRPC for real-time communication:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: firebase-grpc
spec:
  hosts:
    - firestore.googleapis.com
    - fcm.googleapis.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## gRPC Retries and Timeouts

gRPC retries work through VirtualService just like HTTP retries, but you can target specific gRPC status codes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-retry-policy
spec:
  hosts:
    - grpc-api.example.com
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: unavailable,resource-exhausted,internal
      route:
        - destination:
            host: grpc-api.example.com
            port:
              number: 443
```

The `retryOn` values map to gRPC status codes:
- `unavailable` - gRPC UNAVAILABLE (equivalent to HTTP 503)
- `resource-exhausted` - gRPC RESOURCE_EXHAUSTED (equivalent to HTTP 429)
- `internal` - gRPC INTERNAL (equivalent to HTTP 500)

## gRPC Connection Pooling

gRPC multiplexes many requests over a single HTTP/2 connection. This is efficient but means Envoy's connection pool settings work differently than with HTTP/1.1:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-connection-pool
spec:
  host: grpc-api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 1000
        maxConcurrentStreams: 100
```

The `maxConcurrentStreams` setting is important for gRPC because it limits how many simultaneous gRPC calls can share a single HTTP/2 connection.

## gRPC Health Checking

For static endpoints, you can use gRPC health checking to detect when endpoints go down:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-health-check
spec:
  host: grpc-api.example.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Outlier detection treats gRPC error status codes (UNAVAILABLE, INTERNAL, etc.) as 5xx errors, so the circuit breaker works the same way.

## Debugging gRPC ServiceEntry Issues

gRPC errors can be confusing. Here are the most common issues:

**UNAVAILABLE errors:**

```bash
# Check if the endpoint is reachable
istioctl proxy-config endpoints deploy/my-app | grep grpc-api

# Check cluster configuration
istioctl proxy-config cluster deploy/my-app | grep grpc-api
```

**Protocol mismatch errors:**

If you set `protocol: HTTP` instead of `protocol: GRPC` or `protocol: HTTPS`, Envoy treats the traffic as HTTP/1.1 and gRPC breaks. Check your port protocol settings.

**TLS handshake failures:**

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "TLS error"
```

This usually means the SNI does not match or the CA certificate is not trusted.

**Streaming timeouts:**

gRPC streaming calls (server streaming, client streaming, bidirectional) can hit Envoy's idle timeout. Increase the timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-streaming
spec:
  hosts:
    - grpc-streaming.example.com
  http:
    - timeout: 0s
      route:
        - destination:
            host: grpc-streaming.example.com
            port:
              number: 443
```

Setting `timeout: 0s` disables the timeout entirely for streaming connections. Use this carefully - you probably want some timeout for unary calls but not for long-lived streams.

## Monitoring gRPC External Services

When Envoy can see the gRPC layer (non-TLS or TLS-originated), you get gRPC-specific metrics:

```bash
# gRPC request count by status code
istio_requests_total{
  destination_service="grpc-api.example.com",
  grpc_response_status="0"
}

# gRPC request duration
istio_request_duration_milliseconds_bucket{
  destination_service="grpc-api.example.com"
}
```

gRPC status code 0 means OK. Other common codes: 1 (CANCELLED), 2 (UNKNOWN), 13 (INTERNAL), 14 (UNAVAILABLE).

Getting gRPC ServiceEntry right involves understanding the interplay between HTTP/2, TLS, and Istio's protocol detection. Start with TLS passthrough (using `protocol: HTTPS`) for simplicity, and move to TLS origination with `protocol: GRPC` when you need deeper observability into your external gRPC calls.
