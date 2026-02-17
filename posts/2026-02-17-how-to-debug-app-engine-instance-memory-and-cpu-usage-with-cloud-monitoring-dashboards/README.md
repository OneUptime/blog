# How to Debug App Engine Instance Memory and CPU Usage with Cloud Monitoring Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Cloud Monitoring, Debugging, Performance

Description: Learn how to build Cloud Monitoring dashboards to track App Engine instance memory and CPU usage for identifying performance issues and optimizing resources.

---

When your App Engine application starts behaving erratically - slow responses, random crashes, or unexpected scaling - the first place to look is instance resource usage. Are your instances running out of memory? Is CPU pinned at 100%? Are you using too many or too few instances? Cloud Monitoring gives you the metrics and dashboards to answer these questions.

In this post, I will show you how to set up monitoring dashboards for App Engine, identify common resource issues, and use the data to make informed decisions about instance sizing and scaling.

## Key Metrics for App Engine

App Engine exposes several critical metrics through Cloud Monitoring:

- `appengine.googleapis.com/system/cpu/usage` - CPU utilization per instance
- `appengine.googleapis.com/system/memory/usage` - Memory usage per instance
- `appengine.googleapis.com/system/instance_count` - Number of running instances
- `appengine.googleapis.com/http/server/response_latencies` - Request latency distribution
- `appengine.googleapis.com/http/server/response_count` - Request count by status code

For Flexible Environment, you also get:
- `appengine.googleapis.com/flex/cpu/utilization` - CPU utilization
- `appengine.googleapis.com/flex/disk/read_bytes_count` - Disk read bytes
- `appengine.googleapis.com/flex/disk/write_bytes_count` - Disk write bytes
- `appengine.googleapis.com/flex/network/received_bytes_count` - Network ingress

## Creating a Monitoring Dashboard

You can create dashboards through the Cloud Console or the API. Here is how to create one using the gcloud CLI:

```bash
# Create a monitoring dashboard from a JSON definition
gcloud monitoring dashboards create --config-from-file=dashboard.json \
  --project=your-project-id
```

Here is a comprehensive dashboard definition:

```json
{
  "displayName": "App Engine Performance Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Usage by Instance",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gae_app\" AND metric.type=\"appengine.googleapis.com/system/cpu/usage\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Usage by Instance",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gae_app\" AND metric.type=\"appengine.googleapis.com/system/memory/usage\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Instance Count",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gae_app\" AND metric.type=\"appengine.googleapis.com/system/instance_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Response Latency (p50, p95, p99)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gae_app\" AND metric.type=\"appengine.googleapis.com/http/server/response_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_50"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Using the Cloud Console for Quick Monitoring

The fastest way to check instance health is through the Cloud Console:

1. Navigate to App Engine in the Cloud Console
2. Click "Instances" in the left sidebar
3. You see a list of running instances with their memory usage, QPS, and latency

For more detailed metrics, go to Cloud Monitoring:

1. Navigate to Monitoring in the Cloud Console
2. Click "Metrics Explorer"
3. Search for "App Engine" in the resource type
4. Select the metric you want to explore

## Exploring Metrics with gcloud

Query metrics directly from the command line:

```bash
# Get CPU usage for the last hour
gcloud monitoring time-series list \
  --filter='metric.type="appengine.googleapis.com/system/cpu/usage"' \
  --project=your-project-id \
  --format="table(metric.labels, points.values)"

# Get memory usage for a specific service
gcloud monitoring time-series list \
  --filter='metric.type="appengine.googleapis.com/system/memory/usage" AND resource.labels.module_id="default"' \
  --project=your-project-id
```

## Setting Up Alerts

Create alerts for critical resource thresholds:

```bash
# Create an alert for high memory usage
gcloud alpha monitoring policies create \
  --display-name="App Engine High Memory" \
  --condition-display-name="Memory usage above 80%" \
  --condition-filter='resource.type="gae_app" AND metric.type="appengine.googleapis.com/system/memory/usage"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID \
  --project=your-project-id
```

Here are the alerts every App Engine application should have:

```
1. High Memory Usage (>80% of instance class limit)
   - Indicates potential memory leaks or undersized instances
   - Action: Check for memory leaks, consider upgrading instance class

2. High CPU Usage (>90% sustained for 5 minutes)
   - Indicates CPU bottleneck
   - Action: Check for CPU-intensive operations, scale up or optimize

3. Elevated Error Rate (>5% of requests returning 5xx)
   - Indicates application errors
   - Action: Check logs for error details

4. High Latency (p95 > 2 seconds)
   - Indicates performance degradation
   - Action: Check for slow database queries, external API calls

5. Instance Count Spike (>2x normal count)
   - Indicates unexpected traffic or a scaling issue
   - Action: Check for traffic anomalies, verify scaling configuration
```

## Debugging Memory Issues

Memory issues are the most common resource problem on App Engine. Here is how to investigate them.

### Identifying Memory Leaks

A memory leak shows up as steadily increasing memory usage on individual instances over time. In the Cloud Console, look for instances where memory grows continuously without returning to baseline.

Add memory tracking to your application:

```python
# memory_tracker.py - Track memory usage in your application
import tracemalloc
import logging

logger = logging.getLogger(__name__)

# Start tracking memory allocations
tracemalloc.start()

def log_memory_usage():
    """Log current memory usage and top allocations."""
    current, peak = tracemalloc.get_traced_memory()
    logger.info(f"Current memory: {current / 1024 / 1024:.1f}MB, Peak: {peak / 1024 / 1024:.1f}MB")

    # Get the top 10 memory allocations
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics("lineno")

    logger.info("Top 10 memory allocations:")
    for stat in top_stats[:10]:
        logger.info(f"  {stat}")

def get_memory_stats():
    """Return memory statistics for the monitoring endpoint."""
    import psutil
    process = psutil.Process()
    memory_info = process.memory_info()

    return {
        "rss_mb": memory_info.rss / 1024 / 1024,
        "vms_mb": memory_info.vms / 1024 / 1024,
        "percent": process.memory_percent()
    }
```

Create a monitoring endpoint:

```python
@app.route("/_internal/memory")
def memory_stats():
    """Internal endpoint for memory monitoring."""
    from memory_tracker import get_memory_stats, log_memory_usage
    log_memory_usage()
    stats = get_memory_stats()
    return jsonify(stats)
```

### Common Memory Problems

**Problem**: Memory usage grows with each request and never drops.
**Cause**: Usually a list or dictionary that grows unbounded, or objects being cached without a size limit.
**Fix**: Add LRU caching with size limits, clear request-scoped data.

```python
# Use LRU cache with a maximum size instead of unbounded dict
from functools import lru_cache

@lru_cache(maxsize=1000)  # Limit to 1000 cached items
def get_expensive_data(key):
    return compute_data(key)
```

**Problem**: Memory spikes during specific requests.
**Cause**: Loading large files or datasets into memory.
**Fix**: Process data in chunks using streaming.

```python
# Stream large files instead of loading into memory
def process_large_file(file_path):
    with open(file_path, "r") as f:
        for line in f:  # Process line by line instead of f.read()
            process_line(line)
```

## Debugging CPU Issues

High CPU usage usually means your application is doing more computation than the instance can handle.

### Profiling CPU Usage

Add profiling to identify CPU-intensive code paths:

```python
# cpu_profiler.py - Profile CPU usage for specific endpoints
import cProfile
import pstats
import io

def profile_request(func):
    """Decorator to profile CPU usage of a request handler."""
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        profiler.enable()

        result = func(*args, **kwargs)

        profiler.disable()
        stream = io.StringIO()
        stats = pstats.Stats(profiler, stream=stream)
        stats.sort_stats("cumulative")
        stats.print_stats(20)  # Top 20 functions by cumulative time

        logger.info(f"CPU profile for {func.__name__}:\n{stream.getvalue()}")
        return result

    return wrapper

@app.route("/api/heavy-endpoint")
@profile_request
def heavy_endpoint():
    # This endpoint's CPU usage will be profiled
    return process_data()
```

### Common CPU Problems

**Problem**: CPU consistently at 100%.
**Cause**: Instance class too small for the workload.
**Fix**: Upgrade to a larger instance class.

```yaml
# Upgrade instance class for CPU-intensive workloads
# From F1 (600MHz) to F4 (2.4GHz)
instance_class: F4
```

**Problem**: CPU spikes during specific operations.
**Cause**: Inefficient algorithms, unoptimized database queries, or missing caching.
**Fix**: Profile the specific endpoint, optimize the code path, add caching.

## Custom Metrics

For application-specific monitoring, send custom metrics:

```python
# custom_metrics.py - Send custom metrics to Cloud Monitoring
from google.cloud import monitoring_v3
import time

def write_custom_metric(metric_type, value, project_id):
    """Write a custom metric to Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = f"custom.googleapis.com/{metric_type}"
    series.resource.type = "gae_app"
    series.resource.labels["project_id"] = project_id

    now = time.time()
    interval = monitoring_v3.TimeInterval(
        {"end_time": {"seconds": int(now)}}
    )
    point = monitoring_v3.Point(
        {"interval": interval, "value": {"double_value": value}}
    )
    series.points = [point]

    client.create_time_series(
        request={"name": project_name, "time_series": [series]}
    )

# Track custom application metrics
write_custom_metric("app/queue_depth", 42, "your-project-id")
write_custom_metric("app/cache_hit_ratio", 0.85, "your-project-id")
```

## Practical Monitoring Workflow

When debugging a performance issue, follow this workflow:

1. Check the App Engine dashboard for overall health
2. Look at instance count - is it scaling more than expected?
3. Check memory usage per instance - are they hitting limits?
4. Check CPU usage - is it consistently high?
5. Look at response latency distribution - are p95/p99 elevated?
6. Correlate with request logs to find slow endpoints
7. Check error rates for specific endpoints
8. Look at external dependency latency (database, cache, APIs)

## Summary

Cloud Monitoring dashboards give you visibility into App Engine instance health. Set up dashboards tracking CPU, memory, instance count, and latency. Create alerts for high memory (above 80%), sustained high CPU (above 90%), and elevated error rates. When debugging issues, start with the high-level dashboard, then drill into instance-level metrics, then correlate with request logs to find the root cause. Use custom metrics for application-specific monitoring like queue depth or cache hit ratios. Regular monitoring helps you right-size your instances and catch performance issues before they affect users.
