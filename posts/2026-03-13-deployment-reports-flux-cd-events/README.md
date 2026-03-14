# How to Generate Deployment Reports from Flux CD Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Deployment Reports, Events, Monitoring, Compliance

Description: Generate comprehensive deployment reports by collecting, storing, and querying Flux CD reconciliation events to provide visibility into deployment frequency, success rates, and timelines.

---

## Introduction

Deployment reports answer operational and compliance questions: How many deployments happened this month? What was the success rate? How long did each deployment take? Which services deployed most frequently? These questions come from engineering leadership, change advisory boards, and compliance auditors — and they expect accurate, consistent answers.

Flux CD generates reconciliation events for every source fetch and every Kustomization or HelmRelease reconciliation. By collecting these events and combining them with Git history, you can produce deployment reports that accurately reflect what actually changed in your cluster and when.

This guide shows how to collect Flux events, store them persistently, and generate reports suitable for engineering reviews and compliance audits.

## Prerequisites

- Flux CD with at least one Kustomization or HelmRelease configured
- A persistent event storage backend (Elasticsearch, PostgreSQL, or a cloud logging service)
- `flux` CLI and `kubectl` installed
- Optional: Grafana for visualization

## Step 1: Understand Flux Event Types

Flux emits different event types that map to deployment lifecycle stages:

```bash
# View the event types Flux generates
kubectl get events -n flux-system \
  -o jsonpath='{range .items[*]}{.reason}{"\n"}{end}' \
  | sort -u

# Common Flux event reasons:
# ReconciliationSucceeded — Kustomization/HelmRelease applied successfully
# ReconciliationFailed    — Reconciliation encountered an error
# ArtifactFailed         — Source fetch failed (Git or Helm repo unreachable)
# Progressing            — Reconciliation in progress
# HealthCheckFailed      — Health check on a watched resource failed
# DependencyNotReady     — dependsOn condition not met
```

## Step 2: Export Flux Events to a Persistent Store

Configure Flux alerting to forward events to a webhook that writes them to a database:

```yaml
# clusters/production/reporting/report-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: deployment-reporter
  namespace: flux-system
spec:
  type: generic
  url: https://deployment-reporter.internal/api/events
  secretRef:
    name: reporter-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-deployments
  namespace: flux-system
spec:
  summary: "Deployment event"
  providerRef:
    name: deployment-reporter
  eventSeverity: info
  eventSources:
    - kind: Kustomization
    - kind: HelmRelease
```

The webhook receiver stores events in PostgreSQL with this schema:

```sql
CREATE TABLE deployment_events (
  id              BIGSERIAL PRIMARY KEY,
  event_id        TEXT UNIQUE,
  timestamp       TIMESTAMPTZ NOT NULL,
  resource_kind   TEXT NOT NULL,           -- Kustomization, HelmRelease
  resource_name   TEXT NOT NULL,
  namespace       TEXT NOT NULL,
  reason          TEXT NOT NULL,           -- ReconciliationSucceeded, etc.
  message         TEXT,
  revision        TEXT,                    -- Git SHA or Helm chart version
  duration_ms     INTEGER,                 -- Reconciliation duration
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timestamp ON deployment_events(timestamp DESC);
CREATE INDEX idx_resource ON deployment_events(resource_kind, resource_name);
CREATE INDEX idx_reason ON deployment_events(reason);
```

## Step 3: Generate Monthly Deployment Summary Reports

```bash
#!/bin/bash
# scripts/monthly-deployment-report.sh

MONTH=${1:-$(date +%Y-%m)}
YEAR=$(echo "$MONTH" | cut -d- -f1)
MON=$(echo "$MONTH" | cut -d- -f2)

cat << EOF
# Deployment Report — $MONTH

Generated: $(date -u)

## Summary Statistics
EOF

# Query from PostgreSQL
psql "$DATABASE_URL" << SQL
SELECT
  COUNT(*) FILTER (WHERE reason = 'ReconciliationSucceeded') AS successful_deployments,
  COUNT(*) FILTER (WHERE reason = 'ReconciliationFailed') AS failed_deployments,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE reason = 'ReconciliationSucceeded')
    / NULLIF(COUNT(*), 0), 2
  ) AS success_rate_pct,
  ROUND(AVG(duration_ms) FILTER (WHERE reason = 'ReconciliationSucceeded') / 1000.0, 1) AS avg_duration_seconds
FROM deployment_events
WHERE DATE_TRUNC('month', timestamp) = '$MONTH-01'::DATE
  AND resource_kind IN ('Kustomization', 'HelmRelease');
SQL

cat << 'EOF'

## Deployments by Resource
EOF

psql "$DATABASE_URL" << SQL
SELECT
  resource_name,
  resource_kind,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE reason = 'ReconciliationSucceeded') AS succeeded,
  COUNT(*) FILTER (WHERE reason = 'ReconciliationFailed') AS failed
FROM deployment_events
WHERE DATE_TRUNC('month', timestamp) = '$MONTH-01'::DATE
GROUP BY resource_name, resource_kind
ORDER BY total DESC;
SQL
```

## Step 4: Create a Grafana Dashboard for Real-Time Visibility

If using Prometheus, Flux exports metrics that Grafana can visualize:

```yaml
# infrastructure/monitoring/flux-dashboard-configmap.yaml
# Grafana dashboard JSON stored in a ConfigMap for GitOps management
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-deployment-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"    # Grafana sidecar picks this up automatically
data:
  flux-deployments.json: |
    {
      "title": "Flux CD Deployment Report",
      "panels": [
        {
          "title": "Deployment Success Rate",
          "type": "stat",
          "targets": [
            {
              "expr": "rate(gotk_reconcile_condition_total{type=\"Ready\",status=\"True\"}[24h]) / rate(gotk_reconcile_condition_total{type=\"Ready\"}[24h]) * 100"
            }
          ]
        },
        {
          "title": "Reconciliation Duration (p99)",
          "type": "graph",
          "targets": [
            {
              "expr": "histogram_quantile(0.99, rate(gotk_reconcile_duration_seconds_bucket[5m]))"
            }
          ]
        },
        {
          "title": "Failed Reconciliations",
          "type": "graph",
          "targets": [
            {
              "expr": "increase(gotk_reconcile_condition_total{type=\"Ready\",status=\"False\"}[1h])"
            }
          ]
        }
      ]
    }
```

## Step 5: Generate a Compliance Deployment Report

For compliance submissions, generate a formal deployment report:

```bash
#!/bin/bash
# scripts/compliance-deployment-report.sh
# Generates a report suitable for CAB or compliance audit submission

QUARTER=${1:-"Q1-2026"}
START="2026-01-01"
END="2026-03-31"

OUTPUT="compliance-reports/deployment-report-$QUARTER.md"
mkdir -p compliance-reports

cat > "$OUTPUT" << EOF
# Deployment Activity Report — $QUARTER
**Classification**: Internal Use Only
**Period**: $START to $END
**Generated By**: Automated GitOps Reporting System
**Generated At**: $(date -u)

## Executive Summary

$(git log --merges \
    --since="$START" --until="$END" \
    --oneline \
    -- apps/ clusters/ | wc -l) production change(s) deployed during this quarter.

## All Production Deployments

| Date | Change | Author | Commit | Approvers |
|------|--------|--------|--------|-----------|
$(gh pr list \
    --state merged \
    --json mergedAt,title,author,reviews,mergeCommit \
    --jq '.[] | select(.mergedAt >= "'$START'" and .mergedAt <= "'$END'") |
      "| \(.mergedAt[:10]) | \(.title) | \(.author.login) | \(.mergeCommit.oid[:8]) | \([.reviews[] | select(.state=="APPROVED") | .author.login] | join(", ")) |"')

## Failed Deployments Requiring Rollback

$(git log --oneline --grep="^rollback:" --since="$START" --until="$END")

## Change Freeze Periods
$(git log --oneline --grep=".change-freeze" --since="$START" --until="$END")
EOF

echo "Compliance report generated: $OUTPUT"
```

## Step 6: Automate Scheduled Reports

```yaml
# clusters/production/reporting/report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-deployment-report
  namespace: flux-system
spec:
  schedule: "0 8 1 * *"    # First day of each month at 08:00 UTC
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: reporter
              image: my-registry/deployment-reporter:1.0.0
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: reporter-db-secret
                      key: url
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: reporter-slack-secret
                      key: webhook
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
```

## Best Practices

- Store deployment events in a database with a retention period that matches your compliance requirement (minimum 1 year for most frameworks).
- Include the Git commit SHA in every deployment event record so you can reconstruct exactly what was deployed at any point.
- Run a monthly report review meeting where engineering leadership reviews deployment frequency, success rate, and any failures — this builds operational discipline and catches process problems early.
- Combine Flux event data with application performance metrics to correlate deployments with changes in error rates or latency.
- Archive quarterly reports as PDF documents to your document management system for audit accessibility.

## Conclusion

Generating deployment reports from Flux CD events gives you accurate, automated visibility into your deployment activity without relying on manual tracking. By collecting Flux reconciliation events, combining them with Git history and PR approval records, and scheduling automated report generation, you can answer any deployment-related question from a compliance auditor or engineering executive — with evidence derived automatically from your GitOps workflow.
