# Set Up Automated PagerDuty Incident Creation from Google Cloud Error Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, PagerDuty, Error Reporting, Incident Management, Cloud Monitoring, Alerting

Description: Set up an automated pipeline that creates PagerDuty incidents when new errors or error spikes are detected in Google Cloud Error Reporting.

---

Google Cloud Error Reporting automatically groups and surfaces application errors from your services running on App Engine, Cloud Functions, Cloud Run, GKE, and Compute Engine. But detection without action is just a dashboard nobody checks. The real value comes when new or spiking errors automatically create incidents in PagerDuty so your team can respond before users start filing support tickets.

This guide shows you how to connect Error Reporting to PagerDuty through Cloud Monitoring notification channels, and how to build a more advanced pipeline using Cloud Functions for richer incident context.

## The Simple Approach: Error Reporting Notifications

Error Reporting can send notifications when it sees a new error group or when an error event occurs in a group that has been marked Resolved. You can route those notifications to PagerDuty through a Cloud Monitoring notification channel.

### Set Up the PagerDuty Notification Channel

```bash
# Create a PagerDuty notification channel in Cloud Monitoring

gcloud beta monitoring channels create \
  --type=pagerduty \
  --display-name="PagerDuty - Application Errors" \
  --channel-labels=service_key=YOUR_PAGERDUTY_INTEGRATION_KEY \
  --project=my-project
```

After creating the channel, open Error Reporting, click **Configure notifications**, and select the PagerDuty notification channel. Error Reporting notifications are for new and reopened error groups, not every repeated occurrence in an already-open group.

### Create an Alert for New Error Groups

Error Reporting creates a new error group when it sees an error it has not seen before. The notification setting above is the supported path for these new-error-group notifications.

### Create an Alert for Error Rate Spikes

A sudden increase in error rate is often more urgent than a single new error. Use a Cloud Monitoring alerting policy on the relevant request-count metric to catch spikes. This Cloud Run example alerts on sustained 5xx responses; use the matching request metric for App Engine, GKE, or another runtime if your service runs elsewhere.

```bash
# Alert when Cloud Run 5xx responses stay above the threshold
gcloud monitoring policies create \
  --display-name="Error Rate Spike" \
  --condition-display-name="Error count spike" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_RATE"}' \
  --if='> 1' \
  --duration=300s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --documentation='5xx response rate is above threshold. Check Error Reporting for stack traces and affected services.' \
  --project=my-project
```

## The Advanced Approach: Cloud Functions Pipeline

The simple approach works but creates incidents with limited context. A Cloud Function can receive Error Reporting or Cloud Monitoring notifications, extract rich details like stack traces and affected versions, and create much more useful PagerDuty incidents.

### Architecture

The flow works as follows: Error Reporting detects a new or reopened error group, or Cloud Monitoring detects a spike in an error metric. A Pub/Sub notification channel publishes the notification, which triggers a Cloud Function. The function queries the Error Reporting API for details, then creates a PagerDuty incident with full context.

### The Cloud Function

```python
# main.py
# Cloud Function that creates rich PagerDuty incidents from Error Reporting notifications
import json
import os
import base64
import requests
from google.cloud import errorreporting_v1beta1
from datetime import datetime, timedelta

# PagerDuty Events API v2 endpoint
PD_EVENTS_URL = "https://events.pagerduty.com/v2/enqueue"
PD_ROUTING_KEY = os.environ["PAGERDUTY_ROUTING_KEY"]
PROJECT_ID = os.environ["GCP_PROJECT_ID"]


def handle_error_alert(event, context):
    """Triggered by a Cloud Monitoring alert notification via Pub/Sub."""

    # Parse the alert notification
    alert_data = json.loads(base64.b64decode(event["data"]).decode("utf-8")) if "data" in event else event

    # Extract the condition and metric information
    incident = alert_data.get("incident", {})
    condition_name = incident.get("condition_name") or alert_data.get("subject", "Error Reporting notification")
    resource_name = incident.get("resource_name") or alert_data.get("group_info", {}).get("detail_link", "Unknown")

    # Query Error Reporting for recent error details
    error_details = get_recent_errors()

    # Build a rich PagerDuty event
    pd_event = {
        "routing_key": PD_ROUTING_KEY,
        "event_action": "trigger",
        "dedup_key": f"gcp-error-{condition_name}-{datetime.utcnow().strftime('%Y%m%d%H')}",
        "payload": {
            "summary": f"Error spike detected: {condition_name}",
            "severity": determine_severity(error_details),
            "source": f"GCP Error Reporting - {PROJECT_ID}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "component": resource_name,
            "group": "application-errors",
            "custom_details": {
                "project": PROJECT_ID,
                "error_count": error_details.get("count", 0),
                "top_errors": error_details.get("top_errors", []),
                "affected_services": error_details.get("services", []),
                "error_reporting_url": f"https://console.cloud.google.com/errors?project={PROJECT_ID}",
                "first_seen": error_details.get("first_seen", "unknown"),
                "stack_trace_preview": error_details.get("stack_preview", "N/A")
            }
        },
        "links": [
            {
                "href": f"https://console.cloud.google.com/errors?project={PROJECT_ID}",
                "text": "View in Error Reporting"
            }
        ]
    }

    # Send to PagerDuty
    response = requests.post(PD_EVENTS_URL, json=pd_event)
    response.raise_for_status()
    print(f"PagerDuty incident created: {response.json()}")


def get_recent_errors():
    """Fetch recent error groups from Error Reporting API."""
    client = errorreporting_v1beta1.ErrorStatsServiceClient()
    project_name = f"projects/{PROJECT_ID}"

    # Look at the last hour of errors
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    try:
        # List error group stats for the recent window
        request = errorreporting_v1beta1.ListGroupStatsRequest(
            project_name=project_name,
            time_range=errorreporting_v1beta1.QueryTimeRange(
                period=errorreporting_v1beta1.QueryTimeRange.Period.PERIOD_1_HOUR
            ),
            order=errorreporting_v1beta1.ErrorGroupOrder.COUNT_DESC,
            page_size=5
        )
        response = client.list_group_stats(request=request)

        top_errors = []
        total_count = 0
        services = set()
        stack_preview = ""

        for stat in response:
            total_count += stat.count
            error_info = {
                "message": stat.representative.message[:300] if stat.representative.message else stat.group.group_id,
                "count": stat.count,
                "affected_users": stat.affected_users_count
            }
            top_errors.append(error_info)

            # Collect service names from affected services
            for svc in stat.affected_services:
                if svc.service:
                    services.add(svc.service)
                if svc.version:
                    services.add(f"{svc.service}:{svc.version}")

            if stat.representative.message and not stack_preview:
                stack_preview = stat.representative.message

        return {
            "count": total_count,
            "top_errors": top_errors[:5],
            "services": list(services),
            "first_seen": str(one_hour_ago),
            "stack_preview": stack_preview[:500] if stack_preview else "Check Error Reporting console"
        }

    except Exception as e:
        print(f"Error querying Error Reporting: {e}")
        return {"count": 0, "top_errors": [], "services": [], "stack_preview": str(e)}


def determine_severity(error_details):
    """Map error count to PagerDuty severity levels."""
    count = error_details.get("count", 0)
    if count > 1000:
        return "critical"
    elif count > 100:
        return "error"
    elif count > 10:
        return "warning"
    else:
        return "info"
```

### Deploying the Cloud Function

```bash
# Deploy the Cloud Function triggered by Pub/Sub
gcloud functions deploy error-to-pagerduty \
  --runtime=python311 \
  --trigger-topic=error-alert-notifications \
  --entry-point=handle_error_alert \
  --set-env-vars="PAGERDUTY_ROUTING_KEY=YOUR_KEY,GCP_PROJECT_ID=my-project" \
  --region=us-central1 \
  --memory=256MB \
  --timeout=60s \
  --project=my-project
```

### Update Notifications to Trigger the Function

Create a Pub/Sub notification channel, select it in Error Reporting notifications, and add it to any alerting policies that should publish to the function.

```bash
# Create a Pub/Sub topic for alert notifications
gcloud pubsub topics create error-alert-notifications --project=my-project

# Create a Pub/Sub notification channel in Cloud Monitoring
gcloud beta monitoring channels create \
  --type=pubsub \
  --display-name="Error Alert Pipeline" \
  --channel-labels=topic=projects/my-project/topics/error-alert-notifications \
  --project=my-project

# Allow Cloud Monitoring notifications to publish to the topic
PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(project_number)")
gcloud pubsub topics add-iam-policy-binding \
  projects/my-project/topics/error-alert-notifications \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-monitoring-notification.iam.gserviceaccount.com" \
  --role=roles/pubsub.publisher \
  --project=my-project
```

## Deduplication Strategy

Error spikes often trigger multiple alerts in rapid succession. The `dedup_key` in the PagerDuty event prevents creating duplicate incidents.

In the Cloud Function above, we use a dedup key that includes the hour. This means:
- Multiple alerts within the same hour for the same condition merge into a single incident.
- A new hour starts a new incident if the problem persists, which serves as a natural escalation signal.

Adjust this strategy based on your needs. Some teams prefer a wider window (daily) while others want tighter dedup (per 15 minutes).

## Testing the Pipeline

Trigger a test error in one of your services to verify the full flow.

```python
# test_trigger_error.py
# Deploy this to a Cloud Function or Cloud Run to generate a test error
from google.cloud import error_reporting

def trigger_test_error(request):
    """Generate a test error for Error Reporting."""
    client = error_reporting.Client()
    try:
        raise ValueError("Test error for PagerDuty integration verification")
    except ValueError:
        client.report_exception()
    return "Test error reported", 200
```

After triggering the error, check the following in sequence: Error Reporting console shows the new error, the Error Reporting notification or Cloud Monitoring alert publishes to Pub/Sub, the Cloud Function executes successfully (check Cloud Logging), and PagerDuty shows a new incident with the enriched details.

## Fine-Tuning Alert Sensitivity

Start with lenient thresholds and tighten over time. An error rate alert that fires on 5 errors per minute might be right for a low-traffic service but would trigger constantly on a high-traffic one. Normalize by request count when possible - alert on error percentage rather than absolute count.

The combination of Error Reporting's automatic grouping and PagerDuty's incident management creates a feedback loop that keeps your team informed without overwhelming them. New errors get attention, spikes get investigated, and resolved errors stop creating noise.
