# How to Configure Flux CD with New Relic for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, New Relic, Metrics, Observability

Description: Learn how to integrate Flux CD metrics with New Relic to monitor reconciliation health, track GitOps performance, and set up alerts for pipeline failures.

---

New Relic provides a comprehensive observability platform that can ingest Prometheus metrics from Flux CD controllers. By configuring the New Relic Prometheus integration, you can monitor reconciliation status, duration, and error rates alongside your application metrics. This guide covers the setup from metric collection through dashboard creation and alerting.

## Integration Options

There are two primary ways to get Flux CD metrics into New Relic:

1. **New Relic Prometheus Agent** -- Scrapes Prometheus endpoints and sends metrics to New Relic.
2. **New Relic Kubernetes Integration** -- Includes Prometheus scraping as part of the broader Kubernetes monitoring.

This guide uses the Prometheus agent approach for a focused Flux CD integration.

## Step 1: Deploy the New Relic Prometheus Agent

Install the New Relic Prometheus agent configured to scrape Flux CD metrics. Create a values file:

```yaml
config:
  static_targets:
    - targets:
        - "source-controller.flux-system.svc.cluster.local:8080"
        - "kustomize-controller.flux-system.svc.cluster.local:8080"
        - "helm-controller.flux-system.svc.cluster.local:8080"
        - "notification-controller.flux-system.svc.cluster.local:8080"
      labels:
        service: flux-cd

  kubernetes:
    integrations_filter:
      enabled: true
      source_labels:
        - app.kubernetes.io/part-of
      source_values:
        - flux

  extra_metric_relabel_config:
    - source_labels: [__name__]
      regex: "gotk_.*|controller_runtime_.*|workqueue_.*"
      action: keep

licenseKey: YOUR_NEW_RELIC_LICENSE_KEY
cluster: your-cluster-name
```

Install with Helm:

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

helm install newrelic-prometheus newrelic/nri-prometheus \
  -n newrelic \
  --create-namespace \
  -f newrelic-prometheus-values.yaml
```

## Step 2: Verify Metrics in New Relic

After deployment, verify that Flux metrics are arriving in New Relic. Open the New Relic query builder and run this NRQL query:

```sql
FROM Metric SELECT uniques(metricName) WHERE metricName LIKE 'gotk_%' SINCE 30 minutes ago
```

You should see metrics like `gotk_reconcile_condition`, `gotk_reconcile_duration_seconds`, and `gotk_suspend_status`.

## Step 3: Create a New Relic Dashboard

Build a dashboard in New Relic using NRQL queries for Flux CD monitoring.

**Reconciliation Health Summary:**

```sql
FROM Metric SELECT latest(gotk_reconcile_condition)
  WHERE type = 'Ready'
  FACET kind, name, namespace, status
  SINCE 30 minutes ago
```

**Failing Reconciliations Count:**

```sql
FROM Metric SELECT uniqueCount(name)
  WHERE metricName = 'gotk_reconcile_condition'
  AND type = 'Ready' AND status = 'False'
  FACET kind
  SINCE 30 minutes ago
```

**Reconciliation Duration Over Time:**

```sql
FROM Metric SELECT average(gotk_reconcile_duration_seconds)
  FACET kind, name
  TIMESERIES AUTO
  SINCE 6 hours ago
```

**Controller Reconcile Error Rate:**

```sql
FROM Metric SELECT rate(sum(controller_runtime_reconcile_errors_total), 1 minute)
  FACET controller
  TIMESERIES AUTO
  SINCE 3 hours ago
```

**Suspended Resources:**

```sql
FROM Metric SELECT latest(gotk_suspend_status)
  WHERE gotk_suspend_status = 1
  FACET kind, name, namespace
  SINCE 30 minutes ago
```

## Step 4: Set Up New Relic Alerts

Create NRQL alert conditions for Flux CD failures:

**Flux Reconciliation Failure:**

```sql
FROM Metric SELECT uniqueCount(name)
  WHERE metricName = 'gotk_reconcile_condition'
  AND type = 'Ready' AND status = 'False'
```

Set the threshold to above 0 for at least 10 minutes with critical priority.

**High Reconciliation Error Rate:**

```sql
FROM Metric SELECT rate(sum(controller_runtime_reconcile_errors_total), 1 minute)
```

Set the threshold to above 0.1 for at least 5 minutes with warning priority.

**Slow Reconciliation:**

```sql
FROM Metric SELECT percentile(gotk_reconcile_duration_seconds, 95)
```

Set the threshold to above 120 seconds for at least 15 minutes with warning priority.

## Step 5: Correlate with Application Metrics

One advantage of New Relic is the ability to correlate Flux CD deployment events with application performance. Forward Flux events to New Relic as deployment markers:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: newrelic-provider
  namespace: flux-system
spec:
  type: generic-hmac
  address: https://api.newrelic.com/v2/applications/YOUR_APP_ID/deployments.json
  secretRef:
    name: newrelic-api-key
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: newrelic-deployments
  namespace: flux-system
spec:
  providerRef:
    name: newrelic-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This sends deployment events to New Relic so you can overlay them on application performance charts and quickly correlate performance changes with GitOps deployments.

## Step 6: Use the New Relic Kubernetes Navigator

New Relic's Kubernetes Navigator provides a visual cluster view. With Flux metrics ingested, you can:

1. View Flux controller pods in the cluster map.
2. See resource utilization of Flux controllers.
3. Correlate Flux reconciliation failures with pod events.
4. Track Flux-managed workload health.

Navigate to **New Relic > Kubernetes > Your Cluster** to access the navigator.

## Summary

Integrating Flux CD with New Relic involves deploying the New Relic Prometheus agent configured to scrape Flux controller metrics, building NRQL-based dashboards for reconciliation health and performance, and creating alert conditions for failures and slowdowns. The key metrics -- `gotk_reconcile_condition`, `gotk_reconcile_duration_seconds`, and `gotk_suspend_status` -- translate directly into NRQL queries. Use deployment markers to correlate Flux events with application performance in New Relic.
