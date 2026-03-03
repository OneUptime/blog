# How to Configure Fault Injection for gRPC Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Fault Injection, VirtualService, Resilience Testing

Description: How to configure Istio fault injection specifically for gRPC services, including delay injection, abort injection with gRPC status codes, and testing patterns.

---

gRPC services in an Istio mesh use HTTP/2 as their transport layer, and Istio's fault injection works with gRPC out of the box. But there are some important differences from standard HTTP fault injection. gRPC has its own status codes, its own error handling patterns, and its own client behavior. Getting fault injection right for gRPC requires understanding these differences.

This post covers how to set up fault injection for gRPC services in Istio, the relationship between HTTP and gRPC status codes, and practical testing patterns for gRPC resilience.

## gRPC Over Istio: The Basics

gRPC runs over HTTP/2, and Istio handles it as such. For Istio to properly manage gRPC traffic, the Service port needs to be named with a `grpc-` prefix or have `appProtocol: grpc`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
spec:
  selector:
    app: user-service
  ports:
    - port: 50051
      name: grpc-server
      appProtocol: grpc
```

This tells Istio to treat traffic on this port as HTTP/2/gRPC, which enables HTTP-level routing, fault injection, and telemetry.

## Delay Injection for gRPC

Delay injection for gRPC works exactly the same as for HTTP. The proxy holds the request for the specified duration before forwarding it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    - fault:
        delay:
          fixedDelay: 3s
          percentage:
            value: 100.0
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

Test it with grpcurl:

```bash
# Install grpcurl if you don't have it
# Time the request to see the delay
time kubectl exec deploy/test-client -n production -- grpcurl -plaintext user-service:50051 user.UserService/GetUser
```

The response should take at least 3 seconds.

## Abort Injection for gRPC

Here's where it gets interesting. Istio's fault injection uses HTTP status codes for aborts, but gRPC clients expect gRPC status codes. Envoy translates between the two.

When you inject an HTTP abort, the gRPC client sees a mapped gRPC status code:

| HTTP Status | gRPC Status Code |
|---|---|
| 400 | INTERNAL |
| 401 | UNAUTHENTICATED |
| 403 | PERMISSION_DENIED |
| 404 | UNIMPLEMENTED |
| 429 | UNAVAILABLE |
| 502 | UNAVAILABLE |
| 503 | UNAVAILABLE |
| 504 | UNAVAILABLE |
| Other 4xx | INTERNAL |
| Other 5xx | INTERNAL |

To inject a gRPC UNAVAILABLE error, use HTTP 503:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50.0
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

When the client makes a gRPC call and hits the abort, it receives:

```text
ERROR:
  Code: Unavailable
  Message: fault filter abort
```

To inject a PERMISSION_DENIED error:

```yaml
fault:
  abort:
    httpStatus: 403
    percentage:
      value: 100.0
```

To inject an UNAUTHENTICATED error:

```yaml
fault:
  abort:
    httpStatus: 401
    percentage:
      value: 100.0
```

Istio also supports directly specifying gRPC status codes using the `grpcStatus` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    - fault:
        abort:
          grpcStatus: "UNAVAILABLE"
          percentage:
            value: 30.0
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

The `grpcStatus` field accepts standard gRPC status code names like `UNAVAILABLE`, `INTERNAL`, `NOT_FOUND`, `DEADLINE_EXCEEDED`, etc.

## Targeting Specific gRPC Methods

gRPC methods map to HTTP/2 paths in the format `/<package>.<Service>/<Method>`. You can use URI matching to target specific methods:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    # Inject faults only on GetUser
    - match:
        - uri:
            exact: /user.UserService/GetUser
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 30.0
      route:
        - destination:
            host: user-service
            port:
              number: 50051
    # All other methods work normally
    - route:
        - destination:
            host: user-service
            port:
              number: 50051
```

To target all methods of a specific service:

```yaml
- match:
    - uri:
        prefix: /user.UserService/
```

## gRPC Streaming and Fault Injection

gRPC supports four communication patterns:

1. **Unary**: Single request, single response
2. **Server streaming**: Single request, stream of responses
3. **Client streaming**: Stream of requests, single response
4. **Bidirectional streaming**: Stream in both directions

Fault injection works best with unary calls. For streaming calls:

- **Delay injection**: Applies to the initial connection setup. Once the stream is established, subsequent messages are not delayed.
- **Abort injection**: Aborts the initial connection. For an already-established stream, abort injection doesn't apply to individual messages.

```yaml
# This works well for unary calls and initial stream setup
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: chat-service
  namespace: production
spec:
  hosts:
    - chat-service
  http:
    - match:
        - uri:
            exact: /chat.ChatService/SendMessage  # Unary
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 20.0
      route:
        - destination:
            host: chat-service
            port:
              number: 50051
    - route:
        - destination:
            host: chat-service
            port:
              number: 50051
```

## Testing gRPC Retry Behavior

gRPC clients typically have built-in retry mechanisms. Test them with fault injection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 40.0
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: cancelled,deadline-exceeded,unavailable
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

Note the `retryOn` values for gRPC. While you can use HTTP-style values like `5xx`, Istio also supports gRPC-specific retry conditions:

- `cancelled`: Retry on CANCELLED status
- `deadline-exceeded`: Retry on DEADLINE_EXCEEDED
- `unavailable`: Retry on UNAVAILABLE
- `resource-exhausted`: Retry on RESOURCE_EXHAUSTED

## Testing gRPC Deadlines with Delay Injection

gRPC clients typically set deadlines (timeouts) on their calls. Test whether your client-side deadline handling works:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
    - user-service
  http:
    - fault:
        delay:
          fixedDelay: 10s
          percentage:
            value: 100.0
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

If your gRPC client sets a 5-second deadline:

```bash
# Using grpcurl with a timeout
kubectl exec deploy/test-client -n production -- grpcurl -plaintext -max-time 5 user-service:50051 user.UserService/GetUser
```

The call should fail with DEADLINE_EXCEEDED after 5 seconds, not hang for 10 seconds.

## Verifying gRPC Fault Injection

Check that faults are being injected:

```bash
# Check proxy access logs
kubectl logs deploy/test-client -c istio-proxy -n production | grep "user-service"

# Check gRPC-specific metrics
kubectl exec -n istio-system deploy/prometheus -- curl -s 'localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{destination_service="user-service.production.svc.cluster.local",grpc_response_status!="0"}[1m]))' | jq '.data.result'
```

For gRPC, a status of 0 means OK. Anything else is an error. The `grpc_response_status` metric label gives you the gRPC-specific status code.

## Complete Example

A full setup for testing gRPC resilience:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
  namespace: production
spec:
  host: user-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
  labels:
    chaos-experiment: grpc-resilience
spec:
  hosts:
    - user-service
  http:
    - match:
        - uri:
            exact: /user.UserService/GetUser
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 25.0
        delay:
          fixedDelay: 2s
          percentage:
            value: 15.0
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: unavailable
      route:
        - destination:
            host: user-service
            port:
              number: 50051
    - route:
        - destination:
            host: user-service
            port:
              number: 50051
```

This gives you a realistic scenario: some calls fail, some are slow, retries are in place, and outlier detection ejects consistently failing pods. It tests the full resilience stack for your gRPC services.
