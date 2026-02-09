# How to Implement Prometheus Alert Silences During Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Alertmanager, Silences, Maintenance, Operations

Description: Learn how to create and manage Alertmanager silences to suppress alerts during planned maintenance windows without losing visibility.

---

Planned maintenance generates expected alerts that create noise and alert fatigue. Alertmanager silences temporarily suppress matching alerts during maintenance windows. Unlike disabling alerts entirely, silences preserve alert history and automatically expire. This guide covers creating, managing, and automating silences for planned maintenance, deployments, and operational tasks.

## Understanding Alertmanager Silences

Silences match alerts based on labels and suppress notifications for a specified duration. Key characteristics:
- Match alerts using label matchers (exact match or regex)
- Have defined start and end times
- Can be created, viewed, and deleted via UI or API
- Are stored in Alertmanager's state
- Automatically expire when the time window ends
- Do not prevent alerts from firing (alerts still appear in Prometheus)

Silences affect notification delivery, not alert evaluation.

## Creating Silences via Alertmanager UI

Access Alertmanager UI:

```bash
kubectl port-forward -n monitoring svc/alertmanager-operated 9093:9093
# Open http://localhost:9093
```

Create a silence:
1. Click "New Silence"
2. Add matchers (e.g., `alertname="HighCPU"`, `namespace="production"`)
3. Set duration (start time, end time)
4. Add comment explaining the silence
5. Set creator name
6. Click "Create"

## Creating Silences via API

Use the Alertmanager API to create silences programmatically:

```bash
# Create a silence
curl -X POST http://localhost:9093/api/v2/silences \
  -H 'Content-Type: application/json' \
  -d '{
    "matchers": [
      {
        "name": "alertname",
        "value": "HighCPU",
        "isRegex": false,
        "isEqual": true
      },
      {
        "name": "namespace",
        "value": "production",
        "isRegex": false,
        "isEqual": true
      }
    ],
    "startsAt": "2026-02-09T10:00:00Z",
    "endsAt": "2026-02-09T12:00:00Z",
    "createdBy": "ops-team",
    "comment": "Database maintenance window"
  }'
```

Response includes the silence ID for future reference.

## Creating Silences with amtool

Use amtool CLI for silence management:

```bash
# Install amtool
go install github.com/prometheus/alertmanager/cmd/amtool@latest

# Create a silence
amtool silence add \
  alertname="HighCPU" \
  namespace="production" \
  --comment="Planned maintenance" \
  --duration=2h \
  --author="ops-team" \
  --alertmanager.url=http://localhost:9093
```

From within Kubernetes:

```bash
kubectl exec -n monitoring alertmanager-pod -- \
  amtool silence add \
  alertname="HighCPU" \
  namespace="production" \
  --comment="Database upgrade" \
  --duration=1h \
  --author="dba-team"
```

## Common Silence Patterns

### Silence All Alerts for a Service

```bash
# Silence all alerts for a specific service
amtool silence add \
  service="payment-api" \
  --comment="Payment API deployment" \
  --duration=30m \
  --author="deploy-bot"
```

API version:

```bash
curl -X POST http://localhost:9093/api/v2/silences \
  -H 'Content-Type: application/json' \
  -d '{
    "matchers": [
      {
        "name": "service",
        "value": "payment-api",
        "isRegex": false,
        "isEqual": true
      }
    ],
    "startsAt": "2026-02-09T14:00:00Z",
    "endsAt": "2026-02-09T14:30:00Z",
    "createdBy": "deploy-bot",
    "comment": "Deployment of payment-api v2.3.0"
  }'
```

### Silence Specific Alert Types

```bash
# Silence pod restart alerts during deployment
amtool silence add \
  alertname=~"PodCrashLooping|PodRestartingFrequently" \
  namespace="production" \
  deployment="web-app" \
  --comment="Rolling update" \
  --duration=15m \
  --author="ci-cd"
```

### Silence Node Maintenance

```bash
# Silence all alerts from a specific node
amtool silence add \
  node="node-01.example.com" \
  --comment="Node maintenance - OS updates" \
  --duration=4h \
  --author="sre-team"
```

### Silence Namespace

```bash
# Silence all alerts in a namespace
amtool silence add \
  namespace="staging" \
  --comment="Staging environment maintenance" \
  --duration=2h \
  --author="platform-team"
```

### Silence Critical Alerts Only

```bash
# Silence critical alerts during risky operation
amtool silence add \
  severity="critical" \
  cluster="production" \
  --comment="Database migration" \
  --duration=1h \
  --author="dba-team"
```

## Automated Silence Creation

### Silence Script for Deployments

Create a script to silence alerts during deployments:

```bash
#!/bin/bash
# create-deployment-silence.sh

NAMESPACE=$1
SERVICE=$2
DURATION=${3:-"30m"}
COMMENT="${4:-Deployment}"

ALERTMANAGER_URL="http://alertmanager-operated.monitoring.svc.cluster.local:9093"

# Create silence
SILENCE_ID=$(curl -s -X POST "${ALERTMANAGER_URL}/api/v2/silences" \
  -H 'Content-Type: application/json' \
  -d "{
    \"matchers\": [
      {\"name\": \"namespace\", \"value\": \"${NAMESPACE}\", \"isRegex\": false},
      {\"name\": \"service\", \"value\": \"${SERVICE}\", \"isRegex\": false}
    ],
    \"startsAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"endsAt\": \"$(date -u -d '+${DURATION}' +%Y-%m-%dT%H:%M:%SZ)\",
    \"createdBy\": \"deployment-automation\",
    \"comment\": \"${COMMENT}\"
  }" | jq -r '.silenceID')

echo "Created silence: ${SILENCE_ID}"
echo "Silence active for ${DURATION}"

# Store silence ID for later deletion
echo "${SILENCE_ID}" > /tmp/silence-${SERVICE}.id
```

Usage:

```bash
# Before deployment
./create-deployment-silence.sh production payment-api 30m "v2.3.0 deployment"

# After deployment (optionally delete early)
./delete-silence.sh $(cat /tmp/silence-payment-api.id)
```

### Kubernetes CronJob for Scheduled Silences

Create recurring silences with CronJobs:

```yaml
# scheduled-silence-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-maintenance-silence
  namespace: monitoring
spec:
  # Every Saturday at 2 AM
  schedule: "0 2 * * 6"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: silence-manager
          containers:
            - name: create-silence
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  curl -X POST http://alertmanager-operated:9093/api/v2/silences \
                    -H 'Content-Type: application/json' \
                    -d '{
                      "matchers": [
                        {"name": "alertname", "value": "ScheduledBackup.*", "isRegex": true}
                      ],
                      "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                      "endsAt": "'$(date -u -d '+4 hours' +%Y-%m-%dT%H:%M:%SZ)'",
                      "createdBy": "scheduled-maintenance",
                      "comment": "Weekly backup window"
                    }'
          restartPolicy: OnFailure
```

### Pre-Deployment Hook

Integrate with CI/CD to create silences automatically:

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  before_script:
    - |
      # Create silence before deployment
      curl -X POST $ALERTMANAGER_URL/api/v2/silences \
        -H 'Content-Type: application/json' \
        -d "{
          \"matchers\": [
            {\"name\": \"service\", \"value\": \"$CI_PROJECT_NAME\", \"isRegex\": false},
            {\"name\": \"namespace\", \"value\": \"$NAMESPACE\", \"isRegex\": false}
          ],
          \"startsAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
          \"endsAt\": \"$(date -u -d '+30 minutes' +%Y-%m-%dT%H:%M:%SZ)\",
          \"createdBy\": \"gitlab-ci\",
          \"comment\": \"Deployment of $CI_COMMIT_TAG\"
        }"
  script:
    - kubectl apply -f deployment.yaml
```

## Managing Silences

### List Active Silences

```bash
# List all silences
amtool silence query --alertmanager.url=http://localhost:9093

# List silences with specific matcher
amtool silence query alertname="HighCPU" --alertmanager.url=http://localhost:9093

# Using API
curl http://localhost:9093/api/v2/silences | jq '.[] | {id: .id, comment: .comment, matchers: .matchers}'
```

### Delete a Silence

```bash
# Delete by ID
amtool silence expire <silence-id> --alertmanager.url=http://localhost:9093

# Using API
curl -X DELETE http://localhost:9093/api/v2/silence/<silence-id>
```

### Extend a Silence

```bash
# Get existing silence
SILENCE=$(curl -s http://localhost:9093/api/v2/silences/<silence-id>)

# Modify end time and resubmit
echo $SILENCE | jq '.endsAt = "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)'"' | \
  curl -X POST http://localhost:9093/api/v2/silences -H 'Content-Type: application/json' -d @-
```

## Best Practices for Silences

### Include Context in Comments

Always provide detailed comments:

```bash
amtool silence add \
  service="database" \
  --comment="PostgreSQL upgrade 12.x to 14.x - Ticket: OPS-1234 - Engineer: John Doe" \
  --duration=2h \
  --author="john.doe@example.com"
```

### Use Specific Matchers

Avoid overly broad silences:

```bash
# Bad: Too broad
amtool silence add \
  severity="warning" \
  --duration=1h

# Good: Specific
amtool silence add \
  alertname="HighDiskUsage" \
  namespace="production" \
  service="database" \
  --duration=1h
```

### Set Appropriate Durations

Match silence duration to maintenance window:

```bash
# Short deployments
--duration=30m

# Standard maintenance
--duration=2h

# Extended maintenance
--duration=4h

# Emergency override (use sparingly)
--duration=24h
```

### Monitor Silence Usage

Track silence creation and usage:

```promql
# Active silences
alertmanager_silences

# Silences by state
alertmanager_silences{state="active"}
alertmanager_silences{state="expired"}

# Silence creations
rate(alertmanager_silences_created_total[1h])
```

Create alerts for silence issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: silence-alerts
  namespace: monitoring
spec:
  groups:
    - name: silences
      interval: 5m
      rules:
        - alert: TooManySilences
          expr: alertmanager_silences{state="active"} > 10
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Too many active silences"
            description: "{{ $value }} active silences may indicate problems."

        - alert: LongRunningSilence
          expr: |
            time() - alertmanager_silence_start_time_seconds > 86400
          labels:
            severity: warning
          annotations:
            summary: "Silence has been active for >24h"
            description: "Silence {{ $labels.silence_id }} may need review."
```

## Silence Documentation

Maintain a silence log:

```bash
# Create silence log entry
cat >> /var/log/silences.log <<EOF
$(date -u): Created silence for ${SERVICE}
  Namespace: ${NAMESPACE}
  Duration: ${DURATION}
  Reason: ${COMMENT}
  Created by: ${AUTHOR}
  Silence ID: ${SILENCE_ID}
EOF
```

## Conclusion

Alertmanager silences provide essential noise reduction during planned maintenance without disabling monitoring. By creating targeted silences with specific matchers and appropriate durations, you maintain alert hygiene while preserving visibility. Automation through CI/CD integration and CronJobs ensures consistent silence management. Combined with proper documentation and monitoring, silences become a valuable tool for operational excellence.
