# How to Handle 504 Gateway Timeout Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 504 Errors, Timeout, Troubleshooting, Kubernetes

Description: Troubleshooting guide for diagnosing and resolving 504 Gateway Timeout errors in Istio service mesh including timeout configuration at every layer.

---

504 Gateway Timeout is what you see when a request takes too long to complete. In Istio, this typically means the Envoy proxy gave up waiting for the upstream service to respond. The problem is that there are multiple timeout layers in Istio, and any one of them can trigger a 504. Figuring out which timeout fired is the first step to fixing the issue.

## Where Timeouts Happen in Istio

A request in Istio goes through several layers, each with its own timeout:

1. **Istio Ingress Gateway** - Has its own route timeout
2. **Client-side Envoy sidecar** - The proxy on the calling service
3. **Server-side Envoy sidecar** - The proxy on the receiving service
4. **The application itself** - May have its own internal timeout

If any of these layers hits its timeout before the response comes back, you get a 504.

## Checking Which Timeout Fired

Start by looking at the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100 | grep "504"
```

Look for the response flag:

- `UT` - Upstream request timeout (often a route timeout configured through VirtualService)
- `DT` - Duration timeout, such as a maximum connection duration
- `DC` - Downstream connection termination
- `LR` - Local reset
- `SI` - Stream idle timeout

The `UT` flag is the most common timeout-related 504 flag and usually means the route timeout was exceeded.

You can also check Envoy stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_timeout"
```

## Default Timeout Behavior

By default, Istio disables the HTTP route request timeout. Envoy also has stream idle timeouts; the HTTP connection manager defaults to 5 minutes if Istio has not configured another value, while DestinationRule TCP idle timeouts default to 1 hour. So if you are seeing 504s, check for an explicit route timeout, an idle timeout, a per-request timeout header, or a timeout at another layer.

Check what timeouts are configured on your VirtualService:

```bash
kubectl get virtualservice -n default -o yaml | grep -A2 timeout
```

Check the gateway configuration:

```bash
kubectl get gateway -n default -o yaml
```

## Fixing Timeout at the VirtualService Level

The most common fix is adjusting the timeout on the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slow-service-vs
  namespace: default
spec:
  hosts:
    - slow-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: slow-service.default.svc.cluster.local
      timeout: 60s
```

If you are using retries along with a timeout, make sure the overall timeout is high enough to accommodate all retry attempts:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slow-service-vs
  namespace: default
spec:
  hosts:
    - slow-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: slow-service.default.svc.cluster.local
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 8s
        retryOn: 5xx,connect-failure
```

Here, 3 retries at 8 seconds each is 24 seconds, which fits inside the 30-second overall timeout. If you set the overall timeout to 15 seconds, the third retry would never complete.

## Fixing Timeout at the Gateway Level

If the 504 happens at the ingress gateway, you need to increase the timeout there:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - myapp.example.com
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: my-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 120s
```

For the gateway itself, you might need to adjust the stream idle timeout using an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-timeout
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 300s
```

## Fixing Timeout for Long-Running Requests

Some operations legitimately take a long time, like file uploads, report generation, or data exports. For these, you need to increase timeouts across the entire request path:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: report-service-vs
  namespace: default
spec:
  hosts:
    - report-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /api/reports/generate
      route:
        - destination:
            host: report-service.default.svc.cluster.local
      timeout: 300s
    - route:
        - destination:
            host: report-service.default.svc.cluster.local
      timeout: 30s
```

This gives the report generation endpoint 5 minutes while keeping the default timeout at 30 seconds for other endpoints. This is much better than raising the timeout globally.

## Fixing Timeout for Streaming/SSE Endpoints

Server-Sent Events (SSE) and streaming endpoints need special handling because they keep the connection open for a long time. If you have configured a route timeout for the service, disable it for the streaming path:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: streaming-service-vs
  namespace: default
spec:
  hosts:
    - streaming-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /events
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 0s
```

If the stream can stay idle for longer than Envoy's stream idle timeout, adjust the HTTP connection manager timeout for that workload:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: streaming-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: streaming-service
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 0s
```

Setting `stream_idle_timeout: 0s` disables the idle timeout entirely for that workload. Only do this for services that actually need streaming, not globally.

## Dealing with Timeout Chains

In a microservice architecture, service A calls service B, which calls service C. If service C takes 10 seconds but service A has a 5-second timeout on its call to B, service A will time out before C even responds.

The rule of thumb is to set timeouts from the inside out:

```text
Service C: timeout = 15s (innermost)
Service B calling C: timeout = 12s
Service A calling B: timeout = 10s (outermost)
```

Wait, that looks wrong. Actually, the outer timeout should be the largest because it needs to account for the total chain time:

```text
Service C processing: up to 5s
Service B timeout for C: 8s (5s + buffer)
Service B processing: up to 3s
Service A timeout for B: 15s (8s + 3s + buffer)
```

Configure this in Istio:

```yaml
# Timeout for calls to Service C

apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-c-vs
spec:
  hosts:
    - service-c.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: service-c.default.svc.cluster.local
      timeout: 8s

---
# Timeout for calls to Service B
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-b-vs
spec:
  hosts:
    - service-b.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: service-b.default.svc.cluster.local
      timeout: 15s
```

## Monitoring Timeouts

Set up alerts for timeout rates so you catch issues early:

```promql
# 504 rate as percentage of total requests
sum(rate(istio_requests_total{response_code="504"}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total[5m])) by (destination_service_name)
* 100
```

Also monitor latency percentiles to predict timeouts before they happen:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service_name)
)
```

If your p99 latency is approaching your timeout threshold, you are about to start seeing 504s.

## Summary

504 errors in Istio are always about timeouts, but figuring out which timeout layer triggered it takes some detective work. Check the access logs for the `UT` response flag, then trace the timeout configuration from the gateway through the sidecar proxies. Set route-specific timeouts for slow endpoints instead of raising the global timeout. For streaming connections, disable the idle timeout on that specific workload. And always set up latency monitoring so you can see timeouts coming before users start complaining.
