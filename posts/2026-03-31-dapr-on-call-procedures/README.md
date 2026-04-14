# How to Set Up Dapr On-Call Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, On-Call, Incident Response, Operation, SRE

Description: Establish effective on-call procedures for Dapr production environments including escalation policies, diagnostic toolkits, and shift handover practices.

---

A well-defined on-call procedure for Dapr reduces panic during incidents by giving engineers a clear process to follow. This guide covers setting up escalation paths, preparing diagnostic toolkits, and managing shift handovers.

## On-Call Rotation Setup

Configure PagerDuty or OpsGenie schedules aligned with your team's time zones:

```json
// OpsGenie rotation configuration (API payload)
{
  "name": "Dapr Platform On-Call",
  "type": "weekly",
  "startDate": "2026-01-01T09:00:00Z",
  "rotations": [
    {
      "name": "Primary",
      "type": "weekly",
      "length": 1,
      "participants": [
        {"type": "user", "username": "engineer-1"},
        {"type": "user", "username": "engineer-2"},
        {"type": "user", "username": "engineer-3"}
      ]
    }
  ]
}
```

## Alert Routing to On-Call

Route Dapr alerts to the correct on-call schedule:

```yaml
# AlertManager routing
route:
  routes:
  - match:
      severity: critical
      namespace: dapr-system
    receiver: dapr-pagerduty-critical
    continue: false
  - match:
      severity: warning
    receiver: dapr-slack-warning

receivers:
- name: dapr-pagerduty-critical
  pagerduty_configs:
  - routing_key: "${PAGERDUTY_KEY}"
    severity: critical
    client: "Prometheus AlertManager"
    client_url: "https://grafana.company.com"
    description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

## First Responder Diagnostic Checklist

Provide on-call engineers a quick triage checklist:

```bash
#!/bin/bash
# dapr-triage.sh - Run at incident start
echo "=== Dapr Control Plane Status ==="
kubectl get pods -n dapr-system

echo "=== Recent Error Events ==="
kubectl get events -n dapr-system --sort-by='.lastTimestamp' | tail -20

echo "=== Sidecar Status (sample) ==="
kubectl get pods --all-namespaces -l "dapr.io/enabled=true" | \
  grep -v Running | head -20

echo "=== Recent Error Logs ==="
kubectl logs -n dapr-system -l app=dapr-operator --tail=30 | grep -i error
```

## Severity Level Definitions

Define clear severity levels for Dapr incidents:

| Severity | Condition | Response Time |
|----------|-----------|---------------|
| P1 | Control plane down or >10% error rate | 15 minutes |
| P2 | Single service failing or p99 >500ms | 30 minutes |
| P3 | Non-critical pub/sub delay or warning alert | 4 hours |
| P4 | Informational, no user impact | Next business day |

Document this in your team wiki and reference it in AlertManager annotations.

## Escalation Procedures

Define when to escalate from primary to secondary and beyond:

```text
Level 1: Primary on-call engineer
  - Initial triage and standard runbook execution
  - Escalate after 20 minutes if unresolved

Level 2: Senior platform engineer
  - Deep diagnosis, non-standard fixes
  - Escalate after 45 minutes if unresolved

Level 3: Dapr subject matter expert / vendor support
  - Critical production outages only
  - Open Dapr GitHub issue or commercial support ticket
```

## Shift Handover Template

Use a structured handover format at end of shift:

```markdown
## Shift Handover - {{ date }}

### Open Incidents
- [P2] DaprHighErrorRate on payment-service - Investigating Redis connection timeouts
  - Last action: Restarted Redis replica at 14:30
  - Next step: Monitor for 2 hours, escalate if error rate stays above 2%

### Recent Changes
- Upgraded Dapr to 1.15.1 at 10:00
- Deployed new resiliency policy to checkout-service

### Watch Items
- order-processor memory usage at 85% - may need scaling
```

## Post-Incident Review

After each P1 or P2 incident, run a blameless post-incident review:

```bash
# Gather incident timeline from Prometheus
curl -s "http://prometheus:9090/api/v1/query_range" \
  --data-urlencode "query=rate(dapr_runtime_service_invocation_req_sent_total{status_code!~'2..'}[5m])" \
  --data-urlencode "start=2026-03-30T00:00:00Z" \
  --data-urlencode "end=2026-03-31T00:00:00Z" \
  --data-urlencode "step=60" | jq '.data.result'
```

## Summary

Effective Dapr on-call procedures combine automated alert routing to on-call schedules, diagnostic toolkits for rapid triage, clear severity and escalation definitions, and structured handover templates. Post-incident reviews close the loop by improving runbooks based on real incidents.
