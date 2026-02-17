# How to Use Metric Explorer in Cloud Monitoring to Analyze and Filter Time-Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Metric Explorer, Time Series, Observability

Description: Master the Metric Explorer in Google Cloud Monitoring to query, filter, aggregate, and visualize time-series data for debugging and performance analysis.

---

Metric Explorer is the Swiss army knife of Cloud Monitoring. When you need to investigate a performance issue, understand resource trends, or explore what metrics are available, Metric Explorer is where you go. It lets you query any metric in your project, apply filters and aggregations, and visualize the results in real time. Once you get comfortable with it, it becomes your primary tool for answering questions about your infrastructure and applications.

This guide covers how to use Metric Explorer effectively for common analysis tasks.

## Accessing Metric Explorer

Open the Google Cloud Console, navigate to Monitoring, and click Metric Explorer in the sidebar. You will see a query builder interface with options for selecting metrics, adding filters, and configuring aggregation.

There are two query modes:

- Builder mode: A point-and-click interface for building queries
- PromQL mode: Write PromQL queries directly (if you are comfortable with Prometheus)
- MQL mode: Write Monitoring Query Language queries for advanced use cases

## Selecting a Metric

The first step is choosing which metric to look at. Click the metric selector and browse by resource type or search by name.

Common metrics to explore:

- `compute.googleapis.com/instance/cpu/utilization` - VM CPU usage
- `run.googleapis.com/request_count` - Cloud Run request count
- `kubernetes.io/container/cpu/core_usage_time` - GKE container CPU
- `cloudsql.googleapis.com/database/cpu/utilization` - Cloud SQL CPU
- `loadbalancing.googleapis.com/https/request_count` - Load balancer requests

Once you select a metric, Metric Explorer immediately shows the time-series data for all resources reporting that metric.

## Filtering Data

Raw metrics show everything, which can be overwhelming. Use filters to narrow down to what you care about.

In Builder mode, add filters in the "Filter" section. Each filter has a label key, an operator, and a value.

For example, to see CPU usage for a specific VM:

- Label: `resource.label.instance_id`
- Operator: `=`
- Value: `1234567890`

Or to see request counts for a specific Cloud Run service:

- Label: `resource.label.service_name`
- Operator: `=`
- Value: `my-api`

You can add multiple filters, and they are combined with AND logic.

## Understanding Aggregation

Aggregation is the most important concept in Metric Explorer. Raw time-series data has many data points from many sources. Aggregation controls how those data points are combined.

There are two levels of aggregation:

The aligner processes each time series independently. It takes raw data points within each alignment period and produces a single value. Common aligners:

- ALIGN_MEAN: Average of data points in the period
- ALIGN_MAX: Maximum value in the period
- ALIGN_SUM: Sum of data points in the period
- ALIGN_RATE: Rate of change per second
- ALIGN_DELTA: Change during the period

The reducer combines multiple time series into fewer series. Common reducers:

- REDUCE_MEAN: Average across all series
- REDUCE_SUM: Sum across all series
- REDUCE_MAX: Maximum across all series
- REDUCE_COUNT: Count of series

## Practical Aggregation Examples

To see total request rate across all instances of a service, you want ALIGN_RATE (to get per-second rate from each instance) combined with REDUCE_SUM (to add them all together).

To see the maximum CPU across your cluster, use ALIGN_MEAN (to smooth each instance's CPU over the alignment period) and REDUCE_MAX (to find the hottest instance).

To see the average memory usage per namespace, use ALIGN_MEAN (to get the average for each container) and REDUCE_MEAN with group-by on `namespace_name` (to average within each namespace).

## Group By

The "Group By" option tells the reducer which labels to preserve. Any labels not in the group-by list are aggregated away.

For example, if you have 50 pods across 3 namespaces and you want to see the average CPU per namespace:

1. Select the CPU metric
2. Set aligner to ALIGN_MEAN
3. Set reducer to REDUCE_MEAN
4. Group by `resource.label.namespace_name`

The result is 3 time series, one per namespace, showing the average CPU usage of all pods in that namespace.

Without group-by, the reducer would produce a single time series representing the average across all 50 pods.

## Using PromQL Mode

If you are familiar with PromQL from Prometheus, switch to PromQL mode for a more concise query syntax.

```promql
# Request rate by service
sum by (service_name)(rate(run_googleapis_com:request_count[5m]))

# 95th percentile latency
histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))

# CPU utilization above 80%
kubernetes_io:container_cpu_core_usage_time{namespace_name="production"} > 0.8
```

PromQL mode is faster for complex queries once you know the syntax.

## Analyzing Error Rates

A common investigation: "What is the error rate for my service?"

In Builder mode:

1. Select metric: `run.googleapis.com/request_count`
2. Add filter: `metric.label.response_code_class` = `5xx`
3. Set aligner: ALIGN_RATE
4. Set reducer: REDUCE_SUM

This gives you the rate of 5xx errors. To get the error percentage, you would need to divide by total requests. In PromQL mode, this is more straightforward:

```promql
sum(rate(run_googleapis_com:request_count{response_code_class="5xx"}[5m]))
/
sum(rate(run_googleapis_com:request_count[5m]))
* 100
```

## Comparing Time Periods

Metric Explorer lets you overlay data from a previous time period to spot differences. Use the "Compare to past" feature to show the same metric from one hour, one day, or one week ago alongside the current data.

This is invaluable for debugging. If latency spiked at 2 PM, comparing to yesterday at 2 PM tells you whether this is normal daily traffic or an anomaly.

## Adjusting the Time Range

The time range selector at the top of Metric Explorer controls how much history you see. Options range from 1 hour to 6 weeks. For debugging active incidents, use shorter ranges (1-6 hours). For trend analysis, use longer ranges (1-4 weeks).

You can also select a custom range by clicking the calendar icon and specifying exact start and end times.

## Saving Queries as Dashboard Widgets

When you build a useful query in Metric Explorer, you can save it directly to a dashboard.

1. Build your query in Metric Explorer
2. Click "Save Chart"
3. Choose an existing dashboard or create a new one
4. The chart is added with all your filters and aggregation settings preserved

This is the easiest way to build dashboards - explore in Metric Explorer, save what is useful.

## Exporting Data

Metric Explorer data can be exported for further analysis.

- Click the download icon to export as CSV
- Use the Cloud Monitoring API to programmatically fetch the data
- Set up a BigQuery export for long-term analysis

```bash
# Fetch time-series data using the API
gcloud monitoring time-series list \
  --filter='metric.type = "compute.googleapis.com/instance/cpu/utilization" AND resource.labels.instance_id = "1234567890"' \
  --interval-start-time="2026-02-17T00:00:00Z" \
  --interval-end-time="2026-02-17T12:00:00Z" \
  --format=json
```

## Advanced MQL Queries

Monitoring Query Language (MQL) supports operations that are hard to express in the builder.

```
# Ratio of 5xx to total requests
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align rate(1m)
| every 1m
| {
    filter metric.response_code_class = '5xx'
  ;
    ident
  }
| ratio
```

MQL is powerful but has a learning curve. Use it when the builder and PromQL do not support what you need.

## Tips for Effective Exploration

Based on daily use, here are techniques that save time:

- Start broad and narrow down. Select the metric first, see all the data, then add filters.
- Use group-by to find outliers. Group by instance or pod to see which specific resource is behaving differently.
- Check the alignment period. If your chart looks too smooth, the alignment period might be too long, hiding spikes.
- Watch the "No data" message. If a metric shows no data, double-check your filters and the time range. The metric might not exist for the resource type you selected.
- Bookmark useful queries. Metric Explorer URLs contain the query state, so bookmarking preserves your work.

## Summary

Metric Explorer is your primary tool for investigating metrics in Cloud Monitoring. It lets you query any metric, apply filters and aggregation, and visualize the results instantly. Whether you use the builder for quick exploration, PromQL for complex queries, or MQL for advanced operations, understanding how to work with metrics effectively is a core skill for anyone running infrastructure on GCP. Master filtering, aggregation, and group-by, and you can answer most monitoring questions in seconds.
