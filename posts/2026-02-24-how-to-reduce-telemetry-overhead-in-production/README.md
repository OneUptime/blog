# How to Reduce Telemetry Overhead in Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Performance, Production, Kubernetes

Description: Practical strategies for reducing Istio telemetry overhead in production without losing the observability you need.

---

Istio telemetry is great until you look at your cloud bill. In production, the sidecar proxies generating metrics, traces, and access logs across thousands of pods can consume significant CPU, memory, and network bandwidth. The telemetry overhead that is barely noticeable in a staging environment with 20 pods becomes a real problem at scale.

Here is how to cut that overhead down while keeping the observability that actually matters.

## Measuring Your Current Overhead

Before optimizing, measure what you are actually spending on telemetry. Check the resource usage of your sidecar containers:

```bash
# Get resource usage for all istio-proxy containers
kubectl top pods -A --containers | grep istio-proxy | sort -k4 -rn | head -20
```

Also look at the Envoy stats about the stats system itself (yes, stats about stats):

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep "server.memory"
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep "stats.overflow"
```

If `stats.overflow` is non-zero, Envoy is running out of room for statistics. If memory usage is high relative to your limits, you have room to optimize.

## Strategy 1: Reduce Metric Cardinality

The number one cause of telemetry overhead is high metric cardinality. Each unique combination of label values creates a separate time series. With Istio's default labels, the cardinality grows as the product of source services, destination services, response codes, and other dimensions.

Remove labels you do not use:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            connection_security_policy:
              operation: REMOVE
            request_protocol:
              operation: REMOVE
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
```

In most meshes, `connection_security_policy` is always `mutual_tls`, so it adds cardinality without information. Same for `request_protocol` if all your traffic is HTTP/2 or gRPC.

## Strategy 2: Disable Unused Metrics

If you are an HTTP-only shop, disable TCP metrics entirely:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-tcp
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: TCP_OPENED_CONNECTIONS
          disabled: true
        - match:
            metric: TCP_CLOSED_CONNECTIONS
          disabled: true
        - match:
            metric: TCP_SENT_BYTES
          disabled: true
        - match:
            metric: TCP_RECEIVED_BYTES
          disabled: true
```

You can also disable client-side metrics if server-side is sufficient:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-only-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

This cuts your metric volume roughly in half. Server-side metrics are usually sufficient for latency monitoring since they capture the actual processing time.

## Strategy 3: Lower Trace Sampling Rates

Tracing is often the most expensive telemetry signal. Each trace span consumes CPU to generate, network bandwidth to transmit, and storage in your backend.

For production, keep sampling rates low:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: low-sampling
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 1.0
```

One percent sampling is plenty for most production workloads. You still get enough traces to see patterns and investigate issues, without the overhead of tracing every single request.

For high-traffic services, you can go even lower:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: hot-service-sampling
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 0.1
```

## Strategy 4: Filter Access Logs

Access logs for every single request generate enormous volume. Filter them to only log what matters:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: filtered-access-logs
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > 1000"
```

This only logs errors and slow requests. In a healthy system, that is maybe 1-5% of all traffic instead of 100%.

You can also disable access logging entirely for namespaces that do not need it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-access-logs
  namespace: batch-jobs
spec:
  accessLogging:
    - disabled: true
```

## Strategy 5: Minimize Raw Envoy Stats

If you have previously added extra Envoy stats through `proxyStatsMatcher`, review whether you still need them:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes: []
        inclusionRegexps: []
```

An empty list means only the default Istio metrics are exposed. No extra Envoy internal stats.

## Strategy 6: Right-Size Proxy Resources

Many teams set generous resource limits on sidecars "just in case." This wastes cluster resources. After reducing telemetry overhead, you can lower the limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
```

Monitor actual usage for a week after changes before reducing limits further. Setting limits too low causes OOM kills and CPU throttling.

## Strategy 7: Use Workload-Specific Configuration

Not every service needs the same level of observability. Apply more telemetry to critical services and less to batch jobs or internal tools:

```yaml
# Critical payment service gets full observability
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-telemetry
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10.0
  accessLogging:
    - providers:
        - name: envoy
---
# Internal cron jobs get minimal observability
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: cron-telemetry
  namespace: production
spec:
  selector:
    matchLabels:
      app: cron-runner
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 0.0
  accessLogging:
    - disabled: true
```

## Strategy 8: Tune Histogram Buckets

Histogram metrics are the most expensive metric type because each observation updates multiple counters (one per bucket). Reducing the number of buckets saves CPU and memory:

If you have custom histogram configurations, reduce the number of buckets to what you actually need for your SLOs. If your SLO is "99th percentile latency under 500ms," you do not need 50ms granularity above 1 second.

## Measuring the Impact

After making changes, measure again:

```bash
# Compare proxy memory before and after
kubectl top pods -A --containers | grep istio-proxy | awk '{sum += $4} END {print sum " Mi total"}'

# Check Prometheus cardinality
curl -s http://prometheus:9090/api/v1/status/tsdb | jq '.data.headStats.numSeries'

# Compare CPU usage
kubectl top pods -A --containers | grep istio-proxy | awk '{sum += $3} END {print sum " total CPU"}'
```

A well-optimized telemetry configuration can reduce overhead by 50-80% compared to the defaults with everything enabled. The key is being intentional about what you collect rather than collecting everything and hoping something useful is in there.
