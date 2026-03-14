# How to Deploy OpenTelemetry Collector as a Deployment with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenTelemetry, OTEL Collector, Deployments, Observability

Description: Deploy OpenTelemetry Collector as a central Deployment using Flux CD for aggregating and processing telemetry from multiple application sources before exporting to backends.

---

## Introduction

While the DaemonSet deployment model runs a collector on every node, the Deployment model runs a configurable number of centralized collector replicas. This pattern is ideal for aggregating telemetry from across the cluster, performing tail-based trace sampling, or acting as a gateway that fans out to multiple backends.

A Deployment-mode collector can be scaled horizontally with an HPA, and its configuration pipeline can be more resource-intensive (e.g., tail sampling processors) without impacting the node where applications run.

This guide deploys the OpenTelemetry Collector as a Deployment using the OpenTelemetry Operator, with a multi-backend export pipeline including Prometheus remote_write, Loki, and Tempo.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- OpenTelemetry Operator installed (see the DaemonSet guide for operator setup)
- Observability backends running (Prometheus/Mimir, Loki, Tempo)
- `flux` and `kubectl` CLIs installed

## Step 1: Create the Deployment Collector CR

Define an `OpenTelemetryCollector` with `mode: deployment` for centralized aggregation.

```yaml
# clusters/my-cluster/otel/otel-deployment-collector.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: monitoring
spec:
  # Deployment mode: scalable central gateway
  mode: deployment
  replicas: 2

  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "1"
      memory: "1Gi"

  config: |
    receivers:
      # Accept OTLP from DaemonSet collectors or directly from apps
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Scrape Prometheus metrics endpoints cluster-wide
      prometheus:
        config:
          scrape_configs:
            - job_name: kubernetes-pods
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                  action: keep
                  regex: "true"

    processors:
      # Enrich with Kubernetes resource attributes
      k8sattributes:
        auth_type: serviceAccount
        passthrough: false
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.deployment.name
            - k8s.node.name

      # Memory limiter prevents OOM kills on the collector pod
      memory_limiter:
        check_interval: 5s
        limit_mib: 900
        spike_limit_mib: 200

      # Tail-based sampling: keep 10% of successful traces, 100% of error traces
      tail_sampling:
        decision_wait: 10s
        num_traces: 50000
        policies:
          - name: errors-policy
            type: status_code
            status_code: {status_codes: [ERROR]}
          - name: probabilistic-policy
            type: probabilistic
            probabilistic: {sampling_percentage: 10}

      batch:
        timeout: 10s
        send_batch_size: 2000

    exporters:
      # Push metrics to Grafana Mimir
      prometheusremotewrite:
        endpoint: http://mimir-distributor.monitoring.svc:8080/api/v1/push
        tls:
          insecure: true

      # Push logs to Grafana Loki
      loki:
        endpoint: http://loki-gateway.monitoring.svc/loki/api/v1/push

      # Push traces to Grafana Tempo
      otlp/tempo:
        endpoint: tempo-distributor.monitoring.svc:4317
        tls:
          insecure: true

      # Debug exporter for troubleshooting (disable in production)
      debug:
        verbosity: basic

    service:
      pipelines:
        metrics:
          receivers: [otlp, prometheus]
          processors: [k8sattributes, memory_limiter, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [k8sattributes, memory_limiter, batch]
          exporters: [loki]
        traces:
          receivers: [otlp]
          processors: [k8sattributes, tail_sampling, memory_limiter, batch]
          exporters: [otlp/tempo]
```

## Step 2: Configure HorizontalPodAutoscaler

Scale the gateway collectors automatically based on CPU utilization.

```yaml
# clusters/my-cluster/otel/otel-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-gateway
  namespace: monitoring
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    # Name matches the collector CR name + "-collector"
    name: otel-gateway-collector
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/otel/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: otel-gateway
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/otel
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: opentelemetry-operator
```

## Best Practices

- Always include the `memory_limiter` processor to prevent the collector from being OOM-killed under high load.
- Place `memory_limiter` before `batch` in the processor chain to shed load before buffering.
- Use tail-based sampling in the gateway (not the DaemonSet) since tail sampling requires seeing all spans for a trace.
- Set `decision_wait` in `tail_sampling` to at least the P99 trace duration to avoid premature sampling decisions.
- Use `minReplicas: 2` in the HPA so the gateway survives a node failure without losing telemetry.

## Conclusion

The OpenTelemetry Collector Deployment gateway, managed via Flux CD, provides a centralized, scalable telemetry aggregation point. Tail sampling, multi-backend export, and automatic scaling are all version-controlled Git resources, giving your observability infrastructure the same rigor as your application code.
