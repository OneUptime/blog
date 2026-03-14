# How to Implement Drift Detection Alerts for Compliance with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Drift Detection, Compliance, Alerting, Configuration Management

Description: Alert on configuration drift detected by Flux CD to identify unauthorized changes in your cluster and maintain compliance with declared configuration baselines.

---

## Introduction

Configuration drift occurs when the actual state of your cluster diverges from the desired state declared in Git. Drift can happen through manual `kubectl` commands, misconfigured automation, or bugs in other controllers that modify resources. For compliance frameworks — SOC 2, HIPAA, PCI DSS, FedRAMP — drift represents an unauthorized change that must be detected, investigated, and remediated.

Flux CD continuously compares cluster state to Git state. When drift is detected, Flux either corrects it automatically (if `prune: true` is set) or marks the Kustomization as drifted. Both cases generate events that can trigger alerts. This guide shows how to configure drift detection sensitivity, set up alerting, and build a compliance response workflow for drift events.

## Prerequisites

- Flux CD managing production workloads
- A notification channel (Slack, PagerDuty, or email)
- Log aggregation for alert history
- `flux` CLI and `kubectl` installed

## Step 1: Configure Kustomizations for Drift Detection

Flux detects drift on every reconciliation interval. Tune the interval and correction behavior:

```yaml
# clusters/production/apps/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Short interval means drift is detected and corrected quickly
  interval: 5m

  # prune: true removes resources not in Git (strongest drift correction)
  # prune: false leaves extra resources but still alerts on them
  prune: true

  sourceRef:
    kind: GitRepository
    name: flux-system

  path: ./apps/production

  # Force: true allows Flux to overwrite fields managed by other controllers
  # Use with caution — only enable if needed
  force: false

  # Health checks run after reconciliation to verify the cluster state
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
  timeout: 5m
```

For compliance-critical namespaces, use a very short interval:

```yaml
spec:
  interval: 2m    # Check for drift every 2 minutes in high-compliance namespaces
```

## Step 2: Configure Drift Alert Notifications

Set up alerting for drift events. Flux generates `ReconciliationFailed` events when it cannot apply the desired state, and generates events with "drift" in the message when it corrects unauthorized changes:

```yaml
# clusters/production/monitoring/drift-alert-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-ops
  namespace: flux-system
spec:
  type: slack
  channel: "#platform-alerts"
  secretRef:
    name: slack-webhook-secret
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: pagerduty-critical
  namespace: flux-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-integration-key   # Secret containing the routing key
---
# Slack alert for drift detection in all production Kustomizations
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: drift-detected-slack
  namespace: flux-system
spec:
  summary: "Configuration drift detected in production"
  providerRef:
    name: slack-ops
  eventSeverity: warning
  eventSources:
    - kind: Kustomization
      namespace: flux-system
  inclusionList:
    - ".*drift.*"
    - ".*ReconciliationFailed.*"
    - ".*pruned.*"           # Resource was pruned (unauthorized resource removed)
```

```yaml
# PagerDuty alert for persistent drift (reconciliation failing for > 15 minutes)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: persistent-drift-pagerduty
  namespace: flux-system
spec:
  summary: "CRITICAL: Persistent configuration drift in production cluster"
  providerRef:
    name: pagerduty-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
  inclusionList:
    - ".*ReconciliationFailed.*"
```

## Step 3: Use flux diff to Detect Drift Proactively

Run `flux diff` in CI or a scheduled job to proactively detect drift before the reconciliation interval fires:

```yaml
# clusters/production/monitoring/drift-check-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-drift-check
  namespace: flux-system
spec:
  schedule: "*/15 * * * *"    # Check every 15 minutes
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-drift-checker-sa
          restartPolicy: OnFailure
          containers:
            - name: drift-checker
              image: ghcr.io/fluxcd/flux-cli:v2.4.0
              command:
                - /bin/sh
                - -c
                - |
                  # Get list of all Kustomizations
                  KUSTOMIZATIONS=$(kubectl get kustomization \
                    -n flux-system \
                    -o jsonpath='{.items[*].metadata.name}')

                  for ks in $KUSTOMIZATIONS; do
                    echo "Checking drift for: $ks"
                    RESULT=$(flux diff kustomization "$ks" 2>&1)

                    if echo "$RESULT" | grep -q "diff"; then
                      echo "DRIFT DETECTED in $ks:"
                      echo "$RESULT"

                      # Send alert via webhook
                      curl -s -X POST "$ALERT_WEBHOOK" \
                        -H "Content-Type: application/json" \
                        -d "{\"text\":\"Drift detected in Kustomization: $ks\",\"drift\":\"$RESULT\"}"
                    fi
                  done
              env:
                - name: ALERT_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: drift-alert-webhook
                      key: url
```

## Step 4: Build a Drift Response Runbook

Document the compliance response process for drift events:

```markdown
# Drift Detection Response Runbook

## Step 1: Identify the Drift
```bash
# Get details of which Kustomization drifted
flux get kustomizations --all-namespaces | grep -v Ready

# See what changed
flux describe kustomization <name>

# Diff Git state vs cluster state
flux diff kustomization <name>
```

## Step 2: Investigate the Cause
- Was the change made intentionally (forgotten to commit to Git)?
- Was the change made by an automated controller legitimately?
- Was the change unauthorized (security incident)?

## Step 3: Remediate
```bash
# Option A: Accept the change — commit it to Git so Flux considers it desired
git add <changed-file>
git commit -m "sync: reconcile drift in <resource> (cause: <reason>)"

# Option B: Reject the change — force Flux to restore Git state
flux reconcile kustomization <name> --force

# Option C: Open a security incident if the change was unauthorized
```

## Step 4: Document
- File an incident ticket with the drift details
- Include who investigated, what the root cause was, and what remediation was applied
- Update the runbook if a new drift pattern is discovered

## Step 5: Implement Compliance Reporting for Drift

Track drift events over time as a compliance metric:

```bash
#!/bin/bash
# scripts/drift-compliance-report.sh
# Generate a drift report for compliance submissions

MONTH=$(date +%Y-%m)
OUTPUT="compliance-reports/drift-report-$MONTH.md"

cat > "$OUTPUT" << EOF
# Configuration Drift Report — $MONTH
Generated: $(date -u)

## Drift Events This Month
EOF

# Query Kubernetes events for drift-related activity
kubectl get events -n flux-system \
  --sort-by='.lastTimestamp' \
  -o json \
  | jq -r '.items[] |
      select(.reason == "ReconciliationFailed" or
             (.message | test("pruned|drift"))) |
      "| \(.lastTimestamp) | \(.involvedObject.name) | \(.reason) | \(.message[:80]) |"' \
  >> "$OUTPUT"

echo "Drift report: $OUTPUT"
```

## Step 6: Tune Drift Sensitivity per Environment

Different environments need different drift sensitivity:

```yaml
# Production: aggressive drift detection and auto-correction
# clusters/production/apps/critical-app.yaml
spec:
  interval: 2m      # Check frequently
  prune: true       # Auto-remove unauthorized resources
  force: false      # Don't force-overwrite — prefer alerting

# Staging: moderate drift detection
# clusters/staging/apps/app.yaml
spec:
  interval: 10m
  prune: true

# Development: permissive — allow manual experimentation
# clusters/development/apps/app.yaml
spec:
  interval: 30m
  prune: false     # Don't auto-remove in dev — developers may be experimenting
```

## Best Practices

- Treat every drift alert as a potential security event until proven otherwise — unauthorized changes to production cluster resources are a serious concern.
- Correlate drift events with access logs to determine who made the change outside of GitOps.
- Use `prune: true` in production for most resources, but be careful with stateful resources (PersistentVolumeClaims, Secrets) where accidental pruning is destructive.
- Set up a Slack channel specifically for drift alerts so they have high visibility and are not lost in general platform noise.
- Track your drift rate (drift events per week) as a KPI. A high drift rate indicates that your GitOps process is being bypassed and needs reinforcement.

## Conclusion

Flux CD drift detection provides a continuous monitoring capability that is essential for compliance frameworks requiring configuration integrity controls. By combining Flux's automatic drift correction with alert notifications and a structured response runbook, you can detect unauthorized changes within minutes, remediate them quickly, and produce drift event reports that demonstrate your configuration management controls are functioning effectively.
