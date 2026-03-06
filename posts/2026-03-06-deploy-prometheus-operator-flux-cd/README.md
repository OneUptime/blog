# How to Deploy Prometheus Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, prometheus, prometheus operator, kubernetes, gitops, monitoring, observability

Description: A practical guide to deploying and managing Prometheus Operator on Kubernetes using Flux CD and GitOps principles.

---

## Introduction

Prometheus Operator simplifies the deployment and configuration of Prometheus, Alertmanager, and related monitoring components on Kubernetes. When combined with Flux CD, you get a fully automated GitOps pipeline for managing your monitoring infrastructure.

This guide walks you through deploying Prometheus Operator using Flux CD, from setting up the Helm repository to configuring custom scrape targets and alerting rules.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on your cluster
- A Git repository connected to Flux CD
- kubectl configured to access your cluster

## Setting Up the Helm Repository

First, create a HelmRepository resource that points to the prometheus-community Helm chart repository.

```yaml
# clusters/my-cluster/monitoring/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

This tells Flux CD to check the Helm repository every hour for updated charts.

## Creating the Monitoring Namespace

Define a namespace for your monitoring stack.

```yaml
# clusters/my-cluster/monitoring/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    toolkit.fluxcd.io/tenant: monitoring
```

## Deploying the Prometheus Operator via HelmRelease

Create a HelmRelease resource to deploy the kube-prometheus-stack chart, which includes Prometheus Operator, Prometheus, Alertmanager, and Grafana.

```yaml
# clusters/my-cluster/monitoring/prometheus-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
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
      interval: 12h
  # Maximum number of history revisions to keep
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
  # Uninstall configuration
  uninstall:
    keepHistory: false
  values:
    # Prometheus configuration
    prometheus:
      prometheusSpec:
        # Retention period for metrics
        retention: 30d
        # Storage configuration
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi
        # Resource limits
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 8Gi
        # Select all ServiceMonitors across namespaces
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
        ruleSelectorNilUsesHelmValues: false

    # Alertmanager configuration
    alertmanager:
      alertmanagerSpec:
        storage:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 10Gi
        resources:
          requests:
            cpu: 100m
            memory: 256Mi

    # Disable Grafana (deploy separately for more control)
    grafana:
      enabled: false

    # Node exporter configuration
    nodeExporter:
      enabled: true

    # kube-state-metrics configuration
    kubeStateMetrics:
      enabled: true
```

## Adding a Kustomization for the Monitoring Stack

Tie all monitoring manifests together with a Flux Kustomization.

```yaml
# clusters/my-cluster/monitoring/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: monitoring
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/monitoring
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kube-prometheus-stack-operator
      namespace: monitoring
```

## Creating Custom ServiceMonitors

Define a ServiceMonitor to scrape metrics from your application.

```yaml
# clusters/my-cluster/monitoring/service-monitors/app-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-application
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  # Select services in the application namespace
  namespaceSelector:
    matchNames:
      - my-app
  selector:
    matchLabels:
      app: my-application
  endpoints:
    - port: metrics
      # Scrape interval
      interval: 30s
      # Scrape timeout
      scrapeTimeout: 10s
      # Path to metrics endpoint
      path: /metrics
```

## Defining PrometheusRules for Alerting

Create alerting rules using the PrometheusRule custom resource.

```yaml
# clusters/my-cluster/monitoring/rules/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: application-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: application.rules
      rules:
        # Alert when a pod is restarting frequently
        - alert: PodCrashLooping
          expr: |
            rate(kube_pod_container_status_restarts_total[15m]) * 60 * 5 > 0
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted more than 0 times in the last hour."

        # Alert when CPU usage is high
        - alert: HighCPUUsage
          expr: |
            (
              sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace, pod)
              /
              sum(kube_pod_container_resource_limits{resource="cpu"}) by (namespace, pod)
            ) > 0.9
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "High CPU usage detected for {{ $labels.pod }}"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is using more than 90% of its CPU limit."

        # Alert when memory usage is high
        - alert: HighMemoryUsage
          expr: |
            (
              sum(container_memory_working_set_bytes{container!=""}) by (namespace, pod)
              /
              sum(kube_pod_container_resource_limits{resource="memory"}) by (namespace, pod)
            ) > 0.9
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "High memory usage detected for {{ $labels.pod }}"
```

## Configuring Alertmanager Routes

Set up Alertmanager configuration within the HelmRelease values to route alerts to different receivers.

```yaml
# Add this under the alertmanager section in prometheus-operator.yaml values
alertmanager:
  config:
    global:
      resolve_timeout: 5m
    route:
      # Default receiver
      receiver: "slack-notifications"
      # Group alerts by these labels
      group_by:
        - alertname
        - namespace
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
        # Route critical alerts to PagerDuty
        - receiver: "pagerduty-critical"
          matchers:
            - severity = critical
          continue: false
        # Route warning alerts to Slack
        - receiver: "slack-notifications"
          matchers:
            - severity = warning

    receivers:
      - name: "slack-notifications"
        slack_configs:
          - api_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
            channel: "#alerts"
            send_resolved: true
            title: '{{ template "slack.title" . }}'
            text: '{{ template "slack.text" . }}'

      - name: "pagerduty-critical"
        pagerduty_configs:
          - service_key: "YOUR_PAGERDUTY_SERVICE_KEY"
            severity: '{{ .CommonLabels.severity }}'
```

## Storing Secrets with SOPS

Use Mozilla SOPS to encrypt sensitive values like webhook URLs.

```yaml
# clusters/my-cluster/monitoring/alertmanager-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-secrets
  namespace: monitoring
type: Opaque
stringData:
  slack-webhook: "https://hooks.slack.com/services/ENCRYPTED"
  pagerduty-key: "ENCRYPTED_KEY"
```

Encrypt the file before committing:

```bash
# Encrypt the secrets file using SOPS
sops --encrypt \
  --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --encrypted-regex '^(data|stringData)$' \
  --in-place clusters/my-cluster/monitoring/alertmanager-secrets.yaml
```

## Verifying the Deployment

After pushing your changes to Git, verify that Flux has reconciled the resources.

```bash
# Check the HelmRelease status
flux get helmreleases -n monitoring

# Check the Kustomization status
flux get kustomizations monitoring-stack

# Verify Prometheus pods are running
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus

# Verify Alertmanager pods are running
kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager

# Check that CRDs are installed
kubectl get crds | grep monitoring.coreos.com

# Access Prometheus UI via port-forward
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

## Upgrading the Prometheus Operator

To upgrade, simply update the chart version in your HelmRelease and push to Git.

```yaml
# Update the version field in prometheus-operator.yaml
spec:
  chart:
    spec:
      # Update to the new version
      version: "61.x"
```

Flux CD will detect the change and perform a rolling upgrade automatically.

## Conclusion

You now have a fully GitOps-managed Prometheus Operator deployment. With Flux CD handling reconciliation, any drift from your desired state is automatically corrected. Changes to monitoring configuration, alerting rules, and scrape targets are all version-controlled and auditable through your Git repository.

Key benefits of this approach include automated drift detection and correction, version-controlled monitoring configuration, easy rollback through Git history, and consistent deployments across multiple clusters.
