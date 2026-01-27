# How to Monitor Flux Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flux, GitOps, Monitoring, Observability, Prometheus, Grafana, Alerting

Description: A comprehensive guide to monitoring Flux CD deployments in Kubernetes. Learn how to collect Flux metrics, build Grafana dashboards, configure notification controllers, and set up alerting for sync failures.

---

> "You can't improve what you can't measure. In GitOps, observability is what separates hope from confidence."

Flux CD is a powerful GitOps toolkit for Kubernetes, but deploying it is only half the battle. To run Flux reliably in production, you need comprehensive monitoring that tells you when syncs fail, reconciliations stall, or drift occurs. This guide covers everything you need to monitor Flux deployments effectively.

## Understanding Flux Architecture

Before diving into monitoring, let's understand what Flux components we need to observe.

```mermaid
flowchart TB
    subgraph Flux Controllers
        SC[Source Controller]
        KC[Kustomize Controller]
        HC[Helm Controller]
        NC[Notification Controller]
        IC[Image Automation Controller]
    end

    subgraph Sources
        GR[GitRepository]
        HR[HelmRepository]
        BC[Bucket]
        OCR[OCIRepository]
    end

    subgraph Reconciliation
        K[Kustomization]
        HRel[HelmRelease]
    end

    GR --> SC
    HR --> SC
    BC --> SC
    OCR --> SC

    SC --> KC
    SC --> HC

    KC --> K
    HC --> HRel

    K --> |Events| NC
    HRel --> |Events| NC
```

Each controller exposes Prometheus metrics that give you visibility into:
- Reconciliation status and duration
- Source fetch success/failure
- Resource conditions
- Queue depth and processing rates

## Enabling Flux Metrics

Flux controllers expose metrics on port 8080 by default. First, verify metrics are enabled in your Flux installation.

### Check Current Metrics Configuration

```bash
# Check if metrics are exposed on the source-controller
kubectl get deployment source-controller -n flux-system -o yaml | grep -A 5 "containerPort"

# You should see port 8080 for metrics
# - containerPort: 8080
#   name: http-prom
#   protocol: TCP
```

### Bootstrap Flux with Metrics Enabled

If you're installing Flux fresh, metrics are enabled by default:

```bash
# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Verify metrics endpoint
kubectl port-forward -n flux-system deployment/source-controller 8080:8080 &
curl http://localhost:8080/metrics | head -50
```

### Create ServiceMonitor for Prometheus

For Prometheus Operator to scrape Flux metrics, create ServiceMonitors:

```yaml
# flux-servicemonitor.yaml
# ServiceMonitor to scrape metrics from all Flux controllers
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  # Match all Flux controller services
  selector:
    matchExpressions:
      - key: app.kubernetes.io/part-of
        operator: In
        values:
          - flux
  # Define the metrics endpoint
  endpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
  # Target the flux-system namespace
  namespaceSelector:
    matchNames:
      - flux-system
```

Apply the ServiceMonitor:

```bash
kubectl apply -f flux-servicemonitor.yaml

# Verify Prometheus is scraping Flux metrics
# In Prometheus UI, check Targets for flux-system endpoints
```

## Key Flux Metrics to Monitor

Flux exposes several critical metrics. Here are the most important ones for production monitoring.

### Reconciliation Metrics

```promql
# Reconciliation duration histogram
# Tracks how long each reconciliation takes
gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}

# Count of reconciliation attempts
# Useful for detecting reconciliation storms
gotk_reconcile_duration_seconds_count{kind="Kustomization"}

# Current reconciliation condition
# 1 = Ready, 0 = Not Ready
gotk_reconcile_condition{kind="Kustomization", type="Ready", status="True"}
```

### Source Controller Metrics

```promql
# Artifact fetch duration
# Tracks time to fetch from Git, Helm repos, etc.
gotk_reconcile_duration_seconds_bucket{kind="GitRepository"}

# Source readiness
# Indicates if source is successfully fetched
gotk_reconcile_condition{kind="GitRepository", type="Ready", status="True"}

# Artifact revision
# Shows current artifact revision being used
gotk_resource_info{kind="GitRepository"}
```

### Controller Runtime Metrics

```promql
# Controller work queue depth
# High values indicate processing backlog
workqueue_depth{name="gitrepository"}

# Controller reconcile errors
# Tracks failed reconciliations
controller_runtime_reconcile_errors_total{controller="kustomization"}

# Controller reconcile rate
# Useful for capacity planning
rate(controller_runtime_reconcile_total{controller="kustomization"}[5m])
```

## Building Grafana Dashboards

A well-designed dashboard gives you instant visibility into Flux health. Here's how to build one.

```mermaid
flowchart LR
    subgraph Data Collection
        F[Flux Controllers] --> |Metrics| P[Prometheus]
    end

    subgraph Visualization
        P --> G[Grafana]
        G --> D1[Overview Dashboard]
        G --> D2[Controller Details]
        G --> D3[Reconciliation History]
    end

    subgraph Alerting
        P --> AM[Alertmanager]
        AM --> |Notifications| S[Slack/PagerDuty]
    end
```

### Import the Official Flux Dashboard

Flux provides an official Grafana dashboard you can import:

```bash
# Download the official Flux dashboard
curl -sL https://raw.githubusercontent.com/fluxcd/flux2-monitoring-example/main/monitoring/configs/dashboards/cluster.json \
  -o flux-dashboard.json

# Import via Grafana API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @flux-dashboard.json \
  http://grafana.example.com/api/dashboards/db
```

### Custom Dashboard JSON

Create a custom dashboard tailored to your needs:

```json
{
  "dashboard": {
    "title": "Flux GitOps Overview",
    "tags": ["flux", "gitops", "kubernetes"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Reconciliation Status",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(gotk_reconcile_condition{type=\"Ready\", status=\"True\"})",
            "legendFormat": "Ready"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "title": "Failed Reconciliations",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
        "targets": [
          {
            "expr": "sum(gotk_reconcile_condition{type=\"Ready\", status=\"False\"})",
            "legendFormat": "Not Ready"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "red", "value": 1}
              ]
            }
          }
        }
      },
      {
        "title": "Reconciliation Duration (p95)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind))",
            "legendFormat": "{{kind}}"
          }
        ]
      },
      {
        "title": "Source Fetch Errors",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
        "targets": [
          {
            "expr": "sum(rate(controller_runtime_reconcile_errors_total{controller=~\"gitrepository|helmrepository\"}[5m])) by (controller)",
            "legendFormat": "{{controller}}"
          }
        ]
      }
    ]
  }
}
```

### Dashboard as Code with ConfigMap

Store your dashboard in Git and deploy via Flux:

```yaml
# grafana-dashboard-configmap.yaml
# ConfigMap containing the Flux monitoring dashboard
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-dashboard
  namespace: monitoring
  labels:
    # Label for Grafana sidecar to auto-import
    grafana_dashboard: "1"
data:
  flux-overview.json: |
    {
      "title": "Flux Overview",
      "uid": "flux-overview",
      "panels": [
        {
          "title": "Kustomization Ready Status",
          "type": "gauge",
          "targets": [
            {
              "expr": "sum(gotk_reconcile_condition{kind=\"Kustomization\",type=\"Ready\",status=\"True\"}) / sum(gotk_reconcile_condition{kind=\"Kustomization\",type=\"Ready\"})",
              "legendFormat": "Ready %"
            }
          ],
          "fieldConfig": {
            "defaults": {
              "min": 0,
              "max": 1,
              "unit": "percentunit"
            }
          }
        }
      ]
    }
```

## Configuring Notification Controller

The Flux Notification Controller handles alerts and integrations with external systems.

```mermaid
flowchart TB
    subgraph Flux Events
        K[Kustomization]
        HR[HelmRelease]
        GR[GitRepository]
    end

    subgraph Notification Controller
        A[Alert]
        P[Provider]
    end

    subgraph External Services
        S[Slack]
        PD[PagerDuty]
        GH[GitHub]
        W[Webhook]
    end

    K --> |Events| A
    HR --> |Events| A
    GR --> |Events| A

    A --> P
    P --> S
    P --> PD
    P --> GH
    P --> W
```

### Create a Slack Provider

```yaml
# slack-provider.yaml
# Provider configuration for Slack notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  # Type of notification provider
  type: slack
  # Channel to send notifications to
  channel: deployments
  # Reference to secret containing the webhook URL
  secretRef:
    name: slack-webhook
---
# Secret containing Slack webhook URL
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook
  namespace: flux-system
stringData:
  # Slack incoming webhook URL
  address: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### Create Alert Rules

```yaml
# flux-alerts.yaml
# Alert configuration for Flux events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-system-alerts
  namespace: flux-system
spec:
  # Summary included in notifications
  summary: "Flux GitOps Alert"
  # Reference to the notification provider
  providerRef:
    name: slack
  # Severity filter - only alert on errors
  eventSeverity: error
  # Event sources to watch
  eventSources:
    # Watch all Kustomizations in all namespaces
    - kind: Kustomization
      name: '*'
      namespace: '*'
    # Watch all HelmReleases in all namespaces
    - kind: HelmRelease
      name: '*'
      namespace: '*'
    # Watch all GitRepositories
    - kind: GitRepository
      name: '*'
      namespace: flux-system
  # Metadata to include in alerts
  eventMetadata:
    cluster: production
    environment: prod
```

### Multi-Severity Alerts

Configure different channels for different severity levels:

```yaml
# info-alerts.yaml
# Alert for informational events (successful deployments)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-notifications
  namespace: flux-system
spec:
  summary: "Deployment Update"
  providerRef:
    name: slack
  # Include info-level events
  eventSeverity: info
  # Inclusion list - only these event reasons
  inclusionList:
    - "ReconciliationSucceeded"
    - "HealthCheckSucceeded"
  eventSources:
    - kind: Kustomization
      name: '*'
---
# error-alerts.yaml
# Alert for error events (failures)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: error-notifications
  namespace: flux-system
spec:
  summary: "Flux Error Alert"
  providerRef:
    name: pagerduty  # Route errors to PagerDuty
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

### GitHub Commit Status Provider

Update GitHub commit status based on reconciliation:

```yaml
# github-provider.yaml
# Provider for GitHub commit status updates
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  # GitHub API address
  address: https://github.com/myorg/myrepo
  secretRef:
    name: github-token
---
apiVersion: v1
kind: Secret
metadata:
  name: github-token
  namespace: flux-system
stringData:
  token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
---
# Alert to update commit status
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: github-commit-status
  namespace: flux-system
spec:
  providerRef:
    name: github-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: production
```

## Alerting on Sync Failures

Set up comprehensive alerting for sync failures using Prometheus Alertmanager.

### Prometheus Alert Rules

```yaml
# flux-alerting-rules.yaml
# PrometheusRule for Flux alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
  labels:
    prometheus: k8s
    role: alert-rules
spec:
  groups:
    - name: flux.rules
      rules:
        # Alert when Kustomization fails to reconcile
        - alert: FluxKustomizationNotReady
          expr: |
            gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux Kustomization {{ $labels.name }} not ready"
            description: "Kustomization {{ $labels.name }} in namespace {{ $labels.exported_namespace }} has been in a non-ready state for more than 5 minutes."
            runbook_url: "https://docs.example.com/runbooks/flux-kustomization-not-ready"

        # Alert when HelmRelease fails to reconcile
        - alert: FluxHelmReleaseNotReady
          expr: |
            gotk_reconcile_condition{kind="HelmRelease", type="Ready", status="False"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux HelmRelease {{ $labels.name }} not ready"
            description: "HelmRelease {{ $labels.name }} in namespace {{ $labels.exported_namespace }} has been in a non-ready state for more than 5 minutes."

        # Alert when GitRepository fails to fetch
        - alert: FluxSourceNotReady
          expr: |
            gotk_reconcile_condition{kind="GitRepository", type="Ready", status="False"} == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux GitRepository {{ $labels.name }} not ready"
            description: "GitRepository {{ $labels.name }} has been unable to fetch for more than 10 minutes. Check network connectivity and credentials."

        # Alert on reconciliation taking too long
        - alert: FluxReconciliationSlow
          expr: |
            histogram_quantile(0.99, sum(rate(gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}[15m])) by (le, name)) > 300
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux reconciliation slow for {{ $labels.name }}"
            description: "Kustomization {{ $labels.name }} p99 reconciliation time is above 5 minutes."

        # Alert when controller has high error rate
        - alert: FluxControllerHighErrorRate
          expr: |
            sum(rate(controller_runtime_reconcile_errors_total[5m])) by (controller)
            / sum(rate(controller_runtime_reconcile_total[5m])) by (controller) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux {{ $labels.controller }} has high error rate"
            description: "Controller {{ $labels.controller }} has more than 10% reconciliation error rate over the last 10 minutes."

        # Alert when reconciliation is stalled
        - alert: FluxReconciliationStalled
          expr: |
            time() - gotk_reconcile_condition{type="Ready"} > 3600
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux reconciliation stalled for {{ $labels.name }}"
            description: "{{ $labels.kind }} {{ $labels.name }} has not been reconciled in over 1 hour."
```

### Alertmanager Configuration

```yaml
# alertmanager-config.yaml
# Alertmanager configuration for Flux alerts
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/xxx/xxx/xxx'

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'slack-notifications'
      routes:
        # Route critical Flux alerts to PagerDuty
        - match:
            severity: critical
            alertname: FluxKustomizationNotReady
          receiver: 'pagerduty-critical'
          continue: true
        # Route all Flux alerts to dedicated channel
        - match_re:
            alertname: Flux.*
          receiver: 'slack-flux-alerts'

    receivers:
      - name: 'slack-notifications'
        slack_configs:
          - channel: '#alerts'
            title: '{{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

      - name: 'slack-flux-alerts'
        slack_configs:
          - channel: '#gitops-alerts'
            title: 'Flux Alert: {{ .GroupLabels.alertname }}'
            text: |
              {{ range .Alerts }}
              *{{ .Labels.name }}* in {{ .Labels.exported_namespace }}
              {{ .Annotations.description }}
              {{ end }}
            actions:
              - type: button
                text: 'View Runbook'
                url: '{{ (index .Alerts 0).Annotations.runbook_url }}'

      - name: 'pagerduty-critical'
        pagerduty_configs:
          - service_key: 'your-pagerduty-service-key'
            severity: critical
            description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

## Complete Monitoring Stack Deployment

Here's how to deploy the complete monitoring stack with Flux itself.

```mermaid
flowchart TB
    subgraph GitOps Repo
        MK[monitoring/kustomization.yaml]
    end

    subgraph Monitoring Stack
        P[Prometheus]
        G[Grafana]
        AM[Alertmanager]
        SM[ServiceMonitors]
        PR[PrometheusRules]
        D[Dashboards]
    end

    MK --> |Deploys| P
    MK --> |Deploys| G
    MK --> |Deploys| AM
    MK --> |Deploys| SM
    MK --> |Deploys| PR
    MK --> |Deploys| D

    P --> |Scrapes| FC[Flux Controllers]
    P --> |Evaluates| PR
    P --> |Sends| AM
    AM --> |Notifies| E[External Systems]
```

### Kustomization for Monitoring

```yaml
# clusters/production/monitoring/kustomization.yaml
# Kustomization to deploy monitoring stack
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: monitoring
resources:
  # Prometheus Operator CRDs
  - https://github.com/prometheus-operator/prometheus-operator/releases/download/v0.70.0/stripped-down-crds.yaml
  # kube-prometheus-stack base
  - helmrelease.yaml
  # Flux-specific monitoring resources
  - flux-servicemonitor.yaml
  - flux-alerting-rules.yaml
  - flux-dashboards.yaml
```

### HelmRelease for kube-prometheus-stack

```yaml
# clusters/production/monitoring/helmrelease.yaml
# HelmRelease for kube-prometheus-stack
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "55.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        # Enable ServiceMonitor discovery across all namespaces
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
        ruleSelectorNilUsesHelmValues: false
        # Retention period
        retention: 30d
        # Storage configuration
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 100Gi
    grafana:
      # Enable sidecar for dashboard auto-discovery
      sidecar:
        dashboards:
          enabled: true
          searchNamespace: ALL
      # Default dashboards
      defaultDashboardsEnabled: true
    alertmanager:
      alertmanagerSpec:
        # Alertmanager configuration from secret
        alertmanagerConfigSecret: alertmanager-config
```

## Monitoring with OneUptime

For teams looking for a comprehensive observability platform, [OneUptime](https://oneuptime.com) provides an excellent solution for monitoring Flux deployments alongside your entire infrastructure.

### Why OneUptime for Flux Monitoring

OneUptime offers:
- **Unified Observability**: Monitor Flux metrics alongside application logs, traces, and uptime
- **Custom Dashboards**: Build Flux-specific dashboards with powerful visualization tools
- **Intelligent Alerting**: Set up sophisticated alert rules with multiple notification channels
- **Incident Management**: When Flux sync failures occur, manage incidents end-to-end
- **Status Pages**: Keep stakeholders informed about deployment status
- **OpenTelemetry Support**: Native support for metrics ingestion

### Integrating Flux Metrics with OneUptime

```yaml
# otel-collector-config.yaml
# OpenTelemetry Collector configuration for OneUptime
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
            # Scrape Flux controller metrics
            - job_name: 'flux-system'
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names:
                      - flux-system
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                  action: keep
                  regex: true
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
                  action: replace
                  target_label: __address__
                  regex: (.+)
                  replacement: $1:8080

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1000

      # Add metadata for better organization in OneUptime
      attributes:
        actions:
          - key: environment
            value: production
            action: insert
          - key: service.name
            value: flux-gitops
            action: insert

    exporters:
      otlp:
        endpoint: "https://otlp.oneuptime.com:4317"
        headers:
          x-oneuptime-token: "${ONEUPTIME_INGESTION_KEY}"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [batch, attributes]
          exporters: [otlp]
```

### Deploy the Collector

```yaml
# otel-collector-deployment.yaml
# OpenTelemetry Collector deployment for OneUptime
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          args:
            - --config=/etc/otel/config.yaml
          env:
            - name: ONEUPTIME_INGESTION_KEY
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: ingestion-key
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Best Practices for Flux Monitoring

### 1. Set Meaningful SLOs

Define Service Level Objectives for your GitOps pipeline:

```yaml
# Example SLOs for Flux
# - 99.9% of reconciliations should complete within 5 minutes
# - Source fetch success rate should be > 99.5%
# - Zero reconciliation failures lasting > 15 minutes
```

### 2. Monitor All Resource Types

Don't just monitor Kustomizations. Track all Flux resources:

```yaml
# Comprehensive event sources
eventSources:
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
  - kind: GitRepository
    name: '*'
  - kind: HelmRepository
    name: '*'
  - kind: HelmChart
    name: '*'
  - kind: Bucket
    name: '*'
  - kind: OCIRepository
    name: '*'
  - kind: ImageRepository
    name: '*'
  - kind: ImagePolicy
    name: '*'
  - kind: ImageUpdateAutomation
    name: '*'
```

### 3. Use Labels for Organization

Add consistent labels to enable filtering and grouping:

```yaml
metadata:
  labels:
    team: platform
    environment: production
    tier: critical
```

### 4. Test Your Alerts

Regularly verify alerts fire correctly:

```bash
# Intentionally break a Kustomization to test alerts
kubectl patch kustomization myapp -n flux-system \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/path", "value": "./nonexistent"}]'

# Verify alert fires, then fix
kubectl patch kustomization myapp -n flux-system \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/path", "value": "./apps/myapp"}]'
```

### 5. Document Runbooks

Create runbooks for each alert:

```markdown
## FluxKustomizationNotReady Runbook

### Symptoms
- Kustomization shows Ready=False
- Deployments not updating
- Alert firing in PagerDuty

### Investigation Steps
1. Check Kustomization status: `flux get kustomization <name>`
2. View recent events: `kubectl describe kustomization <name> -n flux-system`
3. Check source availability: `flux get source git <name>`
4. Review controller logs: `kubectl logs -n flux-system deployment/kustomize-controller`

### Resolution
- If source issue: Check Git credentials, network connectivity
- If validation error: Fix manifests and push to Git
- If timeout: Increase timeout in Kustomization spec
```

---

Monitoring Flux deployments is essential for reliable GitOps operations. With proper metrics collection, dashboards, and alerting, you can catch issues before they impact your applications. Start with the basics, then expand your observability as your GitOps practice matures. For a complete observability solution that integrates seamlessly with Flux and your entire stack, check out [OneUptime](https://oneuptime.com).
