# How to Configure Cloud Monitoring Dashboards and Uptime Checks for a New GCP Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Dashboards, Uptime Checks, Alerting, Observability

Description: Set up Cloud Monitoring dashboards, uptime checks, and alerting policies for a new GCP project to gain visibility into infrastructure and application health from day one.

---

Setting up monitoring before you deploy anything might seem premature, but it is one of the best investments you can make in a new GCP project. When something breaks at 2 AM, you want dashboards that show you what is happening and alerts that tell you about problems before your users do. Cloud Monitoring gives you all of this out of the box for GCP services, but you need to configure it properly.

Here is how to set up monitoring from scratch in a new project.

## Enable Cloud Monitoring

Cloud Monitoring is enabled by default, but you should configure a few things:

```bash
# Ensure the monitoring API is enabled
gcloud services enable monitoring.googleapis.com --project=my-project

# Set up notification channels first - you need these for alerts
# Create an email notification channel
gcloud monitoring channels create \
  --type=email \
  --display-name="On-Call Email" \
  --channel-labels=email_address=oncall@company.com \
  --project=my-project

# Create a Slack notification channel (requires Slack integration setup first)
# Or use PagerDuty, SMS, webhooks, etc.
```

## Setting Up Uptime Checks

Uptime checks are the most fundamental monitoring. They verify that your services are reachable from multiple global locations.

### HTTP Uptime Check

```bash
# Create an uptime check for your main web application
gcloud monitoring uptime create my-webapp-check \
  --display-name="Web Application Health" \
  --resource-type=uptime-url \
  --hostname=api.myapp.com \
  --path=/healthz \
  --port=443 \
  --protocol=https \
  --period=60 \
  --timeout=10 \
  --content-match-content="ok" \
  --project=my-project
```

You can also create uptime checks using JSON configuration for more control:

```bash
# Create a more detailed uptime check using JSON config
gcloud monitoring uptime create \
  --config-from-file=/dev/stdin \
  --project=my-project << 'EOF'
{
  "displayName": "API Health Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "host": "api.myapp.com",
      "project_id": "my-project"
    }
  },
  "httpCheck": {
    "path": "/api/health",
    "port": 443,
    "useSsl": true,
    "validateSsl": true,
    "requestMethod": "GET",
    "acceptedResponseStatusCodes": [
      {"statusClass": "STATUS_CLASS_2XX"}
    ]
  },
  "period": "60s",
  "timeout": "10s",
  "selectedRegions": [
    "USA_VIRGINIA",
    "EUROPE",
    "ASIA_PACIFIC"
  ]
}
EOF
```

### Alert on Uptime Check Failures

```bash
# Create an alert policy that fires when the uptime check fails
gcloud monitoring policies create \
  --display-name="Web Application Down" \
  --condition-display-name="Uptime check failing" \
  --condition-filter='metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url" AND metric.labels.check_id="my-webapp-check"' \
  --condition-threshold-value=1 \
  --condition-comparison=COMPARISON_LT \
  --condition-duration=300s \
  --aggregation-alignment-period=300s \
  --aggregation-per-series-aligner=ALIGN_FRACTION_TRUE \
  --notification-channels=CHANNEL_ID \
  --project=my-project
```

## Building Dashboards

### Infrastructure Overview Dashboard

Create a dashboard that gives you a single-pane view of your infrastructure:

```bash
# Create a comprehensive infrastructure dashboard
gcloud monitoring dashboards create --config-from-file=/dev/stdin << 'DASHBOARD'
{
  "displayName": "Infrastructure Overview",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "CPU Utilization - All VMs",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MEAN",
                  "crossSeriesReducer": "REDUCE_MEAN",
                  "groupByFields": ["resource.label.instance_id"]
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      },
      {
        "title": "Memory Utilization - All VMs",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"agent.googleapis.com/memory/percent_used\" resource.type=\"gce_instance\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      },
      {
        "title": "Disk I/O - Read/Write",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"compute.googleapis.com/instance/disk/read_bytes_count\" resource.type=\"gce_instance\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      },
      {
        "title": "Network Traffic",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"compute.googleapis.com/instance/network/received_bytes_count\" resource.type=\"gce_instance\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      }
    ]
  }
}
DASHBOARD
```

### Application Dashboard

For Cloud Run or GKE applications:

```bash
# Create an application performance dashboard
gcloud monitoring dashboards create --config-from-file=/dev/stdin << 'DASHBOARD'
{
  "displayName": "Application Performance",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "Request Count by Status Code",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE",
                  "crossSeriesReducer": "REDUCE_SUM",
                  "groupByFields": ["metric.label.response_code_class"]
                }
              }
            },
            "plotType": "STACKED_BAR"
          }]
        }
      },
      {
        "title": "Request Latency (p50, p95, p99)",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_50"
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "p50"
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_95"
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "p95"
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99"
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "p99"
            }
          ]
        }
      },
      {
        "title": "Instance Count",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MAX"
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      },
      {
        "title": "Container CPU Utilization",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"run.googleapis.com/container/cpu/utilizations\" resource.type=\"cloud_run_revision\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_PERCENTILE_99"
                }
              }
            },
            "plotType": "LINE"
          }]
        }
      }
    ]
  }
}
DASHBOARD
```

## Setting Up Alert Policies

### Critical Infrastructure Alerts

```bash
# Alert on high CPU utilization
gcloud monitoring policies create \
  --display-name="High CPU Utilization" \
  --condition-display-name="CPU > 85% for 5 minutes" \
  --condition-filter='metric.type="compute.googleapis.com/instance/cpu/utilization" resource.type="gce_instance"' \
  --condition-threshold-value=0.85 \
  --condition-comparison=COMPARISON_GT \
  --condition-duration=300s \
  --aggregation-alignment-period=60s \
  --aggregation-per-series-aligner=ALIGN_MEAN \
  --notification-channels=CHANNEL_ID \
  --project=my-project

# Alert on disk usage above 80%
gcloud monitoring policies create \
  --display-name="Disk Usage High" \
  --condition-display-name="Disk usage > 80%" \
  --condition-filter='metric.type="agent.googleapis.com/disk/percent_used" resource.type="gce_instance"' \
  --condition-threshold-value=80 \
  --condition-comparison=COMPARISON_GT \
  --condition-duration=300s \
  --notification-channels=CHANNEL_ID \
  --project=my-project
```

### Application Performance Alerts

```bash
# Alert on high error rate for Cloud Run
gcloud monitoring policies create \
  --display-name="Cloud Run High Error Rate" \
  --condition-display-name="5xx error rate > 5%" \
  --condition-filter='metric.type="run.googleapis.com/request_count" resource.type="cloud_run_revision" metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=0.05 \
  --condition-comparison=COMPARISON_GT \
  --condition-duration=300s \
  --aggregation-alignment-period=300s \
  --aggregation-per-series-aligner=ALIGN_RATE \
  --notification-channels=CHANNEL_ID \
  --project=my-project

# Alert on high latency
gcloud monitoring policies create \
  --display-name="Cloud Run High Latency" \
  --condition-display-name="p99 latency > 2 seconds" \
  --condition-filter='metric.type="run.googleapis.com/request_latencies" resource.type="cloud_run_revision"' \
  --condition-threshold-value=2000 \
  --condition-comparison=COMPARISON_GT \
  --condition-duration=300s \
  --aggregation-alignment-period=60s \
  --aggregation-per-series-aligner=ALIGN_PERCENTILE_99 \
  --notification-channels=CHANNEL_ID \
  --project=my-project
```

## Custom Metrics

For application-specific monitoring, create custom metrics:

```python
# custom_metrics.py - Send custom metrics from your application
from google.cloud import monitoring_v3
import time

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/my-project"

def record_order_processed(order_value, processing_time_ms):
    """Record a custom metric for order processing."""
    now = time.time()
    interval = monitoring_v3.TimeInterval(
        {"end_time": {"seconds": int(now)}}
    )

    # Record order count
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/orders/processed_count"
    series.resource.type = "global"
    point = monitoring_v3.Point({
        "interval": interval,
        "value": {"int64_value": 1},
    })
    series.points = [point]
    client.create_time_series(name=project_name, time_series=[series])

    # Record processing time
    series2 = monitoring_v3.TimeSeries()
    series2.metric.type = "custom.googleapis.com/orders/processing_time"
    series2.resource.type = "global"
    point2 = monitoring_v3.Point({
        "interval": interval,
        "value": {"double_value": processing_time_ms},
    })
    series2.points = [point2]
    client.create_time_series(name=project_name, time_series=[series2])
```

## Monitoring Checklist for New Projects

- [ ] Notification channels configured (email, Slack, PagerDuty)
- [ ] Uptime checks for all externally accessible endpoints
- [ ] Infrastructure dashboard (CPU, memory, disk, network)
- [ ] Application dashboard (request rate, latency, error rate, instance count)
- [ ] Alert on uptime check failure
- [ ] Alert on high CPU utilization (over 85%)
- [ ] Alert on high disk usage (over 80%)
- [ ] Alert on high error rate (over 5%)
- [ ] Alert on high latency (p99 over SLO threshold)
- [ ] Cloud SQL monitoring (connections, CPU, storage)
- [ ] Custom metrics for business-specific KPIs
- [ ] Ops Agent installed on Compute Engine VMs for memory and disk metrics

## Installing the Ops Agent

GCP does not collect memory and disk metrics from VMs by default. Install the Ops Agent:

```bash
# Install the Ops Agent on a VM
gcloud compute ssh my-vm --zone=us-central1-a --command='
  curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
  sudo bash add-google-cloud-ops-agent-repo.sh --also-install
'
```

For Managed Instance Groups, include the agent installation in the startup script of your instance template.

## Wrapping Up

Monitoring is not something you bolt on after a production incident - it should be part of your project setup from the beginning. Start with uptime checks to know when your services are down, build dashboards that show the four golden signals (latency, traffic, errors, saturation), and create alert policies that notify you before users notice problems. Install the Ops Agent on VMs for complete metrics collection, and add custom metrics for business-specific measurements. A well-monitored project gives you the confidence to ship changes quickly because you will know immediately if something goes wrong.
