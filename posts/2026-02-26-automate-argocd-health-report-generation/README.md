# Automate ArgoCD Health Report Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring, Automation

Description: Learn how to automate ArgoCD health report generation with scripts that collect application sync status, health data, and drift detection across all your environments.

---

Understanding the overall health of your ArgoCD-managed applications is critical for platform teams. Manually checking each application in the ArgoCD UI does not scale, and it is easy to miss a degraded application buried in a long list. Automated health reports give you a regular snapshot of your entire GitOps estate, highlighting problems before they become incidents.

This guide shows you how to build automated health report generation for ArgoCD using shell scripts and Kubernetes CronJobs.

## What Should a Health Report Include

A useful ArgoCD health report should cover:

- Application sync status (Synced, OutOfSync, Unknown)
- Application health status (Healthy, Degraded, Progressing, Missing, Suspended)
- Applications with sync errors
- Drift detection - resources that have diverged from Git
- Cluster connectivity status
- Stale applications that have not synced recently
- Summary statistics and trends

## Basic Health Report Script

Here is a script that generates a comprehensive health report:

```bash
#!/bin/bash
# argocd-health-report.sh - Generate ArgoCD health report
set -euo pipefail

REPORT_DIR="${REPORT_DIR:-/reports}"
REPORT_FILE="${REPORT_DIR}/argocd-health-$(date +%Y%m%d-%H%M%S).txt"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
STALE_THRESHOLD_HOURS="${STALE_THRESHOLD:-24}"

mkdir -p "${REPORT_DIR}"

# Helper function to write to report
report() {
  echo "$1" | tee -a "${REPORT_FILE}"
}

report "============================================="
report "ArgoCD Health Report"
report "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
report "============================================="
report ""

# Collect application data
APPS_JSON=$(argocd app list -o json)
TOTAL_APPS=$(echo "${APPS_JSON}" | jq 'length')

report "SUMMARY"
report "-------"
report "Total Applications: ${TOTAL_APPS}"

# Sync status breakdown
SYNCED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.sync.status == "Synced")] | length')
OUT_OF_SYNC=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.sync.status == "OutOfSync")] | length')
UNKNOWN_SYNC=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.sync.status == "Unknown")] | length')

report ""
report "Sync Status:"
report "  Synced:      ${SYNCED}"
report "  OutOfSync:   ${OUT_OF_SYNC}"
report "  Unknown:     ${UNKNOWN_SYNC}"

# Health status breakdown
HEALTHY=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Healthy")] | length')
DEGRADED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Degraded")] | length')
PROGRESSING=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Progressing")] | length')
MISSING=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Missing")] | length')
SUSPENDED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Suspended")] | length')

report ""
report "Health Status:"
report "  Healthy:     ${HEALTHY}"
report "  Degraded:    ${DEGRADED}"
report "  Progressing: ${PROGRESSING}"
report "  Missing:     ${MISSING}"
report "  Suspended:   ${SUSPENDED}"

# Calculate health percentage
if [[ ${TOTAL_APPS} -gt 0 ]]; then
  HEALTH_PCT=$(( (HEALTHY * 100) / TOTAL_APPS ))
  report ""
  report "Overall Health: ${HEALTH_PCT}%"
fi

# Detailed: Out of sync applications
report ""
report "============================================="
report "OUT OF SYNC APPLICATIONS"
report "============================================="

echo "${APPS_JSON}" | jq -r '.[] | select(.status.sync.status == "OutOfSync") | "\(.metadata.name)\t\(.spec.project)\t\(.status.health.status)"' | \
  while IFS=$'\t' read -r name project health; do
    report "  ${name} (project: ${project}, health: ${health})"
  done

if [[ ${OUT_OF_SYNC} -eq 0 ]]; then
  report "  None - all applications are in sync"
fi

# Detailed: Degraded applications
report ""
report "============================================="
report "DEGRADED APPLICATIONS"
report "============================================="

echo "${APPS_JSON}" | jq -r '.[] | select(.status.health.status == "Degraded") | "\(.metadata.name)\t\(.spec.project)\t\(.status.sync.status)"' | \
  while IFS=$'\t' read -r name project sync; do
    report "  ${name} (project: ${project}, sync: ${sync})"
  done

if [[ ${DEGRADED} -eq 0 ]]; then
  report "  None - no degraded applications"
fi

# Applications with sync errors
report ""
report "============================================="
report "APPLICATIONS WITH SYNC ERRORS"
report "============================================="

echo "${APPS_JSON}" | jq -r '.[] | select(.status.conditions != null) | select(.status.conditions[] | .type == "SyncError") | "\(.metadata.name)\t\(.status.conditions[] | select(.type == "SyncError") | .message)"' | \
  while IFS=$'\t' read -r name message; do
    report "  ${name}: ${message}"
  done

# Stale applications (not synced recently)
report ""
report "============================================="
report "STALE APPLICATIONS (not synced in ${STALE_THRESHOLD_HOURS}h)"
report "============================================="

THRESHOLD_EPOCH=$(date -d "-${STALE_THRESHOLD_HOURS} hours" +%s 2>/dev/null || date -v-${STALE_THRESHOLD_HOURS}H +%s)

echo "${APPS_JSON}" | jq -r '.[] | "\(.metadata.name)\t\(.status.operationState.finishedAt // "never")"' | \
  while IFS=$'\t' read -r name last_sync; do
    if [[ "${last_sync}" == "never" || "${last_sync}" == "null" ]]; then
      report "  ${name}: never synced"
    else
      SYNC_EPOCH=$(date -d "${last_sync}" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "${last_sync}" +%s 2>/dev/null || echo "0")
      if [[ ${SYNC_EPOCH} -lt ${THRESHOLD_EPOCH} ]]; then
        report "  ${name}: last synced ${last_sync}"
      fi
    fi
  done

# Cluster health
report ""
report "============================================="
report "CLUSTER CONNECTIVITY"
report "============================================="

argocd cluster list -o json | jq -r '.[] | "\(.name)\t\(.server)\t\(.connectionState.status)"' | \
  while IFS=$'\t' read -r name server status; do
    STATUS_ICON=$([[ "${status}" == "Successful" ]] && echo "OK" || echo "FAIL")
    report "  [${STATUS_ICON}] ${name} (${server})"
  done

report ""
report "============================================="
report "Report saved to: ${REPORT_FILE}"
report "============================================="
```

## JSON Report Format

For programmatic consumption, generate a JSON report instead:

```bash
#!/bin/bash
# argocd-health-report-json.sh - Generate JSON health report
set -euo pipefail

REPORT_DIR="${REPORT_DIR:-/reports}"
REPORT_FILE="${REPORT_DIR}/argocd-health-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "${REPORT_DIR}"

APPS_JSON=$(argocd app list -o json)

# Build JSON report using jq
jq -n \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson apps "${APPS_JSON}" \
  '{
    timestamp: $timestamp,
    summary: {
      total: ($apps | length),
      sync: {
        synced: ([$apps[] | select(.status.sync.status == "Synced")] | length),
        outOfSync: ([$apps[] | select(.status.sync.status == "OutOfSync")] | length),
        unknown: ([$apps[] | select(.status.sync.status == "Unknown")] | length)
      },
      health: {
        healthy: ([$apps[] | select(.status.health.status == "Healthy")] | length),
        degraded: ([$apps[] | select(.status.health.status == "Degraded")] | length),
        progressing: ([$apps[] | select(.status.health.status == "Progressing")] | length),
        missing: ([$apps[] | select(.status.health.status == "Missing")] | length),
        suspended: ([$apps[] | select(.status.health.status == "Suspended")] | length)
      }
    },
    outOfSync: [$apps[] | select(.status.sync.status == "OutOfSync") | {name: .metadata.name, project: .spec.project, health: .status.health.status}],
    degraded: [$apps[] | select(.status.health.status == "Degraded") | {name: .metadata.name, project: .spec.project, sync: .status.sync.status}]
  }' > "${REPORT_FILE}"

echo "JSON report saved to ${REPORT_FILE}"
```

## CronJob for Scheduled Reports

Run the health report on a schedule using a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-health-report
  namespace: argocd
spec:
  schedule: "0 */6 * * *"   # Every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup
          restartPolicy: OnFailure
          containers:
            - name: report
              image: bitnami/kubectl:1.28
              command: ["/bin/bash", "/scripts/argocd-health-report.sh"]
              env:
                - name: REPORT_DIR
                  value: "/reports"
                - name: STALE_THRESHOLD
                  value: "24"
              volumeMounts:
                - name: report-script
                  mountPath: /scripts
                - name: reports-storage
                  mountPath: /reports
          volumes:
            - name: report-script
              configMap:
                name: argocd-health-report-script
                defaultMode: 0755
            - name: reports-storage
              persistentVolumeClaim:
                claimName: argocd-reports
```

## Sending Reports via Slack

Integrate with Slack to deliver reports directly to your team channel:

```bash
#!/bin/bash
# send-health-slack.sh - Send ArgoCD health summary to Slack
set -euo pipefail

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:?SLACK_WEBHOOK_URL is required}"
APPS_JSON=$(argocd app list -o json)

TOTAL=$(echo "${APPS_JSON}" | jq 'length')
HEALTHY=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Healthy")] | length')
DEGRADED=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.health.status == "Degraded")] | length')
OUT_OF_SYNC=$(echo "${APPS_JSON}" | jq '[.[] | select(.status.sync.status == "OutOfSync")] | length')

# Build degraded list for the message
DEGRADED_LIST=$(echo "${APPS_JSON}" | jq -r '.[] | select(.status.health.status == "Degraded") | "- \(.metadata.name)"' | head -10)

# Choose color based on health
if [[ ${DEGRADED} -eq 0 && ${OUT_OF_SYNC} -eq 0 ]]; then
  COLOR="good"
elif [[ ${DEGRADED} -gt 0 ]]; then
  COLOR="danger"
else
  COLOR="warning"
fi

curl -s -X POST "${SLACK_WEBHOOK}" \
  -H "Content-Type: application/json" \
  -d "{
    \"attachments\": [{
      \"color\": \"${COLOR}\",
      \"title\": \"ArgoCD Health Report\",
      \"text\": \"Total: ${TOTAL} | Healthy: ${HEALTHY} | Degraded: ${DEGRADED} | OutOfSync: ${OUT_OF_SYNC}\",
      \"fields\": [
        {\"title\": \"Degraded Apps\", \"value\": \"${DEGRADED_LIST:-None}\", \"short\": false}
      ],
      \"footer\": \"Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }]
  }"

echo "Slack notification sent"
```

## Summary

Automated health reports transform ArgoCD from a tool you have to constantly check into one that proactively tells you when something needs attention. Whether you deliver reports as text files, JSON for dashboards, or Slack messages for your team, the key is consistency. Run them on a schedule, track trends over time, and set up alerts for degraded states. For comprehensive monitoring beyond ArgoCD health checks, consider pairing these reports with [OneUptime](https://oneuptime.com) for end-to-end observability across your deployment pipeline.
