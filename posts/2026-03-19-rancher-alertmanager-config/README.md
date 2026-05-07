# How to Set Up Alertmanager Configuration in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Alertmanager, Alerting

Description: A comprehensive guide to configuring Alertmanager in Rancher including routing, receivers, inhibition rules, and silences.

Alertmanager is the component of the Prometheus ecosystem responsible for handling alerts sent by Prometheus. It manages deduplication, grouping, routing, and delivery of alerts to notification channels. This guide covers all aspects of Alertmanager configuration in Rancher.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- At least one notification channel endpoint (email, Slack, PagerDuty, or webhook).

## Understanding Alertmanager Architecture

Alertmanager receives alerts from Prometheus and processes them through:

1. **Grouping** - Combines related alerts into a single notification.
2. **Inhibition** - Suppresses certain alerts when other alerts are firing.
3. **Silencing** - Temporarily mutes specific alerts.
4. **Routing** - Directs alerts to appropriate receivers based on labels.
5. **Notification** - Sends alerts to configured channels.

## Step 1: Access Alertmanager Configuration

In Rancher, Alertmanager is configured through the monitoring Helm chart values. To modify the configuration:

1. Go to **Apps & Marketplace > Installed Apps**.
2. Find `rancher-monitoring` and click the three-dot menu.
3. Select **Upgrade** and switch to YAML view.

Alternatively, you can directly inspect the Alertmanager secret:

```bash
kubectl get secret alertmanager-rancher-monitoring-alertmanager \
  -n cattle-monitoring-system \
  -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d
```

## Step 2: Configure the Global Section

Global settings apply to all receivers:

```yaml
alertmanager:
  config:
    global:
      resolve_timeout: 5m
      smtp_from: "alerts@example.com"
      smtp_smarthost: "smtp.example.com:587"
      smtp_auth_username: "alerts@example.com"
      smtp_require_tls: true
      slack_api_url: "https://hooks.slack.com/services/..."
      pagerduty_url: "https://events.pagerduty.com/v2/enqueue"
```

The `resolve_timeout` determines how long Alertmanager waits before marking an alert as resolved if it stops receiving updates.

## Step 3: Configure the Routing Tree

The routing tree determines which receiver handles each alert. Routes are evaluated top-down. By default, Alertmanager stops after the first matching sibling route unless `continue: true` is set:

```yaml
alertmanager:
  config:
    route:
      receiver: "default-receiver"
      group_by:
        - alertname
        - namespace
        - cluster
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      routes:
        # Critical alerts go to PagerDuty and Slack
        - receiver: "critical-alerts"
          matchers:
            - severity = critical
          group_wait: 10s
          repeat_interval: 1h
          continue: false

        # Warning alerts go to Slack only
        - receiver: "warning-alerts"
          matchers:
            - severity = warning
          repeat_interval: 4h

        # Team-specific routing
        - receiver: "platform-team"
          matchers:
            - team = platform
          routes:
            - receiver: "platform-critical"
              matchers:
                - severity = critical

        - receiver: "app-team"
          matchers:
            - team = application

        # Namespace-specific routing
        - receiver: "production-alerts"
          matchers:
            - namespace =~ "production|prod-.*"
```

Key routing parameters:
- **group_by**: Labels used to group alerts together.
- **group_wait**: How long to wait before sending the first notification for a new group.
- **group_interval**: How long to wait before sending updates about new alerts in an existing group.
- **repeat_interval**: How long to wait before re-sending a notification for a firing alert.
- **continue**: If true, continue evaluating sibling routes after matching.

## Step 4: Configure Receivers

Define multiple receivers for different notification channels:

```yaml
alertmanager:
  config:
    receivers:
      - name: "default-receiver"
        email_configs:
          - to: "ops@example.com"
            send_resolved: true

      - name: "critical-alerts"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/pagerduty-key/key
            severity: critical
            send_resolved: true
        slack_configs:
          - channel: "#critical-alerts"
            send_resolved: true
            title: ':red_circle: {{ .CommonLabels.alertname }}'
            text: '{{ .CommonAnnotations.summary }}'

      - name: "warning-alerts"
        slack_configs:
          - channel: "#warnings"
            send_resolved: true

      - name: "platform-team"
        slack_configs:
          - channel: "#platform-alerts"
        email_configs:
          - to: "platform@example.com"

      - name: "platform-critical"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/pd-platform/key
        slack_configs:
          - channel: "#platform-critical"

      - name: "app-team"
        slack_configs:
          - channel: "#app-alerts"

      - name: "production-alerts"
        slack_configs:
          - channel: "#production"
        email_configs:
          - to: "production-oncall@example.com"
```

## Step 5: Configure Inhibition Rules

Inhibition rules suppress notifications for lower-severity alerts when a higher-severity alert is already firing:

```yaml
alertmanager:
  config:
    inhibit_rules:
      # Suppress warnings when critical alerts fire for the same alertname
      - source_matchers:
          - severity = critical
        target_matchers:
          - severity = warning
        equal:
          - alertname
          - namespace

      # Suppress all alerts for a namespace when the namespace itself is failing
      - source_matchers:
          - alertname = NamespaceDown
        target_matchers:
          - severity =~ "warning|info"
        equal:
          - namespace

      # Suppress pod alerts when node is down
      - source_matchers:
          - alertname = NodeDown
        target_matchers:
          - alertname =~ "Pod.*"
        equal:
          - node
```

## Step 6: Configure Silences

Silences temporarily mute alerts during maintenance windows or known issues.

### Via the Alertmanager UI

1. Open Alertmanager from **Monitoring > Alertmanager** in Rancher.
2. Go to the **Silences** tab.
3. Click **New Silence**.
4. Set matchers (label/value pairs) to match the alerts you want to silence.
5. Set a start time, duration, and add a comment explaining the reason.
6. Click **Create**.

### Via the API

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093

curl -X POST http://localhost:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {"name": "alertname", "value": "HighCPU", "isRegex": false},
      {"name": "namespace", "value": "staging", "isRegex": false}
    ],
    "startsAt": "2026-03-19T10:00:00Z",
    "endsAt": "2026-03-19T12:00:00Z",
    "createdBy": "admin",
    "comment": "Scheduled maintenance window"
  }'
```

## Step 7: Configure Alertmanager Resource Limits

Set appropriate resources for Alertmanager:

```yaml
alertmanager:
  alertmanagerSpec:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    storage:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
    replicas: 3
    retention: 120h
```

Running multiple replicas provides high availability. Alertmanager instances communicate via a mesh to deduplicate notifications.

## Step 8: Configure Time-Based Routing

Route alerts differently based on time (business hours vs. off-hours):

```yaml
alertmanager:
  config:
    route:
      receiver: "default-receiver"
      routes:
        - receiver: "warning-alerts"
          matchers:
            - severity = warning
          active_time_intervals:
            - business-hours
        - receiver: "critical-alerts"
          matchers:
            - severity = critical

    time_intervals:
      - name: business-hours
        time_intervals:
          - weekdays: ['monday:friday']
            times:
              - start_time: '09:00'
                end_time: '17:00'
```

## Step 9: Verify the Configuration

Check the active Alertmanager configuration:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093
```

Open `http://localhost:9093/#/status` to see the current configuration.

Test alert routing by checking which receiver an alert would match:

```bash
# Amtool can check routing

kubectl exec -it alertmanager-rancher-monitoring-alertmanager-0 \
  -n cattle-monitoring-system \
  -c alertmanager -- \
  amtool config routes test --config.file=/etc/alertmanager/config/alertmanager.yaml \
  severity=critical namespace=production
```

## Step 10: Monitor Alertmanager Itself

Set up alerts for Alertmanager issues:

```yaml
- alert: AlertmanagerFailedNotifications
  expr: rate(alertmanager_notifications_failed_total[5m]) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Alertmanager is failing to send notifications"

- alert: AlertmanagerMembersInconsistent
  expr: |
    max_over_time(alertmanager_cluster_members[5m])
      < on (namespace, service, cluster) group_left
    count by (namespace, service, cluster) (
      max_over_time(alertmanager_cluster_members[5m])
    )
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "An Alertmanager cluster member cannot see all expected peers"
```

## Summary

Alertmanager configuration in Rancher involves defining a routing tree, receivers, inhibition rules, and silences. The routing tree determines which alerts go to which notification channels based on label matching. Inhibition rules reduce alert noise by suppressing related lower-severity alerts, and silences provide temporary muting during maintenance. Always test your configuration by verifying routes and sending test alerts.
