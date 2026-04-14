# How to Use Dapr Metrics with OpsGenie

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpsGenie, Alerting, Incident Management, Prometheus

Description: Integrate Dapr Prometheus alerts with OpsGenie for on-call management, configure team routing rules, and set up escalation policies for Dapr incidents.

---

OpsGenie provides on-call scheduling, escalation policies, and alert routing for teams managing Dapr deployments. By connecting Prometheus Alertmanager to OpsGenie, Dapr metric alerts become tracked incidents with assigned owners, acknowledgment workflows, and post-mortem integration.

## Integration Architecture

```text
Dapr Metrics -> Prometheus -> Alertmanager -> OpsGenie API -> On-Call Team
```

OpsGenie receives alerts from Alertmanager via the OpsGenie REST API and routes them based on teams, schedules, and escalation policies.

## Creating an OpsGenie Integration

1. In OpsGenie, navigate to Settings - Integrations - Add Integration
2. Search for "Prometheus" and click Add
3. Copy the API key from the integration configuration
4. Note the API URL (EU: `api.eu.opsgenie.com`, US: `api.opsgenie.com`)

## Configuring Alertmanager for OpsGenie

```yaml
# alertmanager.yaml
global:
  opsgenie_api_url: https://api.opsgenie.com/

route:
  group_by: ['alertname', 'namespace', 'app_id']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h
  receiver: default-opsgenie
  routes:
    - match:
        severity: critical
      receiver: dapr-critical-team
      group_wait: 0s

    - match:
        severity: warning
      receiver: dapr-platform-team

receivers:
  - name: default-opsgenie
    opsgenie_configs:
      - api_key: YOUR_OPSGENIE_API_KEY
        message: '{{ .GroupLabels.alertname }}'
        priority: P2
        responders:
          - name: platform-engineering
            type: team

  - name: dapr-critical-team
    opsgenie_configs:
      - api_key: YOUR_OPSGENIE_API_KEY
        message: '{{ .GroupLabels.alertname }}'
        description: '{{ .CommonAnnotations.description }}'
        priority: P1
        tags:
          - dapr
          - '{{ .GroupLabels.namespace }}'
        details:
          app_id: '{{ .GroupLabels.app_id }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
        responders:
          - name: platform-engineering
            type: team

  - name: dapr-platform-team
    opsgenie_configs:
      - api_key: YOUR_OPSGENIE_API_KEY
        message: 'Dapr Warning: {{ .GroupLabels.alertname }}'
        priority: P3
        responders:
          - name: platform-engineering
            type: team
```

## Deploying as a Kubernetes Secret

```bash
kubectl create secret generic alertmanager-opsgenie \
  --from-literal=api-key=YOUR_OPSGENIE_API_KEY \
  -n monitoring
```

Reference the secret in Alertmanager configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      opsgenie_api_url: https://api.opsgenie.com/
    route:
      receiver: dapr-platform-team
    receivers:
      - name: dapr-platform-team
        opsgenie_configs:
          - api_key: YOUR_OPSGENIE_API_KEY
            priority: P2
```

## Routing Dapr Alerts to Specific Teams

Configure OpsGenie routing rules per Dapr component area:

```yaml
routes:
  - match:
      alertname: DaprControlPlaneDown
    receiver: dapr-infra-critical
  - match_re:
      alertname: "DaprPubSub.*"
    receiver: dapr-data-team
  - match_re:
      alertname: "DaprState.*"
    receiver: dapr-data-team
  - match_re:
      alertname: "DaprSLO.*"
    receiver: dapr-sre-team
```

## Testing OpsGenie Integration

Send a test alert via curl:

```bash
curl -X POST \
  https://api.opsgenie.com/v2/alerts \
  -H "Authorization: GenieKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dapr Control Plane Test Alert",
    "alias": "dapr-control-plane-test",
    "description": "Test alert from Dapr Prometheus integration",
    "priority": "P3",
    "tags": ["dapr", "test"]
  }'
```

Verify Alertmanager is correctly forwarding:

```bash
kubectl port-forward svc/alertmanager-operated 9093:9093 -n monitoring
curl http://localhost:9093/api/v2/status | jq '.config.original'
```

## Summary

OpsGenie integration with Dapr metrics via Alertmanager provides team-based alert routing with priority levels mapped to Dapr alert severity. Routing control plane failures as P1, SLO burn rate alerts as P2, and warning-level metrics as P3 ensures the right teams are engaged at the right urgency level.
