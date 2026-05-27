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
- `file.googleapis.com/nfs/server/read_milliseconds_count` - Time spent on read operations
- `file.googleapis.com/nfs/server/write_milliseconds_count` - Time spent on write operations

## Checking Metrics from the Command Line

You can query metrics from the command line with the Cloud Monitoring API and `gcloud` for authentication:

```bash
# Check current capacity usage percentage for the last hour
PROJECT_ID=$(gcloud config get-value project)
START=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  --data-urlencode 'filter=resource.type="filestore_instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --data-urlencode "interval.startTime=${START}" \
  --data-urlencode "interval.endTime=${END}" \
  --data-urlencode "view=FULL" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  | jq -r '.timeSeries[] | [.resource.labels.instance_name, .points[0].value.doubleValue] | @tsv'
```

For a quick throughput check:

```bash
# Get read throughput over the last hour
PROJECT_ID=$(gcloud config get-value project)
START=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  --data-urlencode 'filter=resource.type="filestore_instance" AND metric.type="file.googleapis.com/nfs/server/read_bytes_count"' \
  --data-urlencode "interval.startTime=${START}" \
  --data-urlencode "interval.endTime=${END}" \
  --data-urlencode "aggregation.alignmentPeriod=60s" \
  --data-urlencode "aggregation.perSeriesAligner=ALIGN_RATE" \
  --data-urlencode "view=FULL" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  | jq -r '.timeSeries[] | [.resource.labels.instance_name, .points[0].value.doubleValue] | @tsv'
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
gcloud monitoring policies create \
  --display-name="Filestore Capacity Over 80%" \
  --condition-display-name="Filestore usage above 80%" \
  --condition-filter='resource.type="filestore_instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --if='> 80' \
  --duration=300s \
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
                "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/used_bytes_percent\"",
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
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_bytes_count\"",
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
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_bytes_count\"",
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
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_ops_count\"",
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
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_ops_count\"",
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
        "title": "Read/Write Operation Time",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_milliseconds_count\"",
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
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_milliseconds_count\"",
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

For continuous VM-level monitoring alongside those checks, install the Ops Agent on the VM:

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
      collect:
        - file.googleapis.com/nfs/server
```

This lets you combine Filestore metrics with your application metrics in a single Grafana dashboard.

## Best Practices

1. Set up capacity alerts at 80% and 95% thresholds before you deploy workloads.
2. Monitor throughput and compare against tier limits to know when you are approaching saturation.
3. Track latency trends over time - gradual increases often signal growing performance issues.
4. Use both server-side (Cloud Monitoring) and client-side (nfsstat) monitoring for complete visibility.
5. Keep dashboards simple - focus on capacity, throughput, and latency. These three cover most issues.

Good monitoring is the foundation of reliable operations. With the right alerts and dashboards in place, you can catch Filestore issues before they impact your users.
