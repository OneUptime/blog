# How to Set Up Grafana OnCall for Kubernetes Alert Escalation and Rotation Schedules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, Incident Management

Description: Learn how to configure Grafana OnCall for managing Kubernetes alert escalations, rotation schedules, and on-call workflows to ensure critical alerts reach the right team members at the right time.

---

Kubernetes alerts are only valuable if they reach someone who can act on them. Grafana OnCall solves the alert routing challenge by providing sophisticated escalation policies, rotation schedules, and notification workflows specifically designed for modern infrastructure monitoring.

This guide walks through deploying Grafana OnCall in Kubernetes, configuring escalation chains, setting up rotation schedules, and integrating with your existing Prometheus alerting infrastructure.

## Understanding Grafana OnCall Architecture

Grafana OnCall consists of several components:

- **Engine** - Core routing and escalation logic
- **Web UI** - Management interface for schedules and escalations
- **Mobile Apps** - iOS and Android apps for on-call engineers
- **Integrations** - Connectors for Prometheus, Grafana alerts, and other sources

The system receives alerts, applies routing rules, follows escalation policies, and tracks acknowledgments and resolutions.

## Deploying Grafana OnCall in Kubernetes

Deploy Grafana OnCall using Helm:

```yaml
# Create namespace
apiVersion: v1
kind: Namespace
metadata:
  name: oncall
---
# Add Grafana Helm repository and install
# helm repo add grafana https://grafana.github.io/helm-charts
# helm repo update
# helm install oncall grafana/oncall -n oncall -f values.yaml

# values.yaml
oncall:
  engine:
    replicaCount: 2
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"

  database:
    type: postgresql
    external:
      host: postgres.oncall.svc.cluster.local
      port: 5432
      database: oncall
      user: oncall

  redis:
    enabled: true
    replica:
      replicaCount: 2

  ingress:
    enabled: true
    hosts:
      - host: oncall.example.com
        paths:
          - path: /
            pathType: Prefix

  env:
    - name: BASE_URL
      value: "https://oncall.example.com"
    - name: SECRET_KEY
      valueFrom:
        secretKeyRef:
          name: oncall-secrets
          key: secret-key
```

Deploy the configuration:

```bash
# Create secret for OnCall
kubectl create secret generic oncall-secrets \
  -n oncall \
  --from-literal=secret-key=$(openssl rand -hex 32) \
  --from-literal=database-password=$(openssl rand -hex 16)

# Install OnCall
helm install oncall grafana/oncall \
  -n oncall \
  -f values.yaml
```

## Configuring Alert Sources from Prometheus

Connect Prometheus Alertmanager to Grafana OnCall:

```yaml
# Alertmanager configuration
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
      receiver: 'grafana-oncall'
      group_by: ['alertname', 'cluster', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h

      # Route critical alerts to different escalation
      routes:
      - match:
          severity: critical
        receiver: 'grafana-oncall-critical'
        continue: false
      - match:
          severity: warning
        receiver: 'grafana-oncall-warning'

    receivers:
    - name: 'grafana-oncall'
      webhook_configs:
      - url: 'http://oncall-engine.oncall.svc.cluster.local:8080/integrations/v1/prometheus/'
        send_resolved: true

    - name: 'grafana-oncall-critical'
      webhook_configs:
      - url: 'http://oncall-engine.oncall.svc.cluster.local:8080/integrations/v1/prometheus/critical'
        send_resolved: true

    - name: 'grafana-oncall-warning'
      webhook_configs:
      - url: 'http://oncall-engine.oncall.svc.cluster.local:8080/integrations/v1/prometheus/warning'
        send_resolved: true
```

## Creating On-Call Rotation Schedules

Define rotation schedules using the OnCall API or UI. Here's a complete schedule configuration:

```python
import requests
import json

# OnCall API endpoint
ONCALL_API = "https://oncall.example.com/api/v1"
API_TOKEN = "your-api-token"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Create a weekly rotation schedule
schedule_config = {
    "name": "Platform Team - Weekly Rotation",
    "type": "calendar",
    "time_zone": "America/New_York",
    "shifts": [
        {
            "name": "Business Hours Weekdays",
            "type": "rolling_users",
            "rotation_start": "2026-02-10T09:00:00",
            "duration": 28800,  # 8 hours in seconds
            "frequency": "weekly",
            "by_day": ["MO", "TU", "WE", "TH", "FR"],
            "users": [
                {"user": "alice@example.com"},
                {"user": "bob@example.com"},
                {"user": "charlie@example.com"}
            ]
        },
        {
            "name": "After Hours Weekdays",
            "type": "rolling_users",
            "rotation_start": "2026-02-10T17:00:00",
            "duration": 57600,  # 16 hours
            "frequency": "weekly",
            "by_day": ["MO", "TU", "WE", "TH", "FR"],
            "users": [
                {"user": "dave@example.com"},
                {"user": "eve@example.com"}
            ]
        },
        {
            "name": "Weekend Rotation",
            "type": "rolling_users",
            "rotation_start": "2026-02-15T00:00:00",
            "duration": 172800,  # 48 hours
            "frequency": "weekly",
            "by_day": ["SA", "SU"],
            "users": [
                {"user": "frank@example.com"},
                {"user": "grace@example.com"}
            ]
        }
    ]
}

# Create schedule via API
response = requests.post(
    f"{ONCALL_API}/schedules",
    headers=headers,
    json=schedule_config
)

schedule_id = response.json()["id"]
print(f"Created schedule: {schedule_id}")
```

## Building Escalation Chains

Create sophisticated escalation policies that define how alerts progress if not acknowledged:

```python
# Define escalation chain
escalation_config = {
    "name": "Critical Kubernetes Alerts",
    "steps": [
        {
            "type": "notify_persons",
            "delay": 0,
            "notify": [
                {"user": "current_on_call"}
            ],
            "important": False
        },
        {
            "type": "wait",
            "delay": 300  # Wait 5 minutes
        },
        {
            "type": "notify_persons",
            "delay": 0,
            "notify": [
                {"user": "current_on_call"}
            ],
            "important": True  # Second notification is important
        },
        {
            "type": "wait",
            "delay": 600  # Wait 10 more minutes
        },
        {
            "type": "notify_persons",
            "delay": 0,
            "notify": [
                {"user": "team_lead@example.com"}
            ],
            "important": True
        },
        {
            "type": "wait",
            "delay": 600
        },
        {
            "type": "notify_persons",
            "delay": 0,
            "notify": [
                {"user": "engineering_manager@example.com"}
            ],
            "important": True
        }
    ]
}

# Create escalation chain
response = requests.post(
    f"{ONCALL_API}/escalation_chains",
    headers=headers,
    json=escalation_config
)

escalation_id = response.json()["id"]
```

This escalation chain notifies the on-call person immediately, then escalates to the team lead after 15 minutes, and to the engineering manager after another 10 minutes if still unacknowledged.

## Configuring Route Rules

Define routing rules that determine which alerts go to which escalation chains:

```python
# Create routing rules
routing_config = {
    "integration": "prometheus",
    "routes": [
        {
            "position": 0,
            "routing_regex": ".*severity.*critical.*",
            "escalation_chain": escalation_id,
            "slack_channel": "alerts-critical"
        },
        {
            "position": 1,
            "routing_regex": ".*namespace.*kube-system.*",
            "escalation_chain": escalation_id,
            "slack_channel": "alerts-infrastructure"
        },
        {
            "position": 2,
            "routing_regex": ".*alertname.*PodCrashLooping.*",
            "escalation_chain": escalation_id,
            "slack_channel": "alerts-applications"
        }
    ]
}
```

## Setting Up Notification Channels

Configure multiple notification channels for different alert types:

```yaml
# Slack integration via ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: oncall-integrations
  namespace: oncall
data:
  slack.json: |
    {
      "slack_channel_id": "C01234ABCDE",
      "slack_team_identity": {
        "id": "T01234ABCDE",
        "name": "Example Team"
      }
    }
```

Configure notification preferences via API:

```python
# Set user notification preferences
notification_config = {
    "user": "alice@example.com",
    "notification_rules": [
        {
            "type": "notify_by_slack",
            "important": False,
            "delay": 0
        },
        {
            "type": "notify_by_sms",
            "important": True,
            "delay": 0
        },
        {
            "type": "notify_by_phone_call",
            "important": True,
            "delay": 300  # Call after 5 minutes if still unacknowledged
        }
    ]
}
```

## Implementing Follow-the-Sun Schedules

For global teams, create schedules that hand off between time zones:

```python
# Asia-Pacific shift
apac_schedule = {
    "name": "APAC Shift",
    "time_zone": "Asia/Singapore",
    "shifts": [{
        "rotation_start": "2026-02-10T09:00:00",
        "duration": 28800,  # 8 hours
        "frequency": "daily",
        "users": [
            {"user": "apac-engineer1@example.com"},
            {"user": "apac-engineer2@example.com"}
        ]
    }]
}

# Europe shift
emea_schedule = {
    "name": "EMEA Shift",
    "time_zone": "Europe/London",
    "shifts": [{
        "rotation_start": "2026-02-10T09:00:00",
        "duration": 28800,
        "frequency": "daily",
        "users": [
            {"user": "emea-engineer1@example.com"},
            {"user": "emea-engineer2@example.com"}
        ]
    }]
}

# Americas shift
amer_schedule = {
    "name": "Americas Shift",
    "time_zone": "America/New_York",
    "shifts": [{
        "rotation_start": "2026-02-10T09:00:00",
        "duration": 28800,
        "frequency": "daily",
        "users": [
            {"user": "amer-engineer1@example.com"},
            {"user": "amer-engineer2@example.com"}
        ]
    }]
}
```

## Creating Override Schedules

Handle vacation and shift swaps with override schedules:

```python
# Create override for user vacation
override_config = {
    "schedule": schedule_id,
    "user": "alice@example.com",
    "start": "2026-02-20T00:00:00",
    "end": "2026-02-27T00:00:00",
    "rotation_start": None  # Remove from rotation
}

# Create override for shift swap
swap_config = {
    "schedule": schedule_id,
    "user": "bob@example.com",  # Bob covers for Alice
    "start": "2026-02-20T00:00:00",
    "end": "2026-02-27T00:00:00",
    "rotation_start": "2026-02-20T09:00:00"
}
```

## Integrating with Kubernetes Operators

Create a Kubernetes operator integration for automated escalation:

```python
from kubernetes import client, config, watch

# Watch for pod failures and create OnCall incidents
def watch_critical_pods():
    config.load_incluster_config()
    v1 = client.CoreV1Api()
    w = watch.Watch()

    for event in w.stream(v1.list_pod_for_all_namespaces):
        pod = event['object']
        if pod.status.phase == 'Failed':
            # Create incident in OnCall
            incident_data = {
                "title": f"Pod {pod.metadata.name} failed",
                "message": f"Pod in namespace {pod.metadata.namespace} has failed",
                "alert_group_id": f"pod-failure-{pod.metadata.uid}",
                "integration": "kubernetes",
                "severity": "critical"
            }

            requests.post(
                f"{ONCALL_API}/incidents",
                headers=headers,
                json=incident_data
            )
```

## Setting Up Alert Grouping

Configure intelligent alert grouping to reduce notification noise:

```python
# Configure grouping rules
grouping_config = {
    "integration": "prometheus",
    "grouping_id_template": "{{ payload.labels.alertname }}-{{ payload.labels.namespace }}",
    "resolve_condition": "payload.status == 'resolved'",
    "acknowledge_condition": None,
    "source_link_template": "https://grafana.example.com/d/{{ payload.labels.dashboard }}?orgId=1&var-namespace={{ payload.labels.namespace }}"
}
```

## Creating Custom Notification Templates

Customize notification messages for better context:

```python
# Custom Slack message template
slack_template = {
    "title": "{{ payload.labels.alertname }}",
    "message": """
*Alert:* {{ payload.labels.alertname }}
*Severity:* {{ payload.labels.severity }}
*Namespace:* {{ payload.labels.namespace }}
*Pod:* {{ payload.labels.pod }}

*Description:*
{{ payload.annotations.description }}

*Runbook:* {{ payload.annotations.runbook_url }}
    """,
    "image_url": None
}

# Custom SMS template (keep it short)
sms_template = {
    "message": "{{ payload.labels.severity | upper }}: {{ payload.labels.alertname }} in {{ payload.labels.namespace }}"
}
```

## Monitoring OnCall Performance

Track OnCall system health:

```promql
# Alert acknowledgment time
histogram_quantile(
  0.95,
  sum(rate(oncall_alert_acknowledgment_duration_seconds_bucket[5m])) by (le)
)

# Alert resolution time
histogram_quantile(
  0.95,
  sum(rate(oncall_alert_resolution_duration_seconds_bucket[5m])) by (le)
)

# Failed notification delivery
rate(oncall_notification_failed_total[5m])
```

## Conclusion

Grafana OnCall transforms Kubernetes alert management from chaotic paging to organized incident response. With proper rotation schedules, escalation chains, and routing rules, you ensure critical alerts always reach someone who can respond while avoiding unnecessary interruptions.

Start with basic schedules and escalation chains, then add sophisticated routing rules and notification preferences. Integrate with your existing Prometheus alerts and expand to include custom incident triggers. The result is a reliable on-call system that keeps your Kubernetes clusters healthy without burning out your team.
