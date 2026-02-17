# How to Design Multi-Service Overview Dashboards with MQL on Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, MQL, Dashboards, Observability

Description: Learn how to design multi-service overview dashboards using Monitoring Query Language (MQL) on Google Cloud Monitoring for unified visibility across your infrastructure.

---

When you are running a dozen services on GCP, having individual dashboards for each one is not enough. You need a single pane of glass that shows you the health of your entire system at a glance. Google Cloud Monitoring's Monitoring Query Language (MQL) is the tool for building these kinds of cross-service dashboards.

MQL gives you the expressiveness to aggregate, filter, and transform metrics from multiple services into unified visualizations. In this post, I will walk through designing a multi-service overview dashboard from scratch.

## What MQL Brings to Dashboards

Before MQL, you were limited to the point-and-click metric explorer, which works for simple charts but gets unwieldy for cross-service views. MQL lets you:

- Aggregate metrics across multiple services into a single chart
- Compute ratios and derived metrics (like error rates)
- Apply conditional formatting and thresholds
- Join different metric types together
- Create summary tables with one row per service

## Building the Service Health Summary

The first thing your overview dashboard needs is a quick health indicator for each service. Here is an MQL query that computes the error rate for every Cloud Run service:

```
# Error rate by service over the last 5 minutes
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align rate(5m)
| group_by [resource.service_name, metric.response_code_class],
    [val: aggregate(val())]
| {
    # Total requests per service
    filter metric.response_code_class = '2xx' || metric.response_code_class = '3xx'
    | group_by [resource.service_name], [good: aggregate(val)]
  ;
    # Error requests per service
    filter metric.response_code_class = '5xx'
    | group_by [resource.service_name], [bad: aggregate(val)]
  }
| outer_join 0
| value [error_rate: bad / (good + bad) * 100]
```

This gives you a table or chart showing the error rate for each service, making it easy to spot which services are having problems.

## Latency Overview Across Services

Next, show the P50 and P99 latency for each service side by side:

```
# P99 latency by service
fetch cloud_run_revision
| metric 'run.googleapis.com/request_latencies'
| align delta(5m)
| group_by [resource.service_name],
    [latency_p99: percentile(val(), 99)]
```

For GKE services using custom metrics:

```
# P99 latency for services reporting via OpenTelemetry
fetch k8s_container
| metric 'custom.googleapis.com/http/server/request_duration'
| align delta(5m)
| group_by [metric.service_name],
    [p50: percentile(val(), 50),
     p99: percentile(val(), 99)]
```

## Request Volume Heatmap

A traffic heatmap shows how request volume is distributed across services over time:

```
# Requests per second by service
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align rate(1m)
| group_by [resource.service_name], [rps: aggregate(val())]
```

## Building a Unified Dashboard with the API

You can create dashboards programmatically using the Cloud Monitoring API. Here is a Python script that builds a multi-service overview dashboard:

```python
# create_dashboard.py - Build a multi-service overview dashboard
from google.cloud import monitoring_dashboard_v1
import json

def create_overview_dashboard(project_id):
    """Create a multi-service overview dashboard."""
    client = monitoring_dashboard_v1.DashboardsServiceClient()

    # Define the dashboard layout
    dashboard = monitoring_dashboard_v1.Dashboard(
        display_name="Service Overview",
        mosaic_layout=monitoring_dashboard_v1.MosaicLayout(
            columns=48,
            tiles=[
                # Row 1: Service Error Rates
                monitoring_dashboard_v1.MosaicLayout.Tile(
                    x_pos=0,
                    y_pos=0,
                    width=24,
                    height=16,
                    widget=monitoring_dashboard_v1.Widget(
                        title="Error Rate by Service",
                        time_series_table=monitoring_dashboard_v1.TimeSeriesTable(
                            data_sets=[
                                monitoring_dashboard_v1.TimeSeriesTable.TableDataSet(
                                    time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                                        time_series_query_language="""
                                            fetch cloud_run_revision
                                            | metric 'run.googleapis.com/request_count'
                                            | align rate(5m)
                                            | group_by [resource.service_name, metric.response_code_class],
                                                [val: aggregate(val())]
                                            | filter metric.response_code_class = '5xx'
                                            | group_by [resource.service_name], [errors: aggregate(val)]
                                        """,
                                    ),
                                ),
                            ],
                        ),
                    ),
                ),
                # Row 1: Latency Overview
                monitoring_dashboard_v1.MosaicLayout.Tile(
                    x_pos=24,
                    y_pos=0,
                    width=24,
                    height=16,
                    widget=monitoring_dashboard_v1.Widget(
                        title="P99 Latency by Service",
                        xy_chart=monitoring_dashboard_v1.XyChart(
                            data_sets=[
                                monitoring_dashboard_v1.XyChart.DataSet(
                                    time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                                        time_series_query_language="""
                                            fetch cloud_run_revision
                                            | metric 'run.googleapis.com/request_latencies'
                                            | align delta(5m)
                                            | group_by [resource.service_name],
                                                [p99: percentile(val(), 99)]
                                        """,
                                    ),
                                    plot_type=monitoring_dashboard_v1.XyChart.DataSet.PlotType.LINE,
                                ),
                            ],
                        ),
                    ),
                ),
                # Row 2: Traffic Volume
                monitoring_dashboard_v1.MosaicLayout.Tile(
                    x_pos=0,
                    y_pos=16,
                    width=48,
                    height=16,
                    widget=monitoring_dashboard_v1.Widget(
                        title="Requests Per Second by Service",
                        xy_chart=monitoring_dashboard_v1.XyChart(
                            data_sets=[
                                monitoring_dashboard_v1.XyChart.DataSet(
                                    time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                                        time_series_query_language="""
                                            fetch cloud_run_revision
                                            | metric 'run.googleapis.com/request_count'
                                            | align rate(1m)
                                            | group_by [resource.service_name],
                                                [rps: aggregate(val())]
                                        """,
                                    ),
                                    plot_type=monitoring_dashboard_v1.XyChart.DataSet.PlotType.STACKED_AREA,
                                ),
                            ],
                        ),
                    ),
                ),
            ],
        ),
    )

    # Create the dashboard
    parent = f"projects/{project_id}"
    result = client.create_dashboard(parent=parent, dashboard=dashboard)
    print(f"Dashboard created: {result.name}")
    return result

create_overview_dashboard('my-project')
```

## Infrastructure Health Section

Add infrastructure metrics alongside application metrics:

```
# CPU utilization across all GKE nodes
fetch k8s_node
| metric 'kubernetes.io/node/cpu/allocatable_utilization'
| align mean(5m)
| group_by [resource.node_name], [cpu_util: mean(val())]
| condition val() > 0.8
```

```
# Memory utilization by service
fetch k8s_container
| metric 'kubernetes.io/container/memory/used_bytes'
| align mean(5m)
| group_by [resource.pod_name], [mem_used: mean(val())]
```

```
# Cloud SQL instance health
fetch cloudsql_database
| metric 'cloudsql.googleapis.com/database/cpu/utilization'
| align mean(5m)
| group_by [resource.database_id], [cpu: mean(val())]
```

## SLI/SLO Tracking Section

Add a section that tracks your service level indicators:

```
# Availability SLI - percentage of successful requests over 30 days
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align delta(30d)
| group_by [resource.service_name, metric.response_code_class],
    [count: aggregate(val())]
| {
    filter metric.response_code_class != '5xx'
    | group_by [resource.service_name], [good: aggregate(count)]
  ;
    group_by [resource.service_name], [total: aggregate(count)]
  }
| join
| value [availability: good / total * 100]
```

```
# Latency SLI - percentage of requests under 500ms
fetch cloud_run_revision
| metric 'run.googleapis.com/request_latencies'
| align delta(30d)
| group_by [resource.service_name],
    [p99: percentile(val(), 99)]
| value [meets_slo: if(p99 < 500, 1, 0)]
```

## Dashboard Design Best Practices

After building several overview dashboards, here are the patterns that work best:

1. **Top row: RED metrics.** Rate, Errors, Duration. These three metrics tell you 80% of what you need to know about any service.

2. **Color coding.** Use thresholds to turn charts green/yellow/red based on values. An error rate above 1% should be visually obvious.

3. **Time range consistency.** All charts on an overview dashboard should use the same time range. Five minutes for real-time monitoring, one hour for on-call review.

4. **Drill-down links.** Each chart should link to a more detailed dashboard for that specific service. The overview tells you something is wrong; the detail dashboard tells you why.

5. **Include resource metrics.** Application metrics alone miss infrastructure problems. Include CPU, memory, and disk alongside request metrics.

6. **Group by environment.** If you have staging and production, separate them or add a filter. Mixing environments in the same view creates confusion.

With a well-designed overview dashboard in Cloud Monitoring and complementary alerting through OneUptime, you can keep tabs on your entire GCP infrastructure from a single screen. The MQL queries might take some practice, but once you have the patterns down, building new dashboard sections becomes fast.
