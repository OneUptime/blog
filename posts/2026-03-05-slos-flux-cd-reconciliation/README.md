# How to Create SLOs for Flux CD Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, SLO, SLI, Prometheus, Reliability

Description: Learn how to define and measure Service Level Objectives for Flux CD reconciliation to ensure reliable GitOps delivery pipelines.

---

Service Level Objectives (SLOs) provide a framework for measuring and maintaining reliability. While SLOs are commonly applied to user-facing services, they are equally valuable for internal infrastructure components like Flux CD. When your deployment pipeline breaks or slows down, it directly impacts your ability to ship changes, making reconciliation reliability a critical operational concern.

This guide covers how to define meaningful SLIs and SLOs for Flux CD, implement them using Prometheus metrics, and set up alerting based on error budgets.

## Understanding SLIs for Flux CD

Before defining SLOs, you need Service Level Indicators (SLIs) -- the measurable values that represent the health of your system. For Flux CD, the most relevant SLIs are:

- **Reconciliation success rate**: The percentage of reconciliation attempts that succeed
- **Reconciliation latency**: The time it takes for a change in Git to be applied to the cluster
- **Source fetch success rate**: The percentage of successful source artifact fetches
- **Drift correction time**: How quickly Flux detects and corrects configuration drift

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Prometheus deployed and scraping Flux CD metrics
- Grafana for visualization (optional but recommended)
- The `flux` CLI installed

## Step 1: Enable Flux CD Metrics

Ensure that Flux controllers expose Prometheus metrics. By default, Flux controllers expose metrics on port 8080. Verify that your Prometheus instance is scraping these endpoints:

```bash
kubectl get pods -n flux-system -o yaml | grep -A2 "containerPort"
```

Create a PodMonitor or ServiceMonitor for Prometheus to discover Flux metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  podMetricsEndpoints:
    - port: http-prom
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
```

## Step 2: Define the Reconciliation Success Rate SLO

The reconciliation success rate is the most fundamental SLO for Flux CD. Define it as the ratio of successful reconciliations to total reconciliation attempts over a rolling window.

**SLO**: 99.5% of Kustomization reconciliations succeed over a 30-day window.

The Prometheus query for this SLI uses the `gotk_reconcile_condition` metric:

```promql
sum(rate(gotk_reconcile_condition{type="Ready", status="True", kind="Kustomization"}[30d]))
/
sum(rate(gotk_reconcile_condition{type="Ready", kind="Kustomization"}[30d]))
```

This gives you the fraction of reconciliations that resulted in a Ready=True condition. Multiply by 100 to get the percentage.

## Step 3: Define the Reconciliation Latency SLO

Reconciliation latency measures how long it takes from when a source change is detected to when it is applied. Use the `gotk_reconcile_duration_seconds` metric:

**SLO**: 95% of reconciliations complete within 60 seconds.

```promql
histogram_quantile(0.95,
  sum(rate(gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}[1h])) by (le)
)
```

This calculates the 95th percentile reconciliation duration. If it exceeds 60 seconds, you are violating the SLO.

## Step 4: Define the Source Fetch Success Rate SLO

Source fetching is a prerequisite for reconciliation. If Flux cannot pull artifacts from Git or Helm repositories, nothing gets deployed.

**SLO**: 99.9% of source fetches succeed over a 30-day window.

```promql
sum(rate(gotk_reconcile_condition{type="Ready", status="True", kind="GitRepository"}[30d]))
/
sum(rate(gotk_reconcile_condition{type="Ready", kind="GitRepository"}[30d]))
```

Source fetch failures often indicate external dependencies (Git provider outages, network issues), so set a slightly higher target to catch problems quickly.

## Step 5: Calculate Error Budgets

An error budget is the allowed amount of failure within your SLO window. For a 99.5% reconciliation success rate over 30 days:

- Total reconciliation attempts per day (assuming 10-minute intervals for 50 resources): 7,200
- Total over 30 days: 216,000
- Error budget: 0.5% of 216,000 = 1,080 allowed failures

Track the remaining error budget with a Prometheus recording rule:

```yaml
groups:
  - name: flux-slo
    rules:
      - record: flux:reconciliation:error_budget_remaining
        expr: |
          1 - (
            sum(increase(gotk_reconcile_condition{type="Ready", status="False", kind="Kustomization"}[30d]))
            /
            (sum(increase(gotk_reconcile_condition{type="Ready", kind="Kustomization"}[30d])) * 0.005)
          )
```

A value of 1 means the full error budget is available. A value of 0 means the budget is exhausted.

## Step 6: Set Up Multi-Window Alerting

Rather than alerting on every individual failure, use multi-window burn rate alerting. This approach fires alerts when you are consuming your error budget faster than expected:

```yaml
groups:
  - name: flux-slo-alerts
    rules:
      - alert: FluxReconciliationBurnRateHigh
        expr: |
          (
            sum(rate(gotk_reconcile_condition{type="Ready", status="False", kind="Kustomization"}[1h]))
            /
            sum(rate(gotk_reconcile_condition{type="Ready", kind="Kustomization"}[1h]))
          ) > (14.4 * 0.005)
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Flux reconciliation error rate is burning through the error budget"
          description: "The 1-hour error rate exceeds 14.4x the 30-day budget burn rate"
      - alert: FluxReconciliationBurnRateSlow
        expr: |
          (
            sum(rate(gotk_reconcile_condition{type="Ready", status="False", kind="Kustomization"}[6h]))
            /
            sum(rate(gotk_reconcile_condition{type="Ready", kind="Kustomization"}[6h]))
          ) > (6 * 0.005)
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Flux reconciliation error rate is elevated"
```

The fast-burn alert (1-hour window, 14.4x multiplier) catches sudden outages. The slow-burn alert (6-hour window, 6x multiplier) catches gradual degradation.

## Step 7: Build an SLO Dashboard

Create a Grafana dashboard that shows:

- Current SLI values for each objective
- Error budget remaining as a gauge
- Burn rate over time as a time series
- A table of individual resources with their reconciliation success rates

This dashboard becomes the primary view for understanding the health of your GitOps pipeline at a glance.

## Summary

SLOs for Flux CD reconciliation bring the same reliability engineering practices used for production services to your deployment pipeline. By defining clear objectives for reconciliation success rate, latency, and source fetch reliability, you create measurable targets that your team can track and improve. Error budget-based alerting reduces noise by focusing on trends rather than individual failures, ensuring you get paged only when the overall health of your GitOps pipeline is genuinely at risk.
