# How to Implement GitOps for OpenTelemetry Collector Configuration with ArgoCD and Helm Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GitOps, ArgoCD, Helm

Description: Implement a GitOps workflow for OpenTelemetry Collector configuration using ArgoCD and Helm charts for automated deployments.

GitOps means your Git repository is the single source of truth for your infrastructure state. When you change a Collector configuration in Git, ArgoCD detects the change and automatically applies it to your cluster. No more SSH-ing into servers to tweak configs. No more "who changed this and when" questions. This post covers setting up a full GitOps pipeline for OpenTelemetry Collector management.

## Repository Structure

Organize your Git repository to separate base configurations from environment-specific overrides:

```
otel-gitops/
  charts/
    otel-collector/
      Chart.yaml
      values.yaml
      templates/
        configmap.yaml
        daemonset.yaml
        service.yaml
  environments/
    production/
      values.yaml
    staging/
      values.yaml
    development/
      values.yaml
  argocd/
    applications.yaml
```

## Helm Chart for the Collector

Create a Helm chart that templates the Collector configuration:

```yaml
# charts/otel-collector/Chart.yaml
apiVersion: v2
name: otel-collector
description: OpenTelemetry Collector Helm chart
version: 1.0.0
appVersion: "0.96.0"
```

```yaml
# charts/otel-collector/values.yaml
image:
  repository: otel/opentelemetry-collector-contrib
  tag: "0.96.0"

mode: daemonset  # or deployment for gateway

resources:
  limits:
    cpu: "1"
    memory: "2Gi"
  requests:
    cpu: "200m"
    memory: "256Mi"

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
      send_batch_size: 4096
      timeout: 1s

  exporters:
    otlphttp:
      endpoint: https://backend:4318

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [batch]
        exporters: [otlphttp]
      metrics:
        receivers: [otlp]
        processors: [batch]
        exporters: [otlphttp]
      logs:
        receivers: [otlp]
        processors: [batch]
        exporters: [otlphttp]
```

```yaml
# charts/otel-collector/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
  namespace: {{ .Release.Namespace }}
data:
  config.yaml: |
{{ .Values.config | toYaml | indent 4 }}
```

```yaml
# charts/otel-collector/templates/daemonset.yaml
{{- if eq .Values.mode "daemonset" }}
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: {{ .Release.Name }}
  namespace: {{ .Release.Namespace }}
  labels:
    app: otel-collector
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        # Force rollout when config changes
        checksum/config: {{ .Values.config | toYaml | sha256sum }}
    spec:
      containers:
        - name: otel-collector
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          args: ["--config", "/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
          resources:
{{ toYaml .Values.resources | indent 12 }}
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: {{ .Release.Name }}-config
{{- end }}
```

## Environment-Specific Overrides

```yaml
# environments/production/values.yaml
image:
  tag: "0.96.0"

resources:
  limits:
    cpu: "2"
    memory: "4Gi"

config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
  processors:
    batch:
      send_batch_size: 8192
      timeout: 2s
    memory_limiter:
      check_interval: 5s
      limit_mib: 3072
  exporters:
    otlphttp:
      endpoint: https://prod-backend.internal:4318
      headers:
        Authorization: "Bearer ${OTEL_AUTH_TOKEN}"
  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [memory_limiter, batch]
        exporters: [otlphttp]
```

```yaml
# environments/staging/values.yaml
image:
  tag: "0.97.0-rc1"  # Test new versions in staging first

resources:
  limits:
    cpu: "500m"
    memory: "1Gi"

config:
  exporters:
    otlphttp:
      endpoint: https://staging-backend.internal:4318
    debug:
      verbosity: detailed
  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [batch]
        exporters: [otlphttp, debug]
```

## ArgoCD Application Definitions

```yaml
# argocd/applications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: otel-collector-production
  namespace: argocd
spec:
  project: observability
  source:
    repoURL: https://github.com/yourorg/otel-gitops.git
    targetRevision: main
    path: charts/otel-collector
    helm:
      valueFiles:
        - ../../environments/production/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: observability
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: otel-collector-staging
  namespace: argocd
spec:
  project: observability
  source:
    repoURL: https://github.com/yourorg/otel-gitops.git
    targetRevision: main
    path: charts/otel-collector
    helm:
      valueFiles:
        - ../../environments/staging/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: observability-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Workflow

The GitOps workflow now looks like this:

1. Engineer opens a PR to change a Collector config in the `environments/` directory.
2. CI runs validation (YAML lint, Helm template rendering, config validation).
3. PR is reviewed and merged to `main`.
4. ArgoCD detects the change and syncs the new config to the cluster.
5. The DaemonSet rolls out new pods with the updated ConfigMap (thanks to the `sha256sum` annotation).

## Wrapping Up

GitOps with ArgoCD gives you an auditable, automated pipeline for managing OpenTelemetry Collector configuration. Every change goes through code review, every deployment is tracked in Git history, and ArgoCD ensures the cluster state always matches what is defined in the repository.
