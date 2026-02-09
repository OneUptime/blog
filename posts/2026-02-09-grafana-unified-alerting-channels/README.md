# How to Configure Grafana Unified Alerting with Multiple Notification Channels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Alerting, Notifications, Monitoring, Unified Alerting

Description: Learn how to set up Grafana Unified Alerting with multiple notification channels including Slack, email, PagerDuty, and webhooks for comprehensive alert delivery.

---

Grafana Unified Alerting consolidates alert management across all datasources into a single, powerful alerting system. Unlike legacy alerting limited to graph panels, Unified Alerting supports multi-dimensional rules, routing trees, and complex notification policies. This guide covers configuring alert rules, contact points, and notification policies to build a robust alerting infrastructure.

## Understanding Grafana Unified Alerting

Unified Alerting provides:
- Alert rules that query any datasource
- Multi-dimensional alert instances
- Flexible routing via notification policies
- Contact points for various integrations
- Silences and mute timings
- Alert state history and annotations

Architecture:
1. Alert rules evaluate queries
2. Firing alerts enter notification pipeline
3. Notification policies route to contact points
4. Contact points send to external systems

## Enabling Unified Alerting

Configure in Grafana deployment:

```yaml
# grafana-values.yaml (for kube-prometheus-stack)
grafana:
  enabled: true

  # Unified Alerting configuration
  grafana.ini:
    unified_alerting:
      enabled: true
      # Admin config API for provisioning
      admin_config_poll_interval: 60s

    alerting:
      enabled: false  # Disable legacy alerting

  # SMTP for email notifications
  smtp:
    enabled: true
    host: smtp.example.com:587
    user: alerts@example.com
    password: secret
    from_address: alerts@example.com
    from_name: Grafana Alerts
```

## Creating Alert Rules

Create an alert rule via UI or provisioning:

```yaml
# alert-rules.yaml
apiVersion: 1
groups:
  - orgId: 1
    name: platform-alerts
    folder: Platform
    interval: 1m
    rules:
      - uid: high-cpu-alert
        title: High CPU Usage
        condition: C
        data:
          - refId: A
            queryType: ''
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: avg(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)
              refId: A

          - refId: B
            queryType: ''
            relativeTimeRange:
              from: 0
              to: 0
            datasourceUid: __expr__
            model:
              type: reduce
              expression: A
              reducer: mean
              refId: B

          - refId: C
            queryType: ''
            relativeTimeRange:
              from: 0
              to: 0
            datasourceUid: __expr__
            model:
              type: threshold
              expression: B
              conditions:
                - evaluator:
                    params: [0.8]
                    type: gt
              refId: C

        noDataState: NoData
        execErrState: Alerting
        for: 5m
        annotations:
          description: 'Pod {{ $labels.pod }} CPU usage is {{ $values.A.Value }}%'
          summary: 'High CPU detected'
        labels:
          severity: warning
          team: platform
```

Mount as ConfigMap:

```yaml
grafana:
  alerting:
    rules.yaml:
      apiVersion: 1
      groups:
        - orgId: 1
          name: platform-alerts
          folder: Platform
          interval: 1m
          rules: [...]
```

## Configuring Contact Points

### Slack Integration

```yaml
apiVersion: 1
contactPoints:
  - orgId: 1
    name: slack-platform
    receivers:
      - uid: slack-platform-receiver
        type: slack
        settings:
          url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
          recipient: '#platform-alerts'
          username: Grafana
          icon_emoji: ':grafana:'
          title: '{{ .CommonLabels.alertname }}'
          text: |-
            {{ range .Alerts }}
            *Alert:* {{ .Labels.alertname }}
            *Summary:* {{ .Annotations.summary }}
            *Description:* {{ .Annotations.description }}
            *Severity:* {{ .Labels.severity }}
            *Status:* {{ .Status }}
            {{ end }}
        disableResolveMessage: false
```

### Email Integration

```yaml
contactPoints:
  - orgId: 1
    name: email-oncall
    receivers:
      - uid: email-oncall-receiver
        type: email
        settings:
          addresses: oncall@example.com
          singleEmail: false
        disableResolveMessage: false
```

### PagerDuty Integration

```yaml
contactPoints:
  - orgId: 1
    name: pagerduty-critical
    receivers:
      - uid: pagerduty-critical-receiver
        type: pagerduty
        settings:
          integrationKey: YOUR_PAGERDUTY_INTEGRATION_KEY
          severity: critical
          class: Infrastructure
          component: Kubernetes
          group: Platform
        disableResolveMessage: false
```

### Webhook Integration

```yaml
contactPoints:
  - orgId: 1
    name: webhook-ticketing
    receivers:
      - uid: webhook-ticketing-receiver
        type: webhook
        settings:
          url: https://ticketing.example.com/api/alerts
          httpMethod: POST
          username: grafana
          password: secret
        disableResolveMessage: false
```

### Microsoft Teams

```yaml
contactPoints:
  - orgId: 1
    name: teams-engineering
    receivers:
      - uid: teams-engineering-receiver
        type: teams
        settings:
          url: https://outlook.office.com/webhook/YOUR/WEBHOOK/URL
          title: '{{ .CommonLabels.alertname }}'
          message: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        disableResolveMessage: false
```

### Discord

```yaml
contactPoints:
  - orgId: 1
    name: discord-alerts
    receivers:
      - uid: discord-alerts-receiver
        type: discord
        settings:
          url: https://discord.com/api/webhooks/YOUR/WEBHOOK
          message: |-
            **Alert:** {{ .CommonLabels.alertname }}
            **Status:** {{ .Status }}
            {{ range .Alerts }}
            {{ .Annotations.description }}
            {{ end }}
          avatar_url: https://grafana.com/static/img/grafana_icon.svg
          use_discord_username: false
```

## Configuring Notification Policies

Create routing tree for alerts:

```yaml
apiVersion: 1
policies:
  - orgId: 1
    receiver: default-contact-point
    group_by:
      - alertname
      - cluster
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 12h

    routes:
      # Critical alerts to PagerDuty
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        group_wait: 10s
        repeat_interval: 5m
        continue: true
        routes:
          # Database critical also to DBA team
          - receiver: slack-dba
            matchers:
              - team = database

      # Platform team alerts
      - receiver: slack-platform
        matchers:
          - team = platform
        group_by:
          - alertname
          - namespace
        group_wait: 30s
        repeat_interval: 4h

      # Application team alerts
      - receiver: slack-application
        matchers:
          - team = application
        group_by:
          - alertname
          - service

      # Warning alerts
      - receiver: email-oncall
        matchers:
          - severity = warning
        repeat_interval: 24h

      # Info alerts to webhook
      - receiver: webhook-ticketing
        matchers:
          - severity = info
        repeat_interval: 48h
```

## Advanced Routing with Label Matchers

Use regex and multiple conditions:

```yaml
routes:
  # Production critical alerts
  - receiver: pagerduty-production
    matchers:
      - environment = production
      - severity =~ critical|high
    group_wait: 0s
    repeat_interval: 5m

  # Staging alerts (less frequent)
  - receiver: slack-staging
    matchers:
      - environment =~ staging|qa
    repeat_interval: 12h

  # Specific namespaces
  - receiver: team-payments
    matchers:
      - namespace =~ payment.*|billing.*
      - severity != info

  # Alerts without team label
  - receiver: default-oncall
    matchers:
      - team = ""
```

## Mute Timings

Create maintenance windows:

```yaml
apiVersion: 1
muteTimes:
  - orgId: 1
    name: business-hours
    time_intervals:
      - times:
          - start_time: '09:00'
            end_time: '17:00'
        weekdays:
          - 'monday:friday'

  - orgId: 1
    name: weekends
    time_intervals:
      - weekdays:
          - saturday
          - sunday

  - orgId: 1
    name: maintenance-window
    time_intervals:
      - times:
          - start_time: '02:00'
            end_time: '04:00'
        weekdays:
          - saturday
```

Apply mute timing to notification policy:

```yaml
routes:
  - receiver: slack-non-critical
    matchers:
      - severity = warning
    mute_time_intervals:
      - business-hours
      - weekends
```

## Complete Configuration Example

Comprehensive Grafana alerting setup:

```yaml
# grafana-alerting-config.yaml
grafana:
  alerting:
    # Contact points
    contactpoints.yaml:
      apiVersion: 1
      contactPoints:
        - orgId: 1
          name: slack-critical
          receivers:
            - uid: slack-critical
              type: slack
              settings:
                url: https://hooks.slack.com/services/CRITICAL
                recipient: '#critical-alerts'

        - orgId: 1
          name: pagerduty
          receivers:
            - uid: pagerduty
              type: pagerduty
              settings:
                integrationKey: PAGERDUTY_KEY

        - orgId: 1
          name: email-team
          receivers:
            - uid: email-team
              type: email
              settings:
                addresses: team@example.com

    # Notification policies
    policies.yaml:
      apiVersion: 1
      policies:
        - orgId: 1
          receiver: email-team
          group_by: ['alertname']
          routes:
            - receiver: pagerduty
              matchers:
                - severity = critical
              continue: true

            - receiver: slack-critical
              matchers:
                - severity = critical

    # Mute timings
    mute_timings.yaml:
      apiVersion: 1
      muteTimes:
        - orgId: 1
          name: maintenance
          time_intervals:
            - times:
                - start_time: '02:00'
                  end_time: '04:00'
              weekdays: ['saturday']

    # Alert rules
    rules.yaml:
      apiVersion: 1
      groups:
        - orgId: 1
          name: infrastructure
          folder: Infrastructure
          interval: 1m
          rules:
            - uid: node-down
              title: Node Down
              condition: C
              data:
                - refId: A
                  datasourceUid: prometheus
                  model:
                    expr: up{job="node-exporter"}
                - refId: C
                  datasourceUid: __expr__
                  model:
                    type: threshold
                    expression: A
                    conditions:
                      - evaluator:
                          params: [1]
                          type: lt
              for: 5m
              labels:
                severity: critical
                team: platform
              annotations:
                summary: Node {{ $labels.instance }} is down
```

## Testing Notifications

Test contact points:

```bash
# Via Grafana UI
# Alerting > Contact points > [Select contact point] > Test

# Or via API
curl -X POST http://grafana:3000/api/alertmanager/grafana/api/v1/alerts/test \
  -H 'Content-Type: application/json' \
  -u admin:password \
  -d '{
    "receivers": [{
      "name": "slack-platform",
      "grafana_managed_receiver_configs": [{
        "name": "slack-platform",
        "type": "slack",
        "settings": {
          "url": "https://hooks.slack.com/services/YOUR/WEBHOOK"
        }
      }]
    }],
    "alert": {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning"
      },
      "annotations": {
        "summary": "This is a test alert"
      }
    }
  }'
```

## Monitoring Alerting Performance

Track alert rule evaluation:

```promql
# Alert rule evaluations
grafana_alerting_rule_evaluations_total

# Failed evaluations
grafana_alerting_rule_evaluation_failures_total

# Notification sending duration
grafana_alerting_notification_latency_seconds
```

## Best Practices

1. Use descriptive contact point names (slack-team-platform not slack-1)
2. Configure multiple notification channels for critical alerts
3. Set appropriate group_by labels to reduce noise
4. Use mute timings for known maintenance windows
5. Test contact points before relying on them
6. Document alert routing logic in team runbooks
7. Regularly review and cleanup unused alert rules
8. Use severity labels consistently across all alerts
9. Implement escalation by combining multiple contact points
10. Monitor alert evaluation performance and failures

## Conclusion

Grafana Unified Alerting provides a powerful, flexible alerting system that works across all datasources. By configuring contact points for various notification channels and building sophisticated routing policies, you ensure alerts reach the right people at the right time. Combined with mute timings and proper testing, Unified Alerting delivers reliable, actionable notifications that improve incident response and reduce alert fatigue.
