# How to Use PagerDuty with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PagerDuty, Prometheus, Alertmanager, Incident Management, On-call, Monitoring, DevOps, SRE

Description: Learn how to integrate Prometheus Alertmanager with PagerDuty for automated incident management and on-call alerting.

---

> The most effective incident response starts with the right alert reaching the right person at the right time. Integrating Prometheus with PagerDuty ensures your monitoring data triggers actionable incidents that your on-call team can resolve quickly.

---

## Why integrate Prometheus with PagerDuty

Prometheus excels at collecting metrics and evaluating alert rules, but it was not designed to manage on-call rotations, escalation policies, or incident tracking. PagerDuty fills that gap by providing:

- On-call scheduling and automatic escalations
- Multi-channel notifications (push, SMS, phone, email)
- Incident deduplication and grouping
- Runbook links and contextual information for responders
- Analytics and reporting on incident patterns

By connecting Alertmanager to PagerDuty, you get the best of both worlds: Prometheus handles metric collection and alert evaluation, while PagerDuty handles incident lifecycle management.

---

## Setting up the PagerDuty integration

Before configuring Alertmanager, you need to create a service in PagerDuty and obtain an integration key.

### Step 1: Create a PagerDuty service

1. Log in to PagerDuty and navigate to **Services** in the top menu.
2. Click **New Service** and provide a name (for example, "Prometheus Alerts").
3. Assign an escalation policy that defines who gets notified and in what order.
4. Under **Integrations**, select **Events API v2** as the integration type.
5. Complete the setup and copy the **Integration Key** (also called Routing Key).

Keep this key secure. Anyone with access to it can trigger incidents in your PagerDuty account.

---

## Configuring Alertmanager for PagerDuty

Alertmanager acts as the bridge between Prometheus and PagerDuty. You configure it to receive alerts from Prometheus and route them to PagerDuty based on labels and severity.

### Basic Alertmanager configuration

Create or update your `alertmanager.yml` file with the following structure:

```yaml
# alertmanager.yml
# Basic configuration for routing Prometheus alerts to PagerDuty

global:
  # Default settings applied to all receivers unless overridden
  resolve_timeout: 5m

# Define notification receivers
receivers:
  # PagerDuty receiver for critical alerts
  - name: 'pagerduty-critical'
    pagerduty_configs:
      # Integration key from PagerDuty Events API v2
      - routing_key: 'your-pagerduty-integration-key'
        # Send resolved notifications when alerts clear
        send_resolved: true
        # Use the alertname as the incident description
        description: '{{ .CommonAnnotations.summary }}'

  # Fallback receiver for non-critical alerts (optional)
  - name: 'default'
    # Configure email, Slack, or other receivers here

# Define the routing tree
route:
  # Default receiver if no other routes match
  receiver: 'default'
  # How long to wait before sending notifications for a group
  group_wait: 30s
  # How long to wait before sending updated notifications
  group_interval: 5m
  # How long to wait before repeating notifications
  repeat_interval: 4h
  # Group alerts by these labels
  group_by: ['alertname', 'cluster', 'service']
```

---

## Routing rules for different alert types

Alertmanager uses a hierarchical routing tree to direct alerts to the appropriate receiver. You can create sophisticated routing logic based on alert labels.

### Multi-tier routing configuration

```yaml
# alertmanager.yml
# Advanced routing configuration with multiple tiers

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'namespace']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  # Child routes evaluated in order; first match wins
  routes:
    # Route critical alerts to PagerDuty immediately
    - receiver: 'pagerduty-critical'
      matchers:
        - severity = critical
      # Override timing for critical alerts
      group_wait: 10s
      repeat_interval: 1h
      # Continue evaluating child routes for additional matching
      continue: false

    # Route high-severity alerts to PagerDuty during business hours only
    - receiver: 'pagerduty-high'
      matchers:
        - severity = high
      # Use time-based muting for off-hours (optional, requires mute_time_intervals)
      active_time_intervals:
        - business-hours

    # Route warning alerts to a separate channel
    - receiver: 'slack-warnings'
      matchers:
        - severity = warning
      group_wait: 1m
      repeat_interval: 24h

    # Route database alerts to the DBA on-call team
    - receiver: 'pagerduty-dba'
      matchers:
        - team = database
      continue: false

    # Route infrastructure alerts to the platform team
    - receiver: 'pagerduty-platform'
      matchers:
        - team = platform

# Define time intervals for time-based routing
time_intervals:
  - name: business-hours
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '17:00'
```

---

## Mapping Prometheus severity to PagerDuty

PagerDuty supports four severity levels: critical, error, warning, and info. You can map your Prometheus alert severity labels directly to PagerDuty severity.

### Severity mapping configuration

```yaml
# alertmanager.yml
# Configure severity mapping for PagerDuty

receivers:
  - name: 'pagerduty-all'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-integration-key'
        send_resolved: true

        # Map Prometheus severity label to PagerDuty severity
        # Supported values: critical, error, warning, info
        severity: '{{ .CommonLabels.severity }}'

        # Fallback severity if label is missing
        # Use template logic to provide defaults
        # severity: '{{ if .CommonLabels.severity }}{{ .CommonLabels.severity }}{{ else }}warning{{ end }}'

        # Client identifier shown in PagerDuty
        client: 'Prometheus Alertmanager'
        client_url: 'http://alertmanager.example.com'

        # Description appears as the incident title
        description: '{{ .CommonAnnotations.summary }}'
```

### Alert rule with severity labels

Define your Prometheus alert rules with appropriate severity labels:

```yaml
# prometheus-rules.yml
# Alert rules with severity labels for PagerDuty mapping

groups:
  - name: node-alerts
    rules:
      # Critical alert for node down
      - alert: NodeDown
        expr: up{job="node"} == 0
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Node {{ $labels.instance }} is down'
          description: 'Node {{ $labels.instance }} has been unreachable for more than 2 minutes.'
          runbook_url: 'https://wiki.example.com/runbooks/node-down'

      # High severity alert for high CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: high
          team: platform
        annotations:
          summary: 'High CPU usage on {{ $labels.instance }}'
          description: 'CPU usage on {{ $labels.instance }} has been above 85% for 10 minutes.'

      # Warning alert for disk space
      - alert: DiskSpaceWarning
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 20
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'Low disk space on {{ $labels.instance }}'
          description: 'Disk space on {{ $labels.instance }} is below 20%.'
```

---

## Including incident details in PagerDuty alerts

PagerDuty incidents are more actionable when they include relevant context. Alertmanager lets you customize the information sent to PagerDuty using Go templates.

### Rich incident details configuration

```yaml
# alertmanager.yml
# Configure detailed incident information for PagerDuty

receivers:
  - name: 'pagerduty-detailed'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-integration-key'
        send_resolved: true
        severity: '{{ .CommonLabels.severity }}'

        # Primary incident description (appears as title)
        description: '[{{ .Status | toUpper }}] {{ .CommonAnnotations.summary }}'

        # Client information
        client: 'Prometheus Alertmanager'
        client_url: '{{ template "pagerduty.clientUrl" . }}'

        # Custom details appear in the incident body
        # Use key-value pairs for structured information
        details:
          # Alert identification
          alertname: '{{ .CommonLabels.alertname }}'
          cluster: '{{ .CommonLabels.cluster }}'
          namespace: '{{ .CommonLabels.namespace }}'
          service: '{{ .CommonLabels.service }}'

          # Alert metadata
          severity: '{{ .CommonLabels.severity }}'
          team: '{{ .CommonLabels.team }}'

          # Timing information
          firing_since: '{{ .CommonAnnotations.firing_since }}'

          # Detailed description and remediation
          description: '{{ .CommonAnnotations.description }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'

          # Include all firing alerts in the group
          firing_alerts: '{{ range .Alerts.Firing }}{{ .Labels.alertname }}: {{ .Annotations.summary }} {{ end }}'

          # Number of alerts in this notification
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'

        # Links appear as clickable buttons in PagerDuty
        links:
          - href: '{{ .CommonAnnotations.runbook_url }}'
            text: 'Runbook'
          - href: '{{ .CommonAnnotations.dashboard_url }}'
            text: 'Dashboard'
          - href: 'http://alertmanager.example.com/#/alerts'
            text: 'Alertmanager'

        # Images can be included for visual context (optional)
        # images:
        #   - src: '{{ .CommonAnnotations.graph_url }}'
        #     alt: 'Metric Graph'
```

---

## Custom event fields and service keys

For organizations with multiple PagerDuty services, you can route alerts to different services based on labels or use custom event fields for advanced workflows.

### Multi-service configuration

```yaml
# alertmanager.yml
# Route alerts to different PagerDuty services based on team labels

receivers:
  # Platform team service
  - name: 'pagerduty-platform'
    pagerduty_configs:
      - routing_key: 'platform-team-integration-key'
        send_resolved: true
        severity: '{{ .CommonLabels.severity }}'
        description: '[Platform] {{ .CommonAnnotations.summary }}'
        # Custom event class for filtering in PagerDuty
        class: 'infrastructure'
        # Component affected
        component: '{{ .CommonLabels.component }}'
        # Logical grouping
        group: '{{ .CommonLabels.cluster }}'

  # Database team service
  - name: 'pagerduty-database'
    pagerduty_configs:
      - routing_key: 'database-team-integration-key'
        send_resolved: true
        severity: '{{ .CommonLabels.severity }}'
        description: '[Database] {{ .CommonAnnotations.summary }}'
        class: 'database'
        component: '{{ .CommonLabels.db_type }}'
        group: '{{ .CommonLabels.db_cluster }}'

  # Application team service
  - name: 'pagerduty-application'
    pagerduty_configs:
      - routing_key: 'application-team-integration-key'
        send_resolved: true
        severity: '{{ .CommonLabels.severity }}'
        description: '[Application] {{ .CommonAnnotations.summary }}'
        class: 'application'
        component: '{{ .CommonLabels.app }}'
        group: '{{ .CommonLabels.environment }}'

# Route based on team label
route:
  receiver: 'pagerduty-platform'
  group_by: ['alertname', 'team']
  routes:
    - receiver: 'pagerduty-database'
      matchers:
        - team = database
    - receiver: 'pagerduty-application'
      matchers:
        - team = application
    - receiver: 'pagerduty-platform'
      matchers:
        - team = platform
```

---

## Deduplication and alert grouping

PagerDuty uses a deduplication key to identify unique incidents. Alertmanager generates this key automatically, but you can customize it to control how alerts are grouped into incidents.

### Deduplication configuration

```yaml
# alertmanager.yml
# Configure deduplication keys for PagerDuty

receivers:
  - name: 'pagerduty-dedupe'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-integration-key'
        send_resolved: true
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'

        # Custom deduplication key
        # Alerts with the same dedup_key are grouped into one incident
        # Default: combination of routing_key and group labels

        # Option 1: Dedupe by alert name and instance
        # Each instance gets its own incident
        # dedup_key: '{{ .CommonLabels.alertname }}-{{ .CommonLabels.instance }}'

        # Option 2: Dedupe by alert name and service
        # All instances of the same service are grouped
        # dedup_key: '{{ .CommonLabels.alertname }}-{{ .CommonLabels.service }}'

        # Option 3: Dedupe by alert name, cluster, and namespace
        # Recommended for Kubernetes environments
        dedup_key: '{{ .CommonLabels.alertname }}-{{ .CommonLabels.cluster }}-{{ .CommonLabels.namespace }}'

        # Option 4: Use a fingerprint from Alertmanager
        # Most granular option, each unique alert gets its own incident
        # dedup_key: '{{ .GroupKey }}'
```

### Alertmanager grouping interaction

Alertmanager groups alerts before sending them to PagerDuty. Configure `group_by` to control this behavior:

```yaml
# alertmanager.yml
# Grouping configuration that works well with PagerDuty deduplication

route:
  receiver: 'pagerduty-default'
  # Group alerts by these labels before sending to PagerDuty
  group_by: ['alertname', 'cluster', 'namespace', 'service']

  # Wait time before sending initial notification
  # Allows related alerts to be grouped together
  group_wait: 30s

  # Wait time before sending updates for a group
  group_interval: 5m

  # Wait time before re-sending if nothing changed
  repeat_interval: 4h

  routes:
    # Critical alerts: faster grouping, shorter wait
    - receiver: 'pagerduty-critical'
      matchers:
        - severity = critical
      group_wait: 10s
      group_interval: 1m
      repeat_interval: 1h

    # Warning alerts: longer wait to batch more together
    - receiver: 'pagerduty-warnings'
      matchers:
        - severity = warning
      group_wait: 2m
      group_interval: 10m
      repeat_interval: 24h
```

---

## Testing your integration

Before relying on the integration for production incidents, verify that alerts flow correctly from Prometheus to PagerDuty.

### Send a test alert

Use `amtool` or `curl` to send a test alert to Alertmanager:

```bash
# Send a test alert using curl
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "critical",
        "team": "platform",
        "instance": "test-instance"
      },
      "annotations": {
        "summary": "Test alert for PagerDuty integration",
        "description": "This is a test alert to verify the Prometheus-PagerDuty integration."
      }
    }
  ]'
```

### Verify in PagerDuty

1. Check the PagerDuty service for a new incident.
2. Verify the severity, title, and custom details appear correctly.
3. Confirm that links to runbooks and dashboards work.
4. Resolve the alert and verify PagerDuty receives the resolution.

---

## Best practices summary

Follow these guidelines for a reliable Prometheus-PagerDuty integration:

- **Use Events API v2**: The newer API supports richer incident details, custom fields, and better deduplication.

- **Set appropriate severities**: Map your alert severities consistently. Reserve "critical" for issues requiring immediate human intervention.

- **Include runbook links**: Every actionable alert should link to documentation that helps responders diagnose and fix the issue.

- **Configure sensible grouping**: Balance between grouping too many alerts (alert fatigue) and creating too many incidents (noise).

- **Enable send_resolved**: Let PagerDuty know when issues are fixed automatically to reduce on-call burden.

- **Use descriptive dedup keys**: Choose deduplication keys that match how your team thinks about incidents.

- **Test before production**: Verify alerts flow correctly with test alerts before relying on the integration.

- **Monitor Alertmanager**: Set up alerts for Alertmanager itself to catch configuration errors or connectivity issues.

- **Document your routing**: Keep routing rules documented so the team understands which alerts go where.

- **Review regularly**: Periodically audit your alert rules and routing to remove stale configurations.

---

## Consider OneUptime as an alternative

While PagerDuty is a capable incident management platform, [OneUptime](https://oneuptime.com) offers a unified observability and incident management solution that includes:

- Built-in Prometheus metrics ingestion
- Native alerting without requiring a separate Alertmanager
- On-call scheduling and escalation policies
- Status pages for customer communication
- Integrated logs, traces, and metrics in one platform

If you are evaluating your monitoring stack, consider whether a unified platform like OneUptime might simplify your infrastructure while providing the same incident management capabilities.
