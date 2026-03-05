# How to Use flux stats Command for Overview

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, CLI, Stats, Overview

Description: Learn how to use the flux stats command to get a quick summary of all Flux CD resources, their reconciliation status, and health across your cluster.

---

The `flux stats` command provides a high-level statistical summary of all Flux CD resources in your cluster. Instead of listing individual resources, it gives you aggregate counts of ready, failed, suspended, and total resources grouped by kind. This makes it the fastest way to assess the overall health of your GitOps deployment without digging into individual resource details.

## Basic Usage

Run `flux stats` to see a summary of all Flux resources:

```bash
flux stats -n flux-system
```

The output looks like this:

```text
RECONCILERS            READY   FAILED  SUSPENDED  STORAGE
GitRepository          3       0       0          44.0 MiB
OCIRepository          1       0       0          12.0 MiB
HelmRepository         2       0       0          8.0 MiB
HelmChart              5       0       0          2.0 MiB
Kustomization          8       1       0          -
HelmRelease            5       0       1          -
```

This immediately tells you how many resources of each kind exist, how many are healthy, how many are failing, and how many are suspended.

## Check Stats Across All Namespaces

For multi-tenant clusters or when Flux resources span multiple namespaces:

```bash
flux stats --all-namespaces
```

This gives you a cluster-wide view of Flux CD health in a single command.

## Interpreting the Output

Each column in the `flux stats` output tells you something specific:

- **RECONCILERS** -- The type of Flux resource.
- **READY** -- Count of resources whose last reconciliation succeeded.
- **FAILED** -- Count of resources whose last reconciliation failed.
- **SUSPENDED** -- Count of resources that have been manually suspended.
- **STORAGE** -- Disk usage for source artifacts (only applicable to source resources).

Key things to watch for:

1. **FAILED greater than 0** -- Any non-zero failed count requires investigation.
2. **SUSPENDED greater than 0** -- Suspended resources are intentionally paused, but long suspensions may indicate forgotten manual interventions.
3. **STORAGE growing** -- Large storage values may indicate bloated Git repositories or Helm charts.

## Using flux stats as a Health Check

Integrate `flux stats` into your operational workflow as a quick health check:

```bash
#!/bin/bash
FAILED_COUNT=$(flux stats --all-namespaces 2>/dev/null | awk 'NR>1 {sum += $3} END {print sum}')

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "UNHEALTHY: $FAILED_COUNT Flux resources are failing"
    flux stats --all-namespaces
    exit 1
else
    echo "HEALTHY: All Flux resources are reconciling successfully"
    exit 0
fi
```

## Combine with Other Commands for Drill-Down

When `flux stats` reveals failures, drill down to find the specific resources:

```bash
# Step 1: Check overall stats
flux stats --all-namespaces

# Step 2: If Kustomizations show failures, list them to find which ones
flux get kustomizations --all-namespaces --status-selector ready=false

# Step 3: Check events for the failing Kustomization
flux events --for Kustomization/failing-app -n flux-system

# Step 4: Check logs for more detail
flux logs --kind=Kustomization --name=failing-app --level=error --since=1h
```

## Monitor Stats Over Time

While `flux stats` is a point-in-time command, you can log stats periodically for trend analysis:

```bash
#!/bin/bash
LOG_FILE="/var/log/flux-stats.log"

while true; do
    echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG_FILE"
    flux stats --all-namespaces >> "$LOG_FILE" 2>&1
    echo "" >> "$LOG_FILE"
    sleep 300
done
```

For production use, it is better to rely on Prometheus metrics (`gotk_reconcile_condition`, `gotk_suspend_status`) which are continuously scraped and can be visualized in Grafana. The `flux stats` command is best suited for interactive use and quick health checks.

## Use in CI/CD Pipelines

Add `flux stats` to your CI/CD pipeline as a post-deployment verification step:

```yaml
name: Verify Flux Health
on:
  workflow_dispatch:
  schedule:
    - cron: '*/30 * * * *'

jobs:
  check-flux:
    runs-on: ubuntu-latest
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Set up Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Check Flux stats
        run: |
          flux stats --all-namespaces

          FAILED=$(flux stats --all-namespaces 2>/dev/null | awk 'NR>1 {sum += $3} END {print sum}')
          if [ "$FAILED" -gt 0 ]; then
            echo "::error::$FAILED Flux resources are failing"
            flux get all --all-namespaces --status-selector ready=false
            exit 1
          fi
```

## Comparing flux stats with flux get all

| Feature | flux stats | flux get all |
|---------|-----------|-------------|
| Output type | Aggregate counts | Individual resources |
| Speed | Fast (summary) | Slower (lists all) |
| Detail level | High-level overview | Per-resource detail |
| Storage info | Yes | No |
| Use case | Health check | Detailed inspection |

Use `flux stats` first to get the big picture, then `flux get all` or `flux get <kind>` to drill into specifics.

## Summary

The `flux stats` command is the quickest way to assess Flux CD health across your cluster. It provides aggregate counts of ready, failed, and suspended resources by kind, plus storage usage for source artifacts. Use it as a daily health check, integrate it into CI/CD verification steps, and combine it with `flux get`, `flux events`, and `flux logs` for a complete debugging workflow. For continuous monitoring, combine this CLI-based approach with Prometheus metrics and Grafana dashboards for persistent tracking and alerting.
