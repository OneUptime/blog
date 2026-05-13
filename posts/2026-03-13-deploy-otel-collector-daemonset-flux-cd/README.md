# Deploy OpenTelemetry Collector as a DaemonSet with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenTelemetry, OTEL Collector, DaemonSet, Observability

Description: Deploy the OpenTelemetry Collector as a Kubernetes DaemonSet using Flux CD to collect node-level metrics, host logs, and application telemetry from every node in your cluster.

---

## Introduction

Deploying the OpenTelemetry Collector as a DaemonSet ensures that one collector pod runs on every node in your Kubernetes cluster. This pattern is ideal for collecting node-level host metrics, kubelet statistics, container logs from the host filesystem, and receiving telemetry from applications running on the same node via `hostPort`.

Managing the DaemonSet collector configuration via Flux CD means your pipeline configuration-receivers, processors, exporters-is version-controlled. When you add a new backend or enable a new receiver, the change flows through a pull request and Flux automatically reconciles every node's collector.

This guide uses the OpenTelemetry Operator and an `OpenTelemetryCollector` custom resource to deploy the DaemonSet.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- cert-manager installed (required by the OpenTelemetry Operator webhook)
- An observability backend (Prometheus/Mimir for metrics, Loki for logs, Tempo/Jaeger for traces)
- `flux` and `kubectl` CLIs installed

## Step 1: Deploy the OpenTelemetry Operator

```yaml
# clusters/my-cluster/otel-operator/otel-operator-helmrepository.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: open-telemetry
  namespace: flux-system
spec:
  interval: 12h
  url: https://open-telemetry.github.io/opentelemetry-helm-charts
---
# clusters/my-cluster/otel-operator/otel-operator-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: opentelemetry-operator
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: opentelemetry-operator-system
  install:
    createNamespace: true
  chart:
    spec:
      chart: opentelemetry-operator
      version: ">=0.43.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: open-telemetry
        namespace: flux-system
  values:
    # Automatically manage cert-manager certificates for the webhook
    admissionWebhooks:
      certManager:
        enabled: true
    manager:
      collectorImage:
        repository: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-k8s
      # Let the operator create collector RBAC needed by processors such as k8sattributes
      createRbacPermissions: true
```

## Step 2: Create the DaemonSet OpenTelemetry Collector

Define a `OpenTelemetryCollector` CR with `mode: daemonset` to run one pod per node.

```yaml
# clusters/my-cluster/otel-collector/otel-daemonset-collector.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-daemonset
  namespace: monitoring
spec:
  # DaemonSet mode: one collector pod per node
  mode: daemonset

  # Grant access to host filesystem for log collection
  volumeMounts:
    - name: varlogpods
      mountPath: /var/log/pods
      readOnly: true
    - name: varlibdockercontainers
      mountPath: /var/lib/docker/containers
      readOnly: true
    - name: hostfs
      mountPath: /hostfs
      readOnly: true

  volumes:
    - name: varlogpods
      hostPath:
        path: /var/log/pods
    - name: varlibdockercontainers
      hostPath:
        path: /var/lib/docker/containers
    - name: hostfs
      hostPath:
        path: /

  # Expose OTLP ports on the host so applications can send to their node IP
  hostNetwork: false
  ports:
    - name: otlp-grpc
      port: 4317
      hostPort: 4317
    - name: otlp-http
      port: 4318
      hostPort: 4318

  config:
    receivers:
      # Receive OTLP telemetry from applications on this node
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Collect host metrics from every node
      hostmetrics:
        root_path: /hostfs
        collection_interval: 30s
        scrapers:
          cpu: {}
          disk: {}
          filesystem: {}
          memory: {}
          network: {}
          load: {}

      # Collect container logs from the host filesystem
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        start_at: beginning
        include_file_path: true
        operators:
          - type: container
            id: container-parser

    processors:
      # Add Kubernetes metadata (pod name, namespace, node name) to all telemetry
      k8sattributes:
        auth_type: serviceAccount
        passthrough: false
        extract:
          metadata:
            - k8s.node.name
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.container.name
      # Batch telemetry for efficient export
      batch:
        timeout: 10s
        send_batch_size: 1000

    exporters:
      # Export metrics to Prometheus-compatible remote_write endpoint
      prometheusremotewrite:
        endpoint: http://mimir-distributor.monitoring.svc:8080/api/v1/push
      # Export logs to Loki's OTLP ingestion endpoint
      otlphttp/loki:
        endpoint: http://loki-gateway.monitoring.svc/otlp
      # Export traces to Tempo
      otlp/tempo:
        endpoint: tempo-distributor.monitoring.svc:4317
        tls:
          insecure: true

    service:
      pipelines:
        metrics:
          receivers: [otlp, hostmetrics]
          processors: [k8sattributes, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp, filelog]
          processors: [k8sattributes, batch]
          exporters: [otlphttp/loki]
        traces:
          receivers: [otlp]
          processors: [k8sattributes, batch]
          exporters: [otlp/tempo]
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-system/otel-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: opentelemetry-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/otel-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cert-manager
---
# clusters/my-cluster/flux-system/otel-collector-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: otel-daemonset
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/otel-collector
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: opentelemetry-operator
```

## Best Practices

- Use `k8sattributes` processor to enrich all telemetry with Kubernetes pod and node metadata.
- Mount the host log paths read-only; the collector never needs write access.
- Use `batch` processor to reduce network overhead; tune `send_batch_size` based on your volume.
- Set resource limits on the collector DaemonSet pods to prevent noisy-neighbor issues on nodes.
- Monitor the collector's own metrics via a ServiceMonitor to detect dropped spans or export failures.

## Conclusion

The OpenTelemetry Collector DaemonSet, managed via Flux CD, provides universal telemetry collection from every node in your cluster. Host metrics, container logs, and application traces are all collected, enriched with Kubernetes metadata, and forwarded to your observability backends in a fully GitOps-managed pipeline.
