# Deploy kube-prometheus-stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Prometheus, Grafana, Alertmanager, kube-prometheus-stack, Flux CD, GitOps, Kubernetes, Monitoring

Description: Deploy the full kube-prometheus-stack (Prometheus, Grafana, Alertmanager, and exporters) on Kubernetes using Flux CD. This guide covers HelmRelease configuration, persistent storage, alerting rules, and GitOps best practices.

---

## Introduction

The kube-prometheus-stack Helm chart is the de facto standard for deploying a complete Kubernetes monitoring stack. It bundles Prometheus Operator, Prometheus, Grafana, Alertmanager, kube-state-metrics, node-exporter, and a comprehensive set of pre-built dashboards and alert rules in a single chart.

Deploying it via Flux CD gives you a GitOps-managed observability platform where every Prometheus rule, Grafana dashboard, and Alertmanager receiver is version-controlled. Changes go through your normal code review workflow before being applied to the cluster.

This guide walks through deploying kube-prometheus-stack with persistent storage, custom alert rules, and a Slack notification channel.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- A StorageClass that supports `ReadWriteOnce` PVCs (for Prometheus and Grafana persistence)
- A Slack webhook URL for alert notifications
- `flux` and `kubectl` CLIs installed

## Step 1: Create the Alertmanager Slack Secret

Store the Slack webhook URL in an encrypted Secret.

```yaml
# clusters/my-cluster/monitoring/alertmanager-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-slack-webhook
  namespace: monitoring
type: Opaque
stringData:
  # Slack incoming webhook URL — encrypt with SOPS before committing
  slack_api_url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

## Step 2: Add the Prometheus Community HelmRepository

```yaml
# clusters/my-cluster/monitoring/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 12h
  url: https://prometheus-community.github.io/helm-charts
```

## Step 3: Deploy kube-prometheus-stack via HelmRelease

Configure the stack with persistent storage, Slack alerting, and production-ready defaults.

```yaml
# clusters/my-cluster/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=55.0.0 <56.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    # Prometheus configuration
    prometheus:
      prometheusSpec:
        # Retain 30 days of metrics
        retention: 30d
        retentionSize: "50GB"
        # Persistent storage for Prometheus data
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: fast-ssd
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 50Gi
        # Scrape all ServiceMonitors and PodMonitors across namespaces
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
        ruleSelectorNilUsesHelmValues: false

    # Grafana configuration
    grafana:
      enabled: true
      adminPassword: "changeme"  # Override with SOPS Secret in production
      persistence:
        enabled: true
        size: 10Gi
      ingress:
        enabled: true
        hosts:
          - grafana.example.com

    # Alertmanager configuration with Slack routing
    alertmanager:
      alertmanagerSpec:
        storage:
          volumeClaimTemplate:
            spec:
              storageClassName: fast-ssd
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 5Gi
      config:
        global:
          slack_api_url: "${SLACK_API_URL}"
        route:
          group_by: ["alertname", "namespace"]
          group_wait: 30s
          group_interval: 5m
          repeat_interval: 12h
          receiver: slack-notifications
        receivers:
          - name: slack-notifications
            slack_configs:
              - channel: "#alerts"
                send_resolved: true
                title: "{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}"
                text: "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/monitoring/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kube-prometheus-stack-grafana
      namespace: monitoring
    - apiVersion: apps/v1
      kind: StatefulSet
      name: prometheus-kube-prometheus-stack-prometheus
      namespace: monitoring
```

## Best Practices

- Use `serviceMonitorSelectorNilUsesHelmValues: false` so Prometheus picks up ServiceMonitors from all namespaces, not just the ones with the Helm chart labels.
- Store the Grafana admin password and Alertmanager webhook URL in SOPS-encrypted Secrets.
- Set `retentionSize` alongside `retention` to prevent Prometheus from filling the PVC if metric volume spikes.
- Enable `prune: true` in the Kustomization so alert rules and dashboards removed from Git are deleted from the cluster.
- Use separate PVCs for Prometheus and Alertmanager so they can be sized and snapshotted independently.

## Conclusion

The kube-prometheus-stack deployed via Flux CD provides a production-ready, GitOps-managed monitoring platform for Kubernetes. Every alert rule, dashboard, and notification channel is auditable in Git, making your observability stack as reliable and reviewable as your application code.
