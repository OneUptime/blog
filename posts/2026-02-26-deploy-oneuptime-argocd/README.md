# How to Deploy OneUptime with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OneUptime, Monitoring

Description: Learn how to deploy OneUptime - the open-source observability platform - using ArgoCD for GitOps-managed monitoring, alerting, and status pages on Kubernetes.

---

OneUptime is an open-source, complete observability platform that provides monitoring, incident management, status pages, on-call management, and more in a single unified tool. Deploying OneUptime with ArgoCD lets you manage your entire observability infrastructure as code, with automated syncing, drift detection, and version-controlled configuration.

This guide covers deploying OneUptime on Kubernetes using its official Helm chart through ArgoCD, including database configuration, ingress setup, and production hardening.

## What OneUptime Provides

OneUptime replaces multiple tools by bundling several capabilities into one platform:

- **Uptime Monitoring**: HTTP, TCP, UDP, and ICMP health checks
- **Status Pages**: Public and private status pages for your services
- **Incident Management**: Incident creation, tracking, and resolution workflows
- **On-Call Management**: Schedules, escalation policies, and alerting
- **Log Management**: Centralized log collection and search
- **Traces**: Distributed tracing with OpenTelemetry support
- **Metrics**: Time-series metrics collection and visualization
- **Dashboards**: Custom dashboards for visualizing all telemetry data

Having all of these managed through ArgoCD means your entire observability stack is declared in Git and automatically kept in the desired state.

## Prerequisites

Before deploying OneUptime with ArgoCD, ensure you have:

- A Kubernetes cluster with at least 8 GB of available memory
- ArgoCD installed and configured
- A Git repository for your manifests
- A domain name configured for OneUptime access
- TLS certificates (or cert-manager for automatic provisioning)

## Repository Structure

```
observability/
  oneuptime/
    Chart.yaml
    values.yaml
    values-production.yaml
    secrets/
      sealed-secrets.yaml
```

## Creating the Wrapper Chart

```yaml
# observability/oneuptime/Chart.yaml
apiVersion: v2
name: oneuptime
description: Wrapper chart for OneUptime observability platform
type: application
version: 1.0.0
dependencies:
  - name: oneuptime
    version: "7.0.0"
    repository: "https://helm-chart.oneuptime.com"
```

## Configuring OneUptime

```yaml
# observability/oneuptime/values.yaml
oneuptime:
  # Global settings
  global:
    # Your domain for accessing OneUptime
    host: oneuptime.example.com
    # HTTP protocol
    httpProtocol: https

  # Deployment configuration
  deployment:
    # Enable all OneUptime components
    replicaCount: 1

  # PostgreSQL database
  postgresql:
    enabled: true
    auth:
      existingSecret: oneuptime-postgresql-credentials
      secretKeys:
        adminPasswordKey: postgres-password
    primary:
      persistence:
        enabled: true
        size: 50Gi
        storageClass: gp3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          memory: 2Gi

  # Redis
  redis:
    enabled: true
    auth:
      existingSecret: oneuptime-redis-credentials
      existingSecretPasswordKey: redis-password
    master:
      persistence:
        enabled: true
        size: 10Gi
        storageClass: gp3

  # ClickHouse for logs, traces, and metrics
  clickhouse:
    enabled: true
    persistence:
      enabled: true
      size: 100Gi
      storageClass: gp3
    resources:
      requests:
        cpu: 1
        memory: 4Gi
      limits:
        memory: 8Gi

  # Ingress configuration
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/proxy-body-size: "50m"
      nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
      nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    hosts:
      - host: oneuptime.example.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: oneuptime-tls
        hosts:
          - oneuptime.example.com
```

## Production Configuration

Create a production-specific values file with higher resource allocations and replica counts.

```yaml
# observability/oneuptime/values-production.yaml
oneuptime:
  deployment:
    replicaCount: 2

  # Scale PostgreSQL for production
  postgresql:
    primary:
      resources:
        requests:
          cpu: 1
          memory: 2Gi
        limits:
          memory: 4Gi

  # Scale ClickHouse for production
  clickhouse:
    resources:
      requests:
        cpu: 2
        memory: 8Gi
      limits:
        memory: 16Gi
```

## Creating the ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: oneuptime
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: observability
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: observability/oneuptime
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: oneuptime
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
        duration: 10s
        factor: 2
        maxDuration: 5m
  ignoreDifferences:
    - group: apps
      kind: StatefulSet
      jqPathExpressions:
        - '.spec.volumeClaimTemplates[]?.spec.resources'
```

## Managing Secrets

Never store database passwords or API keys in plain text. Use Sealed Secrets or an external secrets operator.

```yaml
# Sealed Secret for PostgreSQL credentials
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: oneuptime-postgresql-credentials
  namespace: oneuptime
spec:
  encryptedData:
    postgres-password: AgBy3i4OJSWK+PiTySYZZA9r...
  template:
    metadata:
      name: oneuptime-postgresql-credentials
      namespace: oneuptime
```

```yaml
# Sealed Secret for Redis credentials
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: oneuptime-redis-credentials
  namespace: oneuptime
spec:
  encryptedData:
    redis-password: AgBy3i4OJSWK+PiTySYZZA9r...
  template:
    metadata:
      name: oneuptime-redis-credentials
      namespace: oneuptime
```

## Setting Up the ArgoCD AppProject

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: observability
  namespace: argocd
spec:
  description: Observability platform applications
  sourceRepos:
    - https://github.com/your-org/gitops-repo.git
  destinations:
    - namespace: oneuptime
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
```

## Configuring OpenTelemetry to Send Data to OneUptime

OneUptime accepts OpenTelemetry data natively. Configure your applications to send traces, logs, and metrics to OneUptime's OTLP endpoint.

```yaml
# OpenTelemetry Collector configuration
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: observability
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
      otlp/oneuptime:
        endpoint: oneuptime.oneuptime.svc.cluster.local:4317
        tls:
          insecure: true
        headers:
          x-oneuptime-service-token: "your-service-token"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/oneuptime]
        logs:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/oneuptime]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/oneuptime]
```

## Verifying the Deployment

```bash
# Check all OneUptime pods
kubectl get pods -n oneuptime

# Check the database is running
kubectl get pods -n oneuptime -l app.kubernetes.io/name=postgresql

# Verify the ingress is configured
kubectl get ingress -n oneuptime

# Access the OneUptime dashboard
# Navigate to https://oneuptime.example.com in your browser

# Check ArgoCD sync status
argocd app get oneuptime
```

## Backup Strategy

For production deployments, configure regular backups of the PostgreSQL and ClickHouse databases. You can use Velero managed through ArgoCD for cluster-level backups.

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: oneuptime-db-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
      - oneuptime
    includedResources:
      - persistentvolumeclaims
      - persistentvolumes
    snapshotVolumes: true
    storageLocation: aws-backups
    ttl: 720h  # 30 days retention
```

## Summary

Deploying OneUptime with ArgoCD gives you a complete observability platform - monitoring, incident management, status pages, logs, traces, and metrics - all managed through GitOps. The key considerations are properly sizing the database backends (PostgreSQL and ClickHouse), managing secrets securely, and configuring reliable ingress with TLS. With ArgoCD handling the deployment lifecycle, your observability platform becomes as auditable and reproducible as the applications it monitors.
