# How to Configure Alertmanager on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Alertmanager, Prometheus, Monitoring, Kubernetes, Alerting

Description: A detailed guide to configuring Alertmanager on Talos Linux for routing, grouping, and delivering alerts from Prometheus to your notification channels.

---

Collecting metrics with Prometheus is only half the monitoring story. The other half is knowing when something goes wrong, and that is where Alertmanager comes in. Alertmanager receives alerts from Prometheus, groups related alerts together, deduplicates them, and routes them to the right notification channels - Slack, email, PagerDuty, OpsGenie, or webhooks. On Talos Linux, Alertmanager runs as a Kubernetes workload and is typically deployed alongside Prometheus as part of the monitoring stack.

This guide covers the complete Alertmanager configuration on Talos Linux, from installation to advanced routing, silencing, and integration with notification services.

## How Alertmanager Works

The alerting pipeline has three stages:

1. **Prometheus** evaluates alerting rules against collected metrics. When a rule condition is true for the specified duration, Prometheus fires an alert to Alertmanager.
2. **Alertmanager** receives alerts, groups them by labels, waits for related alerts to arrive (grouping), and routes them to the appropriate receiver based on matching rules.
3. **Receivers** are the notification channels - Slack, email, PagerDuty, webhooks, etc.

Alertmanager also handles:
- **Deduplication**: The same alert from multiple Prometheus replicas is sent once
- **Silencing**: Temporarily mute specific alerts during maintenance
- **Inhibition**: Suppress less important alerts when a critical alert is firing

## Prerequisites

You need:

- A Talos Linux cluster with Prometheus running
- `kubectl` configured for the cluster
- Notification channel credentials (Slack webhook URL, email settings, etc.)

```bash
# Verify Prometheus is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
```

## Installing Alertmanager

If you deployed Prometheus using the kube-prometheus-stack, Alertmanager is already included. For a standalone installation:

```bash
# Add the Prometheus community repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Alertmanager standalone
helm install alertmanager prometheus-community/alertmanager \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=5Gi \
  --set service.type=NodePort \
  --set service.nodePort=31093
```

## Basic Configuration

Alertmanager configuration has four main sections: global settings, route tree, receivers, and inhibition rules.

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

    route:
      receiver: 'default-slack'
      group_by: ['alertname', 'namespace', 'job']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty-critical'
        group_wait: 10s
        repeat_interval: 1h
      - match:
          severity: warning
        receiver: 'slack-warnings'
        repeat_interval: 12h
      - match_re:
          namespace: 'production|staging'
        receiver: 'team-platform'

    receivers:
    - name: 'default-slack'
      slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
          *Alert:* {{ .Labels.alertname }}
          *Severity:* {{ .Labels.severity }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

    - name: 'pagerduty-critical'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        severity: '{{ .CommonLabels.severity }}'

    - name: 'slack-warnings'
      slack_configs:
      - channel: '#warnings'
        send_resolved: true

    - name: 'team-platform'
      slack_configs:
      - channel: '#platform-alerts'
        send_resolved: true

    inhibit_rules:
    - source_match:
        severity: 'critical'
      target_match:
        severity: 'warning'
      equal: ['alertname', 'namespace']
```

## Understanding the Route Tree

The route tree determines where alerts go. It works like a decision tree:

```yaml
route:
  # Default receiver if no child route matches
  receiver: 'default-slack'

  # Group alerts by these labels
  group_by: ['alertname', 'namespace']

  # Wait this long for more alerts to arrive before sending
  group_wait: 30s

  # Wait this long between sending group updates
  group_interval: 5m

  # Wait this long before re-sending the same alert
  repeat_interval: 4h

  # Child routes (evaluated in order)
  routes:
  # Critical alerts to PagerDuty
  - match:
      severity: critical
    receiver: 'pagerduty-critical'
    continue: false  # Stop evaluating if this matches

  # Database alerts to the DBA team
  - match_re:
      alertname: '(Postgres|MySQL|Redis).*'
    receiver: 'dba-team'
    group_by: ['alertname', 'instance']

  # Namespace-specific routing
  - match:
      namespace: 'team-a'
    receiver: 'team-a-slack'
  - match:
      namespace: 'team-b'
    receiver: 'team-b-slack'
```

## Configuring Receivers

### Slack

```yaml
receivers:
- name: 'slack-alerts'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/T00/B00/XXX'
    channel: '#alerts'
    send_resolved: true
    title: '{{ template "slack.title" . }}'
    text: '{{ template "slack.text" . }}'
    color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
    actions:
    - type: button
      text: 'View in Prometheus'
      url: '{{ (index .Alerts 0).GeneratorURL }}'
    - type: button
      text: 'Silence'
      url: 'http://alertmanager.example.com/#/silences/new'
```

### Email

```yaml
receivers:
- name: 'email-alerts'
  email_configs:
  - to: 'oncall@example.com'
    from: 'alertmanager@example.com'
    smarthost: 'smtp.example.com:587'
    auth_username: 'alertmanager@example.com'
    auth_password: 'smtp-password'
    send_resolved: true
    headers:
      Subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
```

### PagerDuty

```yaml
receivers:
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: 'YOUR_SERVICE_KEY'
    severity: '{{ .CommonLabels.severity }}'
    description: '{{ .CommonAnnotations.summary }}'
    details:
      alertname: '{{ .CommonLabels.alertname }}'
      namespace: '{{ .CommonLabels.namespace }}'
```

### Webhook (Generic)

```yaml
receivers:
- name: 'webhook'
  webhook_configs:
  - url: 'http://alert-handler.default.svc.cluster.local:8080/alerts'
    send_resolved: true
    max_alerts: 10
```

## Creating Alerting Rules in Prometheus

Define what triggers alerts using PrometheusRule resources:

```yaml
# alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-health-rules
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
  - name: node-health
    rules:
    - alert: NodeNotReady
      expr: kube_node_status_condition{condition="Ready",status="true"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} is not ready"
        description: "Node has been in NotReady state for more than 5 minutes"

    - alert: NodeHighCPU
      expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage on {{ $labels.instance }}"
        description: "CPU usage is {{ $value }}%"

    - alert: NodeHighMemory
      expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "High memory usage on {{ $labels.instance }}"
        description: "Memory usage is {{ $value }}%"

  - name: pod-health
    rules:
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"

    - alert: PodNotReady
      expr: kube_pod_status_ready{condition="true"} == 0
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is not ready"
```

## Managing Silences

Silences temporarily suppress alerts during maintenance windows:

```bash
# Access Alertmanager UI
kubectl port-forward -n monitoring svc/alertmanager-operated 9093:9093

# Create a silence via API
curl -X POST http://localhost:9093/api/v2/silences -d '{
  "matchers": [
    {"name": "alertname", "value": "NodeHighCPU", "isRegex": false},
    {"name": "instance", "value": "node-1", "isRegex": false}
  ],
  "startsAt": "2026-03-03T00:00:00Z",
  "endsAt": "2026-03-03T06:00:00Z",
  "createdBy": "admin",
  "comment": "Planned maintenance on node-1"
}'

# List active silences
curl http://localhost:9093/api/v2/silences
```

## Inhibition Rules

Inhibition rules suppress less important alerts when a more important one is active:

```yaml
inhibit_rules:
# If a node is down, suppress all warnings from that node
- source_match:
    severity: 'critical'
    alertname: 'NodeDown'
  target_match:
    severity: 'warning'
  equal: ['instance']

# If the cluster is unhealthy, suppress individual pod alerts
- source_match:
    alertname: 'ClusterUnhealthy'
  target_match_re:
    alertname: 'Pod.*'
```

## Testing Alertmanager

Verify your configuration works:

```bash
# Check Alertmanager configuration
kubectl exec -n monitoring alertmanager-kube-prometheus-stack-alertmanager-0 -- \
  amtool check-config /etc/alertmanager/config/alertmanager.yaml

# Send a test alert
curl -X POST http://localhost:9093/api/v2/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "namespace": "default"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }
]'

# Check active alerts
curl http://localhost:9093/api/v2/alerts
```

## Talos Linux Notes

On Talos Linux, Alertmanager stores its state (silences and notification history) in a persistent volume. Make sure your StorageClass is reliable. Also, since Talos nodes do not have email or notification tools installed, all alerting must go through Alertmanager running inside the cluster.

```bash
# Check Alertmanager health
kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager

# Check persistent storage
kubectl get pvc -n monitoring -l app.kubernetes.io/name=alertmanager
```

## Conclusion

Alertmanager on Talos Linux completes your monitoring pipeline by turning Prometheus alerts into actionable notifications. The routing tree gives you flexible control over where alerts go, inhibition rules prevent alert fatigue, and silences handle planned maintenance gracefully. By combining well-crafted alerting rules with thoughtful routing and notification configuration, you build a system that notifies the right people about the right problems at the right time, which is essential for keeping your Talos Linux infrastructure running reliably.
