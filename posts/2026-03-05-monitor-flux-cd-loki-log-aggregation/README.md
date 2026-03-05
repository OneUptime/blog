# How to Monitor Flux CD with Loki for Log Aggregation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Loki, Grafana, Log Aggregation

Description: Learn how to aggregate and query Flux CD controller logs using Grafana Loki for centralized observability and troubleshooting.

---

Flux CD controllers produce structured logs that contain valuable information about reconciliation cycles, errors, and source fetching. When running Flux at scale across multiple namespaces and clusters, centralized log aggregation becomes essential. Grafana Loki is a lightweight, cost-effective log aggregation system that integrates naturally with Kubernetes and Grafana, making it an excellent choice for collecting and querying Flux CD logs.

This guide walks you through deploying Loki, configuring log collection from Flux controllers, and building queries to monitor your GitOps pipeline.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Helm CLI installed
- `kubectl` access to the cluster
- Grafana deployed (or willingness to deploy it alongside Loki)

## Step 1: Deploy Loki and Promtail Using Helm

Add the Grafana Helm repository and install Loki along with Promtail, which collects logs from all pods and ships them to Loki:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set promtail.enabled=true \
  --set grafana.enabled=true
```

This deploys Loki as the log backend, Promtail as the log collector (running as a DaemonSet), and Grafana for querying. Promtail automatically discovers and collects logs from all containers running in the cluster, including Flux controllers.

## Step 2: Verify Log Collection from Flux Controllers

Flux controllers run in the `flux-system` namespace by default. Check that Promtail is collecting logs from these pods:

```bash
kubectl get pods -n flux-system
```

You should see controllers like `source-controller`, `kustomize-controller`, `helm-controller`, and `notification-controller`. Promtail picks up their logs automatically through Kubernetes service discovery.

To verify in Grafana, open the Explore tab, select the Loki data source, and run a basic query:

```logql
{namespace="flux-system"}
```

This returns all logs from the Flux system namespace. You should see structured JSON log entries from each controller.

## Step 3: Query Reconciliation Events

Flux controllers log reconciliation outcomes with structured fields. To find all successful reconciliations:

```logql
{namespace="flux-system"} |= "ReconciliationSucceeded"
```

To find failures:

```logql
{namespace="flux-system"} |= "ReconciliationFailed"
```

For more precise filtering, parse the JSON logs and filter by specific fields:

```logql
{namespace="flux-system"} | json | level="error"
```

This shows only error-level log entries from Flux controllers, which typically indicate reconciliation failures, source fetch problems, or authentication issues.

## Step 4: Filter Logs by Controller and Resource

To focus on a specific controller, filter by the pod label:

```logql
{namespace="flux-system", app="kustomize-controller"}
```

To find logs related to a specific Kustomization resource, search for its name:

```logql
{namespace="flux-system", app="kustomize-controller"} |= "my-app"
```

For HelmRelease issues:

```logql
{namespace="flux-system", app="helm-controller"} |= "my-helm-release" | json | level="error"
```

These targeted queries help you quickly isolate problems with specific resources rather than sifting through the entire log stream.

## Step 5: Create a Grafana Dashboard for Flux Logs

In Grafana, create a new dashboard with panels that show key Flux log metrics. Add a panel with the following LogQL query to track reconciliation error rates:

```logql
sum(count_over_time({namespace="flux-system"} |= "ReconciliationFailed" [5m])) by (app)
```

Add another panel for source fetch errors:

```logql
count_over_time({namespace="flux-system", app="source-controller"} | json | level="error" [5m])
```

A useful dashboard layout includes:

- A log panel showing recent errors across all controllers
- A time series panel showing error count over time per controller
- A log panel filtered to the source controller for artifact fetch issues
- A log panel for notification delivery failures

## Step 6: Set Up Alerts on Log Patterns

Loki supports alerting through the Loki ruler component or through Grafana alert rules. Create a Grafana alert rule that fires when Flux reconciliation errors exceed a threshold:

In Grafana, navigate to **Alerting > Alert Rules** and create a new rule:

- **Query**: `count_over_time({namespace="flux-system"} |= "ReconciliationFailed" [15m])`
- **Condition**: When the query result is above 5
- **Evaluation interval**: 5 minutes
- **For**: 10 minutes

This alert fires when more than five reconciliation failures occur within a 15-minute window, sustained for 10 minutes. Connect it to a notification channel like Slack or email to ensure your team is informed promptly.

## Step 7: Configure Log Retention

Flux controllers can produce a significant volume of logs, especially in clusters with many resources. Configure Loki retention to manage storage:

```yaml
# loki-values.yaml
loki:
  config:
    table_manager:
      retention_deletes_enabled: true
      retention_period: 168h  # 7 days
```

Apply the updated values:

```bash
helm upgrade loki grafana/loki-stack \
  --namespace monitoring \
  --values loki-values.yaml
```

Seven days of retention is typically sufficient for troubleshooting. For compliance requirements, consider longer retention periods or archiving logs to object storage.

## Structured Logging in Flux Controllers

Flux controllers emit logs in JSON format by default, which Loki can parse natively. Key fields include:

- `level`: The log severity (info, error, debug)
- `ts`: The timestamp
- `msg`: The human-readable message
- `controller`: The controller name
- `name`: The resource name
- `namespace`: The resource namespace
- `revision`: The source revision being reconciled

These fields make it straightforward to build precise LogQL queries that filter by any combination of attributes.

## Summary

Grafana Loki provides a scalable and cost-effective way to aggregate logs from Flux CD controllers. By deploying Loki with Promtail, you get automatic log collection from all Flux components. LogQL queries allow you to filter by controller, resource name, log level, and message content. Combined with Grafana dashboards and alert rules, this setup gives you comprehensive visibility into your GitOps pipeline, enabling fast detection and resolution of reconciliation issues.
