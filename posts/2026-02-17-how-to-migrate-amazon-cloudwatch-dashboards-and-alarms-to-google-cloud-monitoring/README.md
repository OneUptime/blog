# How to Migrate Amazon CloudWatch Dashboards and Alarms to Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, CloudWatch, Migration, Observability

Description: Migrate your Amazon CloudWatch dashboards and alarms to Google Cloud Monitoring with equivalent metrics, alerts, and visualization configurations.

---

When moving from AWS to GCP, your monitoring setup needs to come along. CloudWatch dashboards and alarms represent institutional knowledge about what matters in your system - the metrics your team watches, the thresholds that indicate problems, and the alerts that wake people up at night. Losing that during migration means you are flying blind until you rebuild it all from scratch.

In this post, I will walk through mapping CloudWatch concepts to Google Cloud Monitoring, exporting your existing dashboards and alarms, and recreating them on GCP.

## Concept Mapping

Here is how CloudWatch concepts translate to Google Cloud Monitoring:

| CloudWatch | Google Cloud Monitoring |
|-----------|------------------------|
| Dashboard | Dashboard |
| Widget | Widget/Chart |
| Metric Namespace | Metric Type (resource.type) |
| Dimension | Metric Label |
| Alarm | Alert Policy |
| SNS Topic | Notification Channel |
| Composite Alarm | Multi-condition Alert Policy |
| Metric Math | MQL (Monitoring Query Language) |
| Anomaly Detection | MQL with forecasting |
| Log Metric Filter | Log-based Metric |

## Exporting CloudWatch Dashboards

First, export your existing CloudWatch dashboards:

```python
# export_cloudwatch.py
# Export CloudWatch dashboards and alarms for migration
import boto3
import json
import os

def export_dashboards(output_dir='cloudwatch_export'):
    """Export all CloudWatch dashboards to JSON files."""
    cw = boto3.client('cloudwatch')
    os.makedirs(output_dir, exist_ok=True)

    # List all dashboards
    dashboards = cw.list_dashboards()

    for entry in dashboards['DashboardEntries']:
        name = entry['DashboardName']

        # Get the full dashboard body
        response = cw.get_dashboard(DashboardName=name)
        body = json.loads(response['DashboardBody'])

        # Save to file
        output_file = os.path.join(output_dir, f"dashboard-{name}.json")
        with open(output_file, 'w') as f:
            json.dump(body, f, indent=2)

        print(f"Exported dashboard: {name}")

    return dashboards


def export_alarms(output_dir='cloudwatch_export'):
    """Export all CloudWatch alarms to JSON files."""
    cw = boto3.client('cloudwatch')
    os.makedirs(output_dir, exist_ok=True)

    alarms = []
    paginator = cw.get_paginator('describe_alarms')

    for page in paginator.paginate():
        for alarm in page['MetricAlarms']:
            alarms.append({
                'name': alarm['AlarmName'],
                'description': alarm.get('AlarmDescription', ''),
                'namespace': alarm['Namespace'],
                'metric': alarm['MetricName'],
                'dimensions': alarm.get('Dimensions', []),
                'statistic': alarm.get('Statistic', ''),
                'period': alarm['Period'],
                'evaluation_periods': alarm['EvaluationPeriods'],
                'threshold': alarm['Threshold'],
                'comparison': alarm['ComparisonOperator'],
                'actions': alarm.get('AlarmActions', []),
            })

    output_file = os.path.join(output_dir, 'alarms.json')
    with open(output_file, 'w') as f:
        json.dump(alarms, f, indent=2)

    print(f"Exported {len(alarms)} alarms")
    return alarms


if __name__ == '__main__':
    export_dashboards()
    export_alarms()
```

## Metric Mapping

Map common AWS metrics to their GCP equivalents:

```python
# metric_mapping.py
# Maps CloudWatch metrics to Google Cloud Monitoring equivalents

METRIC_MAP = {
    # EC2 to Compute Engine
    "AWS/EC2": {
        "resource_type": "gce_instance",
        "metrics": {
            "CPUUtilization": "compute.googleapis.com/instance/cpu/utilization",
            "NetworkIn": "compute.googleapis.com/instance/network/received_bytes_count",
            "NetworkOut": "compute.googleapis.com/instance/network/sent_bytes_count",
            "DiskReadOps": "compute.googleapis.com/instance/disk/read_ops_count",
            "DiskWriteOps": "compute.googleapis.com/instance/disk/write_ops_count",
            "DiskReadBytes": "compute.googleapis.com/instance/disk/read_bytes_count",
            "DiskWriteBytes": "compute.googleapis.com/instance/disk/write_bytes_count",
        }
    },
    # RDS to Cloud SQL
    "AWS/RDS": {
        "resource_type": "cloudsql_database",
        "metrics": {
            "CPUUtilization": "cloudsql.googleapis.com/database/cpu/utilization",
            "FreeableMemory": "cloudsql.googleapis.com/database/memory/utilization",
            "DatabaseConnections": "cloudsql.googleapis.com/database/postgresql/num_backends",
            "ReadIOPS": "cloudsql.googleapis.com/database/disk/read_ops_count",
            "WriteIOPS": "cloudsql.googleapis.com/database/disk/write_ops_count",
            "FreeStorageSpace": "cloudsql.googleapis.com/database/disk/utilization",
            "ReplicaLag": "cloudsql.googleapis.com/database/replication/replica_lag",
        }
    },
    # ALB to HTTP(S) Load Balancer
    "AWS/ApplicationELB": {
        "resource_type": "https_lb_rule",
        "metrics": {
            "RequestCount": "loadbalancing.googleapis.com/https/request_count",
            "TargetResponseTime": "loadbalancing.googleapis.com/https/backend_latencies",
            "HTTPCode_ELB_5XX_Count": "loadbalancing.googleapis.com/https/request_count",
            "HTTPCode_Target_2XX_Count": "loadbalancing.googleapis.com/https/request_count",
            "ActiveConnectionCount": "loadbalancing.googleapis.com/https/request_count",
        }
    },
    # SQS to Pub/Sub
    "AWS/SQS": {
        "resource_type": "pubsub_subscription",
        "metrics": {
            "NumberOfMessagesSent": "pubsub.googleapis.com/topic/send_message_operation_count",
            "NumberOfMessagesReceived": "pubsub.googleapis.com/subscription/pull_message_operation_count",
            "ApproximateNumberOfMessagesVisible": "pubsub.googleapis.com/subscription/num_undelivered_messages",
            "ApproximateAgeOfOldestMessage": "pubsub.googleapis.com/subscription/oldest_unacked_message_age",
        }
    },
    # Lambda to Cloud Functions
    "AWS/Lambda": {
        "resource_type": "cloud_function",
        "metrics": {
            "Invocations": "cloudfunctions.googleapis.com/function/execution_count",
            "Duration": "cloudfunctions.googleapis.com/function/execution_times",
            "Errors": "cloudfunctions.googleapis.com/function/execution_count",
            "ConcurrentExecutions": "cloudfunctions.googleapis.com/function/active_instances",
        }
    },
}


def translate_metric(namespace, metric_name):
    """Translate a CloudWatch metric to its GCP equivalent."""
    ns_config = METRIC_MAP.get(namespace, {})
    gcp_metric = ns_config.get("metrics", {}).get(metric_name)
    resource_type = ns_config.get("resource_type")

    return {
        "gcp_metric": gcp_metric,
        "resource_type": resource_type,
    }
```

## Converting Alarms to Alert Policies

Translate CloudWatch alarms to Google Cloud Monitoring alert policies:

```python
# convert_alarms.py
# Converts CloudWatch alarms to Terraform GCP alert policies
import json
from metric_mapping import METRIC_MAP

# Map CloudWatch comparison operators to GCP
COMPARISON_MAP = {
    "GreaterThanThreshold": "COMPARISON_GT",
    "GreaterThanOrEqualToThreshold": "COMPARISON_GE",
    "LessThanThreshold": "COMPARISON_LT",
    "LessThanOrEqualToThreshold": "COMPARISON_LE",
}

# Map CloudWatch statistics to GCP aligners
STATISTIC_MAP = {
    "Average": "ALIGN_MEAN",
    "Sum": "ALIGN_SUM",
    "Maximum": "ALIGN_MAX",
    "Minimum": "ALIGN_MIN",
    "SampleCount": "ALIGN_COUNT",
    "p99": "ALIGN_PERCENTILE_99",
    "p95": "ALIGN_PERCENTILE_95",
    "p90": "ALIGN_PERCENTILE_90",
}


def convert_alarm_to_terraform(alarm):
    """Convert a CloudWatch alarm to Terraform HCL for GCP."""
    namespace = alarm['namespace']
    metric = alarm['metric']

    ns_config = METRIC_MAP.get(namespace, {})
    gcp_metric = ns_config.get("metrics", {}).get(metric, "")
    resource_type = ns_config.get("resource_type", "")

    comparison = COMPARISON_MAP.get(alarm['comparison'], "COMPARISON_GT")
    aligner = STATISTIC_MAP.get(alarm['statistic'], "ALIGN_MEAN")

    # Generate Terraform HCL
    safe_name = alarm['name'].lower().replace(' ', '-').replace('_', '-')

    hcl = f'''
resource "google_monitoring_alert_policy" "{safe_name}" {{
  display_name = "{alarm['name']}"
  project      = var.project_id

  conditions {{
    display_name = "{alarm.get('description', alarm['name'])}"

    condition_threshold {{
      filter          = "resource.type = \\"{resource_type}\\" AND metric.type = \\"{gcp_metric}\\""
      comparison      = "{comparison}"
      threshold_value = {alarm['threshold']}
      duration        = "{alarm['period'] * alarm['evaluation_periods']}s"

      aggregations {{
        alignment_period   = "{alarm['period']}s"
        per_series_aligner = "{aligner}"
      }}
    }}
  }}

  notification_channels = var.notification_channels

  alert_strategy {{
    auto_close = "1800s"
  }}
}}
'''
    return hcl


def convert_all_alarms(alarms_file, output_file):
    """Convert all exported CloudWatch alarms to Terraform."""
    with open(alarms_file, 'r') as f:
        alarms = json.load(f)

    terraform_configs = []
    skipped = []

    for alarm in alarms:
        ns_config = METRIC_MAP.get(alarm['namespace'])
        if not ns_config:
            skipped.append(alarm['name'])
            continue

        if alarm['metric'] not in ns_config.get('metrics', {}):
            skipped.append(alarm['name'])
            continue

        hcl = convert_alarm_to_terraform(alarm)
        terraform_configs.append(hcl)

    # Write Terraform file
    with open(output_file, 'w') as f:
        f.write("# Auto-generated alert policies migrated from CloudWatch\n\n")
        for config in terraform_configs:
            f.write(config)
            f.write("\n")

    print(f"Converted {len(terraform_configs)} alarms")
    print(f"Skipped {len(skipped)} alarms (no metric mapping)")

    if skipped:
        print("Skipped alarms:")
        for name in skipped:
            print(f"  - {name}")


if __name__ == '__main__':
    convert_all_alarms(
        'cloudwatch_export/alarms.json',
        'terraform/alert_policies.tf'
    )
```

## Creating Equivalent Dashboards

Here is an example of a Terraform dashboard that mirrors a typical CloudWatch dashboard:

```hcl
# dashboard.tf
# Google Cloud Monitoring dashboard equivalent to CloudWatch

resource "google_monitoring_dashboard" "application" {
  dashboard_json = jsonencode({
    displayName = "Application Overview"

    gridLayout = {
      columns = 2
      widgets = [
        # CPU Utilization chart
        {
          title = "CPU Utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
            }]
            yAxis = {
              scale = "LINEAR"
              label = "CPU %"
            }
          }
        },
        # Request Latency chart
        {
          title = "Request Latency (p99)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"https_lb_rule\" AND metric.type = \"loadbalancing.googleapis.com/https/backend_latencies\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_99"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
            }]
            yAxis = {
              scale = "LINEAR"
              label = "Latency (ms)"
            }
          }
        },
        # Error Rate chart
        {
          title = "5xx Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"https_lb_rule\" AND metric.type = \"loadbalancing.googleapis.com/https/request_count\" AND metric.labels.response_code_class = \"500\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
            }]
          }
        },
        # Database Connections
        {
          title = "Database Connections"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/postgresql/num_backends\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })

  project = var.project_id
}
```

## Setting Up Notification Channels

Replace SNS topics with Google Cloud notification channels:

```hcl
# notifications.tf
# Notification channels equivalent to SNS topics

resource "google_monitoring_notification_channel" "email" {
  display_name = "On-Call Team Email"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = "oncall@example.com"
  }
}

resource "google_monitoring_notification_channel" "slack" {
  display_name = "Engineering Slack"
  type         = "slack"
  project      = var.project_id

  labels = {
    channel_name = "#alerts-production"
  }

  sensitive_labels {
    auth_token = var.slack_webhook_token
  }
}

resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty"
  type         = "pagerduty"
  project      = var.project_id

  labels = {
    service_key = var.pagerduty_service_key
  }
}
```

## Wrapping Up

Migrating monitoring from CloudWatch to Google Cloud Monitoring takes effort, but the concepts map well enough that automated translation handles most of the work. The scripts in this post can export your CloudWatch configuration, map metrics to GCP equivalents, and generate Terraform code for the new alert policies. Start with your most critical alarms, verify they fire correctly in GCP, and then move on to dashboards and lower-priority alerts. The goal is to have equivalent monitoring coverage on GCP before you cut over your production workloads.
