# How to Monitor GKE Cluster Metrics with Cloud Monitoring Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Cloud Monitoring, Kubernetes, Dashboards

Description: A practical guide to building Cloud Monitoring dashboards for GKE clusters, covering key metrics for nodes, pods, containers, and workloads.

---

Running workloads on Google Kubernetes Engine is relatively straightforward until something goes wrong and you realize you have no visibility into what is happening inside your cluster. Cloud Monitoring provides built-in integration with GKE, but the default experience only gets you so far. In this post, I will show you how to build custom dashboards that give you real insight into your GKE cluster health and performance.

## What GKE Metrics Are Available?

GKE automatically sends metrics to Cloud Monitoring. These fall into several categories:

- **Node metrics**: CPU usage, memory usage, disk I/O, network throughput per node
- **Pod metrics**: CPU and memory requests versus actual usage, restart counts, pod phase
- **Container metrics**: Per-container resource consumption, OOMKill events
- **Cluster-level metrics**: Total allocatable resources, scheduler metrics, API server latency

By default, GKE sends system metrics. If you enable Managed Prometheus or the Kubernetes Monitoring pipeline, you get even more detailed metrics including custom application metrics.

## Setting Up Your First GKE Dashboard

Navigate to **Monitoring** > **Dashboards** > **Create Dashboard** in the Cloud Console. Give it a descriptive name like "GKE Production Cluster Overview."

The dashboard editor lets you add widgets by dragging them in. For GKE monitoring, I recommend starting with these core widgets.

### Node CPU and Memory Utilization

These two charts give you the foundation of cluster health. If nodes are maxed out, your pods cannot schedule.

Here is how to configure a node CPU utilization chart using MQL:

```
# Node CPU utilization as a fraction across all nodes
fetch k8s_node
| metric 'kubernetes.io/node/cpu/allocatable_utilization'
| group_by [node_name], [val: mean(value.allocatable_utilization)]
| every 1m
```

For memory, use a similar query:

```
# Node memory utilization across all nodes
fetch k8s_node
| metric 'kubernetes.io/node/memory/allocatable_utilization'
| group_by [node_name], [val: mean(value.allocatable_utilization)]
| every 1m
```

### Pod Status Overview

Knowing how many pods are in each phase (Running, Pending, Failed, Succeeded) is critical. A growing count of Pending pods usually means your cluster needs more capacity.

This metric visualization uses the pod phase metric:

```
# Count of pods by phase
fetch k8s_pod
| metric 'kubernetes.io/pod/phase'
| group_by [phase], [val: count(value.phase)]
| every 1m
```

### Container Restart Counts

Frequent container restarts signal crashlooping applications. This is one of the most important operational metrics to track:

```
# Container restart count by pod and container name
fetch k8s_container
| metric 'kubernetes.io/container/restart_count'
| group_by [pod_name, container_name], [val: max(value.restart_count)]
| every 1m
```

## Building a Comprehensive Dashboard with the API

For teams that manage dashboards as code, the Cloud Monitoring API lets you define dashboards in JSON. Here is a template that includes the essential GKE widgets.

The following JSON creates a dashboard with CPU, memory, and pod restart widgets:

```json
{
  "displayName": "GKE Cluster Overview",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Node CPU Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"kubernetes.io/node/cpu/allocatable_utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN",
                    "groupByFields": ["resource.labels.node_name"],
                    "crossSeriesReducer": "REDUCE_NONE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Node Memory Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"kubernetes.io/node/memory/allocatable_utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN",
                    "groupByFields": ["resource.labels.node_name"],
                    "crossSeriesReducer": "REDUCE_NONE"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

Apply it with:

```bash
# Create the dashboard from a JSON definition file
gcloud monitoring dashboards create --config-from-file=gke-dashboard.json
```

## Key Metrics Worth Tracking

Based on running GKE in production, here are the metrics I always include on my dashboards:

### Resource Requests vs Actual Usage

One of the biggest waste areas in Kubernetes is over-provisioning. Comparing what pods request versus what they actually use helps you right-size your workloads.

```
# CPU requested vs actually used per namespace
fetch k8s_container
| metric 'kubernetes.io/container/cpu/request_utilization'
| group_by [namespace_name], [val: mean(value.request_utilization)]
| every 5m
```

If request utilization is consistently below 30 percent, your pods are requesting way more CPU than they need.

### Network Throughput

Network issues in GKE can be tricky to diagnose. Having throughput charts per node makes it easier to spot anomalies:

```
# Network bytes received per node
fetch k8s_node
| metric 'kubernetes.io/node/network/received_bytes_count'
| group_by [node_name], [val: rate(value.received_bytes_count)]
| every 1m
```

### Persistent Volume Usage

If your workloads use persistent volumes, tracking usage prevents outages caused by full disks:

```
# PVC usage as a fraction of capacity
fetch k8s_pod
| metric 'kubernetes.io/pod/volume/utilization'
| group_by [pod_name, volume_name], [val: mean(value.utilization)]
| every 5m
```

## Using Terraform to Manage Dashboards

For infrastructure-as-code approaches, Terraform can manage your monitoring dashboards:

```hcl
# Terraform resource for a GKE monitoring dashboard
resource "google_monitoring_dashboard" "gke_overview" {
  dashboard_json = jsonencode({
    displayName = "GKE Cluster Overview"
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "Node CPU Utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"kubernetes.io/node/cpu/allocatable_utilization\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    groupByFields      = ["resource.labels.node_name"]
                    crossSeriesReducer = "REDUCE_NONE"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

## Adding Alerting Thresholds to Your Dashboard

Dashboards become more useful when they visually show your alerting thresholds. You can add threshold lines to XY charts so that anyone glancing at the dashboard can immediately see which metrics are approaching alert levels.

In the dashboard editor, click on any chart and select "Add threshold." Set it to match your alerting policy thresholds. For example, if you alert at 80 percent CPU utilization, add a horizontal line at 0.80 on your CPU chart.

## Dashboard Organization Tips

After building dashboards for several GKE clusters, here is what works well:

1. **Separate dashboards per environment**: Do not mix production and staging metrics on the same dashboard. It causes confusion during incidents.

2. **Top-down layout**: Start with cluster-wide aggregates at the top, then break down into per-node, per-namespace, and per-pod metrics as you scroll down.

3. **Include a "Key Indicators" section**: Put your three or four most critical metrics (the ones that tell you at a glance if things are healthy) in a single row at the very top.

4. **Use scorecard widgets for current values**: Not everything needs a time series chart. For things like "current number of nodes" or "total running pods," a scorecard widget is cleaner.

5. **Link to related dashboards**: Cloud Monitoring supports dashboard links. Connect your GKE cluster dashboard to your application-specific dashboards for easy navigation during troubleshooting.

## Wrapping Up

A well-built GKE monitoring dashboard saves hours during incident response. The combination of node-level resource metrics, pod lifecycle information, and container restart data gives you a solid operational picture. Start with the basics - CPU, memory, pod status, and restarts - and expand from there based on what questions you find yourself asking during outages.

The key is to build your dashboards before you need them, not during the incident when you are scrambling for data.
