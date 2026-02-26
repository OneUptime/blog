# How to Deploy OpenTelemetry Operator with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OpenTelemetry, Observability

Description: Learn how to deploy the OpenTelemetry Operator using ArgoCD for GitOps-managed collector configuration, auto-instrumentation, and telemetry pipelines on Kubernetes.

---

The OpenTelemetry Operator is a Kubernetes operator that manages OpenTelemetry Collectors, auto-instrumentation agents, and the target allocator for Prometheus scraping. Deploying it with ArgoCD gives you a GitOps-managed telemetry pipeline where collectors and instrumentation are declared in Git, automatically synced, and self-healing.

This guide covers deploying the operator itself, creating collector instances, setting up auto-instrumentation for applications, and managing the full lifecycle through ArgoCD.

## What the OpenTelemetry Operator Manages

The operator introduces three custom resources:

- **OpenTelemetryCollector**: Defines a collector instance with its configuration, deployment mode, and scaling
- **Instrumentation**: Configures auto-instrumentation for applications in supported languages (Java, Python, Node.js, .NET, Go)
- **OpAMPBridge**: Connects collectors to an OpAMP server for remote management

## Repository Structure

```
telemetry/
  opentelemetry-operator/
    Chart.yaml
    values.yaml
  collectors/
    cluster-collector.yaml
    gateway-collector.yaml
  instrumentation/
    java-instrumentation.yaml
    python-instrumentation.yaml
    nodejs-instrumentation.yaml
```

## Deploying the Operator

### Creating the Wrapper Chart

```yaml
# telemetry/opentelemetry-operator/Chart.yaml
apiVersion: v2
name: opentelemetry-operator
description: Wrapper chart for OpenTelemetry Operator
type: application
version: 1.0.0
dependencies:
  - name: opentelemetry-operator
    version: "0.74.0"
    repository: "https://open-telemetry.github.io/opentelemetry-helm-charts"
```

### Operator Values

```yaml
# telemetry/opentelemetry-operator/values.yaml
opentelemetry-operator:
  # Manager configuration
  manager:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

    # Enable feature gates
    featureGates: "operator.autoinstrumentation.go,operator.autoinstrumentation.nginx"

    # Collector image to use by default
    collectorImage:
      repository: otel/opentelemetry-collector-contrib
      tag: 0.112.0

  # Admission webhooks
  admissionWebhooks:
    certManager:
      enabled: true

  # ServiceMonitor for operator metrics
  serviceMonitor:
    enabled: true
    extraLabels:
      release: kube-prometheus-stack

  # Install CRDs
  crds:
    create: true
```

### ArgoCD Application for the Operator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: opentelemetry-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: telemetry
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: telemetry/opentelemetry-operator
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: opentelemetry-system
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
  ignoreDifferences:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
```

## Creating Collector Instances

Once the operator is running, create OpenTelemetryCollector resources to deploy actual collectors.

### Cluster-Level DaemonSet Collector

This collector runs on every node and collects telemetry from all pods.

```yaml
# telemetry/collectors/cluster-collector.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: cluster-collector
  namespace: opentelemetry-system
spec:
  mode: daemonset
  image: otel/opentelemetry-collector-contrib:0.112.0

  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      memory: 512Mi

  tolerations:
    - effect: NoSchedule
      operator: Exists

  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName

  config:
    receivers:
      # Receive OTLP from applications
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Collect container logs
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        exclude:
          - /var/log/pods/*/otc-container/*.log
        start_at: end
        include_file_path: true
        include_file_name: false
        operators:
          - type: router
            id: get-format
            routes:
              - output: parser-docker
                expr: 'body matches "^\\{"'
              - output: parser-crio
                expr: 'body matches "^[^ Z]+ "'
          - type: json_parser
            id: parser-docker
            output: extract_metadata
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - type: regex_parser
            id: parser-crio
            regex: '^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            output: extract_metadata
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%L%j'
          - type: move
            id: extract_metadata
            from: attributes.log
            to: body

      # Collect Kubernetes events
      k8s_events:
        namespaces: []

    processors:
      batch:
        timeout: 5s
        send_batch_size: 1000

      # Add Kubernetes metadata
      k8sattributes:
        auth_type: "serviceAccount"
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.deployment.name
            - k8s.node.name
            - k8s.container.name
          labels:
            - tag_name: app
              key: app.kubernetes.io/name
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.ip
          - sources:
              - from: connection

      # Filter sensitive data
      filter:
        error_mode: ignore
        logs:
          exclude:
            match_type: regexp
            bodies:
              - '.*password.*'
              - '.*secret.*'

      memory_limiter:
        check_interval: 5s
        limit_mib: 400
        spike_limit_mib: 100

    exporters:
      otlp/gateway:
        endpoint: otel-gateway-collector.opentelemetry-system.svc.cluster.local:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/gateway]
        logs:
          receivers: [filelog, k8s_events]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/gateway]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/gateway]
```

### Gateway Collector

The gateway receives telemetry from DaemonSet collectors and routes it to backends.

```yaml
# telemetry/collectors/gateway-collector.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: opentelemetry-system
spec:
  mode: deployment
  replicas: 2
  image: otel/opentelemetry-collector-contrib:0.112.0

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      memory: 2Gi

  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 10s
        send_batch_size: 5000

      # Tail-based sampling for traces
      tail_sampling:
        decision_wait: 10s
        policies:
          - name: error-policy
            type: status_code
            status_code:
              status_codes: [ERROR]
          - name: slow-policy
            type: latency
            latency:
              threshold_ms: 1000
          - name: probabilistic-policy
            type: probabilistic
            probabilistic:
              sampling_percentage: 10

    exporters:
      otlp/tempo:
        endpoint: tempo-distributor.tracing.svc.cluster.local:4317
        tls:
          insecure: true
      otlp/loki:
        endpoint: loki-gateway.logging.svc.cluster.local:3100
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: http://mimir-nginx.metrics.svc.cluster.local/api/v1/push

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [tail_sampling, batch]
          exporters: [otlp/tempo]
        logs:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/loki]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [prometheusremotewrite]
```

## Setting Up Auto-Instrumentation

The operator can automatically inject instrumentation sidecars into your application pods.

```yaml
# telemetry/instrumentation/java-instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: java-instrumentation
  namespace: opentelemetry-system
spec:
  exporter:
    endpoint: http://cluster-collector-collector.opentelemetry-system.svc.cluster.local:4317
  propagators:
    - tracecontext
    - baggage
    - b3
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:2.10.0
```

To instrument a Java application, add an annotation to the pod spec.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-java-app
spec:
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-java: "opentelemetry-system/java-instrumentation"
```

## Creating the ArgoCD Application for Collectors

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: otel-collectors
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  project: telemetry
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: telemetry/collectors
  destination:
    server: https://kubernetes.default.svc
    namespace: opentelemetry-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Verifying the Deployment

```bash
# Check operator pods
kubectl get pods -n opentelemetry-system -l app.kubernetes.io/name=opentelemetry-operator

# Check collector instances
kubectl get opentelemetrycollectors -n opentelemetry-system

# Check instrumentation resources
kubectl get instrumentation -A

# Verify collectors are receiving data
kubectl logs -n opentelemetry-system -l app.kubernetes.io/component=opentelemetry-collector --tail=50
```

## Summary

The OpenTelemetry Operator with ArgoCD provides a powerful combination for managing your telemetry infrastructure as code. The operator handles the lifecycle of collectors and auto-instrumentation, while ArgoCD ensures everything stays in sync with Git. This pattern lets you evolve your telemetry pipeline through pull requests, with full review and rollback capabilities.
