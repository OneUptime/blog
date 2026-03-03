# How to Use argocd app history for Audit Trails

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Auditing

Description: Learn how to use argocd app history to track deployment history, audit changes, compare revisions, and build compliance-friendly audit trails.

---

Every deployment in ArgoCD is recorded in the application's history. The `argocd app history` command gives you access to this audit trail, showing you every sync operation, the revision that was deployed, who initiated it, and when it happened. This is essential for debugging, compliance, and understanding deployment patterns.

## Basic Usage

```bash
argocd app history my-app
```

This produces a table showing the deployment history:

```text
ID  DATE                           REVISION
0   2026-02-20 10:30:00 +0000 UTC  a1b2c3d (HEAD)
1   2026-02-18 14:15:00 +0000 UTC  d4e5f6a
2   2026-02-15 09:00:00 +0000 UTC  g7h8i9j
3   2026-02-10 16:45:00 +0000 UTC  k1l2m3n
```

Each entry represents a successful sync operation.

## Understanding History IDs

History entries are numbered with the most recent entry having the highest ID. The ID is what you use when performing a rollback:

```text
ID 3: oldest recorded deployment
ID 2: next deployment
ID 1: previous deployment
ID 0: current deployment
```

Note: ArgoCD keeps a limited number of history entries (configurable). Older entries are automatically pruned.

## Output Formats

### Table (Default)

```bash
argocd app history my-app
```

### JSON

```bash
argocd app history my-app -o json
```

The JSON output includes much more detail:

```bash
# Get full history with deployment parameters
argocd app history my-app -o json | jq '.[].revision'

# Get deployment dates
argocd app history my-app -o json | jq '.[] | {id: .id, date: .deployedAt, revision: .revision}'

# Get the source configuration for each deployment
argocd app history my-app -o json | jq '.[] | {id: .id, source: .source}'
```

## Building Audit Reports

### Simple Deployment Log

```bash
#!/bin/bash
# deployment-log.sh - Generate a deployment log for an application

APP_NAME="${1:?Usage: deployment-log.sh <app-name>}"

echo "=== Deployment History for: $APP_NAME ==="
echo ""

argocd app history "$APP_NAME" -o json | jq -r '.[] | "\(.id)\t\(.deployedAt)\t\(.revision[0:7])\t\(.source.repoURL)"' | \
  column -t -s $'\t' -N "ID,Date,Revision,Repository"
```

### Deployment Frequency Report

```bash
#!/bin/bash
# deploy-frequency.sh - Analyze deployment frequency

APP_NAME="${1:?Usage: deploy-frequency.sh <app-name>}"

echo "=== Deployment Frequency for: $APP_NAME ==="

# Count deployments per day
argocd app history "$APP_NAME" -o json | jq -r '.[].deployedAt' | \
  cut -d'T' -f1 | sort | uniq -c | sort -rn

echo ""
echo "Total deployments in history: $(argocd app history "$APP_NAME" -o json | jq 'length')"
```

### Team Deployment Report

Generate a report across all applications for a team:

```bash
#!/bin/bash
# team-deploy-report.sh - Deployment report for a team

TEAM="${1:?Usage: team-deploy-report.sh <team-label>}"

echo "=== Team Deployment Report: $TEAM ==="
echo ""

APPS=$(argocd app list -l "team=$TEAM" -o name)

for app in $APPS; do
  DEPLOY_COUNT=$(argocd app history "$app" -o json 2>/dev/null | jq 'length')
  LAST_DEPLOY=$(argocd app history "$app" -o json 2>/dev/null | jq -r '.[0].deployedAt // "never"')
  LAST_REV=$(argocd app history "$app" -o json 2>/dev/null | jq -r '.[0].revision[0:7] // "none"')

  printf "%-30s Deploys: %-5s Last: %-25s Rev: %s\n" "$app" "$DEPLOY_COUNT" "$LAST_DEPLOY" "$LAST_REV"
done
```

## Comparing History Entries

To understand what changed between two deployments, compare the revisions from the history:

```bash
#!/bin/bash
# compare-deployments.sh - Compare two history entries

APP_NAME="${1:?Usage: compare-deployments.sh <app> <old-id> <new-id>}"
OLD_ID="${2:?Usage: compare-deployments.sh <app> <old-id> <new-id>}"
NEW_ID="${3:?Usage: compare-deployments.sh <app> <old-id> <new-id>}"

HISTORY=$(argocd app history "$APP_NAME" -o json)

OLD_REV=$(echo "$HISTORY" | jq -r ".[] | select(.id == $OLD_ID) | .revision")
NEW_REV=$(echo "$HISTORY" | jq -r ".[] | select(.id == $NEW_ID) | .revision")
REPO_URL=$(echo "$HISTORY" | jq -r ".[0].source.repoURL")
REPO_PATH=$(echo "$HISTORY" | jq -r ".[0].source.path")

echo "Comparing deployment $OLD_ID ($OLD_REV) to $NEW_ID ($NEW_REV)"
echo "Repository: $REPO_URL"
echo "Path: $REPO_PATH"
echo ""

# If you have the repo cloned locally
if [ -d ".git" ]; then
  git log --oneline "$OLD_REV..$NEW_REV" -- "$REPO_PATH"
  echo ""
  git diff "$OLD_REV" "$NEW_REV" -- "$REPO_PATH"
fi
```

## History and Rollback Connection

The history is directly linked to the rollback capability. Each history entry is a known-good state you can return to:

```bash
# View history to find the target
argocd app history my-app

# Rollback to a specific history ID
argocd app rollback my-app <ID>
```

For more on rollback, see the [argocd app rollback guide](https://oneuptime.com/blog/post/2026-02-26-argocd-app-rollback-command/view).

## History Retention Configuration

By default, ArgoCD keeps a limited number of history entries. You can configure this in the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Keep 50 history entries per application (default is 10)
  controller.status.processors: "50"
```

Or set it on the Application spec directly using the `revisionHistoryLimit` field:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  revisionHistoryLimit: 20
  project: default
  source:
    repoURL: https://github.com/my-org/manifests.git
    path: apps/my-app
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-ns
```

For compliance requirements, you might need to retain more history. Set `revisionHistoryLimit` to a higher value (the default is 10).

## Compliance and Governance

For regulated environments, the deployment history provides evidence of:

- **When** a deployment happened (timestamp)
- **What** was deployed (Git revision)
- **Where** it was deployed (source repo, path, destination)
- **How** it was configured (Helm values, parameters)

### Export History for Compliance

```bash
#!/bin/bash
# compliance-export.sh - Export deployment history for compliance

OUTPUT_DIR="./compliance-reports"
mkdir -p "$OUTPUT_DIR"

DATE=$(date +%Y-%m-%d)

# Export history for all production applications
for app in $(argocd app list -l environment=production -o name); do
  echo "Exporting history for: $app"
  argocd app history "$app" -o json > "$OUTPUT_DIR/${app}-history-${DATE}.json"
done

echo "History exported to $OUTPUT_DIR"

# Generate summary
echo "=== Compliance Summary ===" > "$OUTPUT_DIR/summary-${DATE}.txt"
echo "Date: $DATE" >> "$OUTPUT_DIR/summary-${DATE}.txt"
echo "" >> "$OUTPUT_DIR/summary-${DATE}.txt"

for f in "$OUTPUT_DIR"/*-history-*.json; do
  APP=$(basename "$f" | sed "s/-history-.*//")
  COUNT=$(jq 'length' "$f")
  LAST=$(jq -r '.[0].deployedAt // "none"' "$f")
  echo "$APP: $COUNT deployments, last: $LAST" >> "$OUTPUT_DIR/summary-${DATE}.txt"
done
```

## Correlating History with Git Commits

The revision in the history is the Git commit SHA. You can correlate this with Git log information:

```bash
#!/bin/bash
# annotate-history.sh - Annotate history with commit messages

APP_NAME="${1:?Usage: annotate-history.sh <app-name>}"
REPO_DIR="${2:?Usage: annotate-history.sh <app-name> <local-repo-path>}"

argocd app history "$APP_NAME" -o json | jq -r '.[].revision' | while read rev; do
  COMMIT_MSG=$(cd "$REPO_DIR" && git log -1 --format="%s" "$rev" 2>/dev/null || echo "unknown")
  COMMIT_DATE=$(cd "$REPO_DIR" && git log -1 --format="%ai" "$rev" 2>/dev/null || echo "unknown")
  echo "$rev $COMMIT_DATE - $COMMIT_MSG"
done
```

## Monitoring Deployment Velocity

Track deployment velocity over time:

```bash
#!/bin/bash
# velocity.sh - Track deployment velocity

echo "Deployments in the last 7 days:"
echo "================================"

for app in $(argocd app list -o name); do
  WEEK_COUNT=$(argocd app history "$app" -o json 2>/dev/null | \
    jq "[.[] | select(.deployedAt > \"$(date -v-7d +%Y-%m-%d)\")] | length")

  if [ "$WEEK_COUNT" -gt 0 ]; then
    echo "$app: $WEEK_COUNT deployments"
  fi
done
```

## Summary

The `argocd app history` command provides a complete audit trail for every deployment managed by ArgoCD. Use it for debugging (when did this change?), compliance (prove what was deployed and when), and operational insights (deployment frequency). Combined with JSON output and scripting, it becomes a powerful tool for generating reports, correlating deployments with Git commits, and tracking your team's deployment velocity.
