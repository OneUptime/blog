# How to Deploy Loki Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, loki, grafana loki, kubernetes, gitops, logging, observability, promtail

Description: A practical guide to deploying the Grafana Loki logging stack on Kubernetes using Flux CD for GitOps-managed log aggregation.

---

## Introduction

Grafana Loki is a horizontally scalable, highly available log aggregation system inspired by Prometheus. Unlike traditional log aggregation tools, Loki indexes only metadata (labels) rather than the full text of log lines, making it cost-effective and efficient.

This guide walks you through deploying the complete Loki stack -- including Loki, Promtail, and related components -- using Flux CD.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- An S3-compatible object storage bucket (for production deployments)

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/logging/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Creating the Logging Namespace

```yaml
# clusters/my-cluster/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying Loki in Scalable Mode

For production use, deploy Loki in its microservices (scalable) mode with object storage.

```yaml
# clusters/my-cluster/logging/loki.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: loki
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: loki
      version: "6.x"
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
    # Deploy in scalable single binary mode
    deploymentMode: SimpleScalable

    loki:
      # Authentication disabled for internal use
      auth_enabled: false

      # Schema configuration
      schemaConfig:
        configs:
          - from: "2024-04-01"
            store: tsdb
            object_store: s3
            schema: v13
            index:
              prefix: loki_index_
              period: 24h

      # Storage configuration for S3
      storage:
        type: s3
        s3:
          endpoint: s3.amazonaws.com
          region: us-east-1
          bucketnames: my-loki-logs
          # Use IRSA or instance profiles for auth
          insecure: false
          sse_encryption: true
        bucketNames:
          chunks: my-loki-chunks
          ruler: my-loki-ruler
          admin: my-loki-admin

      # Ingestion limits
      limits_config:
        # Maximum log line size
        max_line_size: 256000
        # Ingestion rate limit per tenant
        ingestion_rate_mb: 10
        ingestion_burst_size_mb: 20
        # Maximum number of streams per tenant
        max_global_streams_per_user: 10000
        # Retention period
        retention_period: 720h

      # Compactor configuration for retention
      compactor:
        working_directory: /var/loki/compactor
        compaction_interval: 10m
        retention_enabled: true
        retention_delete_delay: 2h
        delete_request_store: s3

    # Read component scaling
    read:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi

    # Write component scaling
    write:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistence:
        size: 20Gi
        storageClass: gp3

    # Backend component scaling
    backend:
      replicas: 2
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi
      persistence:
        size: 10Gi
        storageClass: gp3

    # Gateway configuration
    gateway:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi

    # Disable built-in monitoring for now
    monitoring:
      selfMonitoring:
        enabled: false
      lokiCanary:
        enabled: false
```

## Deploying Promtail for Log Collection

Promtail is the agent that ships logs from your nodes to Loki.

```yaml
# clusters/my-cluster/logging/promtail.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: promtail
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: promtail
      version: "6.x"
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
    config:
      # Loki endpoint
      clients:
        - url: http://loki-gateway.logging.svc:80/loki/api/v1/push
          # Tenant ID (if multi-tenancy is enabled)
          # tenant_id: default

      snippets:
        # Pipeline stages for log processing
        pipelineStages:
          # Extract container runtime logs
          - cri: {}
          # Drop debug logs to reduce volume
          - match:
              selector: '{app="noisy-app"}'
              stages:
                - drop:
                    expression: ".*DEBUG.*"
          # Parse JSON logs and extract labels
          - match:
              selector: '{app=~"api-.*"}'
              stages:
                - json:
                    expressions:
                      level: level
                      method: method
                      status_code: status_code
                - labels:
                    level:
                    method:

        # Additional scrape configs
        extraScrapeConfigs: |
          # Scrape systemd journal logs
          - job_name: journal
            journal:
              max_age: 12h
              labels:
                job: systemd-journal
            relabel_configs:
              - source_labels: ['__journal__systemd_unit']
                target_label: 'unit'

    # Resource limits for Promtail
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Tolerate all taints to run on every node
    tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists

    # Mount additional volumes for log collection
    extraVolumes:
      - name: journal
        hostPath:
          path: /var/log/journal
    extraVolumeMounts:
      - name: journal
        mountPath: /var/log/journal
        readOnly: true
```

## Configuring S3 Credentials

Store object storage credentials in a Kubernetes Secret.

```yaml
# clusters/my-cluster/logging/s3-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: loki-s3-credentials
  namespace: logging
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
```

Encrypt before committing:

```bash
# Encrypt with SOPS
sops --encrypt \
  --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --encrypted-regex '^(data|stringData)$' \
  --in-place clusters/my-cluster/logging/s3-credentials.yaml
```

## Flux Kustomization

```yaml
# clusters/my-cluster/logging/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: logging-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: logging
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/logging
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: loki-gateway
      namespace: logging
```

## Setting Up Log-Based Alerts with Ruler

Configure Loki ruler to generate alerts from log queries.

```yaml
# clusters/my-cluster/logging/ruler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-ruler-config
  namespace: logging
data:
  rules.yaml: |
    groups:
      - name: application-log-alerts
        rules:
          # Alert on high error rate in logs
          - alert: HighErrorRate
            expr: |
              sum(rate({namespace="production"} |= "ERROR" [5m])) by (app)
              /
              sum(rate({namespace="production"} [5m])) by (app)
              > 0.05
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "High error rate in {{ $labels.app }}"

          # Alert on out-of-memory errors
          - alert: OOMKilled
            expr: |
              count_over_time({namespace=~".+"} |= "OOMKilled" [5m]) > 0
            for: 1m
            labels:
              severity: critical
            annotations:
              summary: "OOM kill detected in logs"
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n logging

# Verify Loki pods are running
kubectl get pods -n logging -l app.kubernetes.io/name=loki

# Verify Promtail is running on all nodes
kubectl get pods -n logging -l app.kubernetes.io/name=promtail -o wide

# Check Loki readiness
kubectl exec -n logging svc/loki-gateway -- wget -qO- http://localhost:80/ready

# Test log ingestion with logcli
kubectl port-forward -n logging svc/loki-gateway 3100:80
# In another terminal:
# logcli query '{namespace="logging"}' --addr=http://localhost:3100

# Check Loki ring status
kubectl port-forward -n logging svc/loki-write 3100:3100
# Visit http://localhost:3100/ring in a browser
```

## Conclusion

You now have a production-ready Loki logging stack managed entirely through Flux CD. The setup includes scalable Loki components with S3-backed storage, Promtail agents on every node for log collection, log processing pipelines for parsing and filtering, and log-based alerting through the Loki ruler. All configuration is version-controlled and automatically reconciled, ensuring your logging infrastructure stays consistent with your desired state in Git.
