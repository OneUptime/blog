# How to Troubleshoot Metrics Not Being Scraped by Prometheus from the OpenTelemetry Collector Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Collector, Metrics

Description: Fix Prometheus failing to scrape metrics from the OpenTelemetry Collector when the exporter endpoint is misconfigured or unreachable.

You configure the OpenTelemetry Collector to expose a Prometheus endpoint so that Prometheus can scrape metrics from it. But Prometheus shows the target as "down" and no metrics appear. Here is how to troubleshoot this step by step.

## How the Flow Works

```
Applications -> OTLP -> Collector -> Prometheus Exporter -> :8889/metrics -> Prometheus scrapes
```

The Collector receives metrics via OTLP, processes them, and exposes them on a Prometheus-compatible HTTP endpoint. Prometheus then scrapes that endpoint.

## Step 1: Verify the Prometheus Exporter Is Configured

Check your Collector config:

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: ""
    send_timestamps: true
    metric_expiration: 5m

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

Common mistakes:
- Using `prometheusremotewrite` instead of `prometheus` (they are different exporters)
- Forgetting to add `prometheus` to the pipeline's exporters
- Binding to `localhost` instead of `0.0.0.0` (unreachable from outside the container)

## Step 2: Check If the Endpoint Is Accessible

From inside the Collector pod:

```bash
kubectl exec <collector-pod> -- wget -qO- http://localhost:8889/metrics | head -20
```

You should see Prometheus-formatted metrics. If this fails, the exporter is not running.

From another pod in the cluster:

```bash
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://otel-collector:8889/metrics | head -20
```

If this fails but the local test works, it is a networking or Service issue.

## Step 3: Verify the Kubernetes Service Exposes the Metrics Port

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: prometheus-metrics    # this port must be defined
    port: 8889
    targetPort: 8889
```

If the metrics port is not in the Service, Prometheus cannot reach it.

## Step 4: Check the Prometheus Scrape Configuration

In Prometheus's config:

```yaml
# prometheus.yml
scrape_configs:
- job_name: 'otel-collector'
  scrape_interval: 30s
  static_configs:
  - targets: ['otel-collector:8889']
```

If using Kubernetes service discovery:

```yaml
scrape_configs:
- job_name: 'otel-collector'
  kubernetes_sd_configs:
  - role: endpoints
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_name]
    regex: otel-collector
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    regex: prometheus-metrics
    action: keep
```

The `port_name` must match the port name in the Service definition.

## Step 5: Check Prometheus Targets Page

Open the Prometheus UI at `http://prometheus:9090/targets`. Look for the `otel-collector` target. If it shows as "DOWN", check the error message:

- `connection refused`: the port is not open or the Service is misconfigured
- `context deadline exceeded`: the scrape is timing out (the Collector might be overloaded)
- `server returned HTTP status 404 Not Found`: wrong path (should be `/metrics`)

## Step 6: Check If Metrics Are Actually Being Received

The Collector might not have any metrics to expose. Verify that applications are sending metrics:

```yaml
# Add a debug exporter temporarily
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, debug]
```

The debug exporter will print received metrics to the Collector logs. If nothing prints, the problem is upstream (applications are not sending metrics).

## Step 7: Check metric_expiration

The Prometheus exporter has a `metric_expiration` setting. If a metric is not updated within this window, it is removed from the endpoint:

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    metric_expiration: 5m  # metrics disappear after 5 minutes of no updates
```

If your applications send metrics infrequently (less than every 5 minutes), increase the expiration:

```yaml
    metric_expiration: 30m
```

## Common Gotcha: prometheusremotewrite vs prometheus

These are two different exporters:

```yaml
# prometheus: exposes /metrics endpoint for Prometheus to scrape (pull model)
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

# prometheusremotewrite: pushes metrics to a Prometheus-compatible endpoint (push model)
exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"
```

If you want Prometheus to scrape the Collector, use `prometheus`. If you want the Collector to push metrics to Prometheus, use `prometheusremotewrite`.

## Summary

When Prometheus cannot scrape the Collector, work through these layers: verify the exporter config, check the endpoint is accessible, confirm the Kubernetes Service exposes the port, validate the Prometheus scrape config, and check the Prometheus targets page for specific errors. The most common issues are port mismatches, wrong exporter type, and binding to localhost instead of 0.0.0.0.
