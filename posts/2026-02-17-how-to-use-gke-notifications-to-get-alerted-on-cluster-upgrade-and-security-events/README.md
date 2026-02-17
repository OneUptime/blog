# How to Use GKE Notifications to Get Alerted on Cluster Upgrade and Security Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Notifications, Alerting, Cluster Management, Security, Pub/Sub

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

- **UpgradeEvent**: When a cluster or node pool upgrade starts or finishes
- **UpgradeAvailableEvent**: When a new version is available for your cluster
- **SecurityBulletinEvent**: When a security vulnerability affects your cluster version
- **AutoUpgradeEvent**: When an automatic upgrade is scheduled or in progress

Each notification type provides different information. Here is what an upgrade event looks like in JSON:

```json
{
  "type": "UpgradeEvent",
  "cluster": "projects/my-project/locations/us-central1-a/clusters/my-cluster",
  "currentVersion": "1.28.5-gke.1200",
  "targetVersion": "1.28.6-gke.1000",
  "resource": "MASTER",
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
import base64
import json
import os
import urllib.request

def gke_notification_to_slack(event, context):
    """Process GKE notification from Pub/Sub and send to Slack."""
    # Decode the Pub/Sub message
    message_data = base64.b64decode(event['data']).decode('utf-8')
    notification = json.loads(message_data)

    # Format the message based on notification type
    notification_type = notification.get('type', 'Unknown')

    if notification_type == 'UpgradeEvent':
        text = format_upgrade_event(notification)
        color = '#36a64f'  # green
    elif notification_type == 'SecurityBulletinEvent':
        text = format_security_event(notification)
        color = '#ff0000'  # red
    elif notification_type == 'UpgradeAvailableEvent':
        text = format_available_event(notification)
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


def format_upgrade_event(notification):
    """Format an upgrade event for Slack."""
    cluster = notification.get('cluster', '').split('/')[-1]
    current = notification.get('currentVersion', 'unknown')
    target = notification.get('targetVersion', 'unknown')
    resource = notification.get('resource', 'unknown')
    return f"Cluster *{cluster}* {resource} upgrading from `{current}` to `{target}`"


def format_security_event(notification):
    """Format a security bulletin for Slack."""
    cluster = notification.get('cluster', '').split('/')[-1]
    bulletin_id = notification.get('bulletinId', 'unknown')
    severity = notification.get('severity', 'unknown')
    return f"Security bulletin *{bulletin_id}* ({severity}) affects cluster *{cluster}*"


def format_available_event(notification):
    """Format an upgrade available event for Slack."""
    cluster = notification.get('cluster', '').split('/')[-1]
    version = notification.get('version', 'unknown')
    return f"New version `{version}` available for cluster *{cluster}*"
```

Deploy the function:

```bash
# Deploy the Cloud Function triggered by the Pub/Sub topic
gcloud functions deploy gke-slack-notifier \
  --runtime python39 \
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
import base64
import json
import urllib.request
import os

def gke_to_pagerduty(event, context):
    """Send critical GKE notifications to PagerDuty."""
    message_data = base64.b64decode(event['data']).decode('utf-8')
    notification = json.loads(message_data)

    # Only page for security bulletins
    if notification.get('type') != 'SecurityBulletinEvent':
        return

    severity = notification.get('severity', 'LOW')
    # Only page for HIGH and CRITICAL severity
    if severity not in ('HIGH', 'CRITICAL'):
        return

    pd_payload = {
        'routing_key': os.environ['PAGERDUTY_ROUTING_KEY'],
        'event_action': 'trigger',
        'payload': {
            'summary': f"GKE Security Bulletin: {notification.get('bulletinId')}",
            'severity': 'critical' if severity == 'CRITICAL' else 'error',
            'source': notification.get('cluster', 'unknown'),
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
    --zone "$location" \
    --notification-config=pubsub=ENABLED,pubsub-topic=projects/my-project/topics/gke-cluster-notifications
done
```

GKE notifications are a simple but powerful way to stay on top of what is happening with your clusters. Set them up once, route them to your team's communication channels, and you will never be surprised by an upgrade or caught off guard by a security bulletin again.
