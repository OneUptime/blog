# How to Measure Recovery Time Objective (RTO) with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, RTO, SRE, Metrics

Description: Measure and optimize Recovery Time Objective (RTO) for Flux CD managed cluster recovery, with tooling to track and improve your recovery performance over time.

---

## Introduction

Recovery Time Objective (RTO) is the maximum acceptable duration between a failure and the restoration of normal service. It is a commitment, not a hope - and you cannot make a commitment without measuring your actual recovery performance. Many teams define RTO in their SLAs without ever having timed an actual recovery.

Flux CD provides clear, observable reconciliation events that make RTO measurement straightforward. Every reconciliation cycle is logged with timestamps, and Flux exposes metrics for how long reconciliation takes. By combining Flux metrics with scripted recovery procedures and timing hooks, you can measure and continuously improve your RTO.

This guide covers defining RTO targets for different failure scenarios, instrumenting your recovery procedures to capture timing data, and using that data to optimize your Flux configuration for faster recovery.

## Prerequisites

- Flux CD with Prometheus metrics enabled
- Prometheus and Grafana for metrics visualization
- `flux` and `kubectl` CLI tools
- A scripted recovery procedure to time (see companion posts on specific recovery scenarios)

## Step 1: Define RTO Targets by Scenario

Different failure scenarios have different RTO targets based on business impact.

```yaml
# rto-targets.yaml - Store in Git for version control
rto_targets:
  scenarios:
    flux_controller_restart:
      target_minutes: 5
      rationale: "Controllers auto-restart via Kubernetes; mainly wait time"
    single_namespace_deletion:
      target_minutes: 10
      rationale: "Flux reconciles namespace and all resources within one sync interval"
    full_cluster_rebuild:
      target_minutes: 30
      rationale: "Bootstrap + infrastructure + apps reconciliation"
    etcd_restore_from_snapshot:
      target_minutes: 60
      rationale: "etcd restore is manual; Flux speeds up post-restore state recovery"
    git_repository_failover:
      target_minutes: 5
      rationale: "Patching GitRepository URL + one reconciliation cycle"
```

## Step 2: Enable Flux Prometheus Metrics

```yaml
# Flux controllers expose metrics by default; ensure Prometheus can scrape them
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
      interval: 15s
```

Key Flux metrics for RTO measurement:

```promql
# Time since last successful reconciliation
gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}

# Number of failed reconciliations
gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"}

# Source controller fetch duration
gotk_source_duration_seconds{kind="GitRepository"}
```

## Step 3: Instrument Recovery Scripts with Timing

Wrap each recovery step in timing hooks to capture where time is actually spent.

```bash
#!/bin/bash
# timed-recovery.sh - Full cluster rebuild with RTO measurement
set -euo pipefail

START_TOTAL=$(date +%s%3N)  # Milliseconds
declare -A STEP_TIMES

time_step() {
  local name="$1"
  local start=$(date +%s%3N)
  "$2"
  local end=$(date +%s%3N)
  STEP_TIMES["$name"]=$((end - start))
  echo "STEP [$name]: $((end - start))ms"
}

step_bootstrap() {
  flux bootstrap github \
    --owner=my-org \
    --repository=my-fleet \
    --branch=main \
    --path=clusters/production \
    --token-env=GITHUB_TOKEN
}

step_restore_secrets() {
  kubectl apply -f /tmp/sealed-secrets-key.yaml -n kube-system
  kubectl rollout restart deployment sealed-secrets -n kube-system
  kubectl rollout status deployment/sealed-secrets -n kube-system --timeout=120s
}

step_wait_infrastructure() {
  kubectl wait kustomization/infrastructure -n flux-system \
    --for=condition=ready --timeout=300s
}

step_wait_apps() {
  kubectl wait kustomization/apps -n flux-system \
    --for=condition=ready --timeout=300s
}

time_step "bootstrap" step_bootstrap
time_step "restore_secrets" step_restore_secrets
time_step "wait_infrastructure" step_wait_infrastructure
time_step "wait_apps" step_wait_apps

END_TOTAL=$(date +%s%3N)
TOTAL_MS=$((END_TOTAL - START_TOTAL))
TOTAL_MINUTES=$((TOTAL_MS / 60000))

echo ""
echo "=== RTO Measurement Results ==="
for step in "${!STEP_TIMES[@]}"; do
  echo "  $step: ${STEP_TIMES[$step]}ms"
done
echo "Total RTO: ${TOTAL_MS}ms (${TOTAL_MINUTES} minutes)"

# Write results to JSON for trending
cat > /tmp/rto-result.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scenario": "full_cluster_rebuild",
  "total_ms": $TOTAL_MS,
  "total_minutes": $TOTAL_MINUTES,
  "steps": {
    "bootstrap_ms": ${STEP_TIMES[bootstrap]},
    "restore_secrets_ms": ${STEP_TIMES[restore_secrets]},
    "wait_infrastructure_ms": ${STEP_TIMES[wait_infrastructure]},
    "wait_apps_ms": ${STEP_TIMES[wait_apps]}
  }
}
EOF
```

## Step 4: Create a Grafana Dashboard for RTO Tracking

```json
{
  "title": "Flux CD RTO Metrics",
  "panels": [
    {
      "title": "Reconciliation Duration (p99)",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, rate(gotk_reconcile_duration_seconds_bucket{kind='Kustomization'}[5m]))",
          "legendFormat": "{{name}} p99"
        }
      ]
    },
    {
      "title": "Failed Reconciliations",
      "type": "stat",
      "targets": [
        {
          "expr": "count(gotk_reconcile_condition{type='Ready',status='False'}) by (kind, name)"
        }
      ]
    },
    {
      "title": "Time Since Last Successful Reconciliation",
      "type": "table",
      "targets": [
        {
          "expr": "time() - gotk_reconcile_duration_seconds_sum{type='Ready',status='True'}"
        }
      ]
    }
  ]
}
```

## Step 5: Optimize Flux Configuration for Faster RTO

After measuring, optimize the bottlenecks.

```yaml
# Reduce reconciliation interval for critical components
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Shorter interval = faster automatic recovery
  interval: 2m     # Was 10m; faster convergence after failures
  retryInterval: 30s  # Retry quickly after transient failures
  timeout: 3m
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure
```

```yaml
# Shorten Git source polling for faster state detection
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m   # Poll Git every minute for faster detection of recovery commits
  timeout: 30s
  ref:
    branch: main
  url: https://github.com/my-org/my-fleet
```

## Step 6: Report and Track RTO Over Time

```bash
#!/bin/bash
# rto-report.sh - Generate RTO trend report
jq -s '
  . |
  group_by(.scenario) |
  map({
    scenario: .[0].scenario,
    measurements: length,
    avg_minutes: (map(.total_minutes) | add / length),
    min_minutes: (map(.total_minutes) | min),
    max_minutes: (map(.total_minutes) | max),
    trend: (if ([-2:] | .[1].total_minutes) < ([-2:] | .[0].total_minutes) then "improving" else "degrading" end)
  })
' /var/log/rto-results/*.json
```

## Best Practices

- Measure RTO during planned DR drills, not only during actual incidents.
- Break RTO into component steps to identify the bottleneck (bootstrap vs. secrets vs. app reconciliation).
- Compare RTO across drills to validate that improvements are real and sustained.
- Set alert thresholds based on measured RTO, not theoretical estimates.
- Share RTO measurements with stakeholders to build realistic expectations.
- Re-measure RTO after Flux upgrades or infrastructure changes.

## Conclusion

Measuring RTO is not bureaucratic overhead - it is the feedback loop that drives DR improvement. With Flux CD's observable reconciliation events and scripted recovery procedures with timing hooks, you can move from "we think our RTO is 30 minutes" to "our measured RTO is 23 minutes and trending down." That precision is what separates teams with genuine DR capabilities from teams with untested DR hopes.
