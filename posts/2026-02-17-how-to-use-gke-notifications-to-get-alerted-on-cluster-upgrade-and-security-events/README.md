# How to Use GKE Notifications to Get Alerted on Cluster Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Notification, Alerting, Cluster Management, Security, Pub/Sub

Description: Learn how to configure GKE cluster notifications to receive alerts on upgrades, security bulletins, and other important cluster events via Pub/Sub.

---

GKE does a lot of things automatically - upgrades the control plane, patches nodes, applies security fixes. These are all good things, but you need to know when they happen. An unexpected upgrade during a critical deployment window can cause confusion. A security bulletin that affects your cluster version needs prompt attention.

GKE cluster notifications let you subscribe to these events and route them to your team through whatever channel you prefer - Slack, email, PagerDuty, or a custom webhook. The notification system uses Pub/Sub as the delivery mechanism, which means you can build any integration you want.

## Enabling Cluster Notifications

First, create a Pub/Sub topic that will receive the notifications:

```bash
# Create a Pub/Sub topic for GKE notifications

gcloud pubsub topics create gke-cluster-notifications
```

Then enable notifications on your cluster:

```bash
# Enable notifications on the cluster, sending to the Pub/Sub topic
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --notification-config=pubsub=ENABLED,pubsub-topic=projects/my-project/topics/gke-cluster-notifications
```

You can also filter which notification types you receive:

```bash
# Enable only specific notification types
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --notification-config=pubsub=ENABLED,pubsub-topic=projects/my-project/topics/gke-cluster-notifications,filter="UpgradeEvent|SecurityBulletinEvent"
```

## Notification Types

GKE sends several types of notifications:

- **UpgradeEvent**: When a cluster or node pool upgrade starts
- **UpgradeAvailableEvent**: When a new version is available for your cluster
- **SecurityBulletinEvent**: When a security vulnerability affects your cluster version
- **UpgradeInfoEvent**: When an upgrade is scheduled, completes, or needs attention

Each notification type provides different information. GKE sends the notification details in the Pub/Sub message attributes. Here is what an upgrade event payload looks like in JSON:

```json
{
  "resourceType": "MASTER",
  "operation": "operation-1771279200000-87b7254a",
  "currentVersion": "1.28.5-gke.1200",
  "targetVersion": "1.28.6-gke.1000",
  "operationStartTime": "2026-02-17T02:00:00Z"
}
```

## Setting Up a Pub/Sub Subscription

Create a subscription to consume the notifications:

```bash
# Create a pull subscription
gcloud pubsub subscriptions create gke-notifications-sub \
  --topic=gke-cluster-notifications

# Or create a push subscription that sends to a webhook
gcloud pubsub subscriptions create gke-notifications-push \
  --topic=gke-cluster-notifications \
  --push-endpoint=https://my-webhook.example.com/gke-notifications
```

Test that notifications are flowing:

```bash
# Pull a test message (may take a few minutes for first notification)
gcloud pubsub subscriptions pull gke-notifications-sub --auto-ack --limit=5
```

## Routing Notifications to Slack

A common setup is routing GKE notifications to a Slack channel. You can do this with a Cloud Function that reads from the Pub/Sub topic and posts to Slack.

Here is a Cloud Function that formats and sends GKE notifications to Slack:

```python
# main.py - Cloud Function to forward GKE notifications to Slack
import json
import os
import urllib.request

def gke_notification_to_slack(event, context):
    """Process GKE notification from Pub/Sub and send to Slack."""
    # GKE sends human-readable text in data and structured details in attributes.payload.
    attributes = event.get('attributes', {})
    payload = attributes.get('payload', '{}')
    notification = json.loads(payload)

    # Format the message based on notification type
    type_url = attributes.get('type_url', '')
    notification_type = type_url.rsplit('.', 1)[-1] if type_url else 'Unknown'

    if notification_type == 'UpgradeEvent':
        text = format_upgrade_event(notification, attributes)
        color = '#36a64f'  # green
    elif notification_type == 'SecurityBulletinEvent':
        text = format_security_event(notification, attributes)
        color = '#ff0000'  # red
    elif notification_type == 'UpgradeAvailableEvent':
        text = format_available_event(notification, attributes)
        color = '#2196f3'  # blue
    else:
        text = f"GKE Notification: {notification_type}"
        color = '#808080'  # gray

    # Build the Slack message payload
    slack_message = {
        'attachments': [{
            'color': color,
            'title': f'GKE: {notification_type}',
            'text': text,
            'footer': 'GKE Cluster Notifications'
        }]
    }

    # Send to Slack webhook
    webhook_url = os.environ['SLACK_WEBHOOK_URL']
    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(slack_message).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)


def format_upgrade_event(notification, attributes):
    """Format an upgrade event for Slack."""
    cluster = attributes.get('cluster_name', 'unknown')
    current = notification.get('currentVersion', 'unknown')
    target = notification.get('targetVersion', 'unknown')
    resource = notification.get('resourceType', 'unknown')
    return f"Cluster *{cluster}* {resource} upgrading from `{current}` to `{target}`"


def format_security_event(notification, attributes):
    """Format a security bulletin for Slack."""
    cluster = attributes.get('cluster_name', 'unknown')
    bulletin_id = notification.get('bulletinId', 'unknown')
    severity = notification.get('severity', 'unknown')
    return f"Security bulletin *{bulletin_id}* ({severity}) affects cluster *{cluster}*"


def format_available_event(notification, attributes):
    """Format an upgrade available event for Slack."""
    cluster = attributes.get('cluster_name', 'unknown')
    version = notification.get('version', 'unknown')
    return f"New version `{version}` available for cluster *{cluster}*"
```

Deploy the function:

```bash
# Deploy the Cloud Function triggered by the Pub/Sub topic
gcloud functions deploy gke-slack-notifier \
  --runtime python312 \
  --trigger-topic gke-cluster-notifications \
  --entry-point gke_notification_to_slack \
  --set-env-vars SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --region us-central1
```

## Routing to Email

For email notifications, create a Cloud Monitoring notification channel and set up an alert that triggers on Pub/Sub messages:

```bash
# Create an email notification channel
gcloud beta monitoring channels create \
  --display-name="GKE Alerts Email" \
  --type=email \
  --channel-labels=email_address=team@example.com
```

Alternatively, use Pub/Sub's native integration with Cloud Functions to send emails through SendGrid, Mailgun, or any SMTP service.

## Routing to PagerDuty

For critical security bulletins, route to PagerDuty:

```python
# pagerduty_handler.py - Route critical GKE events to PagerDuty
import json
import urllib.request
import os

def gke_to_pagerduty(event, context):
    """Send critical GKE notifications to PagerDuty."""
    attributes = event.get('attributes', {})
    payload = attributes.get('payload', '{}')
    notification = json.loads(payload)

    # Only page for security bulletins
    type_url = attributes.get('type_url', '')
    if not type_url.endswith('.SecurityBulletinEvent'):
        return

    severity = notification.get('severity', 'LOW').upper()
    # Only page for HIGH and CRITICAL severity
    if severity not in ('HIGH', 'CRITICAL'):
        return

    pd_payload = {
        'routing_key': os.environ['PAGERDUTY_ROUTING_KEY'],
        'event_action': 'trigger',
        'payload': {
            'summary': f"GKE Security Bulletin: {notification.get('bulletinId')}",
            'severity': 'critical' if severity == 'CRITICAL' else 'error',
            'source': attributes.get('cluster_name', 'unknown'),
        }
    }

    req = urllib.request.Request(
        'https://events.pagerduty.com/v2/enqueue',
        data=json.dumps(pd_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)
```

## Using Terraform

Set up the entire notification pipeline with Terraform:

```hcl
# Pub/Sub topic for GKE notifications
resource "google_pubsub_topic" "gke_notifications" {
  name = "gke-cluster-notifications"
}

# Update the cluster to enable notifications
resource "google_container_cluster" "primary" {
  name     = "my-cluster"
  location = "us-central1-a"

  notification_config {
    pubsub {
      enabled = true
      topic   = google_pubsub_topic.gke_notifications.id
      filter {
        event_type = ["UPGRADE_EVENT", "SECURITY_BULLETIN_EVENT"]
      }
    }
  }
}

# Subscription for processing
resource "google_pubsub_subscription" "gke_sub" {
  name  = "gke-notifications-sub"
  topic = google_pubsub_topic.gke_notifications.name
}
```

## Handling Multiple Clusters

If you have many clusters, you can either send all notifications to a single topic (each message includes the cluster name) or create separate topics per cluster.

For most teams, a single topic with filtering in the consumer works best:

```bash
# Enable notifications on all clusters to the same topic
for cluster in $(gcloud container clusters list --format="value(name,location)" | tr '\t' ','); do
  name=$(echo $cluster | cut -d, -f1)
  location=$(echo $cluster | cut -d, -f2)
  gcloud container clusters update "$name" \
    --location "$location" \
    --notification-config=pubsub=ENABLED,pubsub-topic=projects/my-project/topics/gke-cluster-notifications
done
```

GKE notifications are a simple but powerful way to stay on top of what is happening with your clusters. Set them up once, route them to your team's communication channels, and you will never be surprised by an upgrade or caught off guard by a security bulletin again.
