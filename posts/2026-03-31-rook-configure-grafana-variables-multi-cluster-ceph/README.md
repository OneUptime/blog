# Configure Grafana Variables for Multi-Cluster Ceph Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Monitoring, Multi-Cluster, Variable, Dashboard

Description: Learn how to configure Grafana template variables to build reusable dashboards that monitor multiple Ceph clusters from a single Grafana instance.

---

## Why Grafana Variables Matter for Multi-Cluster Ceph

When running multiple Ceph clusters, you need dashboards that adapt dynamically rather than requiring a separate dashboard per cluster. Grafana template variables let you create a single dashboard that switches context between clusters, namespaces, or pools with a dropdown selector.

## Prerequisites

- Grafana with multiple Prometheus data sources, one per cluster
- Each Prometheus scraping its respective Ceph cluster via the Rook operator
- Prometheus federation or Thanos for centralized querying (optional but recommended)

## Configuring Data Source Variables

The first step is adding a data source variable so users can select which cluster's Prometheus to query.

In your Grafana dashboard, open **Dashboard Settings > Variables** and add a new variable:

```yaml
# Variable: datasource
Type: Datasource
Plugin type: Prometheus
Name: datasource
Label: Cluster
Regex: /^ceph-.*/
```

This regex filters only data sources prefixed with `ceph-`, keeping the selector clean.

## Adding a Namespace Variable

Next, add a variable for the Rook namespace:

```yaml
# Variable: namespace
Type: Query
Data source: ${datasource}
Query: label_values(ceph_health_status, namespace)
Name: namespace
Label: Namespace
Refresh: On dashboard load
```

This queries the selected cluster's Prometheus for all namespaces that expose the `ceph_health_status` metric.

## Adding a Pool Variable

For pool-level filtering, add another query variable:

```yaml
# Variable: pool
Type: Query
Data source: ${datasource}
Query: label_values(ceph_pool_bytes_used{namespace="$namespace"}, name)
Name: pool
Label: Pool
Multi-value: true
Include All: true
```

## Using Variables in Panel Queries

With variables configured, update your panel PromQL queries to reference them:

```promql
# Total bytes used by selected pool(s)
ceph_pool_bytes_used{namespace="$namespace", name=~"$pool"}

# OSD count per cluster
count(ceph_osd_up{namespace="$namespace"} == 1)

# Cluster health
ceph_health_status{namespace="$namespace"}
```

## Example: Multi-Cluster Overview Row

Add a row with a Stat panel using:

```promql
# Health status across all clusters (use "All" data sources with repeat)
ceph_health_status{namespace="$namespace"}
```

Set the panel to repeat by the `datasource` variable so Grafana renders one panel per cluster automatically.

## Provisioning Variables via JSON

You can provision dashboards with variables pre-configured:

```json
{
  "templating": {
    "list": [
      {
        "name": "datasource",
        "type": "datasource",
        "query": "prometheus",
        "regex": "/^ceph-.*/"
      },
      {
        "name": "namespace",
        "type": "query",
        "datasource": "${datasource}",
        "query": "label_values(ceph_health_status, namespace)",
        "refresh": 1
      }
    ]
  }
}
```

Store this JSON in a ConfigMap and mount it into the Grafana pod for GitOps-friendly provisioning.

## Summary

Grafana template variables transform static Ceph dashboards into dynamic, multi-cluster tools. By defining data source, namespace, and pool variables, a single dashboard can monitor all your Ceph clusters. Provisioning these variables via JSON and ConfigMaps keeps the setup reproducible and version-controlled.
