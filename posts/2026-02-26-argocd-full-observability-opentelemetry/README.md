# How to Set Up Full Observability for ArgoCD with OpenTelemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OpenTelemetry, Observability

Description: A comprehensive guide to setting up full observability for ArgoCD using OpenTelemetry, covering metrics, traces, and logs for complete GitOps pipeline visibility.

---

Running ArgoCD in production without observability is like flying blind. You know deployments are happening, but you have no idea how fast, how reliably, or where bottlenecks are hiding. OpenTelemetry gives you a vendor-neutral way to instrument ArgoCD with metrics, traces, and logs so you can see everything that matters.

This guide walks through setting up a complete observability stack for ArgoCD using OpenTelemetry, from collector configuration to dashboards.

## Why OpenTelemetry for ArgoCD

ArgoCD already exposes Prometheus metrics on its components. But metrics alone only tell part of the story. You need:

- **Metrics** for aggregate health and trends (sync duration, error rates, queue depth)
- **Traces** for understanding the lifecycle of individual sync operations
- **Logs** for debugging failures and auditing changes

OpenTelemetry unifies all three signals under one framework, making correlation between them straightforward.

## Architecture Overview

The observability setup consists of the OpenTelemetry Collector receiving signals from ArgoCD components and forwarding them to your backends.

```mermaid
graph LR
    A[ArgoCD Server] -->|metrics + traces| C[OTel Collector]
    B[ArgoCD Repo Server] -->|metrics + traces| C
    D[ArgoCD App Controller] -->|metrics + traces| C
    E[ArgoCD Notifications] -->|metrics| C
    C -->|metrics| F[Prometheus/Mimir]
    C -->|traces| G[Jaeger/Tempo]
    C -->|logs| H[Loki/Elasticsearch]
```

## Step 1: Deploy the OpenTelemetry Collector

First, deploy the OpenTelemetry Collector in the same namespace as ArgoCD. Use the OpenTelemetry Operator for a clean setup.

Install the operator:

```bash
# Install cert-manager (required by the operator)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml

# Install the OpenTelemetry Operator
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
```

Create the collector configuration:

```yaml
# otel-collector.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: argocd-otel
  namespace: argocd
spec:
  mode: deployment
  image: otel/opentelemetry-collector-contrib:0.151.0
  config:
    receivers:
      # Scrape Prometheus metrics from ArgoCD components
      prometheus:
        config:
          scrape_configs:
            - job_name: 'argocd-server'
              scrape_interval: 30s
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names: [argocd]
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
                  regex: argocd-server
                  action: keep
                - source_labels: [__meta_kubernetes_pod_ip]
                  target_label: __address__
                  replacement: '$1:8083'

            - job_name: 'argocd-repo-server'
              scrape_interval: 30s
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names: [argocd]
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
                  regex: argocd-repo-server
                  action: keep
                - source_labels: [__meta_kubernetes_pod_ip]
                  target_label: __address__
                  replacement: '$1:8084'

            - job_name: 'argocd-application-controller'
              scrape_interval: 30s
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names: [argocd]
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
                  regex: argocd-application-controller
                  action: keep
                - source_labels: [__meta_kubernetes_pod_ip]
                  target_label: __address__
                  replacement: '$1:8082'

      # Receive OTLP traces and logs
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      # Add resource attributes for ArgoCD identification
      resource:
        attributes:
          - key: service.namespace
            value: argocd
            action: upsert
      # Batch telemetry for efficiency
      batch:
        send_batch_size: 1000
        timeout: 10s
      # Filter out noisy health check metrics
      filter:
        metrics:
          exclude:
            match_type: strict
            metric_names:
              - go_memstats_alloc_bytes_total

    exporters:
      # Export metrics to a Prometheus-compatible remote write endpoint
      prometheusremotewrite:
        endpoint: "http://prometheus:9090/api/v1/write"
      # Export traces to Jaeger
      otlp/jaeger:
        endpoint: "jaeger-collector.observability:4317"
        tls:
          insecure: true
      # Export logs to Loki's OTLP endpoint
      otlphttp/loki:
        endpoint: "http://loki.observability:3100/otlp"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [resource, filter, batch]
          exporters: [prometheusremotewrite]
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [otlp/jaeger]
        logs:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [otlphttp/loki]
```

Apply it:

```bash
kubectl apply -f otel-collector.yaml
```

## Step 2: Enable ArgoCD Metrics

ArgoCD components expose Prometheus metrics by default, but you need to ensure the metrics ports are accessible to the collector. The default metrics endpoints are:

```bash
kubectl get svc -n argocd argocd-metrics argocd-server-metrics argocd-repo-server
```

Verify metrics are being scraped:

```bash
# Check the OTel collector logs
kubectl logs -n argocd deployment/argocd-otel-collector -f

# Verify ArgoCD metrics are flowing to your backend
curl -s 'http://prometheus:9090/api/v1/query?query=argocd_app_info' | jq .
```

## Step 3: Configure Distributed Tracing

ArgoCD supports OpenTelemetry tracing natively through the `--otlp-address` component flag. Enable it through the ArgoCD command parameters ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable OTLP tracing
  otlp.address: "argocd-otel-collector.argocd:4317"
  otlp.insecure: "true"
```

You can also set headers or resource attributes for finer control:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  otlp.address: "argocd-otel-collector.argocd:4317"
  otlp.insecure: "true"
  otlp.headers: "tenant=platform"
  otlp.attrs: "service.namespace:argocd"
```

## Step 4: Collect Logs with OpenTelemetry

For log collection, use the OpenTelemetry Collector's filelog receiver or rely on a DaemonSet collector to tail ArgoCD pod logs:

```yaml
# otel-collector-daemonset.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: argocd-log-collector
  namespace: argocd
spec:
  mode: daemonset
  image: otel/opentelemetry-collector-contrib:0.151.0
  volumeMounts:
    - name: varlogpods
      mountPath: /var/log/pods
      readOnly: true
  volumes:
    - name: varlogpods
      hostPath:
        path: /var/log/pods
  config:
    receivers:
      filelog:
        include:
          - /var/log/pods/argocd_*/*/*.log
        start_at: end
        include_file_path: true
        include_file_name: false
        operators:
          - type: container

    processors:
      resource:
        attributes:
          - key: k8s.namespace.name
            value: argocd
            action: upsert
      batch:
        send_batch_size: 500
        timeout: 5s

    exporters:
      otlphttp/loki:
        endpoint: "http://loki.observability:3100/otlp"

    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [resource, batch]
          exporters: [otlphttp/loki]
```

## Step 5: Key Metrics to Watch

Once everything is wired up, here are the critical ArgoCD metrics to monitor:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `argocd_app_info` | Application health/sync status | health != Healthy |
| `argocd_app_sync_total` | Total sync operations | Sudden drops |
| `argocd_app_reconcile` | Reconciliation time | > 5 minutes |
| `argocd_git_request_total` | Git operations | High error rate |
| `argocd_repo_pending_request_total` | Pending repo lock requests | > 10 |
| `argocd_cluster_api_resource_objects` | Cluster resource count | Sudden changes |

## Step 6: Correlate Across Signals

The power of full observability comes from correlating metrics, traces, and logs. When you see a spike in `argocd_app_reconcile`:

1. Look at traces for that time window to find slow sync operations
2. Check logs for the specific application that was syncing
3. Correlate with cluster metrics to see if resource pressure caused the slowdown

With OpenTelemetry, traces, logs, and metrics can share resource attributes such as `service.namespace` and `k8s.namespace.name`, making correlation easier in tools like Grafana. Trace IDs in logs require the emitting application to include the trace context in its log records; scraped Prometheus metrics from ArgoCD do not automatically gain trace exemplars in the collector.

## Verifying the Setup

Run a quick validation to make sure all signals are flowing:

```bash
# Trigger a sync to generate telemetry
argocd app sync my-app

# Check metrics
curl -s http://prometheus:9090/api/v1/query?query=argocd_app_sync_total | jq .

# Check traces
curl -s http://jaeger:16686/api/traces?service=argocd-server | jq '.data | length'

# Check logs
curl -G -s http://loki:3100/loki/api/v1/query --data-urlencode 'query={k8s_namespace_name="argocd"}' | jq .
```

## Summary

Setting up full observability for ArgoCD with OpenTelemetry gives you unified visibility into your GitOps pipeline. You get metrics for trends and alerting, traces for debugging individual operations, and logs for detailed forensics. The OpenTelemetry Collector acts as the central hub, receiving all signals and routing them to your preferred backends. With this setup, you will never be caught off guard by a deployment issue again.

For monitoring specific DORA metrics from this observability data, see our guide on [creating DORA metrics dashboards with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-dora-metrics-dashboard/view).
