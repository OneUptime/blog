# How to Monitor Flux Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flux, GitOps, Monitoring, Prometheus, Grafana, Alerting, DevOps

Description: A comprehensive guide to monitoring Flux CD deployments, including CLI status commands, Prometheus metrics, Grafana dashboards, alerting on sync failures, and notification providers for complete GitOps observability.

---

> Flux is only as reliable as your ability to know when it fails. Monitoring your GitOps pipeline is not optional - it is the foundation of deployment confidence.

## What Is Flux CD?

Flux is a set of continuous and progressive delivery solutions for Kubernetes that keeps your clusters in sync with sources of configuration (like Git repositories) and automates updates to configuration when there is new code to deploy.

```mermaid
flowchart LR
    subgraph Sources
        Git[Git Repository]
        Helm[Helm Repository]
        OCI[OCI Registry]
    end

    subgraph Flux Controllers
        SC[Source Controller]
        KC[Kustomize Controller]
        HC[Helm Controller]
        NC[Notification Controller]
    end

    subgraph Kubernetes
        NS[Namespaces]
        Deploy[Deployments]
        SVC[Services]
    end

    Git --> SC
    Helm --> SC
    OCI --> SC
    SC --> KC
    SC --> HC
    KC --> NS
    KC --> Deploy
    KC --> SVC
    HC --> Deploy
    NC -->|Alerts| Slack[Slack/Teams/etc]
```

Monitoring Flux means watching these controllers and their reconciliation status to ensure your deployments stay healthy.

## Flux CLI Status Commands

The Flux CLI provides powerful commands to check the health of your deployments. These are essential for both manual checks and scripted monitoring.

### Installing the Flux CLI

```bash
# Install Flux CLI on macOS
brew install fluxcd/tap/flux

# Install on Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify installation
flux --version
```

### Checking Overall Flux Health

```bash
# Check all Flux components are running
# This verifies the controllers are healthy and ready
flux check

# Example output:
# ► checking prerequisites
# ✔ Kubernetes 1.28.0 >=1.25.0-0
# ► checking controllers
# ✔ helm-controller: healthy
# ✔ kustomize-controller: healthy
# ✔ notification-controller: healthy
# ✔ source-controller: healthy
# ✔ all checks passed
```

### Checking GitRepository Sources

```bash
# List all Git repositories and their sync status
# Shows revision, age, and ready status for each source
flux get sources git --all-namespaces

# Get detailed status of a specific GitRepository
flux get source git my-app -n flux-system

# Watch for changes in real-time
# Useful for monitoring during deployments
flux get sources git --watch

# Example output:
# NAME     REVISION       SUSPENDED  READY  MESSAGE
# my-app   main@sha1:abc  False      True   stored artifact for revision 'main@sha1:abc'
```

### Checking Kustomization Status

```bash
# List all Kustomizations and their reconciliation status
# This shows whether your manifests are synced to the cluster
flux get kustomizations --all-namespaces

# Get detailed status with conditions
flux get kustomization my-app -n flux-system -o yaml

# Force immediate reconciliation
# Useful when you need changes applied immediately
flux reconcile kustomization my-app -n flux-system --with-source
```

### Checking HelmRelease Status

```bash
# List all HelmReleases and their status
flux get helmreleases --all-namespaces

# Get detailed HelmRelease information
flux get helmrelease my-chart -n default

# Example output:
# NAME      REVISION  SUSPENDED  READY  MESSAGE
# my-chart  1.2.3     False      True   Release reconciliation succeeded

# Force HelmRelease reconciliation
flux reconcile helmrelease my-chart -n default --with-source
```

### Checking Image Automation Status

```bash
# List image repositories being scanned
flux get images repository --all-namespaces

# List image policies and their latest selected image
flux get images policy --all-namespaces

# List image update automations
flux get images update --all-namespaces
```

### Debugging Failed Reconciliations

```bash
# Get events for a specific resource
# Essential for understanding why a reconciliation failed
flux events --for Kustomization/my-app -n flux-system

# Get logs from Flux controllers
# Helpful for debugging controller-level issues
flux logs --all-namespaces --follow

# Filter logs by specific controller
flux logs --kind=Kustomization --name=my-app -n flux-system

# Suspend and resume reconciliation for debugging
flux suspend kustomization my-app -n flux-system
flux resume kustomization my-app -n flux-system
```

## Prometheus Metrics

Flux controllers expose Prometheus metrics that provide deep insights into reconciliation performance and health.

### Enabling Metrics Collection

```yaml
# flux-system/kustomization.yaml
# Patch to enable metrics for all controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Enable metrics on all controllers
  - patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --metrics-addr=:8080
    target:
      kind: Deployment
      name: "(source-controller|kustomize-controller|helm-controller|notification-controller)"
```

### ServiceMonitor Configuration

```yaml
# servicemonitor.yaml
# Configure Prometheus to scrape Flux controller metrics
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
    matchLabels:
      app.kubernetes.io/part-of: flux
  # Define endpoint to scrape
  endpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
  namespaceSelector:
    matchNames:
      - flux-system
```

### Key Flux Metrics to Monitor

```yaml
# Prometheus recording rules for Flux metrics
# These create pre-computed metrics for dashboards and alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-recording-rules
  namespace: flux-system
spec:
  groups:
    - name: flux.rules
      rules:
        # Record reconciliation duration histogram
        # Useful for tracking performance over time
        - record: flux:reconcile_duration_seconds:histogram_quantile
          expr: |
            histogram_quantile(0.99,
              sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind)
            )

        # Record reconciliation success rate
        # Critical metric for deployment health
        - record: flux:reconcile_success_rate
          expr: |
            sum(rate(gotk_reconcile_condition{status="True",type="Ready"}[5m])) by (kind, name, namespace)
            /
            sum(rate(gotk_reconcile_condition{type="Ready"}[5m])) by (kind, name, namespace)
```

### Important Flux Metrics Reference

```promql
# gotk_reconcile_condition
# Shows the current condition of each Flux resource
# Labels: kind, name, namespace, type, status
# Example: gotk_reconcile_condition{kind="Kustomization",name="my-app",type="Ready",status="True"}

# gotk_reconcile_duration_seconds
# Histogram of reconciliation duration
# Labels: kind, name, namespace, success
# Use for performance monitoring and SLO tracking

# gotk_suspend_status
# Shows if a resource is suspended (1) or active (0)
# Labels: kind, name, namespace
# Important for alerting on accidentally suspended resources

# controller_runtime_reconcile_total
# Total number of reconciliations per controller
# Labels: controller, result
# Useful for understanding reconciliation frequency

# controller_runtime_reconcile_errors_total
# Total number of reconciliation errors
# Labels: controller
# Critical for error rate monitoring
```

### Example PromQL Queries

```promql
# Count of failed reconciliations in the last hour
# Use this to detect persistent failures
sum(increase(gotk_reconcile_condition{status="False",type="Ready"}[1h])) by (kind, name, namespace)

# Average reconciliation duration by resource type
# Helps identify slow reconciliations
avg(rate(gotk_reconcile_duration_seconds_sum[5m]) / rate(gotk_reconcile_duration_seconds_count[5m])) by (kind)

# Resources stuck in non-ready state
# Critical for identifying deployment issues
gotk_reconcile_condition{status="False",type="Ready"} == 1

# Suspended resources count
# Ensure nothing is accidentally suspended
count(gotk_suspend_status == 1) by (kind)

# Source fetch failures
# Detect Git/Helm repository connectivity issues
increase(gotk_reconcile_condition{kind="GitRepository",type="Ready",status="False"}[5m]) > 0
```

## Grafana Dashboards

Visualizing Flux metrics helps teams quickly identify and respond to deployment issues.

### Flux Overview Dashboard

```json
{
  "dashboard": {
    "title": "Flux GitOps Overview",
    "tags": ["flux", "gitops", "kubernetes"],
    "panels": [
      {
        "title": "Reconciliation Status",
        "type": "stat",
        "targets": [
          {
            "expr": "count(gotk_reconcile_condition{type=\"Ready\",status=\"True\"})",
            "legendFormat": "Healthy"
          },
          {
            "expr": "count(gotk_reconcile_condition{type=\"Ready\",status=\"False\"})",
            "legendFormat": "Unhealthy"
          }
        ]
      }
    ]
  }
}
```

### Dashboard Architecture

```mermaid
flowchart TB
    subgraph Data Collection
        FC[Flux Controllers] -->|Expose| Metrics[/metrics endpoint/]
        Metrics --> Prom[Prometheus]
    end

    subgraph Visualization
        Prom --> Grafana[Grafana]
        Grafana --> Overview[Overview Dashboard]
        Grafana --> Details[Detail Dashboard]
        Grafana --> Alerts[Alert Dashboard]
    end

    subgraph Dashboards
        Overview --> Status[Resource Status]
        Overview --> Duration[Reconcile Duration]
        Overview --> Errors[Error Rates]
        Details --> Timeline[Deployment Timeline]
        Details --> Logs[Reconcile Logs]
    end
```

### Recommended Dashboard Panels

```yaml
# Panel configurations for a comprehensive Flux dashboard
panels:
  # Panel 1: Overall Health Status
  - title: "Flux Health Overview"
    description: "Shows ready vs not-ready resources"
    type: gauge
    query: |
      sum(gotk_reconcile_condition{type="Ready",status="True"})
      /
      count(gotk_reconcile_condition{type="Ready"})
      * 100
    thresholds:
      - value: 0
        color: red
      - value: 90
        color: yellow
      - value: 99
        color: green

  # Panel 2: Reconciliation Timeline
  - title: "Reconciliation Activity"
    description: "Shows reconciliation events over time"
    type: timeseries
    query: |
      sum(rate(controller_runtime_reconcile_total[5m])) by (controller)

  # Panel 3: Failed Resources Table
  - title: "Failed Resources"
    description: "List of resources that failed to reconcile"
    type: table
    query: |
      gotk_reconcile_condition{type="Ready",status="False"} == 1

  # Panel 4: Reconciliation Duration Heatmap
  - title: "Reconciliation Duration"
    description: "Heatmap of reconciliation times"
    type: heatmap
    query: |
      sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le)
```

### Installing Community Dashboards

```bash
# Import the official Flux dashboard from Grafana
# Dashboard ID: 16714 - Flux Cluster Stats
# Dashboard ID: 16715 - Flux Control Plane

# Using Grafana CLI
grafana-cli dashboards install 16714

# Or configure via Grafana Operator
cat <<EOF | kubectl apply -f -
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: flux-cluster-stats
  namespace: monitoring
spec:
  instanceSelector:
    matchLabels:
      app: grafana
  grafanaCom:
    id: 16714
    revision: 1
EOF
```

## Alerting on Sync Failures

Proactive alerting ensures your team knows about deployment issues before they impact users.

### Prometheus Alerting Rules

```yaml
# flux-alerts.yaml
# Comprehensive alerting rules for Flux deployments
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  groups:
    - name: flux-reconciliation
      rules:
        # Alert when any resource fails to reconcile
        - alert: FluxReconciliationFailure
          expr: |
            gotk_reconcile_condition{type="Ready",status="False"} == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Flux reconciliation failed for {{ $labels.kind }}/{{ $labels.name }}"
            description: |
              The {{ $labels.kind }} {{ $labels.name }} in namespace {{ $labels.namespace }}
              has been failing to reconcile for more than 10 minutes.
            runbook_url: https://fluxcd.io/flux/components/

        # Alert when reconciliation is taking too long
        - alert: FluxReconciliationSlow
          expr: |
            histogram_quantile(0.99,
              sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind, name, namespace)
            ) > 60
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Slow Flux reconciliation for {{ $labels.kind }}/{{ $labels.name }}"
            description: |
              The 99th percentile reconciliation time for {{ $labels.kind }} {{ $labels.name }}
              is over 60 seconds.

        # Alert when resources are accidentally suspended
        - alert: FluxResourceSuspended
          expr: |
            gotk_suspend_status == 1
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Flux resource suspended: {{ $labels.kind }}/{{ $labels.name }}"
            description: |
              The {{ $labels.kind }} {{ $labels.name }} has been suspended for over 1 hour.
              This may be intentional, but verify it's not blocking deployments.

    - name: flux-sources
      rules:
        # Alert when Git repository fetch fails
        - alert: FluxSourceFetchFailure
          expr: |
            gotk_reconcile_condition{kind="GitRepository",type="Ready",status="False"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux cannot fetch Git repository {{ $labels.name }}"
            description: |
              The GitRepository {{ $labels.name }} has been failing to fetch for 5 minutes.
              Check network connectivity and credentials.

        # Alert when Helm repository is unavailable
        - alert: FluxHelmRepoUnavailable
          expr: |
            gotk_reconcile_condition{kind="HelmRepository",type="Ready",status="False"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux cannot reach Helm repository {{ $labels.name }}"
            description: |
              The HelmRepository {{ $labels.name }} is unreachable.
              Helm deployments depending on this source will fail.

    - name: flux-controllers
      rules:
        # Alert when Flux controller pods are not running
        - alert: FluxControllerDown
          expr: |
            absent(up{job=~".*flux.*"} == 1)
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller is down"
            description: |
              One or more Flux controllers are not running.
              GitOps reconciliation is not functioning.

        # Alert on high error rate
        - alert: FluxHighErrorRate
          expr: |
            sum(rate(controller_runtime_reconcile_errors_total[5m])) by (controller) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High error rate in Flux controller {{ $labels.controller }}"
            description: |
              The {{ $labels.controller }} is experiencing more than 0.1 errors per second.
```

### Alert Routing with Alertmanager

```yaml
# alertmanager-config.yaml
# Route Flux alerts to appropriate channels
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'default'
      routes:
        # Critical Flux alerts go to PagerDuty and Slack
        - match:
            severity: critical
            alertname: =~"Flux.*"
          receiver: 'flux-critical'
          continue: true
        # Warning Flux alerts go to Slack only
        - match:
            severity: warning
            alertname: =~"Flux.*"
          receiver: 'flux-warnings'

    receivers:
      - name: 'default'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/xxx'
            channel: '#alerts'

      - name: 'flux-critical'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/xxx'
            channel: '#deployments-critical'
            title: 'Flux Deployment Failure'
            text: '{{ .CommonAnnotations.description }}'
        pagerduty_configs:
          - service_key: 'your-pagerduty-key'
            severity: critical

      - name: 'flux-warnings'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/xxx'
            channel: '#deployments'
            title: 'Flux Warning'
```

## Notification Providers

Flux has a built-in notification system that can send alerts directly to various providers without requiring Alertmanager.

### Notification Architecture

```mermaid
flowchart LR
    subgraph Flux Controllers
        KC[Kustomize Controller]
        HC[Helm Controller]
        SC[Source Controller]
    end

    subgraph Notification Controller
        NC[Notification Controller]
        Alerts[Alerts CRD]
        Providers[Providers CRD]
    end

    subgraph External Services
        Slack[Slack]
        Teams[Microsoft Teams]
        Discord[Discord]
        Webhook[Generic Webhook]
        GitHub[GitHub]
        GitLab[GitLab]
    end

    KC -->|Events| NC
    HC -->|Events| NC
    SC -->|Events| NC
    NC --> Alerts
    Alerts --> Providers
    Providers --> Slack
    Providers --> Teams
    Providers --> Discord
    Providers --> Webhook
    Providers --> GitHub
    Providers --> GitLab
```

### Slack Provider Configuration

```yaml
# slack-provider.yaml
# Configure Slack as a notification provider
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  # Slack provider type
  type: slack
  # Channel to post notifications
  channel: deployments
  # Reference to secret containing webhook URL
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
  # Obtain this URL from Slack Incoming Webhooks
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Microsoft Teams Provider

```yaml
# teams-provider.yaml
# Configure Microsoft Teams notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  # Optional: customize the message card title
  address: https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK
  secretRef:
    name: teams-webhook
---
apiVersion: v1
kind: Secret
metadata:
  name: teams-webhook
  namespace: flux-system
stringData:
  address: https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK
```

### Discord Provider

```yaml
# discord-provider.yaml
# Configure Discord notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: discord
  namespace: flux-system
spec:
  type: discord
  # Discord webhook URL
  secretRef:
    name: discord-webhook
---
apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook
  namespace: flux-system
stringData:
  address: https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
```

### GitHub Commit Status Provider

```yaml
# github-provider.yaml
# Post deployment status to GitHub commits
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  # GitHub repository owner and name
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
  # GitHub Personal Access Token with repo:status permission
  token: ghp_xxxxxxxxxxxx
```

### Alert Configuration

```yaml
# alerts.yaml
# Define what events trigger notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  # Reference to the notification provider
  providerRef:
    name: slack
  # Severity filter: info, error, or both
  eventSeverity: error
  # Event sources to monitor
  eventSources:
    # Monitor all Kustomizations
    - kind: Kustomization
      name: '*'
      namespace: flux-system
    # Monitor all HelmReleases
    - kind: HelmRelease
      name: '*'
      namespace: '*'
    # Monitor all GitRepositories
    - kind: GitRepository
      name: '*'
      namespace: flux-system
  # Optional: filter events by metadata
  eventMetadata:
    # Only alert on specific clusters
    cluster: production
  # Summary template (optional)
  summary: "Flux deployment alert in production cluster"
---
# Separate alert for successful deployments (info level)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-success
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
  # Include only reconciliation success events
  inclusionList:
    - ".*succeeded.*"
```

### Generic Webhook Provider

```yaml
# webhook-provider.yaml
# Send events to any HTTP endpoint (like OneUptime)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: oneuptime-webhook
  namespace: flux-system
spec:
  type: generic-hmac
  # Your webhook endpoint
  address: https://oneuptime.com/api/webhook/flux
  secretRef:
    name: webhook-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secret
  namespace: flux-system
stringData:
  # HMAC token for webhook verification
  token: your-hmac-secret-token
```

### Complete Notification Setup Example

```yaml
# complete-notifications.yaml
# Production-ready notification configuration
---
# Slack provider for all notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-deployments
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  username: Flux Bot
  secretRef:
    name: slack-webhook
---
# GitHub status provider for commit status
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/myorg/myrepo
  secretRef:
    name: github-token
---
# Alert for deployment failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-failures
  namespace: flux-system
spec:
  summary: "Deployment failed in {{ .metadata.namespace }}"
  providerRef:
    name: slack-deployments
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: GitRepository
      name: '*'
    - kind: HelmRepository
      name: '*'
---
# Alert for deployment successes
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-success
  namespace: flux-system
spec:
  summary: "Deployment succeeded"
  providerRef:
    name: slack-deployments
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
  inclusionList:
    - ".*Reconciliation finished.*"
---
# GitHub commit status updates
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
      name: '*'
```

## OneUptime Integration

Monitor your Flux deployments alongside your application metrics in [OneUptime](https://oneuptime.com) for complete observability.

### Webhook Integration

```yaml
# oneuptime-provider.yaml
# Send Flux events to OneUptime
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: oneuptime
  namespace: flux-system
spec:
  type: generic
  address: https://oneuptime.com/api/incoming-request/YOUR_PROJECT_ID
  secretRef:
    name: oneuptime-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: oneuptime-secret
  namespace: flux-system
stringData:
  token: your-oneuptime-api-key
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: oneuptime-alerts
  namespace: flux-system
spec:
  providerRef:
    name: oneuptime
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

### Prometheus Remote Write to OneUptime

```yaml
# prometheus-remote-write.yaml
# Send Flux metrics to OneUptime
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  remoteWrite:
    - url: https://oneuptime.com/api/telemetry/metrics
      headers:
        Authorization: Bearer YOUR_ONEUPTIME_API_KEY
      writeRelabelConfigs:
        # Only send Flux-related metrics
        - sourceLabels: [__name__]
          regex: '(gotk_.*|flux_.*|controller_runtime_.*)'
          action: keep
```

## Best Practices Summary

Following these best practices will ensure your Flux monitoring is reliable and actionable:

1. **Enable metrics on all controllers** - Ensure every Flux controller exposes metrics for comprehensive visibility.

2. **Use multiple alert severities** - Distinguish between critical failures that need immediate attention and warnings that can wait.

3. **Set appropriate alert thresholds** - Avoid alert fatigue by tuning `for` durations and thresholds based on your deployment patterns.

4. **Monitor source availability** - Git and Helm repository connectivity issues often precede deployment failures.

5. **Track reconciliation duration** - Slow reconciliations may indicate resource constraints or complex deployments.

6. **Alert on suspended resources** - Resources suspended for debugging can be forgotten; set alerts as reminders.

7. **Use multiple notification channels** - Critical alerts should go to PagerDuty/OpsGenie, while informational alerts can go to Slack.

8. **Include runbook URLs** - Every alert should link to documentation on how to investigate and resolve the issue.

9. **Test your alerts regularly** - Periodically verify that notifications are being delivered correctly.

10. **Correlate with application metrics** - Use OneUptime to view Flux deployment events alongside application performance metrics.

---

Effective monitoring transforms Flux from a deployment tool into a reliable GitOps platform. By combining CLI commands for manual checks, Prometheus metrics for detailed analysis, and notifications for proactive alerting, you build confidence that your deployments are working as expected.

Start with basic health checks and gradually add more sophisticated monitoring as your GitOps practice matures. The investment in observability pays dividends when you catch deployment issues before they impact your users.

For a complete observability solution that integrates Flux monitoring with application metrics, logs, and traces, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that brings all your monitoring data together.
