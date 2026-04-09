# How to Configure Grafana Variables for Multi-Cluster Ceph Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Monitoring, Multi-Cluster

Description: Set up Grafana dashboard variables to monitor multiple Rook-Ceph clusters from a single dashboard by using Prometheus labels and templating.

---

## Why Multi-Cluster Monitoring Requires Variables

When managing multiple Rook-Ceph clusters, you need a unified monitoring view without duplicating dashboards. Grafana's template variables allow a single dashboard to switch between clusters dynamically. The key is to configure Prometheus to scrape all clusters with distinguishing labels, then use those labels as Grafana variables.

## Step 1 - Configure Prometheus to Scrape Multiple Clusters

Add external labels to each cluster's Prometheus configuration so metrics are tagged with cluster identity.

For a cluster named `prod-cluster`, add to the Prometheus configuration:

```yaml
global:
  external_labels:
    cluster: prod-cluster
    region: us-east-1
```

For `staging-cluster`:

```yaml
global:
  external_labels:
    cluster: staging-cluster
    region: us-west-2
```

When using Prometheus Operator with Rook, update the Prometheus custom resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  externalLabels:
    cluster: prod-cluster
```

## Step 2 - Configure Grafana Data Sources

For each cluster's Prometheus, add a separate data source in Grafana. Name them clearly:

```text
Data Source 1: prod-cluster-prometheus  -> http://prometheus-prod:9090
Data Source 2: staging-cluster-prometheus -> http://prometheus-staging:9090
```

Or use a single federated Prometheus that aggregates all clusters.

## Step 3 - Create the Cluster Variable in Grafana

In a Grafana dashboard, go to **Settings > Variables > Add variable**.

### Variable: datasource (Data Source)

```text
Name: datasource
Type: Data source
Data source type: Prometheus
Regex: .*-prometheus
```

This creates a dropdown that lets you switch between cluster data sources.

### Variable: cluster (Label-Based)

If using a federated Prometheus:

```text
Name: cluster
Type: Query
Data source: federated-prometheus
Query: label_values(ceph_health_status, cluster)
```

This queries Prometheus for all distinct values of the `cluster` label in Ceph metrics.

## Step 4 - Use Variables in Panel Queries

In dashboard panels, reference variables with `$variable_name`:

### Cluster Health Panel

```text
ceph_health_status{cluster="$cluster"}
```

### OSD Count Panel

```text
count(ceph_osd_up{cluster="$cluster"} == 1)
```

### Total Cluster Capacity

```text
sum(ceph_osd_stat_bytes{cluster="$cluster"})
```

### Pool Usage

```text
ceph_pool_bytes_used{cluster="$cluster", pool_id=~"$pool"}
```

## Step 5 - Add Dependent Variables

Create a `pool` variable that depends on the selected cluster:

```text
Name: pool
Type: Query
Data source: $datasource
Query: label_values(ceph_pool_bytes_used{cluster="$cluster"}, pool_id)
Refresh: On Dashboard Load
```

This dynamically populates pool options based on the selected cluster.

## Step 6 - Add OSD Variable

```text
Name: osd
Type: Query
Data source: $datasource
Query: label_values(ceph_osd_up{cluster="$cluster"}, ceph_daemon)
Multi-value: true
Include All option: true
```

## Step 7 - Example Dashboard JSON

Configure the dashboard to show the variables at the top:

```json
{
  "templating": {
    "list": [
      {
        "name": "cluster",
        "type": "query",
        "query": "label_values(ceph_health_status, cluster)",
        "datasource": "federated-prometheus",
        "refresh": 2
      },
      {
        "name": "pool",
        "type": "query",
        "query": "label_values(ceph_pool_bytes_used{cluster=\"$cluster\"}, pool_id)",
        "datasource": "federated-prometheus",
        "refresh": 2
      }
    ]
  }
}
```

## Step 8 - Import Official Ceph Dashboards

The official Ceph Grafana dashboards are available from the Ceph GitHub repository. Import them and update their queries to include the `$cluster` variable filter.

Find pre-built dashboards at:

```text
https://github.com/ceph/ceph/tree/main/monitoring/ceph-mixin/dashboards
```

Import via Grafana UI: **Dashboards > Import > Upload JSON file**.

## Summary

Multi-cluster Ceph monitoring in Grafana relies on Prometheus external labels to tag metrics with cluster identity, Grafana data source variables to switch between Prometheus instances, and query variables to dynamically populate cluster, pool, and OSD dropdowns. Use `label_values()` queries to populate variable options and reference them with `$variable` syntax in panel queries for fully dynamic, multi-cluster dashboards.
