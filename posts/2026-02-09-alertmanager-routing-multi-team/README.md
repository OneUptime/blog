# How to Configure Alertmanager Routing Trees for Multi-Team Alert Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Prometheus, Routing, Kubernetes, Monitoring

Description: Learn how to design and implement sophisticated Alertmanager routing trees to distribute alerts to the right teams based on labels and conditions.

---

Alertmanager routes alerts from Prometheus to various notification channels. In multi-team environments, proper routing ensures alerts reach the right people without overwhelming others. Alertmanager uses a tree-based routing system where alerts are matched against rules and sent to appropriate receivers. Understanding routing trees is essential for building scalable, maintainable alert distribution systems.

## Understanding Alertmanager Routing

Alertmanager routing works through a hierarchical tree structure. Each route can:
- Match alerts based on label matchers
- Have child routes for more specific matching
- Send alerts to one or more receivers
- Control grouping, timing, and repetition
- Continue matching child routes or stop at first match

The routing process:
1. Alert enters at the root route
2. Alert is evaluated against matchers
3. If matched, alert is sent to the receiver
4. Child routes are evaluated (unless continue: false)
5. Process repeats until no more routes match

## Basic Routing Configuration

Start with a simple routing tree for multiple teams:

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m

    # Root route - catches all alerts
    route:
      receiver: 'default'
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h

      # Child routes for specific teams
      routes:
        # Platform team handles infrastructure alerts
        - match:
            team: platform
          receiver: 'platform-team'
          group_by: ['alertname', 'instance']

        # Application team handles app alerts
        - match:
            team: application
          receiver: 'application-team'
          group_by: ['alertname', 'service']

        # Database team handles database alerts
        - match:
            team: database
          receiver: 'database-team'
          group_by: ['alertname', 'database']

    receivers:
      - name: 'default'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/DEFAULT'
            channel: '#alerts-default'

      - name: 'platform-team'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/PLATFORM'
            channel: '#alerts-platform'

      - name: 'application-team'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/APP'
            channel: '#alerts-application'

      - name: 'database-team'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/DB'
            channel: '#alerts-database'
```

Apply the configuration with kube-prometheus-stack:

```yaml
# prometheus-stack-values.yaml
alertmanager:
  enabled: true
  config:
    global:
      resolve_timeout: 5m

    route:
      receiver: 'default'
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h

      routes:
        - match:
            team: platform
          receiver: 'platform-team'

        - match:
            team: application
          receiver: 'application-team'

    receivers:
      - name: 'default'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/DEFAULT'
            channel: '#alerts-default'

      - name: 'platform-team'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/PLATFORM'
            channel: '#alerts-platform'

      - name: 'application-team'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/APP'
            channel: '#alerts-application'
```

## Severity-Based Routing

Route alerts based on severity with escalation:

```yaml
route:
  receiver: 'default'
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 12h

  routes:
    # Critical alerts go to on-call immediately
    - match:
        severity: critical
      receiver: 'on-call-critical'
      group_wait: 0s
      repeat_interval: 5m
      routes:
        # Database critical alerts need special handling
        - match:
            team: database
          receiver: 'database-on-call'

    # Warning alerts go to team channels
    - match:
        severity: warning
      receiver: 'team-warnings'
      group_wait: 30s
      repeat_interval: 4h

    # Info alerts are logged only
    - match:
        severity: info
      receiver: 'info-logger'
      group_wait: 5m
      repeat_interval: 24h

receivers:
  - name: 'on-call-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: 'Critical: {{ .CommonLabels.alertname }}'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/CRITICAL'
        channel: '#alerts-critical'
        title: 'CRITICAL ALERT'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'database-on-call'
    pagerduty_configs:
      - service_key: 'YOUR_DB_PAGERDUTY_KEY'
    email_configs:
      - to: 'dba-oncall@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts'
        auth_password: 'password'

  - name: 'team-warnings'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/WARNINGS'
        channel: '#alerts-warnings'

  - name: 'info-logger'
    webhook_configs:
      - url: 'http://log-collector:8080/alerts'
```

## Advanced Label Matching

Use match_re for regex matching and complex conditions:

```yaml
route:
  receiver: 'default'
  routes:
    # Match multiple namespaces with regex
    - match_re:
        namespace: '^(prod|production)-.*'
      receiver: 'production-team'
      routes:
        # Within production, route by service
        - match_re:
            service: '^api-.*'
          receiver: 'api-team'

        - match_re:
            service: '^web-.*'
          receiver: 'web-team'

    # Match staging environments
    - match_re:
        namespace: '^(stage|staging)-.*'
      receiver: 'staging-team'
      repeat_interval: 24h  # Less frequent for staging

    # Development environments
    - match_re:
        namespace: '^(dev|development)-.*'
      receiver: 'dev-team'
      repeat_interval: 48h

    # Catch kubernetes system alerts
    - match_re:
        namespace: '^kube-.*'
      receiver: 'platform-team'

    # Monitoring namespace alerts
    - match:
        namespace: monitoring
      receiver: 'observability-team'
```

## Multi-Receiver Configuration

Send alerts to multiple channels simultaneously:

```yaml
receivers:
  - name: 'multi-channel-team'
    # Slack notification
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/TEAM'
        channel: '#team-alerts'
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    # Email notification
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts'
        auth_password: 'password'
        headers:
          subject: 'Alert: {{ .CommonLabels.alertname }}'

    # PagerDuty for critical path
    pagerduty_configs:
      - service_key: 'YOUR_PD_KEY'
        description: '{{ .CommonLabels.alertname }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

    # Webhook for ticketing system
    webhook_configs:
      - url: 'https://ticketing.example.com/api/alerts'
        send_resolved: true
```

## Time-Based Routing

Route differently based on time of day:

```yaml
route:
  receiver: 'default'
  routes:
    # Business hours routing (9 AM - 5 PM weekdays)
    - match:
        severity: critical
      receiver: 'business-hours-team'
      # Note: Alertmanager doesn't natively support time-based routing
      # This requires additional labels from Prometheus rules or external tools

    # After-hours routing
    - match:
        severity: critical
        shift: after-hours
      receiver: 'on-call-rotation'
```

To implement time-based routing, add time information in Prometheus rules:

```yaml
# In PrometheusRule
- alert: CriticalAlert
  expr: up == 0
  labels:
    severity: critical
    team: platform
    # Add time-based label (requires external labeler or rule)
  annotations:
    description: "Service is down"
```

## Namespace and Environment-Based Routing

Organize routing by environment and namespace:

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'namespace', 'severity']

  routes:
    # Production environment
    - match:
        environment: production
      receiver: 'production-default'
      routes:
        # Production platform issues
        - match_re:
            namespace: '^kube-|^istio-|^monitoring$'
          receiver: 'platform-production'
          group_wait: 0s

        # Production application issues by team
        - match:
            team: payments
          receiver: 'payments-production'

        - match:
            team: user-service
          receiver: 'users-production'

    # Staging environment
    - match:
        environment: staging
      receiver: 'staging-default'
      repeat_interval: 6h
      routes:
        - match:
            severity: critical
          receiver: 'staging-critical'

    # Development environment
    - match:
        environment: development
      receiver: 'dev-notifications'
      repeat_interval: 24h

receivers:
  - name: 'platform-production'
    pagerduty_configs:
      - service_key: 'PLATFORM_PD_KEY'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/PLATFORM'
        channel: '#prod-platform-alerts'

  - name: 'payments-production'
    pagerduty_configs:
      - service_key: 'PAYMENTS_PD_KEY'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/PAYMENTS'
        channel: '#prod-payments-alerts'
    email_configs:
      - to: 'payments-team@example.com'
```

## Inhibition Rules

Prevent redundant alerts using inhibition:

```yaml
# Inhibit dependent alerts when root cause is firing
inhibit_rules:
  # If node is down, inhibit all pod alerts on that node
  - source_match:
      alertname: NodeDown
    target_match_re:
      alertname: '(PodCrashLooping|PodNotReady)'
    equal:
      - node

  # If entire service is down, inhibit individual pod alerts
  - source_match:
      alertname: ServiceDown
    target_match:
      alertname: PodNotReady
    equal:
      - service
      - namespace

  # If cluster is unreachable, inhibit all cluster alerts
  - source_match:
      alertname: ClusterUnreachable
    target_match_re:
      severity: '.*'
    equal:
      - cluster

  # During maintenance, inhibit all alerts for that service
  - source_match:
      alertname: MaintenanceWindow
    target_match_re:
      alertname: '.*'
    equal:
      - service
```

## Continue vs Stop Matching

Control whether alerts continue to child routes:

```yaml
route:
  receiver: 'default'
  routes:
    # This route continues to children
    - match:
        team: platform
      receiver: 'platform-team'
      continue: true  # Keep evaluating child routes
      routes:
        # Critical platform alerts also go to on-call
        - match:
            severity: critical
          receiver: 'platform-oncall'

    # This route stops at first match
    - match:
        team: database
      receiver: 'database-team'
      continue: false  # Stop after this route
      routes:
        # These child routes won't be evaluated
        # because parent has continue: false
        - match:
            severity: critical
          receiver: 'database-oncall'
```

## Mute Timing and Silence

Configure time windows when alerts should be muted:

```yaml
route:
  receiver: 'default'
  routes:
    - match:
        team: platform
      receiver: 'platform-team'
      # Apply mute timing
      mute_time_intervals:
        - weekends
        - business-hours

# Define mute time intervals
mute_time_intervals:
  - name: weekends
    time_intervals:
      - weekdays: ['saturday', 'sunday']

  - name: business-hours
    time_intervals:
      - times:
          - start_time: '09:00'
            end_time: '17:00'
        weekdays: ['monday:friday']
        months: ['january:december']

  - name: holidays
    time_intervals:
      - days_of_month: ['25']
        months: ['december']
```

## Verifying Routing Configuration

Test routing with amtool:

```bash
# Validate configuration
kubectl exec -n monitoring alertmanager-pod -- \
  amtool check-config /etc/alertmanager/config/alertmanager.yaml

# Test which route an alert would take
kubectl exec -n monitoring alertmanager-pod -- \
  amtool config routes test \
  --config.file=/etc/alertmanager/config/alertmanager.yaml \
  --tree \
  alertname=HighCPU team=platform severity=warning
```

Check active routing:

```bash
# Port forward to Alertmanager
kubectl port-forward -n monitoring svc/alertmanager-operated 9093:9093 &

# View current configuration
curl http://localhost:9093/api/v2/status | jq '.config'

# See which alerts are active
curl http://localhost:9093/api/v2/alerts | jq '.[] | {alert: .labels.alertname, receiver: .receivers[].name}'
```

## Best Practices

1. Start with a broad default route and add specific routes as needed
2. Use meaningful receiver names that indicate team or purpose
3. Set appropriate group_wait and repeat_interval for each team
4. Use continue: true sparingly to avoid duplicate notifications
5. Implement inhibition rules to prevent alert storms
6. Test routing changes in non-production first
7. Document routing logic in team runbooks
8. Use regex matching carefully to avoid unintended matches
9. Monitor Alertmanager metrics for routing effectiveness
10. Regular review and optimize routing tree as organization evolves

## Conclusion

Alertmanager routing trees provide flexible, powerful alert distribution for complex multi-team environments. By designing hierarchical routes with appropriate matchers, you ensure alerts reach the right people at the right time. Combined with inhibition rules and proper grouping, routing trees prevent alert fatigue while maintaining rapid incident response. Master routing configuration to build scalable alerting that grows with your organization.
