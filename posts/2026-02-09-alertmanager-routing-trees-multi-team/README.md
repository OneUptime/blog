# How to Configure Alertmanager Alert Routing Trees for Multi-Team Kubernetes Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Kubernetes, Alerts, Monitoring, Multi-Tenancy

Description: Learn how to design Alertmanager routing trees that intelligently route alerts to different teams based on namespace, severity, and service labels in multi-team Kubernetes clusters.

---

In multi-team Kubernetes environments, routing all alerts to a single channel creates noise and missed critical alerts. Alertmanager's routing tree feature directs alerts to the right team based on label matchers, ensuring teams only see relevant alerts.

This guide covers designing routing configurations for complex multi-team setups.

## Understanding Alertmanager Routing

Alertmanager processes alerts through a routing tree. Each route has matchers that filter alerts, and child routes that provide more specific routing. Alerts traverse the tree from top to bottom, matching against route conditions.

The first matching route determines where the alert goes. Routes can have continue: true to also match subsequent routes.

## Basic Routing Configuration

Start with a simple configuration that routes by namespace:

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'namespace']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 12h

  routes:
  # Platform team - cluster infrastructure
  - match:
      namespace: kube-system
    receiver: platform-team
    continue: false

  # Application team A
  - match:
      namespace: team-a
    receiver: team-a
    continue: false

  # Application team B
  - match:
      namespace: team-b
    receiver: team-b
    continue: false

receivers:
- name: 'default'
  slack_configs:
  - channel: '#alerts-general'
    api_url: '<slack-webhook-url>'

- name: 'platform-team'
  slack_configs:
  - channel: '#platform-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-a'
  slack_configs:
  - channel: '#team-a-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-b'
  slack_configs:
  - channel: '#team-b-alerts'
    api_url: '<slack-webhook-url>'
```

This routes alerts based on namespace to different Slack channels.

## Hierarchical Routing by Severity

Route critical alerts differently than warnings:

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'namespace', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 12h

  routes:
  # Team A alerts
  - match:
      namespace: team-a
    receiver: team-a
    routes:
    # Critical alerts go to PagerDuty
    - match:
        severity: critical
      receiver: team-a-pagerduty
      continue: true  # Also send to Slack

    # Warnings go to Slack only
    - match:
        severity: warning
      receiver: team-a-slack

receivers:
- name: 'team-a-pagerduty'
  pagerduty_configs:
  - service_key: '<pagerduty-key>'

- name: 'team-a-slack'
  slack_configs:
  - channel: '#team-a-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-a'
  slack_configs:
  - channel: '#team-a-all'
    api_url: '<slack-webhook-url>'
```

Critical alerts trigger pages while warnings go to Slack.

## Routing by Multiple Labels

Match alerts using multiple label conditions:

```yaml
routes:
# Database team - all database alerts
- match_re:
    alertname: '.*Database.*|.*MySQL.*|.*Postgres.*'
  receiver: database-team

# Network team - network-related alerts
- match_re:
    alertname: '.*Network.*|.*Ingress.*|.*Service.*'
  receiver: network-team

# Team-specific application alerts
- match:
    namespace: team-a
    component: api
  receiver: team-a-api
  routes:
  # API critical errors
  - match:
      severity: critical
      alertname: HighErrorRate
    receiver: team-a-oncall
    continue: true
```

## Using Regex Matchers

Match multiple namespaces with regex:

```yaml
routes:
# All production namespaces
- match_re:
    namespace: '^prod-.*'
  receiver: production-team
  routes:
  - match:
      severity: critical
    receiver: production-oncall

# All staging namespaces
- match_re:
    namespace: '^staging-.*'
  receiver: staging-team
```

The `match_re` field uses regex matching instead of exact matching.

## Time-Based Routing

Route alerts differently based on time of day:

```yaml
routes:
# Business hours (9am-5pm weekdays)
- match:
    namespace: team-a
  receiver: team-a-slack
  active_time_intervals:
  - business-hours

# After hours
- match:
    namespace: team-a
  receiver: team-a-pagerduty
  active_time_intervals:
  - after-hours

time_intervals:
- name: business-hours
  time_intervals:
  - times:
    - start_time: '09:00'
      end_time: '17:00'
    weekdays: ['monday:friday']
    location: 'America/New_York'

- name: after-hours
  time_intervals:
  - times:
    - start_time: '17:00'
      end_time: '09:00'
    weekdays: ['monday:friday']
  - weekdays: ['saturday', 'sunday']
```

## Continue Flag for Multiple Receivers

Send alerts to multiple receivers with continue: true:

```yaml
routes:
# Send critical cluster alerts to both teams
- match:
    severity: critical
    component: cluster
  receiver: platform-team
  continue: true

- match:
    severity: critical
  receiver: oncall-team
```

The first route matches and sends to platform-team, then continues to check the second route.

## Inhibition Rules Integration

Some routes should only fire if parent alerts aren't active:

```yaml
inhibit_rules:
# If cluster is down, inhibit namespace alerts
- source_match:
    alertname: ClusterDown
  target_match_re:
    namespace: '.*'
  equal: ['cluster']

# If node is down, inhibit pod alerts on that node
- source_match:
    alertname: NodeDown
  target_match:
    alertname: PodNotReady
  equal: ['node']
```

## Complete Multi-Team Configuration

Here's a production-ready configuration for a multi-team environment:

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'namespace']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 12h

  routes:
  # Platform team - cluster-level alerts
  - match_re:
      namespace: '^(kube-system|kube-public|monitoring|ingress-nginx)$'
    receiver: platform-team
    routes:
    - match:
        severity: critical
      receiver: platform-oncall
      continue: true

  # Database team - database alerts across all namespaces
  - match_re:
      alertname: '.*Database.*|.*MySQL.*|.*Postgres.*|.*Redis.*'
    receiver: database-team
    routes:
    - match:
        severity: critical
      receiver: database-oncall
      continue: true

  # Team A - production
  - match:
      namespace: team-a-prod
    receiver: team-a
    routes:
    - match:
        severity: critical
      receiver: team-a-oncall
      active_time_intervals:
      - after-hours
    - match:
        severity: critical
      receiver: team-a-slack
      active_time_intervals:
      - business-hours

  # Team A - staging (lower priority)
  - match:
      namespace: team-a-staging
    receiver: team-a-slack
    group_interval: 15m
    repeat_interval: 24h

  # Team B - production
  - match_re:
      namespace: '^team-b-prod-.*'
    receiver: team-b
    routes:
    - match:
        severity: critical
      receiver: team-b-oncall

  # Security team - security-related alerts
  - match_re:
      alertname: '.*Security.*|.*CVE.*|.*Vulnerability.*'
    receiver: security-team
    continue: true  # Also route to owning team

receivers:
- name: 'default'
  slack_configs:
  - channel: '#alerts-unrouted'
    api_url: '<slack-webhook-url>'
    title: 'Unrouted Alert'
    text: 'Alert not matched by any routing rule'

- name: 'platform-team'
  slack_configs:
  - channel: '#platform-alerts'
    api_url: '<slack-webhook-url>'

- name: 'platform-oncall'
  pagerduty_configs:
  - service_key: '<platform-pd-key>'

- name: 'database-team'
  slack_configs:
  - channel: '#database-alerts'
    api_url: '<slack-webhook-url>'

- name: 'database-oncall'
  pagerduty_configs:
  - service_key: '<database-pd-key>'

- name: 'team-a'
  slack_configs:
  - channel: '#team-a-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-a-slack'
  slack_configs:
  - channel: '#team-a-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-a-oncall'
  pagerduty_configs:
  - service_key: '<team-a-pd-key>'

- name: 'team-b'
  slack_configs:
  - channel: '#team-b-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-b-oncall'
  pagerduty_configs:
  - service_key: '<team-b-pd-key>'

- name: 'security-team'
  email_configs:
  - to: 'security@example.com'
    from: 'alertmanager@example.com'
    smarthost: 'smtp.example.com:587'

inhibit_rules:
- source_match:
    severity: critical
    alertname: ClusterDown
  target_match_re:
    severity: 'warning|info'
  equal: ['cluster']

- source_match:
    alertname: NodeDown
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping'
  equal: ['node']

time_intervals:
- name: business-hours
  time_intervals:
  - times:
    - start_time: '09:00'
      end_time: '17:00'
    weekdays: ['monday:friday']

- name: after-hours
  time_intervals:
  - times:
    - start_time: '17:00'
      end_time: '09:00'
    weekdays: ['monday:friday']
  - weekdays: ['saturday', 'sunday']
```

## Testing Routing Configuration

Test routing with amtool:

```bash
# Test if alert matches route
amtool config routes test \
  --config.file=alertmanager.yml \
  namespace=team-a \
  severity=critical

# Show routing tree
amtool config routes show --config.file=alertmanager.yml
```

## Deploying with Kubernetes

Deploy as a ConfigMap and reference in Alertmanager:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
    route:
      receiver: 'default'
      routes:
      # ... routing configuration
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: alertmanager
spec:
  template:
    spec:
      containers:
      - name: alertmanager
        image: prom/alertmanager:v0.26.0
        args:
        - --config.file=/etc/alertmanager/alertmanager.yml
        volumeMounts:
        - name: config
          mountPath: /etc/alertmanager
      volumes:
      - name: config
        configMap:
          name: alertmanager-config
```

## Monitoring Routing Performance

Track routing effectiveness:

```promql
# Alerts sent per receiver
sum by (receiver) (rate(alertmanager_notifications_total[5m]))

# Failed notifications
sum by (receiver) (rate(alertmanager_notifications_failed_total[5m]))

# Routing latency
histogram_quantile(0.99,
  rate(alertmanager_notification_latency_seconds_bucket[5m])
)
```

Well-designed routing trees ensure teams receive relevant alerts without noise, improving response times and reducing alert fatigue.
