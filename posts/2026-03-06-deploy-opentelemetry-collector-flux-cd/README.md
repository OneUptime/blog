# How to Deploy OpenTelemetry Collector with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, opentelemetry, otel, kubernetes, gitops, traces, metrics, logs, observability

Description: A practical guide to deploying the OpenTelemetry Collector on Kubernetes using Flux CD for unified telemetry collection.

---

## Introduction

The OpenTelemetry Collector is a vendor-agnostic proxy that can receive, process, and export telemetry data (traces, metrics, and logs). It serves as a central hub in your observability pipeline, decoupling your applications from specific backends. With Flux CD, you can manage the entire collector configuration through GitOps.

This guide covers deploying the OpenTelemetry Collector in multiple modes -- as a DaemonSet for node-level collection and as a Deployment for aggregation -- using Flux CD.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Backend services (Prometheus, Loki, Tempo) for exporting telemetry

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/otel/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: open-telemetry
  namespace: flux-system
spec:
  interval: 1h
  url: https://open-telemetry.github.io/opentelemetry-helm-charts
```

## Creating the Namespace

```yaml
# clusters/my-cluster/otel/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: opentelemetry
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying the OpenTelemetry Operator

The operator manages OpenTelemetryCollector custom resources.

```yaml
# clusters/my-cluster/otel/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: opentelemetry-operator
  namespace: opentelemetry
spec:
  interval: 30m
  chart:
    spec:
      chart: opentelemetry-operator
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: open-telemetry
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Operator resource limits
    manager:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
    # Enable admission webhooks
    admissionWebhooks:
      certManager:
        enabled: true
    # Watch all namespaces
    manager:
      collectorImage:
        repository: otel/opentelemetry-collector-contrib
```

## Deploying the Collector as a DaemonSet (Agent Mode)

Deploy a collector on every node to gather local telemetry.

```yaml
# clusters/my-cluster/otel/collector-agent.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-agent
  namespace: opentelemetry
spec:
  mode: daemonset
  image: otel/opentelemetry-collector-contrib:0.100.0
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  # Tolerate all taints to run on every node
  tolerations:
    - operator: Exists
  # Mount host filesystem for log collection
  volumeMounts:
    - name: varlog
      mountPath: /var/log
      readOnly: true
    - name: varlibdockercontainers
      mountPath: /var/lib/docker/containers
      readOnly: true
  volumes:
    - name: varlog
      hostPath:
        path: /var/log
    - name: varlibdockercontainers
      hostPath:
        path: /var/lib/docker/containers
  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
  config:
    # Receivers - how data gets into the collector
    receivers:
      # OTLP receiver for application traces and metrics
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Host metrics receiver
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu: {}
          disk: {}
          filesystem: {}
          load: {}
          memory: {}
          network: {}

      # Kubernetes events receiver
      k8s_events:
        namespaces: []

      # Filelog receiver for container logs
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        exclude:
          - /var/log/pods/*/otc-container/*.log
        start_at: end
        include_file_path: true
        include_file_name: false
        operators:
          # Parse container runtime logs
          - type: router
            id: get-format
            routes:
              - output: parser-containerd
                expr: 'body matches "^[^ Z]+Z"'
          - type: regex_parser
            id: parser-containerd
            regex: '^(?P<time>[^ Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'

    # Processors - transform data in the pipeline
    processors:
      # Add memory limiter to prevent OOM
      memory_limiter:
        check_interval: 5s
        limit_percentage: 80
        spike_limit_percentage: 25

      # Batch processor for efficient exports
      batch:
        send_batch_size: 8192
        send_batch_max_size: 10000
        timeout: 5s

      # Add Kubernetes metadata
      k8sattributes:
        auth_type: "serviceAccount"
        passthrough: false
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.statefulset.name
            - k8s.daemonset.name
            - k8s.job.name
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.node.name
            - k8s.container.name
          labels:
            - tag_name: app
              key: app
              from: pod
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.ip
          - sources:
              - from: connection

      # Resource detection
      resourcedetection:
        detectors:
          - env
          - system
          - k8snode
        timeout: 5s
        override: false

    # Exporters - where data gets sent
    exporters:
      # Forward to the gateway collector
      otlp/gateway:
        endpoint: otel-gateway-collector.opentelemetry.svc:4317
        tls:
          insecure: true

      # Debug exporter for troubleshooting
      debug:
        verbosity: basic

    # Service - wire receivers, processors, and exporters
    service:
      pipelines:
        # Traces pipeline
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, resourcedetection, batch]
          exporters: [otlp/gateway]
        # Metrics pipeline
        metrics:
          receivers: [otlp, hostmetrics]
          processors: [memory_limiter, k8sattributes, resourcedetection, batch]
          exporters: [otlp/gateway]
        # Logs pipeline
        logs:
          receivers: [filelog, k8s_events]
          processors: [memory_limiter, k8sattributes, resourcedetection, batch]
          exporters: [otlp/gateway]
```

## Deploying the Collector as a Gateway (Aggregation Mode)

Deploy a central gateway that receives from agents and exports to backends.

```yaml
# clusters/my-cluster/otel/collector-gateway.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: opentelemetry
spec:
  mode: deployment
  replicas: 3
  image: otel/opentelemetry-collector-contrib:0.100.0
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      memory_limiter:
        check_interval: 5s
        limit_percentage: 80
        spike_limit_percentage: 25

      batch:
        send_batch_size: 8192
        timeout: 5s

      # Tail sampling for traces - keep only important traces
      tail_sampling:
        decision_wait: 30s
        num_traces: 100000
        policies:
          # Always keep error traces
          - name: errors
            type: status_code
            status_code:
              status_codes:
                - ERROR
          # Always keep slow traces
          - name: slow-traces
            type: latency
            latency:
              threshold_ms: 1000
          # Sample 10% of remaining traces
          - name: probabilistic
            type: probabilistic
            probabilistic:
              sampling_percentage: 10

    exporters:
      # Export traces to Tempo
      otlp/tempo:
        endpoint: tempo-distributor.tracing.svc:4317
        tls:
          insecure: true

      # Export metrics to Prometheus
      prometheusremotewrite:
        endpoint: http://kube-prometheus-stack-prometheus.monitoring.svc:9090/api/v1/write
        resource_to_telemetry_conversion:
          enabled: true

      # Export logs to Loki
      loki:
        endpoint: http://loki-gateway.logging.svc:80/loki/api/v1/push
        default_labels_enabled:
          exporter: true
          job: true
          instance: true
          level: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, tail_sampling, batch]
          exporters: [otlp/tempo]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [loki]
```

## Setting Up Auto-Instrumentation

The operator can automatically inject instrumentation into your applications.

```yaml
# clusters/my-cluster/otel/auto-instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: auto-instrumentation
  namespace: opentelemetry
spec:
  # Endpoint for the collector agent
  exporter:
    endpoint: http://otel-agent-collector.opentelemetry.svc:4317
  propagators:
    - tracecontext
    - baggage
    - b3
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
  # Language-specific configuration
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
```

To enable auto-instrumentation, add an annotation to your pod:

```yaml
# Example application deployment with auto-instrumentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-java-app
spec:
  template:
    metadata:
      annotations:
        # Inject Java instrumentation
        instrumentation.opentelemetry.io/inject-java: "opentelemetry/auto-instrumentation"
```

## Flux Kustomization

```yaml
# clusters/my-cluster/otel/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: otel-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: opentelemetry
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/otel
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: monitoring-stack
    - name: logging-stack
    - name: tracing-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: opentelemetry-operator-controller-manager
      namespace: opentelemetry
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n opentelemetry

# Verify operator is running
kubectl get pods -n opentelemetry -l app.kubernetes.io/name=opentelemetry-operator

# Check collector instances
kubectl get opentelemetrycollectors -n opentelemetry

# Verify agent DaemonSet
kubectl get ds -n opentelemetry

# Verify gateway Deployment
kubectl get deploy -n opentelemetry

# Check collector logs
kubectl logs -n opentelemetry -l app.kubernetes.io/component=opentelemetry-collector --tail=20

# Verify auto-instrumentation resources
kubectl get instrumentation -n opentelemetry
```

## Conclusion

You now have a complete OpenTelemetry Collector deployment managed by Flux CD. The architecture includes DaemonSet agents on every node for local collection, a gateway deployment for centralized processing and routing, tail-based sampling for cost-effective trace storage, auto-instrumentation for zero-code observability, and unified pipelines for traces, metrics, and logs. This setup decouples your applications from backend-specific exporters, allowing you to change observability backends without modifying application code.
