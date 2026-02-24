# How to Configure gRPC Fault Injection with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Fault Injection, Chaos Engineering, Kubernetes

Description: Use Istio fault injection to test gRPC service resilience by injecting delays and abort errors without modifying application code.

---

Fault injection is one of the best ways to test whether your microservices actually handle failures gracefully. You can talk about retry logic and circuit breakers all day, but until you actually inject real failures and see what happens, you do not really know if things work. Istio makes fault injection easy for gRPC services through VirtualService configuration.

## Types of Fault Injection

Istio supports two types of faults:

1. **Delay** - adds latency to requests, simulating slow backends or network congestion
2. **Abort** - returns an error immediately, simulating a crashing or unavailable backend

Both can be configured with a percentage, so you only affect a fraction of traffic. This lets you test failure handling without taking down the whole service.

## Injecting Delays

To add artificial latency to a gRPC service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 3s
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

This adds a 3-second delay to 50% of all gRPC requests to `grpc-backend`. The other 50% proceed normally. This is perfect for testing whether your client-side timeouts and deadlines work correctly.

## Injecting Aborts

To make a percentage of requests fail immediately:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - fault:
        abort:
          percentage:
            value: 20
          httpStatus: 503
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

For gRPC, an HTTP 503 maps to a gRPC `UNAVAILABLE` status code. Here is the mapping of commonly used HTTP status codes to gRPC codes:

- HTTP 400 -> `INTERNAL`
- HTTP 401 -> `UNAUTHENTICATED`
- HTTP 403 -> `PERMISSION_DENIED`
- HTTP 404 -> `UNIMPLEMENTED`
- HTTP 429 -> `UNAVAILABLE`
- HTTP 500 -> `INTERNAL`
- HTTP 503 -> `UNAVAILABLE`
- HTTP 504 -> `DEADLINE_EXCEEDED`

You can also inject gRPC status codes directly using the `grpcStatus` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - fault:
        abort:
          percentage:
            value: 10
          grpcStatus: 14
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

The value `14` is the gRPC status code for `UNAVAILABLE`. Using `grpcStatus` is more precise for gRPC services because you get the exact status code you want.

## Combining Delays and Aborts

You can apply both fault types simultaneously:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - fault:
        delay:
          percentage:
            value: 30
          fixedDelay: 2s
        abort:
          percentage:
            value: 10
          grpcStatus: 14
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

With this config, 30% of requests get delayed by 2 seconds, and independently, 10% get aborted with UNAVAILABLE. Some requests might get both (delayed AND aborted), meaning 3% of requests (30% * 10%) would experience a delay followed by an abort.

## Targeting Specific Methods

You probably do not want to inject faults on all gRPC methods. You can target specific ones using header matching:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - match:
        - headers:
            ":path":
              exact: "/mypackage.MyService/SlowMethod"
      fault:
        delay:
          percentage:
            value: 100
          fixedDelay: 5s
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

This only injects the delay on calls to `SlowMethod`, while all other methods are unaffected.

## Header-Based Fault Injection

For testing in production (carefully), you can trigger faults based on a custom header so only test traffic is affected:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-fault-inject:
              exact: "true"
      fault:
        abort:
          percentage:
            value: 100
          grpcStatus: 14
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
```

Only requests with the `x-fault-inject: true` metadata header trigger the fault. In your gRPC client, add this as metadata:

```go
md := metadata.Pairs("x-fault-inject", "true")
ctx := metadata.NewOutgoingContext(context.Background(), md)
resp, err := client.SomeMethod(ctx, req)
```

## Testing Scenarios

Here are practical scenarios you should test with fault injection:

**Scenario 1: Client timeout handling**

Inject a delay longer than the client's deadline:

```yaml
fault:
  delay:
    percentage:
      value: 100
    fixedDelay: 10s
```

If your client has a 5-second deadline, you should get `DEADLINE_EXCEEDED`. If you do not get it, your client is not setting deadlines properly.

**Scenario 2: Retry logic**

Inject a 50% abort rate and verify that retries bring the success rate back up:

```yaml
fault:
  abort:
    percentage:
      value: 50
    grpcStatus: 14
```

With 3 retries, your effective failure rate should drop to about 12.5% (0.5^3).

**Scenario 3: Circuit breaker activation**

Inject 100% failures for a subset of traffic and verify the circuit breaker ejects the faulty upstream:

```yaml
fault:
  abort:
    percentage:
      value: 100
    grpcStatus: 13
```

## Verifying Fault Injection Is Working

Check the Envoy stats to confirm faults are being injected:

```bash
# Check delay injection stats
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "fault"
```

Look for:
- `http.inbound.fault.delays_injected` - number of delays injected
- `http.inbound.fault.aborts_injected` - number of aborts injected

Also check the access logs for fault-related response flags:

```bash
kubectl logs <server-pod> -c istio-proxy | grep "FI"
```

The response flag `FI` indicates a fault-injected response, and `DI` indicates an injected delay.

## Cleaning Up

Always remember to remove fault injection rules when you are done testing:

```bash
kubectl delete virtualservice grpc-backend -n default
```

Or apply a clean version without the fault block. Leaving fault injection rules in production is a recipe for a very bad day.

Fault injection through Istio is one of the safest ways to test gRPC failure scenarios. You do not need to modify your application, you can target specific methods and traffic patterns, and you can easily clean up when you are done. Just make sure you have monitoring in place so you can see the impact of the faults you inject.
