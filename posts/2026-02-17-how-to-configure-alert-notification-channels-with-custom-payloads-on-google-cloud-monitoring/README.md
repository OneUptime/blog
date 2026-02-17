# How to Configure Alert Notification Channels with Custom Payloads on Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Alerting, Webhooks, Notification Channels

Description: Learn how to configure custom notification channels and webhook payloads in Google Cloud Monitoring to route alerts to Slack, PagerDuty, and custom systems with rich context.

---

The default notification payloads from Google Cloud Monitoring are functional but generic. When an alert fires, you want your team to immediately understand what is happening without clicking through three links. Custom notification channels and webhook payloads let you control exactly what information gets sent and how it is formatted, whether you are sending to Slack, PagerDuty, a custom API, or all three at once.

In this post, I will walk through setting up different notification channels, customizing webhook payloads, and building notification routing logic that matches how your team actually works.

## Notification Channel Types

Cloud Monitoring supports several built-in notification channel types:

- **Email** - Simple but gets buried in inboxes
- **SMS** - Good for critical alerts to on-call
- **Slack** - Most common for team visibility
- **PagerDuty** - For incident management workflows
- **Webhooks** - For custom integrations and routing
- **Pub/Sub** - For programmatic alert handling
- **Mobile push** - Through the Cloud Console mobile app

## Setting Up a Slack Notification Channel

```bash
# Create a Slack notification channel using gcloud
gcloud beta monitoring channels create \
  --display-name="Engineering Slack" \
  --type=slack \
  --channel-labels=channel_name="#engineering-alerts" \
  --channel-labels=auth_token="xoxb-your-slack-bot-token" \
  --project=my-project
```

Or using Terraform:

```hcl
# Terraform: Slack notification channel
resource "google_monitoring_notification_channel" "slack_engineering" {
  display_name = "Engineering Slack"
  type         = "slack"

  labels = {
    channel_name = "#engineering-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_bot_token
  }
}
```

## Setting Up PagerDuty

```hcl
# Terraform: PagerDuty notification channel
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty - Production"
  type         = "pagerduty"

  labels = {
    service_key = var.pagerduty_service_key
  }
}
```

## Setting Up Webhook Channels with Custom Payloads

Webhooks are the most flexible option. They let you send alert data to any HTTP endpoint:

```hcl
# Terraform: Webhook notification channel
resource "google_monitoring_notification_channel" "custom_webhook" {
  display_name = "Custom Alert Router"
  type         = "webhook_tokenauth"

  labels = {
    url = "https://my-alert-router.run.app/alerts"
  }

  sensitive_labels {
    auth_token = var.webhook_auth_token
  }
}
```

## Building a Custom Alert Router

The real power comes from building a custom webhook receiver that reformats and routes alerts. Here is a Cloud Run service that receives Cloud Monitoring webhooks and routes them to different Slack channels with rich formatting:

```python
# alert_router.py - Custom webhook receiver for Cloud Monitoring alerts
from flask import Flask, request, jsonify
import requests
import json
from datetime import datetime

app = Flask(__name__)

# Configuration: route alerts based on policy name patterns
ROUTING_CONFIG = {
    'production': {
        'slack_channel': '#prod-alerts',
        'slack_webhook': 'https://hooks.slack.com/services/xxx/yyy/zzz',
        'severity': 'critical',
    },
    'staging': {
        'slack_channel': '#staging-alerts',
        'slack_webhook': 'https://hooks.slack.com/services/aaa/bbb/ccc',
        'severity': 'warning',
    },
    'database': {
        'slack_channel': '#dba-alerts',
        'slack_webhook': 'https://hooks.slack.com/services/ddd/eee/fff',
        'severity': 'high',
    },
}

def get_route(policy_name):
    """Determine where to route an alert based on policy name."""
    policy_lower = policy_name.lower()
    for keyword, config in ROUTING_CONFIG.items():
        if keyword in policy_lower:
            return config
    # Default route
    return ROUTING_CONFIG.get('production')

def format_slack_message(alert_data):
    """Format a Cloud Monitoring alert into a rich Slack message."""
    incident = alert_data.get('incident', {})

    # Extract key fields from the alert payload
    policy_name = incident.get('policy_name', 'Unknown Policy')
    state = incident.get('state', 'unknown')
    started = incident.get('started_at', '')
    summary = incident.get('summary', 'No summary available')
    resource_name = incident.get('resource_name', 'unknown')
    url = incident.get('url', '')

    # Determine color based on state
    color = '#ff0000' if state == 'open' else '#36a64f'  # Red for open, green for resolved
    state_emoji = 'FIRING' if state == 'open' else 'RESOLVED'

    # Build the Slack message with blocks
    message = {
        'attachments': [
            {
                'color': color,
                'blocks': [
                    {
                        'type': 'header',
                        'text': {
                            'type': 'plain_text',
                            'text': f'[{state_emoji}] {policy_name}',
                        },
                    },
                    {
                        'type': 'section',
                        'fields': [
                            {
                                'type': 'mrkdwn',
                                'text': f'*Resource:*\n{resource_name}',
                            },
                            {
                                'type': 'mrkdwn',
                                'text': f'*Started:*\n{started}',
                            },
                        ],
                    },
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': f'*Summary:*\n{summary}',
                        },
                    },
                    {
                        'type': 'actions',
                        'elements': [
                            {
                                'type': 'button',
                                'text': {
                                    'type': 'plain_text',
                                    'text': 'View in Cloud Monitoring',
                                },
                                'url': url,
                                'style': 'primary',
                            },
                        ],
                    },
                ],
            }
        ],
    }

    return message

@app.route('/alerts', methods=['POST'])
def receive_alert():
    """Receive and route Cloud Monitoring alerts."""
    # Verify the auth token
    auth_header = request.headers.get('Authorization', '')
    expected_token = f'Bearer {app.config.get("AUTH_TOKEN", "")}'
    if auth_header != expected_token:
        return jsonify({'error': 'unauthorized'}), 401

    alert_data = request.get_json()

    # Log the raw alert for debugging
    print(f"Received alert: {json.dumps(alert_data, indent=2)}")

    # Get the policy name for routing
    incident = alert_data.get('incident', {})
    policy_name = incident.get('policy_name', '')

    # Determine the route
    route = get_route(policy_name)

    # Format the Slack message
    slack_message = format_slack_message(alert_data)

    # Send to the appropriate Slack channel
    response = requests.post(
        route['slack_webhook'],
        json=slack_message,
        timeout=10,
    )

    if response.status_code != 200:
        print(f"Failed to send to Slack: {response.text}")
        return jsonify({'error': 'slack_send_failed'}), 500

    return jsonify({'status': 'routed', 'channel': route['slack_channel']}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Using Pub/Sub for Programmatic Alert Handling

For more complex routing and processing, use Pub/Sub as the notification channel:

```hcl
# Terraform: Pub/Sub notification channel
resource "google_pubsub_topic" "alerts" {
  name = "monitoring-alerts"
}

resource "google_monitoring_notification_channel" "pubsub" {
  display_name = "Alert Processing Pipeline"
  type         = "pubsub"

  labels = {
    topic = google_pubsub_topic.alerts.id
  }
}
```

Then process alerts with a Cloud Function:

```python
# Cloud Function to process alerts from Pub/Sub
import functions_framework
import json
import requests
from google.cloud import firestore

db = firestore.Client()

@functions_framework.cloud_event
def process_alert(cloud_event):
    """Process Cloud Monitoring alerts from Pub/Sub."""
    # Decode the alert payload
    alert_data = json.loads(
        cloud_event.data['message']['data']
    )

    incident = alert_data.get('incident', {})
    state = incident.get('state', 'unknown')
    policy_name = incident.get('policy_name', '')
    resource_name = incident.get('resource_name', '')

    # Store alert history in Firestore for tracking
    db.collection('alert_history').add({
        'policy_name': policy_name,
        'state': state,
        'resource': resource_name,
        'timestamp': firestore.SERVER_TIMESTAMP,
        'raw_data': alert_data,
    })

    # Route based on severity
    if 'critical' in policy_name.lower():
        # Send to PagerDuty
        send_to_pagerduty(alert_data)
        # Also send to Slack
        send_to_slack(alert_data, '#critical-alerts')
    elif 'warning' in policy_name.lower():
        # Just Slack for warnings
        send_to_slack(alert_data, '#warnings')
    else:
        # Low-priority alerts go to a general channel
        send_to_slack(alert_data, '#monitoring')

    # Check for alert storms - too many alerts in a short period
    check_alert_storm(policy_name)

def check_alert_storm(policy_name):
    """Detect if we are getting too many alerts in a short period."""
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(minutes=10)
    recent_alerts = (db.collection('alert_history')
                    .where('timestamp', '>=', cutoff)
                    .stream())

    count = sum(1 for _ in recent_alerts)

    if count > 20:
        send_to_slack(
            {'message': f'Alert storm detected: {count} alerts in 10 minutes'},
            '#incident-response'
        )

def send_to_pagerduty(alert_data):
    """Send alert to PagerDuty."""
    # PagerDuty Events API v2
    payload = {
        'routing_key': 'your-pagerduty-routing-key',
        'event_action': 'trigger' if alert_data['incident']['state'] == 'open' else 'resolve',
        'dedup_key': alert_data['incident'].get('incident_id', ''),
        'payload': {
            'summary': alert_data['incident'].get('summary', 'Alert'),
            'severity': 'critical',
            'source': alert_data['incident'].get('resource_name', 'GCP'),
        },
    }
    requests.post('https://events.pagerduty.com/v2/enqueue', json=payload)

def send_to_slack(alert_data, channel):
    """Send formatted alert to a Slack channel."""
    # Implement Slack webhook logic here
    pass
```

## Alert Documentation Templates

Add runbook links and response instructions directly in the alert policy:

```hcl
resource "google_monitoring_alert_policy" "api_errors" {
  display_name = "Production API Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "Error Rate > 5%"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  documentation {
    content = <<-EOT
## API Error Rate Alert

**What:** The API error rate has exceeded 5% for more than 5 minutes.

**Impact:** Users are experiencing failed requests.

**Response Steps:**
1. Check the [service dashboard](https://console.cloud.google.com/monitoring/dashboards)
2. Look at recent deployments in the [revision list](https://console.cloud.google.com/run)
3. Check Cloud Logging for error details
4. If a bad deploy, rollback to the previous revision

**Escalation:** If not resolved in 15 minutes, page the on-call SRE.

**Runbook:** https://wiki.internal/runbooks/api-error-rate
    EOT
    mime_type = "text/markdown"
  }

  notification_channels = [
    google_monitoring_notification_channel.slack_engineering.id,
    google_monitoring_notification_channel.pagerduty.id,
  ]
}
```

## Notification Channel Verification

After creating notification channels, verify they work:

```bash
# List all notification channels
gcloud beta monitoring channels list --project=my-project

# Send a test notification to verify the channel works
gcloud beta monitoring channels verify CHANNEL_ID --project=my-project
```

## Best Practices

1. **Separate channels by severity.** Critical alerts go to PagerDuty and Slack. Warnings go to Slack only. Info alerts go to a low-traffic channel or email digest.

2. **Include context in notifications.** The alert should tell you what happened, what it means, and what to do about it. Use the documentation field extensively.

3. **Test your channels regularly.** Notification channels can break silently (expired tokens, changed webhook URLs). Set up a monthly test.

4. **Use Pub/Sub for complex routing.** If your routing logic involves more than "send to channel X," use Pub/Sub and process alerts programmatically.

5. **Deduplicate across tools.** If you are also using OneUptime for monitoring, make sure your Cloud Monitoring alerts and OneUptime alerts complement each other rather than duplicating the same notifications.

Custom notification channels turn your monitoring system from a noise generator into a targeted communication system. The investment in building a proper alert router pays off every time an incident happens and your team gets exactly the information they need, in the right channel, at the right time.
