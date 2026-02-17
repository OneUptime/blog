# How to Monitor Pub/Sub Subscription Backlog and Oldest Unacked Message Age

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Monitoring, Cloud Monitoring, Observability

Description: Learn how to monitor Pub/Sub subscription backlog size and oldest unacknowledged message age to detect processing delays and ensure your messaging pipeline stays healthy.

---

A Pub/Sub subscription backlog tells you how many messages are waiting to be processed. The oldest unacknowledged message age tells you how far behind your subscriber is. Together, these two metrics give you the clearest picture of whether your messaging pipeline is healthy or heading toward trouble.

If the backlog is growing, your subscriber is not keeping up with the publish rate. If the oldest unacked message age is increasing, something is stuck. Both of these situations need attention before they snowball into a production incident.

## The Key Metrics

Pub/Sub exports several metrics to Cloud Monitoring, but two are essential for backlog monitoring:

**`pubsub.googleapis.com/subscription/num_undelivered_messages`** - The number of messages that have been published to the topic but not yet acknowledged by the subscriber. This is your backlog size.

**`pubsub.googleapis.com/subscription/oldest_unacked_message_age`** - The age (in seconds) of the oldest unacknowledged message in the subscription. This tells you the maximum delay in your pipeline.

A healthy subscription has a small, stable backlog and a low oldest message age. The exact numbers depend on your use case - a real-time alerting system should have near-zero backlog, while a batch processing system might intentionally accumulate messages between processing windows.

## Checking Backlog from the Command Line

You can quickly check a subscription's backlog with gcloud:

```bash
# Check the number of undelivered messages
gcloud pubsub subscriptions describe my-subscription \
  --format="value(messageRetentionDuration)"

# Use Cloud Monitoring to get the current backlog
gcloud monitoring read \
  "pubsub.googleapis.com/subscription/num_undelivered_messages" \
  --filter='resource.labels.subscription_id = "my-subscription"' \
  --interval-start-time="$(date -u -d '-5 minutes' +%Y-%m-%dT%H:%M:%SZ)" \
  --format=json
```

For a quick snapshot, you can also use the Pub/Sub API directly:

```python
# Check subscription backlog programmatically
from google.cloud import monitoring_v3
from google.protobuf.timestamp_pb2 import Timestamp
import time

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/my-project"

# Query the backlog metric
now = time.time()
interval = monitoring_v3.TimeInterval(
    end_time=Timestamp(seconds=int(now)),
    start_time=Timestamp(seconds=int(now - 300)),  # Last 5 minutes
)

results = client.list_time_series(
    request={
        "name": project_name,
        "filter": (
            'metric.type = "pubsub.googleapis.com/subscription/num_undelivered_messages"'
            ' AND resource.labels.subscription_id = "my-subscription"'
        ),
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
    }
)

for series in results:
    for point in series.points:
        print(f"Backlog: {point.value.int64_value} messages")
```

## Creating a Monitoring Dashboard

A custom Cloud Monitoring dashboard makes it easy to visualize backlog trends. Here is how to create one with the gcloud CLI:

```bash
# Create a monitoring dashboard for Pub/Sub subscription health
gcloud monitoring dashboards create --config='{
  "displayName": "Pub/Sub Subscription Health",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Subscription Backlog (Messages)",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }]
        }
      },
      {
        "title": "Oldest Unacked Message Age (Seconds)",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"pubsub.googleapis.com/subscription/oldest_unacked_message_age\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MAX"
                }
              }
            }
          }]
        }
      }
    ]
  }
}'
```

## Setting Up Alerts

Dashboards are great for investigation, but alerts catch problems when you are not looking. Here are the essential alert policies:

### Alert on Growing Backlog

```hcl
# Alert when subscription backlog exceeds threshold
resource "google_monitoring_alert_policy" "backlog_high" {
  display_name = "Pub/Sub Backlog Too High"
  combiner     = "OR"

  conditions {
    display_name = "Subscription backlog above 10000 messages"

    condition_threshold {
      filter = <<-EOT
        resource.type = "pubsub_subscription"
        AND metric.type = "pubsub.googleapis.com/subscription/num_undelivered_messages"
      EOT

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 10000
      duration        = "600s"  # Must be above threshold for 10 minutes

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.name,
  ]

  documentation {
    content   = "Subscription backlog is growing. Check subscriber health and scaling."
    mime_type = "text/markdown"
  }
}
```

### Alert on Stale Messages

```hcl
# Alert when oldest unacked message is too old
resource "google_monitoring_alert_policy" "message_age_high" {
  display_name = "Pub/Sub Oldest Message Too Old"
  combiner     = "OR"

  conditions {
    display_name = "Oldest unacked message age above 1 hour"

    condition_threshold {
      filter = <<-EOT
        resource.type = "pubsub_subscription"
        AND metric.type = "pubsub.googleapis.com/subscription/oldest_unacked_message_age"
      EOT

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MAX"
      }

      # Alert if oldest message is more than 3600 seconds (1 hour) old
      comparison      = "COMPARISON_GT"
      threshold_value = 3600
      duration        = "300s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
  ]

  documentation {
    content   = "Messages are stuck in the subscription for over 1 hour. This indicates subscriber failure or a poison message."
    mime_type = "text/markdown"
  }
}
```

### Alert on Specific Subscriptions

For critical subscriptions, set tighter thresholds:

```hcl
# Tight alerting for a critical real-time subscription
resource "google_monitoring_alert_policy" "critical_sub_backlog" {
  display_name = "Critical Sub - Backlog Alert"
  combiner     = "OR"

  conditions {
    display_name = "Payment processor backlog"

    condition_threshold {
      filter = <<-EOT
        resource.type = "pubsub_subscription"
        AND resource.labels.subscription_id = "payment-processor-sub"
        AND metric.type = "pubsub.googleapis.com/subscription/num_undelivered_messages"
      EOT

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      # Much tighter threshold for payment processing
      comparison      = "COMPARISON_GT"
      threshold_value = 100
      duration        = "120s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
  ]
}
```

## Interpreting the Metrics

Understanding what the metrics tell you:

### Steady Backlog, Low Age
Your subscriber is processing at the same rate as publishing. The backlog represents the normal in-flight messages. This is healthy.

### Growing Backlog, Growing Age
Your subscriber cannot keep up. Either publish rate has increased, subscriber throughput has decreased, or some messages are failing and being retried. Action needed.

### Spike Then Recovery
A burst of messages or a brief subscriber outage. The backlog spikes then drains back to normal. Usually fine, but worth investigating if frequent.

### High Age, Low Backlog
A single message (or a few) is stuck while others process fine. This is likely a poison message that keeps failing and being redelivered. Check your dead letter configuration.

### Zero Backlog Suddenly
Either the topic stopped receiving messages (check publisher health) or the subscription was deleted and recreated (check audit logs).

## Building a Backlog Monitor Script

For teams that want a quick CLI check across all subscriptions:

```python
# Script to check backlog across all subscriptions in a project
from google.cloud import monitoring_v3, pubsub_v1
from google.protobuf.timestamp_pb2 import Timestamp
import time

def check_all_backlogs(project_id):
    """Check backlog for all subscriptions in a project."""
    # List all subscriptions
    sub_client = pubsub_v1.SubscriberClient()
    project_path = f"projects/{project_id}"

    subscriptions = list(sub_client.list_subscriptions(
        request={"project": project_path}
    ))

    # Query metrics
    monitoring_client = monitoring_v3.MetricServiceClient()
    now = time.time()
    interval = monitoring_v3.TimeInterval(
        end_time=Timestamp(seconds=int(now)),
        start_time=Timestamp(seconds=int(now - 300)),
    )

    # Get backlog counts
    results = monitoring_client.list_time_series(
        request={
            "name": project_path,
            "filter": 'metric.type = "pubsub.googleapis.com/subscription/num_undelivered_messages"',
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        }
    )

    print(f"{'Subscription':<50} {'Backlog':>10}")
    print("-" * 62)

    for series in results:
        sub_id = series.resource.labels.get("subscription_id", "unknown")
        latest_value = series.points[0].value.int64_value if series.points else 0
        status = " *** WARNING ***" if latest_value > 1000 else ""
        print(f"{sub_id:<50} {latest_value:>10}{status}")

if __name__ == "__main__":
    check_all_backlogs("my-project")
```

## Autoscaling Based on Backlog

For subscribers running on GKE, you can use the backlog metric to drive autoscaling:

```yaml
# HPA configuration that scales based on Pub/Sub backlog
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pubsub-subscriber-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-processor
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: pubsub.googleapis.com|subscription|num_undelivered_messages
        selector:
          matchLabels:
            resource.labels.subscription_id: my-subscription
      target:
        type: AverageValue
        averageValue: 1000  # Target 1000 messages per pod
```

This configuration scales the subscriber deployment up when the backlog grows and back down when it shrinks.

## Best Practices

1. **Set different thresholds for different subscriptions.** A real-time payment system and a daily analytics pipeline have very different acceptable backlog sizes.

2. **Monitor the rate of change, not just the absolute value.** A backlog of 10,000 messages that is shrinking is fine. A backlog of 1,000 messages that is growing is a problem.

3. **Combine backlog and age alerts.** High backlog alone might be acceptable during expected traffic spikes. High message age almost always indicates a problem.

4. **Include subscription context in alerts.** When an alert fires at 3 AM, the on-call engineer needs to immediately know which subscription, which topic, and what service is affected.

5. **Review thresholds quarterly.** As your traffic patterns change, your alerting thresholds should change too.

## Wrapping Up

Monitoring the subscription backlog and oldest unacked message age gives you early warning of processing problems. Set up dashboards for visibility, alerts for automated detection, and autoscaling for automatic remediation. The goal is to catch growing backlogs before they become customer-impacting incidents. Start with the two key metrics - backlog size and message age - and build from there based on what your team needs.
