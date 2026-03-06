# How to Deploy Tempo Tracing with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tempo, Grafana Tempo, Kubernetes, GitOps, Tracing, Distributed Tracing, Observability

Description: A practical guide to deploying Grafana Tempo for distributed tracing on Kubernetes using Flux CD and GitOps workflows.

---

## Introduction

Grafana Tempo is an open-source, high-scale distributed tracing backend. It requires only object storage to operate and integrates deeply with Grafana, Loki, and Prometheus. Tempo accepts traces in multiple formats including Jaeger, Zipkin, OpenTelemetry, and OpenCensus.

This guide walks you through deploying Tempo using Flux CD, configuring trace ingestion, and connecting it to your observability stack.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- An S3-compatible object storage bucket

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/tracing/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Creating the Tracing Namespace

```yaml
# clusters/my-cluster/tracing/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tracing
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying Tempo in Distributed Mode

For production environments, deploy Tempo in distributed (microservices) mode.

```yaml
# clusters/my-cluster/tracing/tempo.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tempo-distributed
  namespace: tracing
spec:
  interval: 30m
  chart:
    spec:
      chart: tempo-distributed
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Global storage configuration
    storage:
      trace:
        backend: s3
        s3:
          bucket: my-tempo-traces
          endpoint: s3.amazonaws.com
          region: us-east-1
          # Use IRSA for authentication
          insecure: false

    # Distributor receives incoming traces
    distributor:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      config:
        log_received_spans:
          enabled: true
          include_all_attributes: false

    # Ingester writes traces to backend storage
    ingester:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistence:
        enabled: true
        size: 20Gi
        storageClass: gp3
      config:
        # Replication factor for trace data
        replication_factor: 2

    # Compactor merges blocks for efficient querying
    compactor:
      replicas: 1
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi
      config:
        compaction:
          # Compaction window
          compaction_window: 4h
          # Maximum block size after compaction
          max_block_bytes: 524288000
          # Block retention period
          block_retention: 336h

    # Query frontend handles search requests
    queryFrontend:
      replicas: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      config:
        search:
          # Maximum duration for search queries
          max_duration: 12h

    # Querier executes trace lookups
    querier:
      replicas: 2
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi

    # Metrics generator produces span metrics
    metricsGenerator:
      enabled: true
      replicas: 1
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      config:
        # Send generated metrics to Prometheus
        storage:
          remote_write:
            - url: http://kube-prometheus-stack-prometheus.monitoring.svc:9090/api/v1/write
        processor:
          # Generate span metrics
          span_metrics:
            dimensions:
              - service.name
              - http.method
              - http.status_code
          # Generate service graph metrics
          service_graphs:
            dimensions:
              - service.name

    # Receiver configuration for trace ingestion
    traces:
      otlp:
        grpc:
          enabled: true
        http:
          enabled: true
      jaeger:
        thriftHttp:
          enabled: true
        grpc:
          enabled: true
      zipkin:
        enabled: true

    # Global overrides for limits
    global_overrides:
      defaults:
        ingestion:
          # Maximum bytes per trace
          max_bytes_per_trace: 5000000
          # Rate limit for spans per second
          rate_strategy: local
          rate_limit_bytes: 15000000
          burst_size_bytes: 20000000
        # Maximum number of search attributes per span
        max_search_duration: 12h

    # Gateway configuration
    gateway:
      enabled: true
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Configuring OpenTelemetry SDK to Send Traces

Here is an example of how to configure an application to send traces to Tempo.

```yaml
# clusters/my-cluster/tracing/otel-config-example.yaml
# This ConfigMap shows how to configure the OTEL SDK
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: my-app
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://tempo-distributor.tracing.svc:4317"
  OTEL_EXPORTER_OTLP_PROTOCOL: "grpc"
  OTEL_SERVICE_NAME: "my-application"
  OTEL_RESOURCE_ATTRIBUTES: "deployment.environment=production,service.version=1.0.0"
```

## Setting Up Trace-Aware Ingress

Expose the Tempo distributor for external trace ingestion.

```yaml
# clusters/my-cluster/tracing/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tempo-distributor
  namespace: tracing
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Backend protocol for gRPC
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - tempo.example.com
      secretName: tempo-tls
  rules:
    - host: tempo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tempo-distributor
                port:
                  number: 4317
```

## Creating a ServiceMonitor for Tempo Metrics

Monitor Tempo itself with Prometheus.

```yaml
# clusters/my-cluster/tracing/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: tempo
  namespace: tracing
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: tempo
  endpoints:
    - port: http-metrics
      interval: 30s
      path: /metrics
```

## Flux Kustomization

```yaml
# clusters/my-cluster/tracing/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tracing-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: tracing
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/tracing
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: monitoring-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: tempo-distributed-distributor
      namespace: tracing
    - apiVersion: apps/v1
      kind: Deployment
      name: tempo-distributed-query-frontend
      namespace: tracing
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n tracing

# Verify Tempo pods are running
kubectl get pods -n tracing

# Check Tempo distributor readiness
kubectl exec -n tracing deploy/tempo-distributed-distributor -- wget -qO- http://localhost:3100/ready

# Send a test trace using curl (OTLP HTTP)
kubectl run test-trace --rm -it --image=curlimages/curl --restart=Never -- \
  curl -X POST http://tempo-distributor.tracing.svc:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"test"}}]},"scopeSpans":[{"spans":[{"traceId":"01020304050607080910111213141516","spanId":"0102030405060708","name":"test-span","startTimeUnixNano":"1700000000000000000","endTimeUnixNano":"1700000001000000000"}]}]}]}'

# Query traces via the API
kubectl port-forward -n tracing svc/tempo-distributed-query-frontend 3100:3100
# Visit http://localhost:3100/api/search?tags=service.name%3Dtest
```

## Conclusion

You now have a production-ready Grafana Tempo deployment managed by Flux CD. The setup includes distributed Tempo components for high availability, multi-format trace ingestion (OTLP, Jaeger, Zipkin), S3-backed storage for cost-effective retention, metrics generation from spans for RED metrics, and full integration with Grafana for trace visualization. All configuration is version-controlled, and Flux CD ensures your tracing infrastructure remains in the desired state.
