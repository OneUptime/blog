# How to Handle Telemetry Data Retention in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Observability, Kubernetes, Data Retention

Description: Learn how to configure and manage telemetry data retention policies in Istio to balance storage costs with observability needs.

---

Telemetry data is one of those things that grows fast and quietly eats through your storage budget if you are not careful. Istio generates metrics, traces, and access logs for every request flowing through the mesh, and without a solid retention strategy, you will end up with terabytes of data that nobody ever looks at.

The tricky part is finding the right balance. Keep too little data and you cannot debug issues from last week. Keep too much and your Prometheus server falls over or your cloud storage bill goes through the roof. Here is how to get telemetry data retention right in Istio.

## Understanding What Istio Generates

Before setting retention policies, you need to understand the volume of data Istio produces. Each sidecar proxy generates:

- Request-level metrics (request count, duration, size)
- TCP connection metrics
- Distributed traces (if enabled)
- Access logs (if enabled)

For a mesh with 100 services handling 10,000 requests per second, that can easily translate to millions of metric data points per minute. The first step is knowing what you actually collect.

Check your current Istio telemetry configuration:

```bash
kubectl get telemetry --all-namespaces
```

Look at the mesh-level telemetry settings:

```bash
kubectl get telemetry -n istio-system
```

## Configuring Metric Retention in Prometheus

Most Istio deployments use Prometheus for metrics storage. Prometheus retention is controlled through its startup flags.

If you installed Prometheus via the kube-prometheus-stack Helm chart, update your values:

```yaml
prometheus:
  prometheusSpec:
    retention: 15d
    retentionSize: 50GB
    resources:
      requests:
        memory: 4Gi
        cpu: "1"
      limits:
        memory: 8Gi
```

The `retention` flag sets time-based retention, while `retentionSize` caps the total storage. Whichever limit is hit first wins. For most teams, 15 days of full-resolution metrics is a good starting point.

Apply the configuration:

```bash
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  -f prometheus-values.yaml \
  -n monitoring
```

## Reducing Metric Cardinality

Before worrying about retention duration, reduce the amount of data you store in the first place. Istio metrics have high cardinality because they include labels like source, destination, response code, and more.

Use the Istio Telemetry API to drop metrics you do not need:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT
          disabled: true
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT
          disabled: true
```

This disables client-side metrics, which are often redundant with server-side metrics. You cut your metric volume roughly in half with this single change.

You can also strip unnecessary labels using tag overrides:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-labels
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
            connection_security_policy:
              operation: REMOVE
```

## Setting Up Trace Retention

Traces are typically stored in backends like Jaeger, Zipkin, or Tempo. Each has its own retention configuration.

For Jaeger with Elasticsearch storage, set the index retention:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
    esIndexCleaner:
      enabled: true
      numberOfDays: 7
      schedule: "55 23 * * *"
```

The `esIndexCleaner` runs on a cron schedule and deletes trace indices older than the specified number of days.

For Grafana Tempo, configure retention in the compactor:

```yaml
compactor:
  compaction:
    block_retention: 168h  # 7 days
  ring:
    kvstore:
      store: memberlist
```

## Managing Access Log Retention

Istio access logs can be sent to stdout (picked up by your log aggregator) or directly to backends. If you are using a log aggregator like Fluentd or Fluentbit, configure retention at the aggregator level.

First, control which namespaces generate access logs:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This only logs error responses, dramatically reducing log volume. You probably do not need a log line for every successful health check.

For namespace-level control, apply different logging policies:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-logging
  namespace: staging
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This gives you full access logs in staging but filtered logs in production.

## Implementing Tiered Retention

For production environments, a tiered retention strategy works best. Keep recent data at full resolution and downsample older data.

Set up Prometheus recording rules to create downsampled metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-downsampling
  namespace: monitoring
spec:
  groups:
    - name: istio-5m-aggregation
      interval: 5m
      rules:
        - record: istio_requests:rate5m
          expr: sum(rate(istio_requests_total[5m])) by (destination_service, response_code)
        - record: istio_request_duration:p99_5m
          expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le))
```

Then configure Thanos or Cortex for long-term storage of the downsampled data:

```yaml
thanos:
  store:
    retentionResolutionRaw: 7d
    retentionResolution5m: 30d
    retentionResolution1h: 365d
```

This gives you 7 days of raw data, 30 days of 5-minute resolution, and a year of hourly data.

## Automating Retention Policy Enforcement

Create a CronJob to clean up old telemetry data that might be missed by backend retention policies:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: telemetry-cleanup
  namespace: monitoring
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Clean old Prometheus TSDB blocks
                  curl -X POST http://prometheus:9090/api/v1/admin/tsdb/clean_tombstones
                  # Trigger compaction
                  curl -X POST http://prometheus:9090/api/v1/admin/tsdb/snapshot
          restartPolicy: OnFailure
```

## Monitoring Your Retention Policies

Keep an eye on storage consumption to make sure your retention policies are working:

```bash
# Check Prometheus TSDB status
kubectl exec -n monitoring prometheus-0 -- promtool tsdb list /prometheus

# Check storage usage
kubectl exec -n monitoring prometheus-0 -- df -h /prometheus
```

Set up alerts for when storage is getting close to capacity:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-alerts
  namespace: monitoring
spec:
  groups:
    - name: storage
      rules:
        - alert: PrometheusStorageHigh
          expr: prometheus_tsdb_storage_blocks_bytes / (50 * 1024 * 1024 * 1024) > 0.8
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Prometheus storage above 80% capacity"
```

## Practical Recommendations

After working with Istio telemetry retention across multiple clusters, here is what tends to work well:

- **Metrics**: 15 days raw, 90 days downsampled, 1 year hourly
- **Traces**: 7 days for production, 3 days for staging
- **Access logs**: 30 days for errors, 7 days for full logs
- **Start by reducing cardinality** before increasing storage

The most common mistake teams make is keeping everything at full resolution forever. That is expensive and unnecessary. Most debugging happens within the first 48 hours of an incident, so having extremely detailed data beyond two weeks rarely pays off. Focus your retention budget on the data that actually helps you respond to incidents and understand trends over time.
