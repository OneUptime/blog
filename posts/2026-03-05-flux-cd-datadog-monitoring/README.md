# How to Configure Flux CD with Datadog for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Datadog, Metrics, Observability

Description: Learn how to integrate Flux CD with Datadog to monitor reconciliation metrics, controller health, and GitOps pipeline performance in your Datadog dashboards.

---

Datadog is a widely used monitoring platform that can ingest Prometheus metrics from Flux CD controllers. By configuring the Datadog Agent to scrape Flux metrics, you gain visibility into reconciliation health, duration, and error rates directly within your Datadog dashboards and alerting system. This guide covers the full integration from metric collection through dashboard creation and alerting.

## How It Works

Flux CD controllers expose Prometheus-format metrics on their `/metrics` endpoint at port 8080. The Datadog Agent can scrape these endpoints using its OpenMetrics integration, converting Prometheus metrics into Datadog metrics that can be queried, graphed, and alerted on.

## Step 1: Annotate Flux CD Pods for Datadog Scraping

The Datadog Agent discovers scrape targets via pod annotations. Patch the Flux CD deployments to include Datadog annotations using a Kustomize overlay:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          metadata:
            annotations:
              ad.datadoghq.com/manager.checks: |
                {
                  "openmetrics": {
                    "instances": [
                      {
                        "openmetrics_endpoint": "http://%%host%%:8080/metrics",
                        "namespace": "flux",
                        "metrics": [
                          "gotk_reconcile_condition",
                          "gotk_reconcile_duration_seconds.*",
                          "gotk_suspend_status",
                          "controller_runtime_reconcile_total",
                          "controller_runtime_reconcile_errors_total"
                        ]
                      }
                    ]
                  }
                }
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          metadata:
            annotations:
              ad.datadoghq.com/manager.checks: |
                {
                  "openmetrics": {
                    "instances": [
                      {
                        "openmetrics_endpoint": "http://%%host%%:8080/metrics",
                        "namespace": "flux",
                        "metrics": [
                          "gotk_reconcile_condition",
                          "gotk_reconcile_duration_seconds.*",
                          "gotk_suspend_status",
                          "controller_runtime_reconcile_total",
                          "controller_runtime_reconcile_errors_total"
                        ]
                      }
                    ]
                  }
                }
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          metadata:
            annotations:
              ad.datadoghq.com/manager.checks: |
                {
                  "openmetrics": {
                    "instances": [
                      {
                        "openmetrics_endpoint": "http://%%host%%:8080/metrics",
                        "namespace": "flux",
                        "metrics": [
                          "gotk_reconcile_condition",
                          "gotk_reconcile_duration_seconds.*",
                          "gotk_suspend_status",
                          "controller_runtime_reconcile_total",
                          "controller_runtime_reconcile_errors_total"
                        ]
                      }
                    ]
                  }
                }
```

Apply the patches:

```bash
kubectl apply -k .
```

## Step 2: Verify Metrics Are Being Collected

After the pods restart with the new annotations, verify that the Datadog Agent is collecting Flux metrics:

```bash
kubectl exec -n datadog $(kubectl get pods -n datadog -l app=datadog -o jsonpath='{.items[0].metadata.name}') -- agent status | grep -A 20 "openmetrics"
```

## Step 3: Create a Datadog Dashboard

In the Datadog UI, create a new dashboard with widgets using these queries:

**Reconciliation Failures:**

```
sum:flux.gotk_reconcile_condition{type:ready,status:false}
```

**Ready Reconciliations:**

```
sum:flux.gotk_reconcile_condition{type:ready,status:true}
```

**P95 Reconciliation Duration:**

```
p95:flux.gotk_reconcile_duration_seconds.quantile{*} by {kind,name}
```

**Reconciliation Error Rate:**

```
sum:flux.controller_runtime_reconcile_errors_total{*}.as_rate() by {controller}
```

**Suspended Resources:**

```
sum:flux.gotk_suspend_status{*} by {kind}
```

## Step 4: Set Up Datadog Monitors

Create Datadog monitors for Flux CD issues. You can create them via the Datadog UI or API:

```bash
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "name": "Flux Reconciliation Failure",
    "type": "metric alert",
    "query": "sum(last_10m):sum:flux.gotk_reconcile_condition{type:ready,status:false} > 0",
    "message": "Flux CD has failing reconciliations. Check the Flux dashboard for details. @slack-flux-alerts",
    "tags": ["service:flux-cd", "team:platform"],
    "priority": 2
  }'
```

Additional monitors to configure:

- **High reconciliation error rate**: Alert when `sum:flux.controller_runtime_reconcile_errors_total{*}.as_rate()` is above 0.1 for 5 minutes.
- **Reconciliation duration spike**: Alert when `avg:flux.gotk_reconcile_duration_seconds.quantile{quantile:0.95}` is above 120 seconds for 15 minutes.

## Step 5: Forward Flux Events to Datadog

In addition to metrics, send Flux events to Datadog for correlation:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: datadog-provider
  namespace: flux-system
spec:
  type: generic
  address: https://http-intake.logs.datadoghq.com/v1/input
  secretRef:
    name: datadog-api-key
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: datadog-events
  namespace: flux-system
spec:
  providerRef:
    name: datadog-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Summary

Integrating Flux CD with Datadog involves annotating Flux controller pods with Datadog OpenMetrics scraping configuration, creating dashboards to visualize reconciliation health and duration, and setting up monitors to alert on failures. Key metrics to track include `gotk_reconcile_condition`, `gotk_reconcile_duration_seconds`, and `controller_runtime_reconcile_errors_total`. Forward Flux events to Datadog Logs for correlation between deployment events and metric changes.
