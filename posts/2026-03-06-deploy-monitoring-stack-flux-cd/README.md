# How to Deploy Monitoring Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, monitoring, prometheus, grafana, kubernetes, gitops, observability

Description: A comprehensive guide to deploying a full monitoring stack with Prometheus, Grafana, and Alertmanager using Flux CD.

---

## Introduction

A robust monitoring stack is essential for any production Kubernetes cluster. The Prometheus ecosystem, combined with Grafana for visualization and Alertmanager for notifications, provides a battle-tested solution. Deploying this stack through Flux CD ensures your monitoring infrastructure is reproducible, version-controlled, and consistently applied across clusters.

This guide walks through deploying the kube-prometheus-stack using Flux CD with production-ready configurations.

## Prerequisites

- A running Kubernetes cluster with at least 4GB of available memory
- Flux CD installed and bootstrapped
- A Git repository connected to Flux
- kubectl access to the cluster

## Repository Structure

```
infrastructure/
  monitoring/
    namespace.yaml
    helmrepository.yaml
    helmrelease.yaml
    grafana-dashboards/
      kustomization.yaml
      node-exporter-dashboard.yaml
      flux-dashboard.yaml
    alertmanager/
      alertmanager-config.yaml
    prometheus-rules/
      cluster-alerts.yaml
```

## Creating the Monitoring Namespace

```yaml
# infrastructure/monitoring/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    # Enable Prometheus to scrape pods in this namespace
    monitoring: enabled
```

## Adding the Helm Repository

```yaml
# infrastructure/monitoring/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

## Deploying kube-prometheus-stack

The kube-prometheus-stack Helm chart bundles Prometheus, Grafana, Alertmanager, and various exporters.

```yaml
# infrastructure/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "60.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    # Create CRDs before installing
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # ---- Prometheus Configuration ----
    prometheus:
      prometheusSpec:
        # Retention period for metrics
        retention: 30d
        # Storage configuration
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: standard
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi
        # Resource allocation
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        # Scrape all ServiceMonitors across namespaces
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
        ruleSelectorNilUsesHelmValues: false
        # Additional scrape configurations
        additionalScrapeConfigs: []

    # ---- Grafana Configuration ----
    grafana:
      # Admin credentials from a secret
      adminPassword: ""
      admin:
        existingSecret: grafana-admin-credentials
        userKey: admin-user
        passwordKey: admin-password
      # Enable persistence for dashboards
      persistence:
        enabled: true
        size: 10Gi
      # Install useful plugins
      plugins:
        - grafana-piechart-panel
        - grafana-clock-panel
      # Sidecar for auto-loading dashboards from ConfigMaps
      sidecar:
        dashboards:
          enabled: true
          # Search all namespaces for dashboard ConfigMaps
          searchNamespace: ALL
          label: grafana_dashboard
        datasources:
          enabled: true
      # Ingress configuration
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - grafana.example.com
        tls:
          - secretName: grafana-tls
            hosts:
              - grafana.example.com
      # Resource allocation
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

    # ---- Alertmanager Configuration ----
    alertmanager:
      alertmanagerSpec:
        # Store silences and notification state
        storage:
          volumeClaimTemplate:
            spec:
              storageClassName: standard
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 5Gi
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      # Alertmanager configuration for routing alerts
      config:
        global:
          resolve_timeout: 5m
        route:
          receiver: "slack-notifications"
          group_by:
            - alertname
            - namespace
          group_wait: 30s
          group_interval: 5m
          repeat_interval: 4h
          routes:
            # Critical alerts go to PagerDuty
            - match:
                severity: critical
              receiver: "pagerduty-critical"
              repeat_interval: 1h
            # Warning alerts go to Slack
            - match:
                severity: warning
              receiver: "slack-notifications"
        receivers:
          - name: "slack-notifications"
            slack_configs:
              - api_url_file: /etc/alertmanager/secrets/slack-webhook-url
                channel: "#alerts"
                title: '{{ .GroupLabels.alertname }}'
                text: >-
                  {{ range .Alerts }}
                  *Alert:* {{ .Annotations.summary }}
                  *Description:* {{ .Annotations.description }}
                  *Namespace:* {{ .Labels.namespace }}
                  {{ end }}
          - name: "pagerduty-critical"
            pagerduty_configs:
              - service_key_file: /etc/alertmanager/secrets/pagerduty-key

    # ---- Node Exporter ----
    nodeExporter:
      enabled: true

    # ---- Kube State Metrics ----
    kubeStateMetrics:
      enabled: true

    # ---- Default Prometheus Rules ----
    defaultRules:
      create: true
      rules:
        alertmanager: true
        etcd: true
        general: true
        k8s: true
        kubeScheduler: true
        node: true
        prometheus: true
```

## Grafana Admin Credentials Secret

Store Grafana credentials securely using a sealed secret or SOPS-encrypted secret.

```yaml
# infrastructure/monitoring/grafana-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin-credentials
  namespace: monitoring
type: Opaque
stringData:
  admin-user: admin
  # In practice, encrypt this with SOPS or use SealedSecrets
  admin-password: CHANGE_ME_USE_SOPS
```

## Custom Grafana Dashboard

Add custom dashboards as ConfigMaps that the Grafana sidecar picks up automatically.

```yaml
# infrastructure/monitoring/grafana-dashboards/flux-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-dashboard
  namespace: monitoring
  labels:
    # This label tells the Grafana sidecar to load this dashboard
    grafana_dashboard: "true"
data:
  flux-cluster-stats.json: |
    {
      "dashboard": {
        "title": "Flux CD Cluster Stats",
        "uid": "flux-cluster-stats",
        "panels": [
          {
            "title": "Flux Reconciliation Duration",
            "type": "timeseries",
            "targets": [
              {
                "expr": "rate(gotk_reconcile_duration_seconds_sum[5m]) / rate(gotk_reconcile_duration_seconds_count[5m])",
                "legendFormat": "{{ kind }}/{{ name }}"
              }
            ]
          },
          {
            "title": "Flux Reconciliation Status",
            "type": "stat",
            "targets": [
              {
                "expr": "gotk_reconcile_condition{status='True',type='Ready'}",
                "legendFormat": "{{ kind }}/{{ name }}"
              }
            ]
          }
        ]
      }
    }
```

## Custom Alerting Rules

Define application-specific alerting rules.

```yaml
# infrastructure/monitoring/prometheus-rules/cluster-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: cluster-health
      rules:
        # Alert on high node CPU usage
        - alert: HighNodeCPU
          expr: |
            100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} CPU usage is above 85% for 10 minutes."
        # Alert on high memory usage
        - alert: HighNodeMemory
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} memory usage is above 90%."
        # Alert on pod crash loops
        - alert: PodCrashLooping
          expr: |
            rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 3
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
        # Alert on persistent volume usage
        - alert: PersistentVolumeNearlyFull
          expr: |
            kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes < 0.1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "PVC {{ $labels.persistentvolumeclaim }} in {{ $labels.namespace }} is nearly full"
```

## Flux Kustomization for the Monitoring Stack

Tie everything together with a Flux Kustomization.

```yaml
# clusters/my-cluster/monitoring.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-stack
  namespace: flux-system
spec:
  interval: 15m
  path: ./infrastructure/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health checks to verify all components are running
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kube-prometheus-stack-grafana
      namespace: monitoring
    - apiVersion: apps/v1
      kind: StatefulSet
      name: prometheus-kube-prometheus-stack-prometheus
      namespace: monitoring
  timeout: 10m
  # Decrypt SOPS-encrypted secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

## Verifying the Deployment

```bash
# Check Flux reconciliation status
flux get kustomizations monitoring-stack
flux get helmreleases -n monitoring

# Verify all monitoring pods are running
kubectl get pods -n monitoring

# Check Prometheus targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Then open http://localhost:9090/targets in your browser

# Access Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Then open http://localhost:3000

# Check Alertmanager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
```

## Troubleshooting

- **Prometheus not scraping targets**: Verify ServiceMonitor labels match the Prometheus selector. Check with `kubectl get servicemonitor -n monitoring`
- **Grafana dashboards not loading**: Ensure the ConfigMap has the `grafana_dashboard: "true"` label and the sidecar is configured to search all namespaces
- **Alertmanager not sending alerts**: Check the Alertmanager configuration and ensure secrets for webhook URLs are properly mounted
- **High memory usage**: Adjust Prometheus retention period and storage. Consider using remote write to offload long-term storage

## Conclusion

Deploying a monitoring stack with Flux CD gives you a fully GitOps-managed observability platform. Every configuration change, from scrape intervals to alert rules, is tracked in Git and automatically reconciled to your cluster. This approach simplifies managing monitoring across multiple clusters and ensures your observability infrastructure is as reliable as the applications it monitors.
