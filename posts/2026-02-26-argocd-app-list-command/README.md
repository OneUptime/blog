# How to Use argocd app list for Application Overview

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Application Management

Description: A complete guide to the argocd app list command with filtering, output formatting, and practical scripting examples for managing applications at scale.

---

The `argocd app list` command is the starting point for most ArgoCD CLI workflows. Whether you are checking the health of your deployments, scripting batch operations, or troubleshooting sync issues, this command gives you the overview you need. This guide covers every useful option and pattern for getting the most out of it.

## Basic Usage

The simplest invocation lists all applications visible to your current user:

```bash
argocd app list
```

This produces a table with columns for name, cluster, namespace, project, status, health, sync policy, and conditions. The output looks something like:

```
NAME              CLUSTER                         NAMESPACE    PROJECT    STATUS  HEALTH   SYNCPOLICY  CONDITIONS
web-app           https://kubernetes.default.svc  web          default    Synced  Healthy  Auto        <none>
api-service       https://kubernetes.default.svc  api          backend    Synced  Healthy  Auto-Prune  <none>
payment-svc       https://prod.cluster.local      payments     critical   OutOfSync Degraded Manual    SyncError
monitoring-stack  https://kubernetes.default.svc  monitoring   infra      Synced  Healthy  Auto        <none>
```

## Output Formats

The `-o` flag controls the output format:

### Table (Default)

```bash
argocd app list -o table
```

Human-readable table format, ideal for terminal viewing.

### Wide Table

```bash
argocd app list -o wide
```

Includes additional columns like repo URL, path, and target revision. Useful when you need to see the source configuration at a glance.

### Name Only

```bash
argocd app list -o name
```

Outputs just the application names, one per line. This is the format you want for scripting:

```
web-app
api-service
payment-svc
monitoring-stack
```

### JSON

```bash
argocd app list -o json
```

Full JSON output with all application details. Combined with `jq`, this is extremely powerful for custom queries:

```bash
# Get names and health status
argocd app list -o json | jq '.items[] | {name: .metadata.name, health: .status.health.status}'

# Find applications with sync errors
argocd app list -o json | jq '.items[] | select(.status.conditions != null) | .metadata.name'
```

### YAML

```bash
argocd app list -o yaml
```

Same as JSON but in YAML format. Useful for piping into tools that prefer YAML.

## Filtering with Label Selectors

Label selectors are the primary filtering mechanism:

```bash
# Filter by environment
argocd app list -l environment=production

# Filter by team
argocd app list -l team=backend

# Multiple labels (AND logic)
argocd app list -l team=backend,environment=production

# Set-based selectors
argocd app list -l 'environment in (staging, production)'
argocd app list -l 'tier notin (internal, test)'

# Label existence check
argocd app list -l 'compliance'
argocd app list -l '!deprecated'
```

## Filtering by Project

Filter applications belonging to a specific ArgoCD project:

```bash
# All applications in the "production" project
argocd app list --project production

# Multiple projects
argocd app list --project production --project staging
```

## Filtering by Repository

Filter by the Git repository URL:

```bash
argocd app list --repo https://github.com/my-org/manifests.git
```

This is useful when you want to see all applications sourced from a specific repository.

## Filtering by Cluster

```bash
# Filter by cluster URL
argocd app list --cluster https://prod.cluster.local

# Filter by cluster name (if set)
argocd app list --cluster production-cluster
```

## Combining Filters

All filters can be combined:

```bash
# Production apps from a specific repo owned by the backend team
argocd app list \
  --project production \
  --repo https://github.com/my-org/manifests.git \
  -l team=backend
```

## Practical Scripting Patterns

### Health Check Dashboard

Build a quick health overview:

```bash
#!/bin/bash
# health-dashboard.sh - Quick health overview of all applications

echo "=== Application Health Dashboard ==="
echo ""

echo "Healthy Applications:"
argocd app list -o json | jq -r '.items[] | select(.status.health.status == "Healthy") | "  \(.metadata.name)"'

echo ""
echo "Degraded Applications:"
argocd app list -o json | jq -r '.items[] | select(.status.health.status == "Degraded") | "  \(.metadata.name) - \(.status.health.message // "no message")"'

echo ""
echo "Progressing Applications:"
argocd app list -o json | jq -r '.items[] | select(.status.health.status == "Progressing") | "  \(.metadata.name)"'

echo ""
echo "Unknown Health:"
argocd app list -o json | jq -r '.items[] | select(.status.health.status == "Unknown") | "  \(.metadata.name)"'
```

### OutOfSync Report

```bash
#!/bin/bash
# sync-report.sh - Find and report OutOfSync applications

echo "OutOfSync Applications:"
echo "========================"

argocd app list -o json | jq -r '
  .items[] |
  select(.status.sync.status == "OutOfSync") |
  "\(.metadata.name)\t\(.spec.source.repoURL)\t\(.spec.source.targetRevision)"
' | column -t -s $'\t'
```

### Batch Sync Script

```bash
#!/bin/bash
# batch-sync.sh - Sync all OutOfSync applications in a project

PROJECT="${1:?Usage: batch-sync.sh <project>}"

echo "Finding OutOfSync applications in project: $PROJECT"

APPS=$(argocd app list --project "$PROJECT" -o json | jq -r '
  .items[] |
  select(.status.sync.status == "OutOfSync") |
  .metadata.name
')

if [ -z "$APPS" ]; then
  echo "All applications are in sync!"
  exit 0
fi

echo "Applications to sync:"
echo "$APPS"
echo ""
read -p "Proceed with sync? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for app in $APPS; do
    echo "Syncing $app..."
    argocd app sync "$app" --async
  done
  echo "Sync initiated for all applications."
fi
```

### Application Count by Category

```bash
#!/bin/bash
# count-apps.sh - Count applications by various categories

echo "=== Applications by Health Status ==="
argocd app list -o json | jq -r '.items[].status.health.status' | sort | uniq -c | sort -rn

echo ""
echo "=== Applications by Sync Status ==="
argocd app list -o json | jq -r '.items[].status.sync.status' | sort | uniq -c | sort -rn

echo ""
echo "=== Applications by Project ==="
argocd app list -o json | jq -r '.items[].spec.project' | sort | uniq -c | sort -rn

echo ""
echo "=== Applications by Cluster ==="
argocd app list -o json | jq -r '.items[].spec.destination.server' | sort | uniq -c | sort -rn
```

## Using app list in CI/CD Pipelines

In CI/CD pipelines, `argocd app list` serves as a validation step:

```yaml
# GitHub Actions example
- name: Verify all apps healthy
  run: |
    UNHEALTHY=$(argocd app list -o json | jq '[.items[] | select(.status.health.status != "Healthy")] | length')
    if [ "$UNHEALTHY" -gt 0 ]; then
      echo "Found $UNHEALTHY unhealthy applications:"
      argocd app list -o json | jq -r '.items[] | select(.status.health.status != "Healthy") | .metadata.name'
      exit 1
    fi
    echo "All applications are healthy."
```

## Performance Considerations

For large ArgoCD installations with thousands of applications:

- Use `--project` or `-l` filters to reduce the amount of data returned
- Use `-o name` when you only need application names
- Avoid repeated `argocd app list -o json` calls in loops; fetch once and process with jq
- Consider using the ArgoCD API directly for very large datasets

```bash
# Efficient: Fetch once, filter locally
DATA=$(argocd app list -o json)
echo "$DATA" | jq '.items[] | select(.metadata.labels.team == "backend") | .metadata.name'
echo "$DATA" | jq '.items[] | select(.status.health.status == "Degraded") | .metadata.name'

# Inefficient: Multiple API calls
argocd app list -l team=backend -o name
argocd app list -o json | jq '...'
```

## Monitoring Integration

Use `argocd app list` output to feed monitoring systems. For example, reporting application counts to OneUptime for alerting:

```bash
#!/bin/bash
# Report application health metrics
TOTAL=$(argocd app list -o json | jq '.items | length')
HEALTHY=$(argocd app list -o json | jq '[.items[] | select(.status.health.status == "Healthy")] | length')
SYNCED=$(argocd app list -o json | jq '[.items[] | select(.status.sync.status == "Synced")] | length')

echo "Total applications: $TOTAL"
echo "Healthy applications: $HEALTHY"
echo "Synced applications: $SYNCED"

# Alert if healthy percentage drops below threshold
HEALTH_PCT=$((HEALTHY * 100 / TOTAL))
if [ "$HEALTH_PCT" -lt 90 ]; then
  echo "WARNING: Only ${HEALTH_PCT}% of applications are healthy!"
fi
```

## Summary

The `argocd app list` command is the Swiss Army knife for ArgoCD application management. Master the output formats (`-o name` for scripting, `-o json` for complex queries), use label selectors for precise filtering, and combine it with shell scripting and `jq` to build powerful automation around your GitOps workflow. For monitoring and alerting on application health, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-app-wait-command/view) integration patterns.
