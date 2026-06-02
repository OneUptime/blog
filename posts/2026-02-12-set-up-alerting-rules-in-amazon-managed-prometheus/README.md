# How to Set Up Alerting Rules in Amazon Managed Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Prometheus, Alerting, AMP, Monitoring, SNS, Observability

Description: Configure alerting rules in Amazon Managed Prometheus to detect issues and route alerts through Amazon SNS for notification delivery

---

Collecting metrics is only half of monitoring. The other half is knowing when those metrics indicate a problem. Amazon Managed Prometheus (AMP) supports alerting rules that continuously evaluate PromQL expressions and fire alerts when conditions are met.

AMP alerting rules work the same way as open-source Prometheus alerting rules. You define conditions using PromQL, set duration thresholds, and route alerts to an alert manager. In Amazon Managed Service for Prometheus, alert manager can route notifications to Amazon SNS, where you can fan them out to email, SMS, Lambda, or other subscribers.

This guide covers creating alerting rules in AMP, configuring the alert manager, and building rules for common production scenarios.

## How AMP Alerting Works

```mermaid
flowchart LR
    A[AMP Workspace] -->|Evaluates Rules| B{Alert Condition Met?}
    B -->|Yes, for duration| C[Fire Alert]
    B -->|No| D[No Action]
    C -->|Route| E[AMP Alert Manager]
    E --> F[SNS Topic]
    F --> I[Email / SMS / Lambda]
```

AMP evaluates alerting rules at regular intervals (typically every 60 seconds). When a rule's PromQL expression returns a non-empty result, the alert enters a "pending" state. If the condition persists for the configured `for` duration, the alert fires and is sent to the alert manager.

## Step 1: Create a Rules Namespace

AMP organizes alerting and recording rules into namespaces (also called rule group namespaces). Think of these as files that contain groups of related rules.

```bash
# Create a rule group namespace with alerting rules

aws amp create-rule-groups-namespace \
  --workspace-id ws-abc123-def456 \
  --name "production-alerts" \
  --data "$(base64 -w0 <<'EOF'
groups:
  - name: application_alerts
    interval: 60s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5..", namespace="production"}[5m]))
          /
          sum(rate(http_requests_total{namespace="production"}[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} in production namespace"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket{namespace="production"}[5m])) by (le, service)
          ) > 2
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High p99 latency for {{ $labels.service }}"
          description: "p99 latency is {{ $value | humanizeDuration }} for {{ $labels.service }}"
EOF
)"
```

Note: AWS CLI v2 expects blob parameters to be passed as base64-encoded strings by default. For larger rules files, base64-encode the YAML first and pass the encoded file with `file://`.

```bash
# Alternative: using a file
base64 -w0 alerting-rules.yaml > alerting-rules.yaml.b64

aws amp create-rule-groups-namespace \
  --workspace-id ws-abc123-def456 \
  --name "production-alerts" \
  --data file://alerting-rules.yaml.b64
```

## Step 2: Define Common Alerting Rules

Here is a comprehensive set of rules for a production Kubernetes environment.

### Application Health Rules

```yaml
groups:
  - name: application_health
    interval: 60s
    rules:
      # High error rate per service
      - alert: ServiceHighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.service }} has high error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Service is completely down
      - alert: ServiceDown
        expr: up{job="kubernetes-pods"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "Prometheus cannot scrape {{ $labels.instance }}"

      # Slow response times
      - alert: ServiceHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Service {{ $labels.service }} has high latency"
          description: "p95 latency is {{ $value }}s"

      # Request rate dropped significantly
      - alert: ServiceLowTraffic
        expr: |
          sum(rate(http_requests_total[5m])) by (service)
          < 0.1
          and
          sum(rate(http_requests_total[5m] offset 1h)) by (service)
          > 1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Traffic to {{ $labels.service }} dropped significantly"
```

### Kubernetes Infrastructure Rules

```yaml
  - name: kubernetes_infrastructure
    interval: 60s
    rules:
      # Pod crash looping
      - alert: PodCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total[1h]) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} restarted {{ $value }} times in the last hour"

      # Pod stuck in non-running state
      - alert: PodNotReady
        expr: |
          kube_pod_status_phase{phase=~"Pending|Unknown"} == 1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} is not ready"
          description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} has been in {{ $labels.phase }} state for 15 minutes"

      # Deployment replica mismatch
      - alert: DeploymentReplicasMismatch
        expr: |
          kube_deployment_spec_replicas
          -
          kube_deployment_status_replicas_available
          != 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Deployment {{ $labels.deployment }} replica mismatch"
          description: "Deployment {{ $labels.deployment }} available replicas differ from the spec by {{ $value }}"
```

Resource Utilization Rules

```yaml
  - name: resource_utilization
    interval: 60s
    rules:
      # High CPU usage on pod
      - alert: PodHighCPU
        expr: |
          sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)
          /
          sum(kube_pod_container_resource_limits{namespace="production", resource="cpu"}) by (pod)
          > 0.9
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} CPU usage above 90%"

      # High memory usage on pod
      - alert: PodHighMemory
        expr: |
          sum(container_memory_working_set_bytes{namespace="production"}) by (pod)
          /
          sum(kube_pod_container_resource_limits{namespace="production", resource="memory"}) by (pod)
          > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} memory usage above 90%"

      # Node disk space low
      - alert: NodeDiskSpaceLow
        expr: |
          (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"})
          / node_filesystem_size_bytes{mountpoint="/"} > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.instance }} disk usage above 85%"
```

## Step 3: Configure Alert Routing with Alert Manager

AMP fires alerts, but you need an alert manager definition to route them to notification channels. Amazon Managed Service for Prometheus alert manager supports Amazon SNS as a receiver.

### SNS Receiver

Configure an SNS receiver in your alert manager definition.

```yaml
alertmanager_config: |
  route:
    receiver: sns-default
    routes:
      - receiver: sns-critical
        matchers:
          - severity="critical"
      - receiver: sns-default
        matchers:
          - severity="warning"

  receivers:
    - name: sns-default
      sns_configs:
        - sigv4:
            region: us-east-1
          topic_arn: arn:aws:sns:us-east-1:123456789012:warning-alerts
          subject: 'AMP alert: {{ .CommonLabels.alertname }}'
    - name: sns-critical
      sns_configs:
        - sigv4:
            region: us-east-1
          topic_arn: arn:aws:sns:us-east-1:123456789012:critical-alerts
          subject: 'AMP alert: {{ .CommonLabels.alertname }}'
```

### Routing Configuration

Upload the alert manager definition to AMP. As with rule files, AWS CLI v2 expects a base64-encoded file for this blob parameter.

```bash
base64 -w0 alertmanager.yaml > alertmanager.yaml.b64

aws amp create-alert-manager-definition \
  --workspace-id ws-abc123-def456 \
  --data file://alertmanager.yaml.b64
```

## Step 4: Update and Manage Rules

### Listing Rules

```bash
# List all rule group namespaces
aws amp list-rule-groups-namespaces \
  --workspace-id ws-abc123-def456

# Describe a specific rule group namespace
aws amp describe-rule-groups-namespace \
  --workspace-id ws-abc123-def456 \
  --name "production-alerts"
```

### Updating Rules

```bash
# Update rules (replaces the entire namespace)
aws amp put-rule-groups-namespace \
  --workspace-id ws-abc123-def456 \
  --name "production-alerts" \
  --data "$(base64 -w0 updated-rules.yaml)"
```

### Deleting Rules

```bash
# Delete a rule group namespace
aws amp delete-rule-groups-namespace \
  --workspace-id ws-abc123-def456 \
  --name "production-alerts"
```

## Step 5: Verify Rules Are Working

Check that your rules are being evaluated correctly.

```bash
# Query the rules API
awscurl --service aps \
  --region us-east-1 \
  "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123/api/v1/rules"

# Check current alerts
awscurl --service aps \
  --region us-east-1 \
  "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123/api/v1/alerts"
```

In Managed Grafana, configure an Alertmanager data source for your AMP workspace to see AMP alert rules, alert groups, and silences in Grafana's Alerting page.

## Best Practices for Alerting Rules

**Set appropriate `for` durations**: A 1-minute `for` duration will generate noisy alerts from brief spikes. Start with 5-10 minutes for most alerts and adjust based on your experience.

**Use severity labels consistently**: Define severity levels (critical, warning, info) and route them to appropriate SNS topics or subscribers. Critical alerts page on-call engineers. Warnings can go to lower-urgency notification paths. Info goes to a dashboard.

**Include useful annotations**: The description annotation should tell the on-call engineer what is wrong and ideally what to do about it. Include the current value using `{{ $value }}`.

**Avoid alerting on symptoms and causes simultaneously**: If high error rate and pod crash looping are related, the crash looping alert is the cause. Alert on both but group them so the on-call engineer sees the relationship.

**Test with `absent()`**: Use the `absent()` function to alert when expected metrics are missing.

```yaml
- alert: MetricsMissing
  expr: absent(http_requests_total{service="order-api"})
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "No metrics from order-api"
    description: "Prometheus is not receiving metrics from order-api. The service may be down or scraping may be broken."
```

For more PromQL patterns to use in your rules, see our guide on [using PromQL queries in Amazon Managed Prometheus](https://oneuptime.com/blog/post/2026-02-12-use-promql-queries-in-amazon-managed-prometheus/view).

## Wrapping Up

Alerting rules in AMP turn passive monitoring into active incident detection. Define rules using the same PromQL queries you use in dashboards, route them through AMP alert manager, and deliver notifications through SNS. The key to effective alerting is starting conservatively, with high thresholds and long durations, then tightening as you learn your system's normal behavior. Too many false positives will train your team to ignore alerts, which defeats the entire purpose.
