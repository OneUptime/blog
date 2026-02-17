# How to Implement Custom Monitoring Metrics Using the Google Cloud Monitoring API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Custom Metrics, Google Cloud Monitoring, Monitoring API, Observability, Time Series

Description: A practical guide to creating and writing custom monitoring metrics using the Google Cloud Monitoring API with examples in Python, Go, and gcloud CLI.

---

Google Cloud Monitoring comes with thousands of built-in metrics for GCP services - CPU utilization, request counts, latency percentiles, and so on. But every application has metrics that are unique to its business logic. How many orders were processed? What is the cache hit rate? How many users are currently in the checkout flow? These are custom metrics, and the Cloud Monitoring API lets you create and write them so they appear alongside your infrastructure metrics in dashboards and alerts.

This post covers everything you need to know about implementing custom metrics: creating metric descriptors, writing time series data, and querying your custom metrics.

## How Custom Metrics Work

Custom metrics in Cloud Monitoring follow the same structure as built-in metrics. Each custom metric has a metric descriptor that defines its name, type, value type, labels, and description. Once the descriptor exists, you write time series data points to that metric. Cloud Monitoring stores the data and makes it available for dashboarding, alerting, and querying.

Custom metric names follow the format `custom.googleapis.com/your/metric/name`. You can also use the `workload.googleapis.com/` prefix if the metrics are collected by the Ops Agent.

## Creating a Metric Descriptor

Before writing data, you need a metric descriptor. You can create one explicitly or let Cloud Monitoring auto-create it when you write the first data point. Explicit creation gives you more control over labels and descriptions.

Here is how to create a metric descriptor using Python:

```python
from google.cloud import monitoring_v3
from google.api import metric_pb2, label_pb2

def create_metric_descriptor(project_id):
    """Create a custom metric descriptor for tracking order processing."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Define the metric descriptor
    descriptor = metric_pb2.MetricDescriptor()
    descriptor.type = "custom.googleapis.com/orders/processed_count"
    descriptor.metric_kind = metric_pb2.MetricDescriptor.MetricKind.CUMULATIVE
    descriptor.value_type = metric_pb2.MetricDescriptor.ValueType.INT64
    descriptor.description = "Total number of orders processed"
    descriptor.display_name = "Orders Processed"
    descriptor.unit = "1"  # Dimensionless count

    # Add labels for filtering and grouping
    label_region = label_pb2.LabelDescriptor()
    label_region.key = "region"
    label_region.value_type = label_pb2.LabelDescriptor.ValueType.STRING
    label_region.description = "The region where the order was processed"

    label_status = label_pb2.LabelDescriptor()
    label_status.key = "status"
    label_status.value_type = label_pb2.LabelDescriptor.ValueType.STRING
    label_status.description = "Order status: success, failure, pending"

    descriptor.labels.append(label_region)
    descriptor.labels.append(label_status)

    # Create the descriptor
    result = client.create_metric_descriptor(
        name=project_name,
        metric_descriptor=descriptor,
    )

    print(f"Created metric descriptor: {result.name}")
    return result

create_metric_descriptor("my-project")
```

You can also create metric descriptors using the gcloud CLI:

```bash
# Create a metric descriptor via the REST API using gcloud
gcloud monitoring metrics-descriptors create \
  custom.googleapis.com/orders/processed_count \
  --description="Total number of orders processed" \
  --display-name="Orders Processed" \
  --type=custom.googleapis.com/orders/processed_count \
  --metric-kind=cumulative \
  --value-type=int64 \
  --project=my-project
```

## Writing Time Series Data

Once the descriptor exists, write data points to the metric. Each data point has a metric type, labels, a resource type, a timestamp, and a value.

```python
from google.cloud import monitoring_v3
import time

def write_metric_data(project_id, region, status, count):
    """Write a data point to the custom orders metric."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Build the time series
    series = monitoring_v3.TimeSeries()

    # Set the metric type and labels
    series.metric.type = "custom.googleapis.com/orders/processed_count"
    series.metric.labels["region"] = region
    series.metric.labels["status"] = status

    # Set the monitored resource
    # Use "global" for application-level metrics
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # Create the data point
    now = time.time()
    point = monitoring_v3.Point()
    point.value.int64_value = count

    # For cumulative metrics, set both start and end time
    point.interval.end_time.seconds = int(now)
    point.interval.start_time.seconds = int(now - 60)

    series.points = [point]

    # Write the time series
    client.create_time_series(
        name=project_name,
        time_series=[series],
    )

    print(f"Wrote metric: orders={count}, region={region}, status={status}")

# Example usage
write_metric_data("my-project", "us-central1", "success", 150)
write_metric_data("my-project", "us-central1", "failure", 3)
write_metric_data("my-project", "europe-west1", "success", 85)
```

## Writing Gauge Metrics

Gauge metrics represent a value at a point in time, like the current number of active connections or the current queue depth:

```python
def write_gauge_metric(project_id, metric_name, value, labels=None):
    """Write a gauge metric value to Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = f"custom.googleapis.com/{metric_name}"

    # Apply any labels
    if labels:
        for key, val in labels.items():
            series.metric.labels[key] = val

    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # For gauge metrics, only set end_time
    point = monitoring_v3.Point()
    point.value.double_value = value
    point.interval.end_time.seconds = int(time.time())

    series.points = [point]

    client.create_time_series(
        name=project_name,
        time_series=[series],
    )

# Write current queue depth
write_gauge_metric("my-project", "queue/depth", 42, {"queue_name": "orders"})

# Write cache hit rate
write_gauge_metric("my-project", "cache/hit_rate", 0.95, {"cache_name": "product-cache"})

# Write active user count
write_gauge_metric("my-project", "users/active_count", 1250)
```

## Writing Distribution Metrics

Distribution metrics capture the statistical distribution of values, like latency or request sizes:

```python
from google.cloud import monitoring_v3
from google.api import distribution_pb2

def write_distribution_metric(project_id, values):
    """Write a distribution metric for request latency."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/api/latency_ms"
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # Calculate distribution statistics
    import statistics
    count = len(values)
    mean = statistics.mean(values)
    sum_of_squared_deviation = sum((v - mean) ** 2 for v in values)

    # Define bucket boundaries (in milliseconds)
    bucket_boundaries = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

    # Count values in each bucket
    bucket_counts = [0] * (len(bucket_boundaries) + 1)
    for v in values:
        placed = False
        for i, boundary in enumerate(bucket_boundaries):
            if v < boundary:
                bucket_counts[i] += 1
                placed = True
                break
        if not placed:
            bucket_counts[-1] += 1

    # Build the distribution value
    point = monitoring_v3.Point()
    point.value.distribution_value.count = count
    point.value.distribution_value.mean = mean
    point.value.distribution_value.sum_of_squared_deviation = sum_of_squared_deviation
    point.value.distribution_value.bucket_options.explicit_buckets.bounds.extend(
        bucket_boundaries
    )
    point.value.distribution_value.bucket_counts.extend(bucket_counts)

    point.interval.end_time.seconds = int(time.time())
    point.interval.start_time.seconds = int(time.time() - 60)

    series.points = [point]

    client.create_time_series(
        name=project_name,
        time_series=[series],
    )

# Write a batch of latency values
latency_values = [15, 23, 45, 67, 120, 200, 35, 55, 89, 150]
write_distribution_metric("my-project", latency_values)
```

## Writing Custom Metrics in Go

Here is the equivalent in Go for teams using Go services:

```go
package main

import (
    "context"
    "fmt"
    "time"

    monitoring "cloud.google.com/go/monitoring/apiv3/v2"
    "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb"
    "google.golang.org/protobuf/types/known/timestamppb"
    metricpb "google.golang.org/genproto/googleapis/api/metric"
    monitoredrespb "google.golang.org/genproto/googleapis/api/monitoredres"
)

func writeCustomMetric(projectID string, value int64) error {
    ctx := context.Background()

    // Create the Monitoring client
    client, err := monitoring.NewMetricClient(ctx)
    if err != nil {
        return fmt.Errorf("failed to create client: %v", err)
    }
    defer client.Close()

    now := timestamppb.Now()

    // Build the time series request
    req := &monitoringpb.CreateTimeSeriesRequest{
        Name: fmt.Sprintf("projects/%s", projectID),
        TimeSeries: []*monitoringpb.TimeSeries{
            {
                Metric: &metricpb.Metric{
                    Type: "custom.googleapis.com/orders/processed_count",
                    Labels: map[string]string{
                        "region": "us-central1",
                        "status": "success",
                    },
                },
                Resource: &monitoredrespb.MonitoredResource{
                    Type: "global",
                    Labels: map[string]string{
                        "project_id": projectID,
                    },
                },
                Points: []*monitoringpb.Point{
                    {
                        Interval: &monitoringpb.TimeInterval{
                            EndTime: now,
                        },
                        Value: &monitoringpb.TypedValue{
                            Value: &monitoringpb.TypedValue_Int64Value{
                                Int64Value: value,
                            },
                        },
                    },
                },
            },
        },
    }

    // Write the time series
    if err := client.CreateTimeSeries(ctx, req); err != nil {
        return fmt.Errorf("failed to write time series: %v", err)
    }

    fmt.Printf("Wrote custom metric: %d\n", value)
    return nil
}
```

## Querying Custom Metrics

Read back your custom metrics using MQL or the time series API:

```python
def query_custom_metric(project_id, metric_type, minutes_back=60):
    """Query custom metric data from Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    now = time.time()
    interval = monitoring_v3.TimeInterval()
    interval.end_time.seconds = int(now)
    interval.start_time.seconds = int(now - (minutes_back * 60))

    results = client.list_time_series(
        request={
            "name": project_name,
            "filter": f'metric.type="{metric_type}"',
            "interval": interval,
            "aggregation": {
                "alignment_period": {"seconds": 300},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_SUM,
            },
        }
    )

    for ts in results:
        print(f"Labels: {dict(ts.metric.labels)}")
        for point in ts.points:
            print(f"  {point.interval.end_time}: {point.value.int64_value}")

query_custom_metric("my-project", "custom.googleapis.com/orders/processed_count")
```

## Creating Alerts on Custom Metrics

Custom metrics work with alerting policies just like built-in metrics:

```bash
# Alert when order failure rate exceeds threshold
gcloud alpha monitoring policies create \
  --display-name="High Order Failure Rate" \
  --condition-display-name="Order failures > 10/min" \
  --condition-filter='metric.type="custom.googleapis.com/orders/processed_count" AND metric.labels.status="failure"' \
  --condition-threshold-value=10 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation-alignment-period=60s \
  --condition-threshold-aggregation-per-series-aligner=ALIGN_RATE \
  --notification-channels=projects/my-project/notificationChannels/12345 \
  --project=my-project
```

## Summary

Custom metrics let you extend Google Cloud Monitoring beyond infrastructure metrics to track the business and application metrics that matter to your team. The Monitoring API supports gauge, cumulative, and distribution metric types with flexible labeling. Create descriptors for your most important metrics, write data points from your application code, and build dashboards and alerts on them. The result is a unified monitoring experience where infrastructure health and business health are visible in the same place.
