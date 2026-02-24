# How to Disable Telemetry for Specific Workloads in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Performance, Optimization, Service Mesh

Description: How to selectively disable metrics, access logging, and tracing for specific workloads in Istio to reduce overhead and costs.

---

Not every workload in your mesh needs full telemetry. Health check endpoints, internal tools, batch jobs, and high-throughput data pipelines can generate enormous amounts of metric, log, and trace data that nobody ever looks at. Disabling telemetry for these workloads saves storage costs, reduces Prometheus load, and can even improve latency by reducing the work the Envoy proxy has to do.

The Telemetry API makes this straightforward. You can disable telemetry completely for a workload, or selectively disable just the parts you don't need.

## Disabling All Telemetry for a Workload

To completely silence a workload from a telemetry perspective:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: silence-workload
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: internal-tool
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0
```

After applying this, the `internal-tool` workload will:
- Stop generating Prometheus metrics
- Stop writing access logs
- Stop producing trace spans

The proxy still handles traffic normally - it just stops reporting telemetry data.

## Disabling Only Metrics

If you want to keep logging and tracing but stop metric collection:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-metrics
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: batch-processor
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
```

This is useful for batch jobs that process millions of items. The per-request metrics create high cardinality and cost, but you still want access logs for audit purposes.

## Disabling Only Access Logging

High-throughput services can generate gigabytes of access logs per day. If you're already getting what you need from metrics and traces:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-access-logs
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: event-stream
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## Disabling Only Tracing

For workloads that handle sensitive data and you don't want trace data leaving the service:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-tracing
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: secret-manager
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0
```

Setting the sampling percentage to 0 effectively disables tracing.

## Disabling Specific Metrics

Rather than disabling all metrics, you might want to keep the important ones and drop the noisy ones:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: minimal-metrics
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: data-pipeline
  metrics:
    - providers:
        - name: prometheus
      overrides:
        # Keep request count and duration
        - match:
            metric: REQUEST_COUNT
          disabled: false
        - match:
            metric: REQUEST_DURATION
          disabled: false
        # Disable everything else
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
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

## Disabling Client-Side Metrics Only

Every Istio metric is collected twice: once on the client (calling) side and once on the server (receiving) side. Disabling client-side metrics cuts your metric volume in half for a workload while keeping the server-side data intact:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-metrics-only
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: high-traffic-service
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

This is a good compromise. You still see all inbound traffic metrics for the service, but you don't get the duplicate data from the outbound perspective.

## Disabling Telemetry for an Entire Namespace

If all workloads in a namespace should have telemetry disabled:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: load-testing
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0
```

Note that this uses the name `default` and no selector, making it a namespace-level override rather than a workload-level one.

## When to Disable Telemetry

Here are common scenarios where disabling telemetry makes sense:

### Health Check Endpoints

If Kubernetes probes hit your services frequently, they generate a lot of metric and log noise:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: healthcheck-quiet
  namespace: production
spec:
  selector:
    matchLabels:
      app: healthcheck-sidecar
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

### Load Testing Tools

When running load tests, the test tooling itself generates tons of client-side metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: loadgen-quiet
  namespace: load-test
spec:
  selector:
    matchLabels:
      app: k6-runner
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0
```

### Internal Monitoring Services

Prometheus scrapers, log collectors, and monitoring agents that talk to many services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: monitoring-quiet
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: prometheus
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

This disables client-side metrics from Prometheus itself, which would otherwise create a metric for every service it scrapes.

### Batch Processing Jobs

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: batch-quiet
  namespace: etl
spec:
  selector:
    matchLabels:
      job-type: batch
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
        - match:
            metric: REQUEST_DURATION
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

Keep request counts for batch jobs (so you know how many items were processed) but drop the size and duration metrics since they aren't meaningful for batch operations.

## Measuring the Impact

Before and after disabling telemetry, check the impact:

### Prometheus Metric Volume

```bash
kubectl port-forward svc/prometheus 9090:9090 -n istio-system
```

Query the number of time series:

```promql
count({__name__=~"istio_.*", source_workload="data-pipeline"})
```

After disabling, this count should drop to near zero.

### Access Log Volume

Check log storage growth rate before and after:

```bash
# Before: check logs per second for a workload
kubectl logs -l app=data-pipeline -c istio-proxy --since=1m | wc -l
```

After disabling access logs, this should be zero (or just startup/shutdown messages).

### Proxy CPU Usage

Telemetry processing costs CPU. Check before and after:

```bash
kubectl top pods -l app=data-pipeline -n my-namespace
```

You should see a small but measurable reduction in the istio-proxy container's CPU usage.

## Re-Enabling Telemetry

To re-enable telemetry for a workload, simply delete the Telemetry resource:

```bash
kubectl delete telemetry silence-workload -n my-namespace
```

The workload falls back to the namespace-level or mesh-wide telemetry configuration.

Selectively disabling telemetry is one of the easiest ways to reduce your observability costs without losing visibility where it matters. Focus your telemetry budget on the services that need it and cut the noise from everything else.
