# How to Deploy Tempo with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tempo, Tracing

Description: Learn how to deploy Grafana Tempo for distributed tracing using ArgoCD with scalable configuration, object storage, and OpenTelemetry integration.

---

Grafana Tempo is an open-source, high-scale distributed tracing backend. It only requires object storage to operate, which makes it cost-effective compared to alternatives like Jaeger with Elasticsearch or Cassandra. Deploying Tempo with ArgoCD means your entire tracing infrastructure is version-controlled, auditable, and automatically kept in sync with your desired state.

This guide covers deploying Tempo in distributed mode with ArgoCD, configuring it to receive traces from OpenTelemetry, Jaeger, and Zipkin protocols, and integrating it with Grafana for trace visualization.

## Tempo Architecture

Tempo uses a microservices architecture with the following components:

- **Distributor**: Receives traces and routes them to ingesters
- **Ingester**: Batches traces and writes them to object storage
- **Compactor**: Compresses and deduplicates trace data in storage
- **Querier**: Handles trace lookups
- **Query Frontend**: Provides search and query splitting

All components are stateless except the ingester, which buffers traces in a Write-Ahead Log (WAL) before flushing to storage.

## Repository Structure

```text
tracing/
  tempo/
    Chart.yaml
    values.yaml
    values-production.yaml
```

## Creating the Wrapper Chart

```yaml
# tracing/tempo/Chart.yaml
apiVersion: v2
name: tempo
description: Wrapper chart for Grafana Tempo
type: application
version: 1.0.0
dependencies:
  - name: tempo-distributed
    version: "1.18.2"
    repository: "https://grafana.github.io/helm-charts"
```

## Configuring Tempo

```yaml
# tracing/tempo/values.yaml
tempo-distributed:
  # Global settings
  global:
    image:
      registry: docker.io

  # Tempo configuration
  tempo:
    # Multitenancy - disable for simplicity
    multitenancyEnabled: false

  # Storage configuration - S3
  storage:
    trace:
      backend: s3
      s3:
        bucket: tempo-traces
        endpoint: s3.us-east-1.amazonaws.com
        region: us-east-1
        # Use IRSA for authentication
        access_key: ""
        secret_key: ""
        insecure: false

  # Distributor receives incoming traces
  distributor:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        memory: 1Gi
    config:
      log_received_spans:
        enabled: false

    # Receivers configuration - accept all common formats
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      jaeger:
        protocols:
          thrift_http:
            endpoint: 0.0.0.0:14268
          grpc:
            endpoint: 0.0.0.0:14250
      zipkin:
        endpoint: 0.0.0.0:9411

  # Ingester buffers and writes to storage
  ingester:
    replicas: 3
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 2Gi
    persistence:
      enabled: true
      size: 20Gi
      storageClass: gp3
    config:
      max_block_duration: 10m
      max_block_bytes: 524288000  # 500MB
      complete_block_timeout: 15m

  # Compactor manages storage lifecycle
  compactor:
    replicas: 1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        memory: 1Gi
    config:
      compaction:
        block_retention: 336h  # 14 days

  # Querier handles trace lookups
  querier:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        memory: 1Gi

  # Query frontend provides search
  queryFrontend:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        memory: 512Mi
    config:
      search:
        max_duration: 0s  # No limit on search duration

  # Metrics generator creates span metrics
  metricsGenerator:
    enabled: true
    replicas: 1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        memory: 1Gi
    config:
      storage:
        remote_write:
          - url: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/write
            send_exemplars: true
      processor:
        span_metrics:
          dimensions:
            - service.namespace
            - http.method
            - http.status_code
        service_graphs:
          dimensions:
            - service.namespace

  # Gateway - optional nginx proxy
  gateway:
    enabled: true
    replicas: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi

  # Monitoring with ServiceMonitor
  metaMonitoring:
    serviceMonitor:
      enabled: true
      labels:
        release: kube-prometheus-stack
```

## Creating the ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: tempo
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: tracing
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: tracing/tempo
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: tracing
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Connecting OpenTelemetry to Tempo

If you are running an OpenTelemetry Collector (see [deploying OpenTelemetry Operator with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-deploy-opentelemetry-operator-argocd/view)), configure it to export traces to Tempo.

```yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: tracing
spec:
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 5s
        send_batch_size: 1000

    exporters:
      otlp/tempo:
        endpoint: tempo-distributor.tracing.svc.cluster.local:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/tempo]
```

## Adding Tempo as a Grafana Datasource

Configure Grafana to query Tempo for traces and link them to logs and metrics.

```yaml
kube-prometheus-stack:
  grafana:
    additionalDataSources:
      - name: Tempo
        type: tempo
        url: http://tempo-query-frontend.tracing.svc.cluster.local:3100
        access: proxy
        jsonData:
          httpMethod: GET
          tracesToLogs:
            datasourceUid: loki
            tags: ['service.name', 'service.namespace']
            mappedTags: [{ key: 'service.name', value: 'app' }]
            mapTagNamesEnabled: true
            filterByTraceID: true
          tracesToMetrics:
            datasourceUid: prometheus
            tags: [{ key: 'service.name', value: 'service' }]
            queries:
              - name: 'Request rate'
                query: 'sum(rate(traces_spanmetrics_calls_total{$$__tags}[5m]))'
          serviceMap:
            datasourceUid: prometheus
          nodeGraph:
            enabled: true
          search:
            hide: false
          lokiSearch:
            datasourceUid: loki
```

This configuration enables powerful features in Grafana:

- **Trace to Logs**: Click a trace span to jump to related logs in Loki
- **Trace to Metrics**: See request rates and latency metrics for traced services
- **Service Map**: Visualize service dependencies based on trace data
- **Node Graph**: Explore service topology interactively

## Verifying the Deployment

```bash
# Check Tempo components
kubectl get pods -n tracing -l app.kubernetes.io/name=tempo

# Test trace ingestion using the Tempo API
kubectl port-forward -n tracing svc/tempo-query-frontend 3200:3100

# Query a specific trace ID
curl http://localhost:3200/api/traces/<trace-id>

# Check ArgoCD sync status
argocd app get tempo
```

## Scaling Considerations

Tempo's main bottleneck is usually the ingester. Monitor the ingester's WAL size and memory usage. If traces are being dropped, increase ingester replicas or memory.

```yaml
# Scale ingesters for higher throughput
ingester:
  replicas: 5
  resources:
    requests:
      memory: 2Gi
    limits:
      memory: 4Gi
```

The compactor should be a single replica to avoid conflicts. If compaction falls behind, increase its resources rather than adding replicas.

## Summary

Deploying Tempo with ArgoCD provides a GitOps-managed distributed tracing backend that is cost-effective and integrates seamlessly with the Grafana observability stack. The combination of Tempo for traces, Loki for logs, and Prometheus for metrics - all managed by ArgoCD - gives you a complete observability platform where every configuration change is tracked in Git and automatically reconciled.
