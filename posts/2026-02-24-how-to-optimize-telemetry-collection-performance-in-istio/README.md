# How to Optimize Telemetry Collection Performance in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Performance, Optimization, Envoy

Description: Practical strategies for optimizing Istio telemetry collection to reduce resource overhead without sacrificing observability coverage.

---

Telemetry collection in Istio is not free. Every metric generated, every trace span recorded, and every access log written costs CPU cycles and memory in your Envoy sidecars. At scale, this overhead adds up. I have seen clusters where the sidecars were burning 30% more resources than necessary because nobody bothered to tune the telemetry settings.

The good news is that there are concrete steps you can take to cut telemetry overhead significantly. Most of them are simple configuration changes that you can apply without downtime.

## Measuring Your Current Overhead

Before optimizing, establish a baseline. You need to know how much your sidecars are currently spending on telemetry.

Check sidecar resource consumption:

```bash
kubectl top pods -n your-namespace --containers | grep istio-proxy | \
  awk '{print $1, $3, $4}'
```

Look at the stats endpoint on a representative proxy:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "server\.(total_connections|memory_allocated|live)"
```

Count the number of metrics each sidecar is exposing:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15090/stats/prometheus | wc -l
```

If a single sidecar is exposing more than 5,000 lines of metrics, there is room to optimize.

## Reducing Metric Cardinality

High cardinality is the number one performance killer for telemetry. Each unique combination of labels creates a separate time series, and Envoy has to maintain counters for all of them.

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
            metric: REQUEST_COUNT
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
            grpc_response_status:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
        - match:
            metric: REQUEST_DURATION
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
            grpc_response_status:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
        - match:
            metric: REQUEST_SIZE
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
        - match:
            metric: RESPONSE_SIZE
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
```

## Disabling Unused Metrics

If you are not using certain metrics at all, disable them entirely:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-unused
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_SIZE
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_SIZE
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: TCP_OPENED_CONNECTIONS
            mode: CLIENT
          disabled: true
        - match:
            metric: TCP_CLOSED_CONNECTIONS
            mode: CLIENT
          disabled: true
```

Most teams only really need `REQUEST_COUNT` and `REQUEST_DURATION` server-side metrics. Everything else is nice to have.

## Optimizing Trace Sampling

Tracing has a much higher per-request cost than metrics because each trace span includes detailed timing and context information. The simplest optimization is to sample fewer traces.

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: trace-optimization
  namespace: istio-system
spec:
  tracing:
    - randomSamplingPercentage: 0.5
```

A 0.5% sampling rate is plenty for high-traffic services. For a service handling 10,000 requests per second, that still gives you 50 traces per second to work with.

For more targeted tracing, apply different sampling rates per namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: high-sampling
  namespace: critical-service
spec:
  tracing:
    - randomSamplingPercentage: 5.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: low-sampling
  namespace: batch-jobs
spec:
  tracing:
    - randomSamplingPercentage: 0.1
```

## Optimizing Access Logging

Access logs are expensive because they involve string formatting and I/O for every request. If you do not need full access logging, disable it or make it conditional.

Disable access logging globally and enable only where needed:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
```

Then enable it selectively via the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: selective-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
```

This only logs server errors, which cuts access log volume by 99% or more in a healthy system.

## Tuning Envoy Concurrency

Envoy uses worker threads to process requests. The default concurrency matches the CPU limit of the container. If you give the sidecar 2 CPU cores, Envoy creates 2 worker threads, each maintaining its own set of stats.

For most workloads, 2 worker threads are enough:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyCPU: "100m"
    spec:
      containers:
        - name: app
          image: your-app:latest
```

Or control concurrency directly:

```yaml
apiVersion: networking.istio.io/v1
kind: ProxyConfig
metadata:
  name: low-concurrency
  namespace: your-namespace
spec:
  concurrency: 2
```

## Reducing Prometheus Scrape Frequency

The default 15-second scrape interval is aggressive for many workloads. If your dashboards show 5-minute rate queries, you do not need 15-second granularity.

Increase the scrape interval for less critical namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: istio-proxies-relaxed
  namespace: monitoring
spec:
  selector:
    matchLabels:
      environment: staging
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 30s
```

This halves the scrape load for staging environments.

## Using Native Histogram Metrics

If you are running Prometheus with native histograms enabled, you can reduce the number of time series generated by histogram metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  enableFeatures:
    - native-histograms
  scrapeClasses:
    - name: default
      default: true
      scrapeTimeout: 10s
```

Native histograms use a single time series instead of one per bucket, which can reduce histogram-related time series by 10-20x.

## Benchmarking After Changes

After applying optimizations, measure the impact:

```bash
# Compare sidecar memory
kubectl top pods -n your-namespace --containers | grep istio-proxy

# Compare metric count
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15090/stats/prometheus | wc -l

# Check Prometheus cardinality
curl -s "http://prometheus:9090/api/v1/query?query=count({__name__=~'istio_.*'})" | \
  jq '.data.result[0].value[1]'
```

Create a before-and-after comparison:

```bash
# Track total Istio time series over time
curl -s "http://prometheus:9090/api/v1/query?query=count({__name__=~'istio_.*'})" | \
  jq -r '.data.result[0].value[1]'
```

## Summary of Optimizations by Impact

From my experience, here is the rough impact of each optimization:

- Disabling client-side metrics: 40-50% reduction in metric volume
- Removing unused labels: 20-30% reduction
- Disabling unused metric types: 10-20% reduction
- Reducing trace sampling: Up to 99% reduction in trace volume
- Conditional access logging: Up to 99% reduction in log volume
- Increasing scrape interval: Proportional reduction in scrape load

Apply them in that order. Start with the changes that have the biggest impact and lowest risk. Most of these changes can be applied with the Telemetry API without restarting any pods, making them safe to roll out gradually.
