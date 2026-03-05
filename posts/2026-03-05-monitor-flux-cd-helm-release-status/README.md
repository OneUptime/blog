# How to Monitor Flux CD Helm Release Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Helm, HelmRelease, Prometheus

Description: Learn how to monitor Flux CD Helm Release status using Prometheus metrics, Flux CLI commands, and kubectl to ensure your Helm-based deployments are healthy.

---

Flux CD manages Helm releases through the helm-controller, which reconciles HelmRelease custom resources against Helm charts from configured sources. Monitoring the status of these releases is essential for catching deployment failures, version mismatches, and upgrade issues. This guide covers how to monitor HelmRelease status using metrics, CLI tools, and kubectl.

## HelmRelease Metrics

The helm-controller exposes the same `gotk_*` metrics as other Flux controllers. For HelmRelease resources, the key metrics are:

- `gotk_reconcile_condition{kind="HelmRelease"}` -- Indicates whether each HelmRelease is Ready, Stalled, or in an error state.
- `gotk_reconcile_duration_seconds{kind="HelmRelease"}` -- Tracks how long each HelmRelease reconciliation takes.
- `gotk_suspend_status{kind="HelmRelease"}` -- Shows whether a HelmRelease is suspended.

## Querying HelmRelease Health

### All Failing HelmReleases

To find all HelmReleases that are not in a Ready state:

```promql
gotk_reconcile_condition{kind="HelmRelease", type="Ready", status="False"} == 1
```

### HelmRelease Success Rate

To calculate the percentage of healthy HelmReleases:

```promql
(
  count(gotk_reconcile_condition{kind="HelmRelease", type="Ready", status="True"} == 1)
  /
  count(gotk_reconcile_condition{kind="HelmRelease", type="Ready"})
) * 100
```

### Slowest HelmRelease Reconciliations

Helm reconciliations tend to be slower than Kustomization reconciliations because they involve rendering templates and managing release state. Identify the slowest releases:

```promql
topk(10,
  rate(gotk_reconcile_duration_seconds_sum{kind="HelmRelease"}[15m])
  /
  rate(gotk_reconcile_duration_seconds_count{kind="HelmRelease"}[15m])
)
```

## Monitoring with Flux CLI

The Flux CLI provides dedicated commands for checking HelmRelease status.

### List All HelmReleases

```bash
flux get helmreleases -A
```

This outputs a table showing the namespace, name, revision, suspended status, ready state, and message for every HelmRelease in the cluster. Example output:

```
NAMESPACE    NAME        REVISION   SUSPENDED  READY  MESSAGE
monitoring   prometheus  45.7.1     False      True   Helm install succeeded
logging      loki        2.9.1      False      True   Helm upgrade succeeded
apps         my-app      1.2.3      False      False  Helm install failed: timed out
```

### Filter by Status

To show only failing HelmReleases:

```bash
flux get helmreleases -A --status-selector ready=false
```

### Get Detailed Events

To see the event history for a specific HelmRelease:

```bash
flux events --for helmrelease/my-app -n apps
```

This shows reconciliation events including install attempts, upgrade results, and error messages.

### Trace a HelmRelease

To understand the full dependency chain of a HelmRelease:

```bash
flux trace helmrelease my-app -n apps
```

This shows the HelmRelease, its source HelmRepository or GitRepository, and the reconciliation status of each component in the chain.

## Monitoring with kubectl

You can also inspect HelmRelease status directly with kubectl.

### Get HelmRelease Status

```bash
kubectl get helmreleases -A -o wide
```

### Check Conditions

```bash
kubectl get helmrelease my-app -n apps -o jsonpath='{.status.conditions[*]}'
```

This returns the full condition array, including the type, status, reason, and message for each condition.

### View the Last Applied Revision

```bash
kubectl get helmrelease my-app -n apps -o jsonpath='{.status.lastAppliedRevision}'
```

## Alert Rules for HelmRelease

Create targeted alerts for HelmRelease failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-helmrelease-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-helmrelease-health
      rules:
        - alert: FluxHelmReleaseNotReady
          expr: gotk_reconcile_condition{kind="HelmRelease", type="Ready", status="False"} == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "HelmRelease not ready: {{ $labels.name }}"
            description: "HelmRelease {{ $labels.name }} in {{ $labels.namespace }} has not been ready for 10 minutes."

        - alert: FluxHelmReleaseStalled
          expr: gotk_reconcile_condition{kind="HelmRelease", type="Stalled", status="True"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "HelmRelease stalled: {{ $labels.name }}"
            description: "HelmRelease {{ $labels.name }} in {{ $labels.namespace }} is stalled and will not be retried."

        - alert: FluxHelmReconciliationSlow
          expr: |
            histogram_quantile(0.95,
              sum by (le, name, namespace) (
                rate(gotk_reconcile_duration_seconds_bucket{kind="HelmRelease"}[15m])
              )
            ) > 600
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Slow HelmRelease reconciliation: {{ $labels.name }}"
            description: "HelmRelease {{ $labels.name }} P95 reconciliation duration exceeds 10 minutes."
```

## Grafana Dashboard Panel

Build a Grafana table panel that shows the current state of all HelmReleases:

```json
{
  "title": "HelmRelease Health Overview",
  "type": "stat",
  "targets": [
    {
      "expr": "sum(gotk_reconcile_condition{kind=\"HelmRelease\", type=\"Ready\", status=\"True\"})",
      "legendFormat": "Ready"
    },
    {
      "expr": "sum(gotk_reconcile_condition{kind=\"HelmRelease\", type=\"Ready\", status=\"False\"})",
      "legendFormat": "Not Ready"
    }
  ]
}
```

Add a second panel showing reconciliation duration trends:

```promql
histogram_quantile(0.95,
  sum by (le, name) (
    rate(gotk_reconcile_duration_seconds_bucket{kind="HelmRelease"}[15m])
  )
)
```

## Common HelmRelease Failure Patterns

When monitoring HelmRelease status, watch for these patterns:

1. Repeated install or upgrade failures often indicate invalid chart values or missing dependencies. Check events with `flux events --for helmrelease/my-app`.
2. Timeout failures suggest resource provisioning issues. Check the underlying pod events with kubectl.
3. Source not found errors mean the HelmRepository or HelmChart source is unavailable. Trace the dependency chain with `flux trace`.
4. Stalled releases indicate the controller has stopped retrying. This usually requires manual intervention to fix the underlying issue and then resume or force reconciliation.

## Summary

Monitoring Flux CD HelmRelease status requires a combination of Prometheus metrics for aggregate health tracking, Flux CLI commands for quick inspection, and kubectl for detailed status checks. The `gotk_reconcile_condition{kind="HelmRelease"}` metric is the primary indicator of release health, while `gotk_reconcile_duration_seconds` helps identify performance issues. Set up targeted alerts for HelmRelease failures to catch deployment issues early.
