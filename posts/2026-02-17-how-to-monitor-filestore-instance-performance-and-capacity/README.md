# How to Monitor Filestore Instance Performance and Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Monitoring, Cloud Monitoring, NFS

Description: A practical guide to monitoring Google Cloud Filestore instances for performance metrics, capacity utilization, and setting up alerts to prevent storage issues.

---

Running a Filestore instance without monitoring is like driving without a dashboard. Everything might be fine until you run out of space or hit a performance wall. Google Cloud Monitoring provides built-in metrics for Filestore that let you track capacity usage, throughput, IOPS, and latency in real time. In this post, I will show you how to access these metrics, build useful dashboards, and set up alerts so you get notified before problems occur.

## Available Filestore Metrics

Filestore exposes several categories of metrics through the Cloud Monitoring API. Here are the ones that matter most for day-to-day operations:

**Capacity metrics:**
- `file.googleapis.com/nfs/server/used_bytes_percent` - Percentage of capacity used
- `file.googleapis.com/nfs/server/free_bytes_percent` - Percentage of capacity free

**Throughput metrics:**
- `file.googleapis.com/nfs/server/read_bytes_count` - Bytes read per interval
- `file.googleapis.com/nfs/server/write_bytes_count` - Bytes written per interval

**IOPS metrics:**
- `file.googleapis.com/nfs/server/read_ops_count` - Read operations per interval
- `file.googleapis.com/nfs/server/write_ops_count` - Write operations per interval

**Latency metrics:**
- `file.googleapis.com/nfs/server/average_read_latency` - Average read latency
- `file.googleapis.com/nfs/server/average_write_latency` - Average write latency

## Checking Metrics from the Command Line

You can query metrics directly with gcloud:

```bash
# Check current capacity usage percentage for the last hour
gcloud monitoring time-series list \
  --filter='resource.type="filestore.googleapis.com/Instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(resource.labels.instance_name,points[0].value.doubleValue)"
```

For a quick throughput check:

```bash
# Get read throughput over the last hour
gcloud monitoring time-series list \
  --filter='resource.type="filestore.googleapis.com/Instance" AND metric.type="file.googleapis.com/nfs/server/read_bytes_count"' \
  --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --per-series-aligner=ALIGN_RATE \
  --format="table(resource.labels.instance_name,points[0].value.doubleValue)"
```

## Setting Up Capacity Alerts

The most critical alert for Filestore is capacity usage. Running out of space causes write failures that can crash applications. Set up an alert before that happens.

Create an alert policy that fires when capacity usage exceeds 80%:

```bash
# Create a notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Filestore Alerts" \
  --type=email \
  --channel-labels=email_address=team@example.com

# Create the alert policy for high capacity usage
gcloud alpha monitoring policies create \
  --display-name="Filestore Capacity Over 80%" \
  --condition-display-name="Filestore usage above 80%" \
  --condition-filter='resource.type="filestore.googleapis.com/Instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --condition-threshold-value=80 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID \
  --combiner=OR
```

I recommend setting up two thresholds:
- **Warning at 80%** - Start planning capacity expansion
- **Critical at 95%** - Immediate action required

## Creating a Monitoring Dashboard

A custom dashboard gives you a single view of all your Filestore instances. You can create one programmatically:

```bash
# Create a monitoring dashboard for Filestore
gcloud monitoring dashboards create --config-from-file=filestore-dashboard.json
```

Here is a dashboard configuration that covers the essential metrics. Save this as `filestore-dashboard.json`:

```json
{
  "displayName": "Filestore Monitoring",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Capacity Usage (%)",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/used_bytes_percent\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }]
        }
      },
      {
        "title": "Read/Write Throughput",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_bytes_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_bytes_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Read/Write IOPS",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_ops_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_ops_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Average Read/Write Latency",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/average_read_latency\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore.googleapis.com/Instance\" AND metric.type=\"file.googleapis.com/nfs/server/average_write_latency\"",
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
    ]
  }
}
```

## Client-Side Monitoring

Server-side metrics from Cloud Monitoring tell you what the Filestore instance is doing. Client-side monitoring tells you what your applications are experiencing. Both perspectives are important.

On the NFS client side, you can use `nfsstat` to see NFS operation statistics:

```bash
# View NFS client statistics
nfsstat -c

# View NFS mount-specific statistics
nfsstat -m
```

For continuous monitoring, you can export client-side NFS metrics to Cloud Monitoring using the Ops Agent:

```bash
# Install the Ops Agent on the VM
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

## Monitoring with the df Command

For a quick capacity check without using the Cloud Monitoring API, you can simply use `df` from a mounted client:

```bash
# Check capacity from any mounted client
df -h /mnt/filestore

# Monitor capacity over time with a simple script
while true; do
  echo "$(date): $(df -h /mnt/filestore | tail -1)"
  sleep 300  # Check every 5 minutes
done
```

This is not a substitute for proper monitoring, but it is useful for quick debugging.

## Key Metrics to Watch and What They Mean

**Capacity usage climbing steadily** - Your data is growing. Plan capacity expansion before hitting 80%. Use the growth rate to estimate when you will need more space.

**Throughput at the tier maximum** - Your workload is saturating the instance. Either upgrade the tier, increase capacity (which increases throughput for Zonal/Regional tiers), or optimize your application's I/O patterns.

**High write latency** - Could indicate disk contention. If you are on Basic HDD, switching to SSD will help. If you are already on SSD, check if the workload involves many small random writes.

**IOPS at limit** - Similar to throughput saturation. Increase capacity or upgrade tier. Also check if your application can batch small operations into larger ones.

**Sudden drop in all metrics** - Could indicate that clients disconnected. Check client health and NFS mount status.

## Integrating with Third-Party Tools

If you use Prometheus and Grafana, you can export Filestore metrics through the Cloud Monitoring API using the Stackdriver exporter:

```yaml
# Prometheus scrape config for GCP metrics
scrape_configs:
  - job_name: 'stackdriver'
    static_configs:
      - targets: ['localhost:9255']
    metrics_path: /metrics
    params:
      match[]:
        - '{__name__=~"filestore.*"}'
```

This lets you combine Filestore metrics with your application metrics in a single Grafana dashboard.

## Best Practices

1. Set up capacity alerts at 80% and 95% thresholds before you deploy workloads.
2. Monitor throughput and compare against tier limits to know when you are approaching saturation.
3. Track latency trends over time - gradual increases often signal growing performance issues.
4. Use both server-side (Cloud Monitoring) and client-side (nfsstat) monitoring for complete visibility.
5. Keep dashboards simple - focus on capacity, throughput, and latency. These three cover most issues.

Good monitoring is the foundation of reliable operations. With the right alerts and dashboards in place, you can catch Filestore issues before they impact your users.
