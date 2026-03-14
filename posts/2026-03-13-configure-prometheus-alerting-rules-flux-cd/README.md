# Configure Prometheus Alerting Rules with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, prometheus, alerting, monitoring, kubernetes, gitops

Description: Learn how to manage Prometheus alerting rules as code using Flux CD, enabling GitOps-driven alert management with automatic reconciliation and version control.

---

## Introduction

Prometheus alerting rules define the conditions under which your monitoring system fires alerts to operators. Managing these rules as code in Git, deployed through Flux CD, ensures they are reviewed, versioned, and consistently applied—eliminating the risk of misconfigured or undocumented alerts in production.

When you store Prometheus rules in Git and use Flux to deploy them via PrometheusRule custom resources, any changes go through your standard pull request workflow. This means alert changes are reviewed by teammates before they affect production, and you can instantly roll back a flawed alert rule by reverting a commit.

This guide covers creating PrometheusRule resources, organizing them by team or service, and deploying them through Flux CD Kustomizations.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped
- Prometheus Operator installed (kube-prometheus-stack recommended)
- Git repository connected to Flux
- `flux` CLI installed

## Step 1: Create a PrometheusRule Resource

Define alerting rules using the Prometheus Operator's PrometheusRule CRD.

```yaml
# infrastructure/monitoring/rules/api-alerts.yaml
# PrometheusRule defining alerting rules for the API service
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-service-alerts
  namespace: monitoring
  labels:
    # This label must match the Prometheus Operator's ruleSelector
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: api.availability
    # Evaluate these rules every 30 seconds
    interval: 30s
    rules:
    # Alert when API error rate exceeds 5% over 5 minutes
    - alert: APIHighErrorRate
      expr: |
        (
          rate(http_requests_total{job="api",status=~"5.."}[5m])
          /
          rate(http_requests_total{job="api"}[5m])
        ) > 0.05
      for: 5m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "API error rate is above 5%"
        description: "The API error rate is {{ $value | humanizePercentage }} over the last 5 minutes."
        runbook_url: "https://wiki.example.com/runbooks/api-high-error-rate"

    # Alert when API p99 latency exceeds 500ms
    - alert: APIHighLatency
      expr: |
        histogram_quantile(0.99,
          rate(http_request_duration_seconds_bucket{job="api"}[5m])
        ) > 0.5
      for: 10m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "API p99 latency is above 500ms"
        description: "The 99th percentile API latency is {{ $value | humanizeDuration }}"
```

## Step 2: Add Infrastructure Alerting Rules

Create separate PrometheusRules for infrastructure-level alerts.

```yaml
# infrastructure/monitoring/rules/infra-alerts.yaml
# PrometheusRule for infrastructure health alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: infrastructure-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: kubernetes.nodes
    rules:
    # Alert when a node is not ready for more than 5 minutes
    - alert: NodeNotReady
      expr: kube_node_status_condition{condition="Ready",status="true"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes node {{ $labels.node }} is not ready"
        description: "Node {{ $labels.node }} has been in NotReady state for more than 5 minutes."

    # Alert when node disk usage exceeds 85%
    - alert: NodeDiskPressure
      expr: |
        (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.instance }} disk usage above 85%"
        description: "Disk usage on {{ $labels.instance }} is {{ $value | humanizePercentage }} full."
```

## Step 3: Organize Rules with Flux Kustomization

Use a Flux Kustomization to deploy all alerting rules from a directory.

```yaml
# infrastructure/monitoring/rules/kustomization.yaml
# Kustomize manifest bundling all PrometheusRule resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-alerts.yaml
  - infra-alerts.yaml
  # Add new alert files here as your rule library grows
```

```yaml
# clusters/production/monitoring-kustomization.yaml
# Flux Kustomization deploying all Prometheus alerting rules
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-rules
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/monitoring/rules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Ensure Prometheus is running before applying rules
  dependsOn:
    - name: kube-prometheus-stack
```

## Step 4: Validate Alerting Rules

After deployment, verify that Prometheus has loaded the rules correctly.

```bash
# Check that PrometheusRule resources are created
kubectl get prometheusrules -n monitoring

# Verify Prometheus has loaded the rules (port-forward to Prometheus UI)
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Query the Prometheus rules API to confirm rules are loaded
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[].name'

# Trigger a test alert (temporarily change threshold to force firing)
# Check the alerts page: http://localhost:9090/alerts

# Verify Flux is reconciling the rules correctly
flux get kustomization prometheus-rules
```

## Best Practices

- Group alerting rules by service or team to keep PrometheusRule files focused and reviewable
- Always include `runbook_url` annotations pointing to documentation for each alert
- Use `for` duration to avoid false positives from transient spikes; at least 5 minutes for most alerts
- Test new alert expressions in Prometheus's expression browser before committing them to Git
- Apply different severity labels (`critical`, `warning`, `info`) and route them to appropriate notification channels

## Conclusion

Managing Prometheus alerting rules through Flux CD brings software engineering best practices to your monitoring infrastructure. Version control, code review, and automatic reconciliation ensure that alert definitions are accurate, documented, and consistently deployed. This approach transforms alert management from ad-hoc configuration into a reliable engineering process that scales with your organization.
