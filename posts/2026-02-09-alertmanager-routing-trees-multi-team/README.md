# How to Configure Alertmanager Alert Routing Trees for Multi-Team K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Kubernetes, Alert, Monitoring, Multi-Tenancy

Description: Learn how to design Alertmanager routing trees that intelligently route alerts to different teams based on namespace, severity, and service labels in multi-team Kubernetes clusters.

---

In multi-team Kubernetes environments, routing all alerts to a single channel creates noise and missed critical alerts. Alertmanager's routing tree feature directs alerts to the right team based on label matchers, ensuring teams only see relevant alerts.

This guide covers designing routing configurations for complex multi-team setups.

## Understanding Alertmanager Routing

Alertmanager processes alerts through a routing tree. Each route has matchers that filter alerts, and child routes that provide more specific routing. Alerts traverse the tree from top to bottom, matching against route conditions.

The first matching child route determines where the alert goes. If no child route matches, Alertmanager uses the current route's receiver. Routes can have continue: true to also match subsequent sibling routes.

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
  - matchers:
    - namespace="kube-system"
    receiver: platform-team
    continue: false

  # Application team A
  - matchers:
    - namespace="team-a"
    receiver: team-a
    continue: false

  # Application team B
  - matchers:
    - namespace="team-b"
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
  - matchers:
    - namespace="team-a"
    receiver: team-a
    routes:
    # Critical alerts go to PagerDuty
    - matchers:
      - severity="critical"
      receiver: team-a-pagerduty
      continue: true  # Also send to Slack

    - matchers:
      - severity="critical"
      receiver: team-a-slack

    # Warnings go to Slack only
    - matchers:
      - severity="warning"
      receiver: team-a-slack

receivers:
- name: 'team-a-pagerduty'
  pagerduty_configs:
  - routing_key: '<pagerduty-key>'

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
- matchers:
  - alertname=~".*Database.*|.*MySQL.*|.*Postgres.*"
  receiver: database-team

# Network team - network-related alerts
- matchers:
  - alertname=~".*Network.*|.*Ingress.*|.*Service.*"
  receiver: network-team

# Team-specific application alerts
- matchers:
  - namespace="team-a"
  - component="api"
  receiver: team-a-api
  routes:
  # API critical errors
  - matchers:
    - severity="critical"
    - alertname="HighErrorRate"
    receiver: team-a-oncall
    continue: true
```

## Using Regex Matchers

Match multiple namespaces with regex:

```yaml
routes:
# All production namespaces
- matchers:
  - namespace=~"^prod-.*"
  receiver: production-team
  routes:
  - matchers:
    - severity="critical"
    receiver: production-oncall

# All staging namespaces
- matchers:
  - namespace=~"^staging-.*"
  receiver: staging-team
```

The `=~` matcher operator uses regex matching instead of exact matching.

## Time-Based Routing

Route alerts differently based on time of day:

```yaml
routes:
# Business hours (9am-5pm weekdays)
- matchers:
  - namespace="team-a"
  receiver: team-a-slack
  active_time_intervals:
  - business-hours

# After hours
- matchers:
  - namespace="team-a"
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
      end_time: '24:00'
    - start_time: '00:00'
      end_time: '09:00'
    weekdays: ['monday:friday']
    location: 'America/New_York'
  - weekdays: ['saturday', 'sunday']
    location: 'America/New_York'
```

## Continue Flag for Multiple Receivers

Send alerts to multiple receivers with continue: true:

```yaml
routes:
# Send critical cluster alerts to both teams
- matchers:
  - severity="critical"
  - component="cluster"
  receiver: platform-team
  continue: true

- matchers:
  - severity="critical"
  receiver: oncall-team
```

The first route matches and sends to platform-team, then continues to check the second route.

## Inhibition Rules Integration

Some alerts should be inhibited when higher-level alerts are already active:

```yaml
inhibit_rules:
# If cluster is down, inhibit namespace alerts
- source_matchers:
  - alertname="ClusterDown"
  target_matchers:
  - namespace=~".*"
  equal: ['cluster']

# If node is down, inhibit pod alerts on that node
- source_matchers:
  - alertname="NodeDown"
  target_matchers:
  - alertname="PodNotReady"
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
  - matchers:
    - namespace=~"^(kube-system|kube-public|monitoring|ingress-nginx)$"
    receiver: platform-team
    routes:
    - matchers:
      - severity="critical"
      receiver: platform-oncall
      continue: true
    - matchers:
      - severity="critical"
      receiver: platform-team

  # Database team - database alerts across all namespaces
  - matchers:
    - alertname=~".*Database.*|.*MySQL.*|.*Postgres.*|.*Redis.*"
    receiver: database-team
    routes:
    - matchers:
      - severity="critical"
      receiver: database-oncall
      continue: true
    - matchers:
      - severity="critical"
      receiver: database-team

  # Security team - security-related alerts
  - matchers:
    - alertname=~".*Security.*|.*CVE.*|.*Vulnerability.*"
    receiver: security-team
    continue: true  # Also route to owning team

  # Team A - production
  - matchers:
    - namespace="team-a-prod"
    receiver: team-a
    routes:
    - matchers:
      - severity="critical"
      receiver: team-a-oncall
      active_time_intervals:
      - after-hours
    - matchers:
      - severity="critical"
      receiver: team-a-slack
      active_time_intervals:
      - business-hours

  # Team A - staging (lower priority)
  - matchers:
    - namespace="team-a-staging"
    receiver: team-a-slack
    group_interval: 15m
    repeat_interval: 24h

  # Team B - production
  - matchers:
    - namespace=~"^team-b-prod-.*"
    receiver: team-b
    routes:
    - matchers:
      - severity="critical"
      receiver: team-b-oncall

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
  - routing_key: '<platform-pd-key>'

- name: 'database-team'
  slack_configs:
  - channel: '#database-alerts'
    api_url: '<slack-webhook-url>'

- name: 'database-oncall'
  pagerduty_configs:
  - routing_key: '<database-pd-key>'

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
  - routing_key: '<team-a-pd-key>'

- name: 'team-b'
  slack_configs:
  - channel: '#team-b-alerts'
    api_url: '<slack-webhook-url>'

- name: 'team-b-oncall'
  pagerduty_configs:
  - routing_key: '<team-b-pd-key>'

- name: 'security-team'
  email_configs:
  - to: 'security@example.com'
    from: 'alertmanager@example.com'
    smarthost: 'smtp.example.com:587'

inhibit_rules:
- source_matchers:
  - severity="critical"
  - alertname="ClusterDown"
  target_matchers:
  - severity=~"warning|info"
  equal: ['cluster']

- source_matchers:
  - alertname="NodeDown"
  target_matchers:
  - alertname=~"PodNotReady|PodCrashLooping"
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
      end_time: '24:00'
    - start_time: '00:00'
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
        image: prom/alertmanager:v0.32.1
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
  sum by (le, receiver) (rate(alertmanager_notification_latency_seconds_bucket[5m]))
)
```

Well-designed routing trees ensure teams receive relevant alerts without noise, improving response times and reducing alert fatigue.
