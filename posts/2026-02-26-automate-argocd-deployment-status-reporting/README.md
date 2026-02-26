# Automate ArgoCD Deployment Status Reporting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, Observability

Description: Learn how to automate ArgoCD deployment status reporting with scripts that track sync operations, deployment history, rollback events, and deliver reports to stakeholders.

---

Knowing what was deployed, when, and whether it succeeded is fundamental to operating a reliable platform. ArgoCD tracks this information internally, but extracting it into structured reports for stakeholders, audit trails, and operational dashboards requires automation. This guide covers practical approaches to generating automated deployment status reports from ArgoCD.

## Why Deployment Status Reporting Matters

Deployment status reports serve multiple audiences:

- **Engineering teams** need to know if their latest changes deployed successfully
- **Platform teams** need visibility into deployment frequency and failure rates
- **Management** wants deployment metrics for DORA and SRE reporting
- **Compliance** requires audit trails of what changed and when

ArgoCD stores all of this data. The challenge is extracting and formatting it.

## Basic Deployment Status Report

This script generates a report of recent deployment activities across all applications:

```bash
#!/bin/bash
# deployment-status-report.sh - Report recent ArgoCD deployments
set -euo pipefail

HOURS="${REPORT_HOURS:-24}"
REPORT_DIR="${REPORT_DIR:-/reports}"
REPORT_FILE="${REPORT_DIR}/deployment-status-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "${REPORT_DIR}"

CUTOFF=$(date -d "-${HOURS} hours" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v-${HOURS}H -u +%Y-%m-%dT%H:%M:%SZ)

log() { echo "$1" | tee -a "${REPORT_FILE}"; }

log "============================================="
log "ArgoCD Deployment Status Report"
log "Period: Last ${HOURS} hours"
log "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "============================================="

# Get all applications
APPS_JSON=$(argocd app list -o json)
TOTAL_APPS=$(echo "${APPS_JSON}" | jq 'length')

log ""
log "Application Overview: ${TOTAL_APPS} total applications"
log ""

# Track deployment statistics
TOTAL_SYNCS=0
SUCCESSFUL_SYNCS=0
FAILED_SYNCS=0

log "RECENT DEPLOYMENTS"
log "------------------"

echo "${APPS_JSON}" | jq -r '.[] | @base64' | while read -r app_b64; do
  APP=$(echo "${app_b64}" | base64 -d)
  APP_NAME=$(echo "${APP}" | jq -r '.metadata.name')
  PROJECT=$(echo "${APP}" | jq -r '.spec.project')

  # Check operation state
  OP_STATE=$(echo "${APP}" | jq -r '.status.operationState // empty')
  if [[ -z "${OP_STATE}" ]]; then
    continue
  fi

  FINISHED=$(echo "${APP}" | jq -r '.status.operationState.finishedAt // "unknown"')
  PHASE=$(echo "${APP}" | jq -r '.status.operationState.phase // "unknown"')
  SYNC_REVISION=$(echo "${APP}" | jq -r '.status.operationState.syncResult.revision // "unknown"' | head -c 8)
  MESSAGE=$(echo "${APP}" | jq -r '.status.operationState.message // "no message"')

  # Only include recent deployments
  if [[ "${FINISHED}" != "unknown" && "${FINISHED}" > "${CUTOFF}" ]]; then
    STATUS_LABEL=$([[ "${PHASE}" == "Succeeded" ]] && echo "SUCCESS" || echo "FAILED")
    log "  [${STATUS_LABEL}] ${APP_NAME}"
    log "    Project:  ${PROJECT}"
    log "    Revision: ${SYNC_REVISION}"
    log "    Finished: ${FINISHED}"
    if [[ "${PHASE}" != "Succeeded" ]]; then
      log "    Message:  ${MESSAGE}"
    fi
    log ""
  fi
done

# Per-project summary
log ""
log "============================================="
log "PROJECT SUMMARY"
log "============================================="

echo "${APPS_JSON}" | jq -r '[.[] | {project: .spec.project, health: .status.health.status, sync: .status.sync.status}] | group_by(.project) | .[] | {project: .[0].project, total: length, healthy: [.[] | select(.health == "Healthy")] | length, synced: [.[] | select(.sync == "Synced")] | length} | "\(.project)\t\(.total)\t\(.healthy)\t\(.synced)"' | \
  while IFS=$'\t' read -r project total healthy synced; do
    log "  ${project}: ${total} apps, ${healthy} healthy, ${synced} synced"
  done

# Deployment history for each application
log ""
log "============================================="
log "DEPLOYMENT HISTORY (last 5 per app)"
log "============================================="

echo "${APPS_JSON}" | jq -r '.[] | .metadata.name' | head -20 | while read -r app_name; do
  HISTORY=$(argocd app history "${app_name}" -o json 2>/dev/null || echo "[]")
  ENTRY_COUNT=$(echo "${HISTORY}" | jq 'length')

  if [[ ${ENTRY_COUNT} -gt 0 ]]; then
    log ""
    log "  ${app_name}:"
    echo "${HISTORY}" | jq -r '.[-5:] | .[] | "    \(.deployedAt // "unknown") - rev:\(.revision[0:8]) - \(.source.path // .source.chart // "unknown")"'  | tee -a "${REPORT_FILE}"
  fi
done

log ""
log "Report saved to: ${REPORT_FILE}"
```

## JSON Deployment Metrics Report

For integration with dashboards and monitoring systems, generate a JSON metrics report:

```bash
#!/bin/bash
# deployment-metrics.sh - Generate deployment metrics in JSON
set -euo pipefail

APPS_JSON=$(argocd app list -o json)

jq -n \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson apps "${APPS_JSON}" \
  '{
    timestamp: $timestamp,
    metrics: {
      total_applications: ($apps | length),
      deployments: {
        succeeded: ([$apps[] | select(.status.operationState.phase == "Succeeded")] | length),
        failed: ([$apps[] | select(.status.operationState.phase == "Failed")] | length),
        running: ([$apps[] | select(.status.operationState.phase == "Running")] | length)
      },
      health_distribution: (
        [$apps[] | .status.health.status] | group_by(.) | map({(.[0]): length}) | add // {}
      ),
      sync_distribution: (
        [$apps[] | .status.sync.status] | group_by(.) | map({(.[0]): length}) | add // {}
      ),
      by_project: (
        [$apps[] | {project: .spec.project, health: .status.health.status, sync: .status.sync.status}]
        | group_by(.project)
        | map({
            project: .[0].project,
            total: length,
            healthy: [.[] | select(.health == "Healthy")] | length,
            synced: [.[] | select(.sync == "Synced")] | length
          })
      )
    }
  }'
```

## CronJob Configuration

Schedule the reporting job to run on a regular cadence:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-deployment-report
  namespace: argocd
spec:
  schedule: "0 9 * * 1-5"    # Weekdays at 9 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-reporter
          restartPolicy: OnFailure
          containers:
            - name: reporter
              image: bitnami/kubectl:1.28
              command: ["/bin/bash", "/scripts/deployment-status-report.sh"]
              env:
                - name: REPORT_HOURS
                  value: "24"
                - name: REPORT_DIR
                  value: "/reports"
                - name: SLACK_WEBHOOK_URL
                  valueFrom:
                    secretKeyRef:
                      name: reporting-secrets
                      key: slack-webhook
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                - name: reports
                  mountPath: /reports
          volumes:
            - name: scripts
              configMap:
                name: argocd-report-scripts
                defaultMode: 0755
            - name: reports
              persistentVolumeClaim:
                claimName: argocd-reports
```

## Tracking DORA Metrics

For organizations tracking DORA (DevOps Research and Assessment) metrics, ArgoCD deployment data feeds directly into two key metrics:

```bash
#!/bin/bash
# dora-metrics.sh - Extract DORA metrics from ArgoCD
set -euo pipefail

DAYS="${1:-30}"
APPS_JSON=$(argocd app list -o json)

echo "DORA Metrics (last ${DAYS} days)"
echo "================================"

# Deployment Frequency
# Count sync operations per day
TOTAL_SYNCS=0
echo "${APPS_JSON}" | jq -r '.[] | .metadata.name' | while read -r app; do
  HISTORY=$(argocd app history "${app}" -o json 2>/dev/null || echo "[]")
  COUNT=$(echo "${HISTORY}" | jq "[.[] | select(.deployedAt > \"$(date -d "-${DAYS} days" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v-${DAYS}d -u +%Y-%m-%dT%H:%M:%SZ)\")] | length")
  TOTAL_SYNCS=$((TOTAL_SYNCS + COUNT))
done

FREQ=$(echo "scale=1; ${TOTAL_SYNCS} / ${DAYS}" | bc 2>/dev/null || echo "N/A")
echo "Deployment Frequency: ${FREQ} deployments/day"

# Change Failure Rate
FAILED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.operationState.phase == "Failed")] | length')
TOTAL=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.operationState != null)] | length')
if [[ ${TOTAL} -gt 0 ]]; then
  CFR=$(echo "scale=1; (${FAILED} * 100) / ${TOTAL}" | bc 2>/dev/null || echo "N/A")
  echo "Change Failure Rate: ${CFR}%"
fi

echo ""
echo "Note: Lead Time and MTTR require additional data sources"
```

## Email Report Delivery

For teams that prefer email reports:

```bash
#!/bin/bash
# email-deployment-report.sh - Send deployment report via email
set -euo pipefail

RECIPIENTS="${EMAIL_RECIPIENTS:?Set EMAIL_RECIPIENTS}"
SMTP_SERVER="${SMTP_SERVER:-smtp.example.com}"

# Generate report content
APPS_JSON=$(argocd app list -o json)
TOTAL=$(echo "${APPS_JSON}" | jq 'length')
HEALTHY=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Healthy")] | length')
DEGRADED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Degraded")] | length')
OUT_OF_SYNC=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.sync.status == "OutOfSync")] | length')

SUBJECT="ArgoCD Daily Report: ${HEALTHY}/${TOTAL} Healthy"

# Build HTML email body
BODY="<html><body>
<h2>ArgoCD Deployment Status Report</h2>
<p>Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)</p>
<table border='1' cellpadding='5'>
<tr><th>Metric</th><th>Count</th></tr>
<tr><td>Total Applications</td><td>${TOTAL}</td></tr>
<tr><td>Healthy</td><td style='color:green'>${HEALTHY}</td></tr>
<tr><td>Degraded</td><td style='color:red'>${DEGRADED}</td></tr>
<tr><td>Out of Sync</td><td style='color:orange'>${OUT_OF_SYNC}</td></tr>
</table>"

# Add degraded applications list
if [[ ${DEGRADED} -gt 0 ]]; then
  BODY+="<h3>Degraded Applications</h3><ul>"
  echo "${APPS_JSON}" | jq -r '.[] | select(.status.health.status == "Degraded") | .metadata.name' | while read -r app; do
    BODY+="<li>${app}</li>"
  done
  BODY+="</ul>"
fi

BODY+="</body></html>"

# Send via sendmail or curl to SMTP
echo "${BODY}" | mail -s "${SUBJECT}" -a "Content-Type: text/html" "${RECIPIENTS}"

echo "Email report sent to ${RECIPIENTS}"
```

## Summary

Automated deployment status reporting turns ArgoCD operational data into actionable intelligence for your organization. Whether you need simple text reports for Slack, JSON metrics for dashboards, or HTML emails for management, the underlying approach is the same: extract data from the ArgoCD API, aggregate it by the dimensions that matter to your stakeholders, and deliver it on a schedule. Pair these reports with [OneUptime](https://oneuptime.com) for real-time alerting on deployment failures, and you have comprehensive coverage of your deployment pipeline.
