# How to Deploy PLG Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Loki, Grafana, Promtail, PLG

Description: Deploy Promtail, Loki, and Grafana (PLG) logging stack to Kubernetes using Flux CD for lightweight GitOps-managed log aggregation.

---

## Introduction

The PLG stack — Promtail, Loki, and Grafana — is a lightweight, cost-effective alternative to the ELK stack for Kubernetes log aggregation. Loki indexes only log metadata (labels) rather than full log content, making it dramatically cheaper to operate at scale. Promtail runs as a DaemonSet and ships logs from every node directly to Loki. Grafana, which your team likely already uses for metrics, doubles as the query and visualization frontend.

Flux CD is a natural fit for managing the PLG stack because all three components are available as Helm charts through the Grafana chart repository. Pinning chart versions and values in Git ensures your logging configuration is auditable and reproducible across staging and production clusters.

This guide deploys Loki in simple scalable mode, Promtail as a DaemonSet, and connects Grafana with a pre-configured Loki datasource — all via Flux HelmRelease resources.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed
- Grafana Helm repository access
- Object storage (S3 or GCS) for Loki chunk storage in production (this example uses filesystem for simplicity)

## Step 1: Add the Grafana HelmRepository

```yaml
# infrastructure/sources/grafana-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

```yaml
# infrastructure/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Deploy Loki

Deploy Loki in single-binary mode suitable for small to medium clusters. For production, switch `deploymentMode` to `SimpleScalable` and configure object storage.

```yaml
# infrastructure/logging/loki.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: loki
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: loki
      version: "6.6.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    deploymentMode: SingleBinary
    loki:
      auth_enabled: false
      commonConfig:
        replication_factor: 1
      storage:
        type: filesystem
      schemaConfig:
        configs:
          - from: "2024-01-01"
            store: tsdb
            object_store: filesystem
            schema: v13
            index:
              prefix: loki_index_
              period: 24h
    singleBinary:
      replicas: 1
      persistence:
        enabled: true
        size: 20Gi
    gateway:
      enabled: true
```

## Step 3: Deploy Promtail

Promtail is deployed as a DaemonSet and automatically discovers pod logs using Kubernetes service discovery.

```yaml
# infrastructure/logging/promtail.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: promtail
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: promtail
      version: "6.15.5"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    config:
      clients:
        - url: http://loki-gateway.logging.svc.cluster.local/loki/api/v1/push
      snippets:
        pipelineStages:
          - cri: {}
          # Parse JSON application logs
          - json:
              expressions:
                level: level
                msg: message
          - labels:
              level:
    resources:
      requests:
        cpu: "50m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
    tolerations:
      # Run on all nodes including control-plane
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
```

## Step 4: Deploy Grafana with Loki Datasource

Pre-configure the Loki datasource so Grafana is ready to query logs immediately after deployment.

```yaml
# infrastructure/logging/grafana.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: grafana
      version: "7.3.7"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    adminPassword: "changeme"  # Use a Secret reference in production
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          - name: Loki
            type: loki
            url: http://loki-gateway.logging.svc.cluster.local
            access: proxy
            isDefault: true
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: nginx
      hosts:
        - grafana.example.com
    persistence:
      enabled: true
      size: 5Gi
```

## Step 5: Organize with a Flux Kustomization

```yaml
# clusters/production/logging-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: plg-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: grafana
      namespace: logging
```

## Step 6: Verify Log Collection

```bash
# Confirm all components reconciled successfully
flux get helmreleases -n logging

# Check Promtail is running on every node
kubectl get daemonset promtail -n logging

# Open Grafana and run a LogQL query
kubectl port-forward svc/grafana 3000:80 -n logging
# Navigate to Explore → Loki → run: {namespace="default"}
```

## Best Practices

- For production, configure Loki with S3 or GCS object storage to decouple storage from the pod lifecycle.
- Use Loki's `limits_config` to set per-tenant ingestion rate limits and prevent a single noisy application from overwhelming the stack.
- Store the Grafana admin password in a Kubernetes Secret and reference it with `adminPasswordSecretKeyRef` in the chart values.
- Add Flux `dependsOn` so Promtail only starts after Loki is healthy and ready to accept pushes.
- Create Grafana dashboards as ConfigMaps in Git using the `grafana.sidecar.dashboards` feature for full GitOps control over your dashboards.

## Conclusion

The PLG stack managed by Flux CD provides a lean, cost-effective logging solution that integrates naturally with a Prometheus and Grafana observability stack. Because Loki stores only labels rather than full-text indexes, your storage costs are a fraction of Elasticsearch. Every configuration change — from Promtail pipeline stages to Loki schema settings — is tracked in Git and applied automatically by Flux, giving your team the audit trail and rollback capabilities that production systems demand.
