# How to Monitor Multi-Cluster Health from Rancher Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Monitoring, Multi-Cluster, Dashboard, Kubernetes, Health, Observability

Description: Learn how to use the Rancher dashboard and integrated monitoring tools to track the health of multiple Kubernetes clusters from a single pane of glass.

---

Rancher's dashboard provides a centralized view of all managed clusters. Combined with Prometheus, Grafana, and alerting, you can monitor the health of every cluster without switching contexts.

---

## The Rancher Home Dashboard

The Rancher home page shows a summary of all clusters with color-coded status indicators:

- **Active (green)**: cluster is healthy and agent is connected
- **Updating (blue)**: cluster is being provisioned or upgraded
- **Error (red)**: cluster has failed nodes or agent connectivity issues

Click any cluster to drill into its details, including node conditions, resource usage, and events.

---

## Step 1: Enable Monitoring on All Clusters

Use Fleet to install the Rancher Monitoring app on every cluster simultaneously:

```yaml
# gitrepo-monitoring.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: cluster-monitoring
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/rancher-configs.git
  branch: main
  paths:
    - monitoring/
  targets:
    - clusterSelector:
        matchLabels:
          monitoring: enabled
```

The `monitoring/` directory contains a Helm bundle referencing `rancher-monitoring`.

---

## Step 2: Key Metrics to Monitor Per Cluster

These PromQL queries form the basis of a multi-cluster health dashboard:

```promql
# Node availability ratio (should be 1.0 = 100%)
(
  count(kube_node_status_condition{condition="Ready",status="true"})
  /
  count(kube_node_info)
) by (cluster)

# Cluster-wide CPU utilization
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (cluster)
/
sum(kube_node_status_capacity{resource="cpu"}) by (cluster)

# Pod restart rate (indicator of application instability)
sum(increase(kube_pod_container_status_restarts_total[1h])) by (cluster, namespace)
```

---

## Step 3: Set Up a Central Grafana Multi-Cluster Dashboard

Import a pre-built multi-cluster overview dashboard from Grafana.com (e.g. dashboard ID 15757) by using the Grafana UI (Dashboards → New → Import) or the HTTP API:

```bash
# Download the dashboard JSON from grafana.com and POST it to your Grafana instance
DASHBOARD_JSON=$(curl -s https://grafana.com/api/dashboards/15757/revisions/1/download)

curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": $DASHBOARD_JSON, \"overwrite\": true}" \
  https://grafana.example.com/api/dashboards/db
```

Add a `cluster` variable to all panels:

```json
{
  "templating": {
    "list": [
      {
        "name": "cluster",
        "type": "query",
        "datasource": "Thanos",
        "query": "label_values(kube_node_info, cluster)"
      }
    ]
  }
}
```

---

## Step 4: Configure Cross-Cluster Alerting Rules

Create alerting rules that fire if any cluster has high error rates or node failures:

```yaml
# cluster-health-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-health
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: cluster.health
      rules:
        - alert: NodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.node }} in cluster {{ $labels.cluster }} is not ready"

        - alert: ClusterHighPodRestartRate
          expr: |
            sum(increase(kube_pod_container_status_restarts_total[30m])) by (cluster) > 20
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High pod restart rate in cluster {{ $labels.cluster }}"
```

---

## Step 5: Rancher Fleet Health Status

Monitor Fleet bundle sync status to know if configuration drift has occurred:

```bash
# Clusters with unhealthy bundle deployments.
# BundleDeployments live in per-cluster registration namespaces
# (cluster-${namespace}-${cluster}-${random}), so query across all namespaces.
kubectl get bundledeployment -A \
  -o jsonpath='{range .items[?(@.status.ready==false)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

---

## Best Practices

- Configure **dead-man's-switch alerts** that fire if a cluster stops sending metrics - this catches complete cluster failures.
- Use Rancher's **Global Alerting** to route critical alerts to PagerDuty with the cluster name in the payload.
- Review the **Rancher audit log** alongside cluster health metrics to correlate operations with health changes.
