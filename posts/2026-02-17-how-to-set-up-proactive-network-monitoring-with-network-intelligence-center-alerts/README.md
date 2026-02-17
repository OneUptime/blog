# How to Set Up Proactive Network Monitoring with Network Intelligence Center Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Intelligence Center, Network Monitoring, Cloud Monitoring, Google Cloud Alerts

Description: Learn how to set up proactive alerting for GCP network issues using Network Intelligence Center combined with Cloud Monitoring to catch problems before they impact users.

---

Reactive monitoring means you find out about network problems when users start complaining. Proactive monitoring means you get alerted before users even notice. Network Intelligence Center provides the data, and Cloud Monitoring provides the alerting framework. Together, they give you a system that watches your network around the clock and notifies you when something goes wrong.

In this post, I will show you how to set up a complete proactive network monitoring system using Network Intelligence Center data and Cloud Monitoring alerts.

## The Components

The setup involves several pieces working together:

- **Performance Dashboard** for inter-zone latency and packet loss metrics
- **Connectivity Tests** for ongoing reachability verification
- **Network Analyzer** for configuration analysis
- **Cloud Monitoring** for alerting policies and notification channels
- **Cloud Scheduler** for periodic test execution

## Step 1: Set Up Notification Channels

Before creating alerts, you need somewhere to send them. Set up notification channels for your team:

```bash
# Create an email notification channel
gcloud monitoring channels create \
  --display-name="Network Ops Team Email" \
  --type=email \
  --channel-labels=email_address=network-ops@example.com \
  --project=my-project

# List notification channels to get the channel ID
gcloud monitoring channels list \
  --project=my-project \
  --format="table(name,displayName,type)"
```

For PagerDuty or Slack integration, you can set up webhook channels:

```bash
# Create a PagerDuty notification channel
gcloud monitoring channels create \
  --display-name="PagerDuty - Network Alerts" \
  --type=pagerduty \
  --channel-labels=service_key=YOUR_PAGERDUTY_SERVICE_KEY \
  --project=my-project
```

## Step 2: Create Latency Alerts

Set up alerts for inter-zone latency that exceed your thresholds. The thresholds depend on the zone pair:

```bash
# Alert for elevated latency between zones in the same region
# Normal is under 1ms, alert at 5ms
gcloud monitoring policies create \
  --display-name="Intra-Region Latency Alert" \
  --condition-display-name="Same-region latency exceeds 5ms" \
  --condition-filter='metric.type="networking.googleapis.com/vm_flow/rtt" AND
                      metric.labels.source_zone=starts_with("us-central1") AND
                      metric.labels.destination_zone=starts_with("us-central1")' \
  --condition-threshold-value=0.005 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

```bash
# Alert for elevated latency between regions
# Normal for us-central1 to us-east1 is about 20ms, alert at 50ms
gcloud monitoring policies create \
  --display-name="Cross-Region Latency Alert" \
  --condition-display-name="Cross-region latency exceeds 50ms" \
  --condition-filter='metric.type="networking.googleapis.com/vm_flow/rtt" AND
                      metric.labels.source_zone=starts_with("us-central1") AND
                      metric.labels.destination_zone=starts_with("us-east1")' \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

## Step 3: Create Packet Loss Alerts

Any sustained packet loss is a concern. Alert on even small amounts:

```bash
# Alert on packet loss exceeding 0.1% for any zone pair
gcloud monitoring policies create \
  --display-name="Network Packet Loss Alert" \
  --condition-display-name="Packet loss exceeds 0.1%" \
  --condition-filter='metric.type="networking.googleapis.com/vm_flow/packet_loss"' \
  --condition-threshold-value=0.001 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

## Step 4: Automate Connectivity Test Reruns

Connectivity tests check configuration at a point in time. To make them continuous, schedule periodic reruns:

First, create the connectivity tests for your critical paths:

```bash
# Create connectivity tests for critical paths
gcloud network-management connectivity-tests create web-to-api \
  --source-instance=projects/my-project/zones/us-central1-a/instances/web-frontend \
  --destination-instance=projects/my-project/zones/us-central1-b/instances/api-server \
  --destination-port=8080 \
  --protocol=TCP \
  --project=my-project

gcloud network-management connectivity-tests create api-to-db \
  --source-instance=projects/my-project/zones/us-central1-b/instances/api-server \
  --destination-instance=projects/my-project/zones/us-central1-c/instances/db-primary \
  --destination-port=5432 \
  --protocol=TCP \
  --project=my-project
```

Then create a Cloud Function that reruns these tests and alerts on failures:

```python
# cloud_function/main.py - Cloud Function to rerun connectivity tests
import functions_framework
from google.cloud import network_management_v1
from google.cloud import monitoring_v3
import time

@functions_framework.http
def check_connectivity(request):
    """Rerun connectivity tests and create incidents for failures."""
    client = network_management_v1.ReachabilityServiceClient()
    project = "my-project"

    # List of critical connectivity tests to check
    tests = ["web-to-api", "api-to-db", "api-to-cache", "web-to-cdn"]

    failures = []
    for test_name in tests:
        test_path = f"projects/{project}/locations/global/connectivityTests/{test_name}"

        # Rerun the test
        operation = client.rerun_connectivity_test(
            request={"name": test_path}
        )
        result = operation.result()  # Wait for completion

        # Check the result
        if result.reachability_details.result != \
           network_management_v1.ReachabilityDetails.Result.REACHABLE:
            failures.append({
                "test": test_name,
                "result": str(result.reachability_details.result),
            })

    if failures:
        # Log failures for alerting
        for f in failures:
            print(f"CONNECTIVITY_FAILURE: {f['test']} - {f['result']}")

    return {"failures": failures, "total_tests": len(tests)}
```

Schedule it with Cloud Scheduler:

```bash
# Create a Cloud Scheduler job to run connectivity checks every 15 minutes
gcloud scheduler jobs create http connectivity-check-job \
  --schedule="*/15 * * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/check-connectivity" \
  --http-method=POST \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --project=my-project
```

## Step 5: Monitor VPN Tunnel Health

If you use Cloud VPN, set up alerts for tunnel state changes:

```bash
# Alert on VPN tunnel status changes
gcloud monitoring policies create \
  --display-name="VPN Tunnel Down Alert" \
  --condition-display-name="VPN tunnel is not established" \
  --condition-filter='metric.type="compute.googleapis.com/vpn_tunnel/tunnel_established" AND
                      metric.labels.tunnel_name=monitoring.regex.full_match(".*")' \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_LT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

## Step 6: Create a Network Health Dashboard

Bring everything together in a single dashboard:

```bash
# Create a comprehensive network health dashboard
gcloud monitoring dashboards create --config='{
  "displayName": "Network Health Overview",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Inter-Zone Latency (All Pairs)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"networking.googleapis.com/vm_flow/rtt\""
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Packet Loss (All Pairs)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"networking.googleapis.com/vm_flow/packet_loss\""
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "VPN Tunnel Status",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"compute.googleapis.com/vpn_tunnel/tunnel_established\""
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Load Balancer Backend Health",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"loadbalancing.googleapis.com/https/backend_request_count\""
                }
              }
            }]
          }
        }
      }
    ]
  }
}'
```

## Alert Tuning Tips

After running for a week or two, you will likely need to tune your alerts. Here are some practical tips:

Avoid alerting on single data points. Use a duration of at least 300 seconds (5 minutes) to avoid false positives from momentary blips.

Set different thresholds for business hours and off-hours. Non-critical latency alerts at 2 AM can wait until morning, but a VPN tunnel going down always needs immediate attention.

Use alert grouping to avoid notification storms. If a regional issue causes multiple alerts to fire simultaneously, you want one notification, not fifty.

Create an escalation chain. Start with email, escalate to Slack after 10 minutes, and escalate to PagerDuty after 30 minutes if not acknowledged.

## Summary

Proactive network monitoring with Network Intelligence Center combines several tools: Performance Dashboard metrics for latency and packet loss alerts, scheduled connectivity tests for ongoing reachability verification, Network Analyzer for configuration issue detection, and Cloud Monitoring for the alerting and notification framework. Set up all four components, tune the thresholds to your environment, and you will catch network issues before they reach your users.
