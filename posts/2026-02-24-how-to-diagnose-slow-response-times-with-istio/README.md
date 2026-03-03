# How to Diagnose Slow Response Times with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, Performance, Troubleshooting, Envoy, Tracing

Description: How to identify and fix the root cause of slow response times in an Istio service mesh using metrics, traces, and proxy diagnostics.

---

Your service was running fine, and then one day response times started climbing. Is it the service itself? The Envoy proxy? The network? mTLS overhead? Istio adds multiple layers to the request path, and any of them could be contributing to slow responses. Here is how to figure out where the time is being spent.

## Measuring Where Latency Comes From

Istio reports latency from two perspectives:

- **Source (client-side)**: Measured by the calling service's sidecar. Includes network time, destination proxy processing, and the actual service response time.
- **Destination (server-side)**: Measured by the receiving service's sidecar. Includes only the proxy-to-service and service response time.

The difference between source and destination latency tells you how much time is spent in the network and proxy processing:

```promql
# Source-side P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",destination_workload="my-service"}[5m])) by (le)
)

# Destination-side P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",destination_workload="my-service"}[5m])) by (le)
)
```

If source latency is much higher than destination latency, the problem is in the network or proxy layers. If they are similar, the problem is likely in the service itself.

## Checking Proxy Overhead

Envoy adds some latency to every request for TLS termination, routing decisions, and telemetry. Normally this is under 1ms. If proxy overhead is high, check:

```bash
# Check proxy CPU usage - high CPU can cause latency
kubectl top pod my-service-pod -n my-namespace --containers | grep istio-proxy

# Check Envoy's own timing stats
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_length_ms\|upstream_rq_time"
```

If the sidecar CPU is consistently at its limit, requests get queued. Increase the sidecar CPU limit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyCPULimit: "2000m"
```

## Using Distributed Tracing

Distributed tracing is the most powerful tool for diagnosing latency issues because it shows you exactly where time is spent across the entire request path.

If you have Jaeger or Zipkin set up:

```bash
# Port-forward Jaeger
kubectl port-forward svc/tracing -n istio-system 16686:80
```

Open `http://localhost:16686`, find a slow trace, and look at the span waterfall. Each span shows:

- Time in the source proxy
- Network transit time
- Time in the destination proxy
- Time in the application

The widest span is your bottleneck.

Make sure your services propagate trace headers. Istio needs these headers to correlate spans:

```text
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
traceparent
tracestate
```

Your application does not need to create these headers, but it must forward them on any outgoing requests.

## Diagnosing Network Latency

If the gap between source and destination latency is large, you have a network issue:

```bash
# Check inter-node latency
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s -o /dev/null -w "time_connect: %{time_connect}\ntime_starttransfer: %{time_starttransfer}\ntime_total: %{time_total}\n" \
  http://destination-service:8080/health
```

Check if source and destination pods are on the same node:

```bash
kubectl get pod -o wide -n my-namespace
```

Cross-node traffic goes through the CNI plugin and potentially across availability zones, which adds latency. This is not Istio-specific, but the mesh makes it more visible.

## Checking for Retries

Istio retries can silently multiply latency. If a request fails and gets retried, the client sees the total time of all attempts:

```bash
# Check if retries are configured
kubectl get virtualservice -n my-namespace -o yaml | grep -A5 retries

# Check retry metrics
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_retry"
```

If retries are happening frequently, fix the root cause of failures rather than just retrying:

```promql
# Retry rate
sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (cluster_name)
```

## Checking Connection Establishment Time

Slow connection establishment can add latency, especially for short-lived requests:

```promql
# Connection setup time
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",connection_security_policy="mutual_tls"}[5m])) by (le)
)
```

If you see high connection setup times, consider using connection pooling with keep-alive:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: keep-alive
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        maxRequestsPerConnection: 0
```

## Checking for Large Configuration

A bloated Envoy configuration can slow down request processing. Check the config size:

```bash
# Get config dump size
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET config_dump | wc -c
```

If the config dump is many megabytes, you have too many services or complex routing rules. Use the Sidecar resource to limit what each proxy knows about:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

## Profiling the Application

Sometimes the slow response time has nothing to do with Istio. The application itself might be the bottleneck. To confirm, bypass the mesh and test directly:

```bash
# Port-forward directly to the pod
kubectl port-forward pod/my-service-pod 8080:8080

# Test latency bypassing the sidecar
curl -s -o /dev/null -w "total: %{time_total}s\n" http://localhost:8080/api/endpoint
```

If direct access is also slow, the problem is in your application code, database queries, or downstream dependencies.

## Systematic Latency Debugging

Follow this order:

1. Compare source vs destination latency metrics to isolate the layer
2. Check traces to find the slowest span
3. Verify sidecar CPU and memory are within limits
4. Look for retries inflating total request time
5. Check connection pool settings and connection reuse
6. Verify network latency between nodes
7. Inspect Envoy config size
8. Test the application directly, bypassing the mesh
9. Profile the application if the issue is in application code

Most latency issues in Istio environments turn out to be application-level problems that the mesh makes more visible through its telemetry. That is actually a good thing - it means you can find and fix performance issues faster than you could without the mesh.
