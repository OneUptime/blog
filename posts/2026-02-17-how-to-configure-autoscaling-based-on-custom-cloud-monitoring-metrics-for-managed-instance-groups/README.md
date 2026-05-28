# How to Configure Autoscaling Based on Custom Cloud Monitoring Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Autoscaling, Cloud Monitoring, Managed Instance Group

Description: Learn how to configure autoscaling for managed instance groups based on custom Cloud Monitoring metrics, going beyond simple CPU-based scaling.

---

CPU-based autoscaling is a good starting point, but it does not work for every workload. Maybe your application is memory-bound, or perhaps the real bottleneck is the length of a task queue, the number of active connections, or a custom business metric. GCP lets you autoscale managed instance groups based on any metric available in Cloud Monitoring - including custom metrics you define yourself.

In this post, I will show you how to create custom metrics, publish them from your application, and configure autoscaling policies that use them.

## Why Custom Metric Autoscaling?

Consider these scenarios where CPU-based autoscaling falls short:

- **Queue-based workers**: CPU usage might be low while a queue of 10,000 tasks is waiting. You want to scale based on queue depth.
- **Memory-intensive applications**: Your app hits memory limits before CPU gets stressed.
- **Connection-based services**: A proxy server needs to scale based on active connections, not CPU.
- **Business metrics**: Scale your order processing system based on the number of pending orders.

Custom metric autoscaling lets you match your scaling behavior to your actual workload characteristics.

## Step 1: Create a Custom Metric

First, define a custom metric in Cloud Monitoring. You can do this through the API or by simply publishing data to a metric descriptor that does not exist yet (Cloud Monitoring auto-creates it).

Here is how to create a metric descriptor explicitly with the Cloud Monitoring API:

```bash
# Create a custom metric descriptor for queue depth
ACCESS_TOKEN=$(gcloud auth print-access-token)

curl -X POST \
    "https://monitoring.googleapis.com/v3/projects/my-project/metricDescriptors" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "custom.googleapis.com/app/queue_depth",
      "metricKind": "GAUGE",
      "valueType": "INT64",
      "description": "Number of items waiting in the task queue",
      "displayName": "Task Queue Depth",
      "labels": [
        {
          "key": "queue_name",
          "valueType": "STRING",
          "description": "Name of the queue being monitored"
        }
      ]
    }'
```

## Step 2: Publish Custom Metrics from Your Application

Your application needs to report the metric value to Cloud Monitoring. Here is a Python example:

```python
# publish_metric.py - Report custom metric to Cloud Monitoring
from google.cloud import monitoring_v3
import time

def publish_queue_depth(project_id, queue_name, queue_depth):
    """Publish the current queue depth to Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Create the time series data point
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/app/queue_depth"
    series.metric.labels["queue_name"] = queue_name

    # Associate the metric with the whole queue, not a single VM.
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # Set the metric value
    now = time.time()
    seconds = int(now)
    nanos = int((now - seconds) * 10**9)

    interval = monitoring_v3.TimeInterval(
        {"end_time": {"seconds": seconds, "nanos": nanos}}
    )
    point = monitoring_v3.Point(
        {"interval": interval, "value": {"int64_value": queue_depth}}
    )
    series.points = [point]

    # Write the time series
    client.create_time_series(
        request={"name": project_name, "time_series": [series]}
    )


# Report queue depth every 60 seconds
import redis
r = redis.Redis(host="redis.internal", port=6379)

while True:
    queue_depth = r.llen("task_queue")
    publish_queue_depth(
        project_id="my-project",
        queue_name="task_queue",
        queue_depth=queue_depth
    )
    time.sleep(60)
```

Run this publisher once per queue, not independently on every worker instance, so that the global queue-depth time series has one current value.

You can also publish custom metrics using the monitoring agent or a dedicated exporter process.

## Step 3: Create the Autoscaler with Custom Metric

Now configure the autoscaler to use your custom metric.

Using gcloud:

```bash
# First, create the managed instance group if it does not exist
gcloud compute instance-groups managed create worker-mig \
    --template=worker-template \
    --size=2 \
    --zone=us-central1-a

# Configure autoscaling based on the custom queue depth metric
gcloud compute instance-groups managed set-autoscaling worker-mig \
    --zone=us-central1-a \
    --min-num-replicas=1 \
    --max-num-replicas=20 \
    --update-stackdriver-metric=custom.googleapis.com/app/queue_depth \
    --stackdriver-metric-filter="resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\"" \
    --stackdriver-metric-single-instance-assignment=100
```

This configuration tells the autoscaler: "Assign about 100 queued items to each instance." So if the total queue depth is 500 and you want each instance to handle 100 items, the autoscaler will scale to 5 instances.

## Understanding Utilization Target Types

When you use `--stackdriver-metric-utilization-target`, the `--stackdriver-metric-utilization-target-type` flag controls how the metric is interpreted:

- **gauge**: The autoscaler calculates the average value of the data collected in the last couple of minutes and compares that to the utilization target.
- **delta-per-minute**: The autoscaler calculates the average rate of growth per minute and compares that to the utilization target.
- **delta-per-second**: The autoscaler calculates the average rate of growth per second and compares that to the utilization target.

For a utilization metric that reports current memory usage or active connections, `gauge` is usually the right choice. For a request rate metric, you would use `delta-per-second`.

## Using a Single Instance Assignment Filter

Sometimes you want to scale based on a metric that is not per-instance but rather a global value (like a total queue depth reported by the queue service itself). Use the single instance assignment filter:

```bash
# Scale based on a global metric (not per-instance)
gcloud compute instance-groups managed set-autoscaling worker-mig \
    --zone=us-central1-a \
    --min-num-replicas=1 \
    --max-num-replicas=20 \
    --update-stackdriver-metric=custom.googleapis.com/queue/total_depth \
    --stackdriver-metric-filter="resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\"" \
    --stackdriver-metric-single-instance-assignment=100
```

With `single-instance-assignment=100`, the autoscaler calculates: `desired instances = total_metric_value / 100`. If the total queue depth is 500, it scales to 5 instances.

## Terraform Configuration

Here is the complete Terraform setup:

```hcl
# Instance template for workers
resource "google_compute_instance_template" "worker" {
  name_prefix  = "worker-"
  machine_type = "e2-standard-4"

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
  }

  metadata_startup_script = file("${path.module}/scripts/worker-startup.sh")

  lifecycle {
    create_before_destroy = true
  }
}

# Managed instance group
resource "google_compute_instance_group_manager" "workers" {
  name               = "worker-mig"
  base_instance_name = "worker"
  zone               = "us-central1-a"
  target_size        = 2

  version {
    instance_template = google_compute_instance_template.worker.id
  }
}

# Autoscaler with custom metric
resource "google_compute_autoscaler" "workers" {
  name   = "worker-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.workers.id

  autoscaling_policy {
    min_replicas = 1
    max_replicas = 20

    # Cool down period to avoid flapping
    cooldown_period = 120

    # Custom metric scaling policy
    metric {
      name                       = "custom.googleapis.com/app/queue_depth"
      filter                     = "resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\""
      single_instance_assignment = 100
    }
  }
}
```

## Combining Multiple Scaling Signals

You can configure multiple autoscaling policies. The autoscaler uses the one that results in the most instances, ensuring you have enough capacity for all metrics:

```bash
# Configure autoscaling with both CPU and custom metric
gcloud compute instance-groups managed set-autoscaling worker-mig \
    --zone=us-central1-a \
    --min-num-replicas=1 \
    --max-num-replicas=20 \
    --target-cpu-utilization=0.7 \
    --update-stackdriver-metric=custom.googleapis.com/app/queue_depth \
    --stackdriver-metric-filter="resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\"" \
    --stackdriver-metric-single-instance-assignment=100
```

In Terraform:

```hcl
resource "google_compute_autoscaler" "workers" {
  name   = "worker-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.workers.id

  autoscaling_policy {
    min_replicas    = 1
    max_replicas    = 20
    cooldown_period = 120

    # Scale based on CPU
    cpu_utilization {
      target = 0.7
    }

    # Also scale based on custom metric
    metric {
      name                       = "custom.googleapis.com/app/queue_depth"
      filter                     = "resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\""
      single_instance_assignment = 100
    }
  }
}
```

## Scale-Down Controls

By default, the autoscaler can scale down aggressively. To prevent thrashing, configure scale-down controls:

```hcl
resource "google_compute_autoscaler" "workers" {
  name   = "worker-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.workers.id

  autoscaling_policy {
    min_replicas    = 1
    max_replicas    = 20
    cooldown_period = 120

    metric {
      name                       = "custom.googleapis.com/app/queue_depth"
      filter                     = "resource.type = \"global\" AND metric.labels.queue_name = \"task_queue\""
      single_instance_assignment = 100
    }

    # Limit scale-down to 10% of current size over 10 minutes
    scale_in_control {
      max_scaled_in_replicas {
        percent = 10
      }
      time_window_sec = 600
    }
  }
}
```

## Monitoring the Autoscaler

Check what the autoscaler is doing:

```bash
# View the current autoscaler status
gcloud compute instance-groups managed describe worker-mig \
    --zone=us-central1-a \
    --format="yaml(status)"

# View autoscaler decisions in Cloud Logging
gcloud logging read 'resource.type="autoscaler" AND resource.labels.autoscaler_name="worker-autoscaler"' \
    --limit=20 \
    --format=json
```

## Common Pitfalls

1. **Metric reporting lag**: Custom metrics take 1-2 minutes to appear in Cloud Monitoring. The autoscaler adds its own evaluation interval (60 seconds by default). Combined with the cooldown period, it can take several minutes for scaling decisions to take effect.

2. **Missing metric data**: If your publisher stops reporting the metric (application crash, agent issue), the autoscaler may behave unpredictably. Always ensure metric reporting is reliable.

3. **Incorrect metric type**: Using `gauge` when you should use `delta-per-second` or `delta-per-minute` (or vice versa) leads to wrong scaling decisions.

4. **Too aggressive cooldown**: A short cooldown period causes the autoscaler to oscillate between scaling up and scaling down.

## Wrapping Up

Custom metric autoscaling unlocks the full potential of managed instance groups by letting you scale based on what actually matters to your workload. Whether it is queue depth, active connections, memory usage, or a business metric, the pattern is the same: publish the metric, configure the autoscaler, and set appropriate targets. Start with conservative settings (higher cooldown, moderate targets) and tune based on observed behavior.
