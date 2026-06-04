# How to Set Up Grafana OnCall for Kubernetes Alert Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, Incident Management

Description: Learn how to configure Grafana OnCall for managing Kubernetes alert escalations, rotation schedules, and on-call workflows to ensure critical alerts reach the right team members at the right time.

---

Kubernetes alerts are only valuable if they reach someone who can act on them. Grafana OnCall solves the alert routing challenge by providing sophisticated escalation policies, rotation schedules, and notification workflows specifically designed for modern infrastructure monitoring.

This guide walks through deploying Grafana OnCall in Kubernetes, configuring escalation chains, setting up rotation schedules, and integrating with your existing Prometheus alerting infrastructure.

Note: Grafana OnCall OSS was archived on March 24, 2026. Existing self-hosted deployments can still run the archived OSS chart, but active development has moved to Grafana Cloud IRM. Treat new OSS deployments as maintenance or migration work rather than a long-term greenfield choice.

## Understanding Grafana OnCall Architecture

Grafana OnCall consists of several components:

- **Engine** - Core routing and escalation logic
- **Grafana plugin UI** - Management interface for schedules and escalations inside Grafana
- **Celery workers** - Background processing for escalations and notifications
- **Integrations** - Connectors for Prometheus Alertmanager, Grafana alerts, and other sources

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
base_url: oncall.example.com
base_url_protocol: https

engine:
  replicaCount: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

celery:
  replicaCount: 2

oncall:
  secrets:
    existingSecret: oncall-secrets
    secretKey: SECRET_KEY
    mirageSecretKey: MIRAGE_SECRET_KEY

database:
  type: postgresql

postgresql:
  enabled: false

externalPostgresql:
  host: postgres.oncall.svc.cluster.local
  port: 5432
  db_name: oncall
  user: oncall
  existingSecret: oncall-secrets
  passwordKey: DATABASE_PASSWORD

redis:
  enabled: true

rabbitmq:
  enabled: true

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/issuer: "letsencrypt-prod"
  tls:
    - hosts:
        - oncall.example.com
      secretName: oncall-tls

grafana:
  enabled: true
  grafana.ini:
    server:
      domain: oncall.example.com
      root_url: "%(protocol)s://%(domain)s/grafana/"
      serve_from_sub_path: true
```

Deploy the configuration:

```bash
# Create secret for OnCall
kubectl create secret generic oncall-secrets \
  -n oncall \
  --from-literal=SECRET_KEY=$(openssl rand -hex 32) \
  --from-literal=MIRAGE_SECRET_KEY=$(openssl rand -hex 32) \
  --from-literal=DATABASE_PASSWORD=$(openssl rand -hex 16)

# Install OnCall
helm install oncall grafana/oncall \
  -n oncall \
  -f values.yaml
```

## Configuring Alert Sources from Prometheus

Connect Prometheus Alertmanager to Grafana OnCall. Create an Alertmanager Prometheus integration in the OnCall UI, then copy the integration URL from the HTTP Endpoint section:

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
      - url: '<oncall-alertmanager-integration-url>'
        send_resolved: true
        max_alerts: 100

    - name: 'grafana-oncall-critical'
      webhook_configs:
      - url: '<critical-alertmanager-integration-url>'
        send_resolved: true
        max_alerts: 100

    - name: 'grafana-oncall-warning'
      webhook_configs:
      - url: '<warning-alertmanager-integration-url>'
        send_resolved: true
        max_alerts: 100
```

## Creating On-Call Rotation Schedules

Define rotation schedules using the OnCall API or UI. Here's a complete schedule configuration:

```python
import requests

# OnCall API endpoint
ONCALL_API = "https://oncall.example.com/api/v1"
API_TOKEN = "your-api-token"

headers = {
    "Authorization": API_TOKEN,
    "Content-Type": "application/json"
}

# User IDs from the OnCall users API
ALICE = "U4DNY931HHJS5"
BOB = "U7S8H84ARFTGN"
CHARLIE = "UC2CHRT5SD34X"
DAVE = "U9Q9X84ARFTGN"
EVE = "U1A2B3C4D5E6F"
FRANK = "U6F5E4D3C2B1A"
GRACE = "U8G7H6I5J4K3L"

# Create a weekly rotation schedule
schedule_config = {
    "name": "Platform Team - Weekly Rotation",
    "type": "calendar",
    "time_zone": "America/New_York",
    "shifts": [
        {
            "name": "Business Hours Weekdays",
            "type": "rolling_users",
            "start": "2026-02-10T09:00:00",
            "duration": 28800,  # 8 hours in seconds
            "frequency": "weekly",
            "by_day": ["MO", "TU", "WE", "TH", "FR"],
            "rolling_users": [[ALICE], [BOB], [CHARLIE]]
        },
        {
            "name": "After Hours Weekdays",
            "type": "rolling_users",
            "start": "2026-02-10T17:00:00",
            "duration": 57600,  # 16 hours
            "frequency": "weekly",
            "by_day": ["MO", "TU", "WE", "TH", "FR"],
            "rolling_users": [[DAVE], [EVE]]
        },
        {
            "name": "Weekend Rotation",
            "type": "rolling_users",
            "start": "2026-02-15T00:00:00",
            "duration": 172800,  # 48 hours
            "frequency": "weekly",
            "by_day": ["SA"],
            "rolling_users": [[FRANK], [GRACE]]
        }
    ]
}

# Create schedule via API
response = requests.post(
    f"{ONCALL_API}/schedules/",
    headers=headers,
    json=schedule_config
)
response.raise_for_status()

schedule_id = response.json()["id"]
print(f"Created schedule: {schedule_id}")
```

## Building Escalation Chains

Create sophisticated escalation policies that define how alerts progress if not acknowledged:

```python
# Create escalation chain
response = requests.post(
    f"{ONCALL_API}/escalation_chains/",
    headers=headers,
    json={"name": "Critical Kubernetes Alerts"}
)
response.raise_for_status()
escalation_id = response.json()["id"]

# Define escalation policies
escalation_policies = [
    {
        "escalation_chain_id": escalation_id,
        "position": 0,
        "type": "notify_on_call_from_schedule",
        "notify_on_call_from_schedule": schedule_id,
        "important": False
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 1,
        "type": "wait",
        "duration": 300  # Wait 5 minutes
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 2,
        "type": "notify_on_call_from_schedule",
        "notify_on_call_from_schedule": schedule_id,
        "important": True  # Second notification is important
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 3,
        "type": "wait",
        "duration": 600  # Wait 10 more minutes
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 4,
        "type": "notify_persons",
        "persons_to_notify": ["UTEAMLEAD123"],
        "important": True
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 5,
        "type": "wait",
        "duration": 600
    },
    {
        "escalation_chain_id": escalation_id,
        "position": 6,
        "type": "notify_persons",
        "persons_to_notify": ["UENGMANAGER1"],
        "important": True
    }
]

for policy in escalation_policies:
    response = requests.post(
        f"{ONCALL_API}/escalation_policies/",
        headers=headers,
        json=policy
    )
    response.raise_for_status()
```

This escalation chain notifies the on-call person immediately, then escalates to the team lead after 15 minutes, and to the engineering manager after another 10 minutes if still unacknowledged.

## Configuring Route Rules

Define routing rules that determine which alerts go to which escalation chains:

```python
# Create routing rules
integration_id = "CFRPV98RPR1U8"

routing_rules = [
    {
        "integration_id": integration_id,
        "position": 0,
        "routing_regex": ".*severity.*critical.*",
        "escalation_chain_id": escalation_id,
        "slack": {"channel_id": "C01234CRITICAL"}
    },
    {
        "integration_id": integration_id,
        "position": 1,
        "routing_regex": ".*namespace.*kube-system.*",
        "escalation_chain_id": escalation_id,
        "slack": {"channel_id": "C01234INFRA"}
    },
    {
        "integration_id": integration_id,
        "position": 2,
        "routing_regex": ".*alertname.*PodCrashLooping.*",
        "escalation_chain_id": escalation_id,
        "slack": {"channel_id": "C01234APPS"}
    }
]

for route in routing_rules:
    response = requests.post(
        f"{ONCALL_API}/routes/",
        headers=headers,
        json=route
    )
    response.raise_for_status()
```

## Setting Up Notification Channels

Configure multiple notification channels for different alert types:

```yaml
# Slack integration via Helm values
oncall:
  slack:
    enabled: true
    existingSecret: oncall-slack-secrets
    clientIdKey: SLACK_CLIENT_OAUTH_ID
    clientSecretKey: SLACK_CLIENT_OAUTH_SECRET
    signingSecretKey: SLACK_SIGNING_SECRET
    redirectHost: https://oncall.example.com
```

Configure notification preferences via API:

```python
# Set user notification preferences
notification_rules = [
    {
        "user_id": ALICE,
        "position": 0,
        "type": "notify_by_slack",
        "important": False
    },
    {
        "user_id": ALICE,
        "position": 1,
        "type": "notify_by_sms",
        "important": True
    },
    {
        "user_id": ALICE,
        "position": 2,
        "type": "wait",
        "duration": 300
    },
    {
        "user_id": ALICE,
        "position": 3,
        "type": "notify_by_phone_call",
        "important": True
    }
]

for rule in notification_rules:
    response = requests.post(
        f"{ONCALL_API}/personal_notification_rules/",
        headers=headers,
        json=rule
    )
    response.raise_for_status()
```

## Implementing Follow-the-Sun Schedules

For global teams, create schedules that hand off between time zones:

```python
# Asia-Pacific shift
apac_schedule = {
    "name": "APAC Shift",
    "type": "calendar",
    "time_zone": "Asia/Singapore",
    "shifts": [{
        "name": "APAC Business Hours",
        "type": "rolling_users",
        "start": "2026-02-10T09:00:00",
        "duration": 28800,  # 8 hours
        "frequency": "daily",
        "rolling_users": [["UAPACENG1"], ["UAPACENG2"]]
    }]
}

# Europe shift
emea_schedule = {
    "name": "EMEA Shift",
    "type": "calendar",
    "time_zone": "Europe/London",
    "shifts": [{
        "name": "EMEA Business Hours",
        "type": "rolling_users",
        "start": "2026-02-10T09:00:00",
        "duration": 28800,
        "frequency": "daily",
        "rolling_users": [["UEMEAENG1"], ["UEMEAENG2"]]
    }]
}

# Americas shift
amer_schedule = {
    "name": "Americas Shift",
    "type": "calendar",
    "time_zone": "America/New_York",
    "shifts": [{
        "name": "Americas Business Hours",
        "type": "rolling_users",
        "start": "2026-02-10T09:00:00",
        "duration": 28800,
        "frequency": "daily",
        "rolling_users": [["UAMERENG1"], ["UAMERENG2"]]
    }]
}
```

## Creating Override Schedules

Handle vacation and shift swaps with web overrides, shift swaps, or an override iCal calendar:

```python
# Attach an override calendar to an API-managed schedule
override_config = {
    "name": "Platform Team - Weekly Rotation",
    "type": "calendar",
    "time_zone": "America/New_York",
    "ical_url_overrides": "https://calendar.example.com/platform-overrides.ics",
    "enable_web_overrides": True
}

response = requests.put(
    f"{ONCALL_API}/schedules/{schedule_id}/",
    headers=headers,
    json=override_config
)
response.raise_for_status()
```

## Integrating with Kubernetes Operators

Create a Kubernetes operator integration for automated escalation:

```python
import requests
from kubernetes import client, config, watch

ONCALL_INTEGRATION_URL = "https://oncall.example.com/integrations/v1/webhook/<integration-token>/"

# Watch for pod failures and send alerts to an OnCall webhook integration
def watch_critical_pods():
    config.load_incluster_config()
    v1 = client.CoreV1Api()
    w = watch.Watch()

    for event in w.stream(v1.list_pod_for_all_namespaces):
        pod = event['object']
        if pod.status.phase == 'Failed':
            alert_data = {
                "title": f"Pod {pod.metadata.name} failed",
                "message": f"Pod in namespace {pod.metadata.namespace} has failed",
                "alert_group_id": f"pod-failure-{pod.metadata.uid}",
                "severity": "critical",
                "namespace": pod.metadata.namespace,
                "pod": pod.metadata.name
            }

            requests.post(
                ONCALL_INTEGRATION_URL,
                json=alert_data,
                timeout=10
            )
```

## Setting Up Alert Grouping

Configure intelligent alert grouping to reduce notification noise:

```python
# Configure grouping templates for an integration
grouping_config = {
    "templates": {
        "grouping_key": "{{ payload.groupLabels.alertname }}-{{ payload.groupLabels.namespace }}",
        "resolve_signal": "{{ 1 if payload.status == 'resolved' else 0 }}",
        "acknowledge_signal": None,
        "source_link": "https://grafana.example.com/d/{{ payload.commonLabels.dashboard }}?orgId=1&var-namespace={{ payload.commonLabels.namespace }}"
    }
}

response = requests.put(
    f"{ONCALL_API}/integrations/{integration_id}/",
    headers=headers,
    json=grouping_config
)
response.raise_for_status()
```

For Alertmanager integrations, keep grouping in Alertmanager when possible and only customize OnCall grouping templates when you have a specific reason to override the defaults.

## Creating Custom Notification Templates

Customize notification messages for better context:

```python
# Custom notification templates
template_config = {
    "templates": {
        "slack": {
            "title": "{{ payload.commonLabels.alertname }}",
            "message": """
*Alert:* {{ payload.commonLabels.alertname }}
*Severity:* {{ payload.commonLabels.severity }}
*Namespace:* {{ payload.commonLabels.namespace }}

*Description:*
{{ payload.commonAnnotations.description }}

*Runbook:* {{ payload.commonAnnotations.runbook_url }}
            """,
            "image_url": None
        },
        "sms": {
            "title": "{{ payload.commonLabels.severity | upper }}: {{ payload.commonLabels.alertname }} in {{ payload.commonLabels.namespace }}"
        }
    }
}

response = requests.put(
    f"{ONCALL_API}/integrations/{integration_id}/",
    headers=headers,
    json=template_config
)
response.raise_for_status()
```

## Monitoring OnCall Performance

Track OnCall system health. Enable the OnCall exporter in Helm, then scrape the `/metrics/` endpoint:

```yaml
oncall:
  exporter:
    enabled: true
    authToken: "replace-with-a-long-random-token"
```

```promql
# Alert group response time over the last 7 days
histogram_quantile(
  0.95,
  sum(rate(oncall_alert_groups_response_time_seconds_bucket[5m])) by (le)
)

# Alert groups by state
sum(oncall_alert_groups_total) by (state)

# Users who received alert group notifications
sum(rate(oncall_user_was_notified_of_alert_groups_total[5m])) by (username)
```

## Conclusion

Grafana OnCall transforms Kubernetes alert management from chaotic paging to organized incident response. With proper rotation schedules, escalation chains, and routing rules, you ensure critical alerts always reach someone who can respond while avoiding unnecessary interruptions.

Start with basic schedules and escalation chains, then add sophisticated routing rules and notification preferences. Integrate with your existing Prometheus alerts and expand to include custom incident triggers. The result is a reliable on-call system that keeps your Kubernetes clusters healthy without burning out your team.
