# How to Build a Monitoring Platform with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Prometheus, Grafana, Platform Engineering, Observability

Description: Deploy and manage a full monitoring platform stack using Flux CD so Prometheus, Grafana, Alertmanager, and dashboards are all version-controlled and continuously reconciled.

---

## Introduction

Observability infrastructure is often the last thing to be treated as code. Teams deploy Prometheus manually, configure Grafana dashboards through the UI, and add Alertmanager routes through a web form. The result is a monitoring system that nobody fully understands, that drifts from its documented configuration, and that takes hours to recreate after a cluster failure.

Flux CD brings GitOps discipline to monitoring infrastructure. Every component — Prometheus installation, scrape configs, dashboards, alert rules, Alertmanager routing — lives in Git and is continuously reconciled. When a platform team adds a new default dashboard or tightens an alert threshold, the change flows to every cluster automatically. When a cluster is rebuilt, monitoring is restored within minutes.

In this guide you will build a complete monitoring stack with the kube-prometheus-stack Helm chart, manage dashboards as ConfigMaps, define alert rules as PrometheusRule objects, and configure Alertmanager routing — all through Flux.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped
- At least 8GB RAM available (Prometheus is memory-intensive)
- Persistent storage provisioner for long-term metrics retention
- A notification channel (Slack, PagerDuty, or email) for alerts

## Step 1: Add the Prometheus Community Helm Repository

```yaml
# infrastructure/sources/prometheus-community.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

## Step 2: Deploy kube-prometheus-stack

```yaml
# infrastructure/controllers/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "58.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  valuesFrom:
    # Separate alertmanager credentials from main config
    - kind: Secret
      name: alertmanager-config
      valuesKey: config.yaml
      targetPath: alertmanager.config
  values:
    # Prometheus configuration
    prometheus:
      prometheusSpec:
        retention: 30d
        retentionSize: 50GB
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: fast-ssd
              resources:
                requests:
                  storage: 100Gi
        # Discover PrometheusRules across all namespaces
        ruleNamespaceSelector: {}
        ruleSelector: {}
        # Discover ServiceMonitors across all namespaces
        serviceMonitorNamespaceSelector: {}
        serviceMonitorSelector: {}
        resources:
          requests:
            cpu: 200m
            memory: 1Gi
          limits:
            cpu: "2"
            memory: 4Gi

    # Grafana configuration
    grafana:
      adminPassword: ${GRAFANA_ADMIN_PASSWORD}
      ingress:
        enabled: true
        hosts: ["grafana.acme.example.com"]
        tls:
          - secretName: grafana-tls
            hosts: ["grafana.acme.example.com"]
      # Auto-load dashboards from ConfigMaps with this label
      sidecar:
        dashboards:
          enabled: true
          label: grafana_dashboard
          labelValue: "1"
          searchNamespace: ALL
      persistence:
        enabled: true
        size: 10Gi

    # Alertmanager configuration
    alertmanager:
      alertmanagerSpec:
        storage:
          volumeClaimTemplate:
            spec:
              resources:
                requests:
                  storage: 10Gi
```

## Step 3: Manage Grafana Dashboards as ConfigMaps

Store dashboards in Git as JSON and deploy them via ConfigMaps with the Grafana sidecar label.

```yaml
# infrastructure/monitoring/dashboards/platform-overview.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-overview-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"    # Grafana sidecar picks this up automatically
data:
  platform-overview.json: |
    {
      "title": "Platform Overview",
      "uid": "platform-overview",
      "panels": [
        {
          "title": "Flux Kustomization Status",
          "type": "stat",
          "targets": [
            {
              "expr": "sum(gotk_reconcile_condition{type='Ready',status='True'}) / sum(gotk_reconcile_condition{type='Ready'})",
              "legendFormat": "Ready %"
            }
          ]
        },
        {
          "title": "Flux Reconciliation Duration P99",
          "type": "graph",
          "targets": [
            {
              "expr": "histogram_quantile(0.99, sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind))",
              "legendFormat": "{{ kind }}"
            }
          ]
        }
      ]
    }
```

## Step 4: Define Alert Rules as PrometheusRule Objects

```yaml
# infrastructure/monitoring/alerts/flux-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-system-alerts
  namespace: monitoring
  labels:
    # Must match the ruleSelector in kube-prometheus-stack
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: flux.rules
      interval: 1m
      rules:
        - alert: FluxKustomizationNotReady
          expr: |
            gotk_reconcile_condition{type="Ready",status="False",kind="Kustomization"} == 1
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Flux Kustomization {{ $labels.name }} is not ready"
            description: "Kustomization {{ $labels.namespace }}/{{ $labels.name }} has been not ready for more than 5 minutes."

        - alert: FluxHelmReleaseNotReady
          expr: |
            gotk_reconcile_condition{type="Ready",status="False",kind="HelmRelease"} == 1
          for: 10m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "HelmRelease {{ $labels.name }} is not ready"

        - alert: FluxReconciliationStopped
          expr: |
            gotk_suspend_status{kind="Kustomization"} == 1
          for: 1h
          labels:
            severity: info
            team: platform
          annotations:
            summary: "Flux Kustomization {{ $labels.name }} has been suspended for over 1 hour"
```

```yaml
# infrastructure/monitoring/alerts/node-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-critical-alerts
  namespace: monitoring
spec:
  groups:
    - name: node.critical
      rules:
        - alert: NodeHighMemoryUsage
          expr: |
            (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.instance }} memory usage is above 90%"
```

## Step 5: Configure Alertmanager Routing

```yaml
# infrastructure/monitoring/alertmanager/config-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
stringData:
  config.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: "https://hooks.slack.com/services/REPLACE_WITH_REAL_URL"

    route:
      group_by: ['alertname', 'cluster', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'default-slack'
      routes:
        - match:
            severity: critical
          receiver: pagerduty
          continue: true
        - match:
            team: platform
          receiver: platform-slack

    receivers:
      - name: 'default-slack'
        slack_configs:
          - channel: '#alerts'
            title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

      - name: 'pagerduty'
        pagerduty_configs:
          - routing_key: ${PAGERDUTY_KEY}
            severity: '{{ .CommonLabels.severity }}'

      - name: 'platform-slack'
        slack_configs:
          - channel: '#platform-alerts'
```

## Step 6: Organize Monitoring with Flux Kustomizations

```yaml
# clusters/production/monitoring.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure   # Install CRDs first
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

- Store Alertmanager credentials in a Secrets Manager and sync them with External Secrets Operator
- Use `valuesFrom` in HelmRelease to keep sensitive values out of the main configuration file
- Export dashboards from the Grafana UI as JSON and commit them to Git rather than building JSON by hand
- Create separate PrometheusRule objects per team so teams can manage their own alert rules
- Use recording rules to pre-compute expensive queries and reduce dashboard load time
- Test alert rules with `promtool check rules` in CI before merging changes

## Conclusion

A GitOps-managed monitoring platform built with Flux CD ensures your observability infrastructure is as reliable and well-maintained as the applications it monitors. Dashboards, alert rules, and Alertmanager configuration are all version-controlled, reviewed, and automatically applied. When a cluster needs to be rebuilt, monitoring is restored automatically from Git — no manual configuration, no forgotten settings, no monitoring gaps during recovery.
