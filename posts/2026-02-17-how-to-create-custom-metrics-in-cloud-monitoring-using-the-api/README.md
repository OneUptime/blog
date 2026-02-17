# How to Create Custom Metrics in Cloud Monitoring Using the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Custom Metrics, API, Observability

Description: Learn how to create and write custom metrics in Google Cloud Monitoring using the API to track application-specific data points beyond built-in infrastructure metrics.

---

Built-in metrics cover infrastructure basics like CPU, memory, and network. But every application has its own important numbers - order processing time, queue depth, cache hit rate, active users, payment success rate. Custom metrics in Cloud Monitoring let you track whatever matters to your specific application and use all the same alerting, dashboarding, and analysis tools.

This guide covers creating custom metrics using the Cloud Monitoring API.

## Understanding Custom Metrics

Custom metrics in Cloud Monitoring follow the same structure as built-in metrics. They have a metric type, labels, and time-series data points. The main differences are:

- Custom metric types start with `custom.googleapis.com/` (or `workload.googleapis.com/` for OpenCensus/OpenTelemetry)
- You define the metric descriptor (what the metric is)
- You write the data points from your application code

## Creating a Metric Descriptor

Before writing data, you need to create a metric descriptor that defines the metric's name, type, labels, and value type.

Here is how to create a metric descriptor using the Python client library.

```python
# create_metric.py - Creates a custom metric descriptor
from google.cloud import monitoring_v3
from google.api import metric_pb2

def create_metric_descriptor(project_id):
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Define the metric descriptor
    descriptor = metric_pb2.MetricDescriptor()
    descriptor.type = "custom.googleapis.com/app/order_processing_time_ms"
    descriptor.metric_kind = metric_pb2.MetricDescriptor.MetricKind.GAUGE
    descriptor.value_type = metric_pb2.MetricDescriptor.ValueType.DOUBLE
    descriptor.description = "Time taken to process an order in milliseconds"
    descriptor.display_name = "Order Processing Time"
    descriptor.unit = "ms"

    # Add labels to allow filtering by order type and region
    label1 = descriptor.labels.add()
    label1.key = "order_type"
    label1.value_type = metric_pb2.LabelDescriptor.ValueType.STRING
    label1.description = "Type of order (standard, express, wholesale)"

    label2 = descriptor.labels.add()
    label2.key = "region"
    label2.value_type = metric_pb2.LabelDescriptor.ValueType.STRING
    label2.description = "Region where the order was processed"

    # Create the metric descriptor
    descriptor = client.create_metric_descriptor(
        name=project_name,
        metric_descriptor=descriptor
    )

    print(f"Created metric descriptor: {descriptor.name}")
    return descriptor

create_metric_descriptor("my-project")
```

## Metric Kinds

There are three metric kinds to choose from:

- GAUGE: A value at a specific point in time. Use for things like current queue depth, active connections, or temperature. Each data point is independent.
- CUMULATIVE: A value that accumulates over time. Use for counters like total requests or total errors. Data points must be monotonically increasing.
- DELTA: The change in value over a time interval. Use for counts during a period.

Choose GAUGE for values that go up and down. Choose CUMULATIVE for values that only go up (counters).

## Writing Data Points

Once the descriptor exists, write data points from your application.

```python
# write_metric.py - Writes a data point to a custom metric
from google.cloud import monitoring_v3
import time

def write_metric(project_id, order_type, region, processing_time):
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Build the time series
    series = monitoring_v3.TimeSeries()

    # Set the metric type and labels
    series.metric.type = "custom.googleapis.com/app/order_processing_time_ms"
    series.metric.labels["order_type"] = order_type
    series.metric.labels["region"] = region

    # Set the monitored resource
    # For GKE, use k8s_container. For VMs, use gce_instance.
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # Create a data point with the current time
    now = time.time()
    point = monitoring_v3.Point()
    point.value.double_value = processing_time
    point.interval.end_time.seconds = int(now)
    point.interval.end_time.nanos = int(
        (now - int(now)) * 10**9
    )
    series.points = [point]

    # Write the time series data
    client.create_time_series(
        name=project_name,
        time_series=[series]
    )

    print(f"Wrote metric: {processing_time}ms for {order_type} in {region}")

# Example usage - call this after processing each order
write_metric("my-project", "standard", "us-central1", 245.7)
write_metric("my-project", "express", "europe-west1", 182.3)
```

## Writing Cumulative Metrics

For counters, you need to track the start time of the cumulative period.

```python
# write_counter.py - Writing a cumulative (counter) metric
from google.cloud import monitoring_v3
import time

# Track when counting started (typically when the application starts)
start_time = time.time()
total_orders = 0

def write_order_count(project_id):
    global total_orders
    total_orders += 1

    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/app/total_orders"
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    point = monitoring_v3.Point()
    point.value.int64_value = total_orders

    # For cumulative metrics, set both start and end time
    now = time.time()
    point.interval.start_time.seconds = int(start_time)
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    client.create_time_series(
        name=project_name,
        time_series=[series]
    )
```

## Using the REST API Directly

If you are not using Python, you can write metrics with any HTTP client through the REST API.

```bash
# Write a custom metric data point using curl
ACCESS_TOKEN=$(gcloud auth print-access-token)

curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/timeSeries" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timeSeries": [
      {
        "metric": {
          "type": "custom.googleapis.com/app/queue_depth",
          "labels": {
            "queue_name": "order-processing"
          }
        },
        "resource": {
          "type": "global",
          "labels": {
            "project_id": "my-project"
          }
        },
        "points": [
          {
            "interval": {
              "endTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
            },
            "value": {
              "int64Value": "42"
            }
          }
        ]
      }
    ]
  }'
```

## Writing Metrics in Node.js

Here is the same thing in Node.js for JavaScript developers.

```javascript
// writeMetric.js - Write a custom metric in Node.js
const monitoring = require('@google-cloud/monitoring');

async function writeMetric(projectId, metricValue) {
  const client = new monitoring.MetricServiceClient();
  const projectPath = client.projectPath(projectId);

  const timeSeriesData = {
    metric: {
      type: 'custom.googleapis.com/app/request_latency_ms',
      labels: {
        endpoint: '/api/v1/orders',
        method: 'GET',
      },
    },
    resource: {
      type: 'global',
      labels: {
        project_id: projectId,
      },
    },
    points: [
      {
        interval: {
          // Current time
          endTime: {
            seconds: Math.floor(Date.now() / 1000),
          },
        },
        value: {
          doubleValue: metricValue,
        },
      },
    ],
  };

  // Write the time series
  await client.createTimeSeries({
    name: projectPath,
    timeSeries: [timeSeriesData],
  });

  console.log(`Wrote metric: ${metricValue}ms`);
}

// Call after handling each request
writeMetric('my-project', 156.2);
```

## Batching Data Points

Writing individual data points for every event is inefficient. Batch your writes.

```python
# batch_write.py - Batch writing multiple metrics at once
from google.cloud import monitoring_v3
import time

def write_batch(project_id, data_points):
    """
    data_points: list of dicts with keys: metric_type, labels, value
    """
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    time_series_list = []
    now = time.time()

    for dp in data_points:
        series = monitoring_v3.TimeSeries()
        series.metric.type = dp["metric_type"]
        for k, v in dp.get("labels", {}).items():
            series.metric.labels[k] = v

        series.resource.type = "global"
        series.resource.labels["project_id"] = project_id

        point = monitoring_v3.Point()
        point.value.double_value = dp["value"]
        point.interval.end_time.seconds = int(now)
        series.points = [point]

        time_series_list.append(series)

    # Write up to 200 time series in a single request
    client.create_time_series(
        name=project_name,
        time_series=time_series_list
    )

# Example: batch write multiple metrics
write_batch("my-project", [
    {"metric_type": "custom.googleapis.com/app/latency", "labels": {"endpoint": "/api"}, "value": 150.0},
    {"metric_type": "custom.googleapis.com/app/latency", "labels": {"endpoint": "/web"}, "value": 85.0},
    {"metric_type": "custom.googleapis.com/app/queue_depth", "labels": {"queue": "orders"}, "value": 12.0},
])
```

You can write up to 200 time series in a single API call. Batch writes reduce API calls and improve performance.

## Rate Limits and Best Practices

Cloud Monitoring has rate limits for custom metrics:

- One data point per metric time series per 10 seconds for GAUGE metrics
- One data point per metric time series per minute is recommended
- Up to 200 time series per write request
- Up to 500 metric descriptors per project

To stay within limits:

- Buffer data points and write them in batches
- Do not write more than once every 10 seconds per unique time series
- Use labels wisely - each unique combination of labels creates a separate time series

## Listing and Deleting Custom Metrics

Manage your custom metric descriptors through the API.

```bash
# List all custom metric descriptors
gcloud monitoring metrics-descriptors list \
  --filter='metric.type = starts_with("custom.googleapis.com")'

# Delete a custom metric descriptor
gcloud monitoring metrics-descriptors delete \
  "custom.googleapis.com/app/order_processing_time_ms"
```

## Summary

Custom metrics in Cloud Monitoring let you track application-specific data alongside your infrastructure metrics. Define a metric descriptor to describe what you are measuring, then write data points from your application code using the client libraries or REST API. Once the data is flowing, you can create dashboards, set up alerts, and analyze trends just like you would with any built-in metric. The key is choosing the right metric kind, batching your writes, and keeping your label cardinality manageable.
