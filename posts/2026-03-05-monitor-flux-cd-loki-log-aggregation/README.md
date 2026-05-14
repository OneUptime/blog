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

## Step 1: Deploy Loki and Alloy Using Helm

Add the Grafana Helm repository and install Loki. Then deploy the Kubernetes Monitoring Helm chart, which uses Grafana Alloy to collect pod logs and ship them to Loki:

```yaml
# loki-values.yaml

loki:
  commonConfig:
    replication_factor: 1
  schemaConfig:
    configs:
      - from: "2024-04-01"
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h
  pattern_ingester:
    enabled: true
  limits_config:
    allow_structured_metadata: true
    volume_enabled: true
  ruler:
    enable_api: true

minio:
  enabled: true

deploymentMode: Monolithic
singleBinary:
  replicas: 1

backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0
ingester:
  replicas: 0
querier:
  replicas: 0
queryFrontend:
  replicas: 0
queryScheduler:
  replicas: 0
distributor:
  replicas: 0
compactor:
  replicas: 0
indexGateway:
  replicas: 0
bloomPlanner:
  replicas: 0
bloomBuilder:
  replicas: 0
bloomGateway:
  replicas: 0
```

```yaml
# k8s-monitoring-values.yaml

cluster:
  name: flux-cluster

destinations:
  - name: loki
    type: loki
    url: http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push

clusterEvents:
  enabled: true
  collector: alloy-logs

nodeLogs:
  enabled: false

podLogs:
  enabled: true
  gatherMethod: kubernetesApi
  collector: alloy-logs
  labelsToKeep:
    - app
    - app_kubernetes_io_component
    - container
    - job
    - namespace
    - service_name
  namespaces:
    - flux-system

alloy-singleton:
  enabled: false
alloy-metrics:
  enabled: false
alloy-logs:
  enabled: true
  alloy:
    mounts:
      varlog: false
    clustering:
      enabled: true
alloy-profiles:
  enabled: false
alloy-receiver:
  enabled: false
```

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki \
  --namespace monitoring \
  --create-namespace \
  --values loki-values.yaml

helm install k8s-monitoring grafana/k8s-monitoring \
  --namespace monitoring \
  --values k8s-monitoring-values.yaml
```

This deploys Loki as the log backend and Alloy as the log collector. The Kubernetes Monitoring chart collects pod logs from the `flux-system` namespace and forwards them to Loki. Use an existing Grafana instance, or install Grafana separately and configure a Loki data source that points to `http://loki-gateway.monitoring.svc.cluster.local:80`.

## Step 2: Verify Log Collection from Flux Controllers

Flux controllers run in the `flux-system` namespace by default. Check that the Flux pods are running:

```bash
kubectl get pods -n flux-system
```

You should see controllers like `source-controller`, `kustomize-controller`, `helm-controller`, and `notification-controller`. Alloy picks up their logs through the Kubernetes Monitoring chart's pod log collection.

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

To focus on a specific controller, filter by the controller label:

```logql
{namespace="flux-system", app_kubernetes_io_component="kustomize-controller"}
```

To find logs related to a specific Kustomization resource, search for its name:

```logql
{namespace="flux-system", app_kubernetes_io_component="kustomize-controller"} |= "my-app"
```

For HelmRelease issues:

```logql
{namespace="flux-system", app_kubernetes_io_component="helm-controller"} |= "my-helm-release" | json | level="error"
```

These targeted queries help you quickly isolate problems with specific resources rather than sifting through the entire log stream.

## Step 5: Create a Grafana Dashboard for Flux Logs

In Grafana, create a new dashboard with panels that show key Flux log metrics. Add a panel with the following LogQL query to track reconciliation error rates:

```logql
sum by (app_kubernetes_io_component) (count_over_time({namespace="flux-system"} |= "ReconciliationFailed" [5m]))
```

Add another panel for source fetch errors:

```logql
count_over_time({namespace="flux-system", app_kubernetes_io_component="source-controller"} | json | level="error" [5m])
```

A useful dashboard layout includes:

- A log panel showing recent errors across all controllers
- A time series panel showing error count over time per controller
- A log panel filtered to the source controller for artifact fetch issues
- A log panel for notification delivery failures

## Step 6: Set Up Alerts on Log Patterns

Loki supports alerting through the Loki ruler component or through Grafana alert rules. Create a Grafana alert rule that fires when Flux reconciliation errors exceed a threshold:

In Grafana, navigate to **Alerting > Alert Rules** and create a new rule:

- **Query**: `sum(count_over_time({namespace="flux-system"} |= "ReconciliationFailed" [15m]))`
- **Condition**: When the query result is above 5
- **Evaluation interval**: 5 minutes
- **For**: 10 minutes

This alert fires when more than five reconciliation failures occur within a 15-minute window, sustained for 10 minutes. Connect it to a notification channel like Slack or email to ensure your team is informed promptly.

## Step 7: Configure Log Retention

Flux controllers can produce a significant volume of logs, especially in clusters with many resources. Configure Loki retention to manage storage:

```yaml
# loki-values.yaml

loki:
  limits_config:
    retention_period: 168h  # 7 days
    max_query_lookback: 168h
  compactor:
    working_directory: /var/loki/retention
    retention_enabled: true
    delete_request_store: s3
```

Apply the updated values:

```bash
helm upgrade loki grafana/loki \
  --namespace monitoring \
  --values loki-values.yaml
```

Seven days of retention is typically sufficient for troubleshooting. For compliance requirements, consider longer retention periods or archiving logs to object storage.

## Structured Logging in Flux Controllers

Flux controllers emit logs in JSON format by default, which Loki can parse natively. Key fields include:

- `level`: The log severity (info, error, debug)
- `ts`: The timestamp
- `msg`: The human-readable message
- `controllerGroup`: The controller API group
- `name`: The resource name
- `namespace`: The resource namespace
- `revision`: The source revision being reconciled

These fields make it straightforward to build precise LogQL queries that filter by any combination of attributes.

## Summary

Grafana Loki provides a scalable and cost-effective way to aggregate logs from Flux CD controllers. By deploying Loki with Alloy, you get automatic log collection from Flux components. LogQL queries allow you to filter by controller, resource name, log level, and message content. Combined with Grafana dashboards and alert rules, this setup gives you comprehensive visibility into your GitOps pipeline, enabling fast detection and resolution of reconciliation issues.
