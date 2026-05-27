# How to Set Up Pub/Sub Notifications for Security Command Center Findings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Command Center, Pub/Sub, Cloud Security, Notification

Description: Learn how to configure Pub/Sub notifications for Security Command Center findings in Google Cloud so your team gets alerted the moment new security issues are detected.

---

If you run workloads on Google Cloud, chances are you already have Security Command Center (SCC) collecting findings about misconfigurations, vulnerabilities, and threats. The problem is that findings just sitting in a dashboard are not that useful if nobody is looking at them. What you actually want is real-time notifications pushed to your team whenever something important pops up.

That is exactly what Pub/Sub integration with SCC gives you. You can route findings to a Pub/Sub topic, and from there send them to Slack, email, a ticketing system, or any custom processing pipeline you can think of.

In this post, I will walk through the full setup from creating the topic to filtering which findings you actually care about.

## Prerequisites

Before we start, make sure you have:

- A GCP project with Security Command Center enabled (Standard or Premium tier)
- The `roles/securitycenter.admin` or `roles/securitycenter.notificationConfigEditor` role on your account
- Pub/Sub Admin (`roles/pubsub.admin`) on the topic you will use
- A Pub/Sub topic (or we will create one)
- The `gcloud` CLI installed and authenticated

## Step 1: Create a Pub/Sub Topic

First, let us create a dedicated Pub/Sub topic for SCC findings. You want a separate topic for this so it does not get mixed up with other message flows.

```bash
# Create a Pub/Sub topic specifically for SCC findings

gcloud pubsub topics create scc-findings-notifications \
  --project=my-project-id
```

## Step 2: Create a Pub/Sub Subscription

You will also need a subscription on that topic. This is what your downstream consumers will pull from.

```bash
# Create a pull subscription for testing purposes
gcloud pubsub subscriptions create scc-findings-sub \
  --topic=scc-findings-notifications \
  --project=my-project-id \
  --ack-deadline=60
```

If you plan to push to a webhook (like a Cloud Run service or HTTP function endpoint that accepts Pub/Sub push requests), you can create a push subscription instead:

```bash
# Create a push subscription that forwards to an HTTPS endpoint
gcloud pubsub subscriptions create scc-findings-push \
  --topic=scc-findings-notifications \
  --push-endpoint=https://scc-processor-abc123-uc.a.run.app/process-scc-finding \
  --project=my-project-id
```

## Step 3: Confirm SCC Permission to Publish

Security Command Center needs permission to publish messages to your topic. When you create your first notification config, Google Cloud creates the SCC notification service account and automatically grants the required service-agent role on the topic if your account has Pub/Sub Admin permissions.

```bash
# Get your organization ID first
gcloud organizations list
```

The service account uses this format:

```text
service-org-ORGANIZATION_ID@gcp-sa-scc-notification.iam.gserviceaccount.com
```

Replace `ORGANIZATION_ID` with your actual organization ID number.

## Step 4: Create the Notification Config

Now comes the key part - creating the notification config in SCC that links findings to your Pub/Sub topic.

```bash
# Create a notification config that sends ALL findings to the topic
gcloud scc notifications create scc-all-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global \
  --pubsub-topic=projects/my-project-id/topics/scc-findings-notifications \
  --filter=""
```

An empty filter means every finding gets published. That is probably too noisy for production, so let us look at filtering.

## Step 5: Filter Findings by Severity

In most cases, you do not want a notification for every single finding. You probably only care about HIGH and CRITICAL severity issues.

```bash
# Only notify on HIGH and CRITICAL severity findings
gcloud scc notifications create scc-critical-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global \
  --pubsub-topic=projects/my-project-id/topics/scc-findings-notifications \
  --filter='severity="HIGH" OR severity="CRITICAL"'
```

You can also filter by category, source, or state:

```bash
# Only notify on active findings from a specific source
gcloud scc notifications create scc-filtered-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global \
  --pubsub-topic=projects/my-project-id/topics/scc-findings-notifications \
  --filter='state="ACTIVE" AND category="OPEN_FIREWALL"'
```

## Step 6: Verify the Setup

Let us confirm the notification config was created correctly.

```bash
# List all notification configs for your organization
gcloud scc notifications list \
  --organization=organizations/ORGANIZATION_ID \
  --location=global

# Describe a specific notification config
gcloud scc notifications describe scc-critical-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global
```

## Step 7: Test with a Pull Subscription

To verify messages are flowing, you can pull from the subscription manually.

```bash
# Pull messages from the subscription (will wait up to 10 seconds)
gcloud pubsub subscriptions pull scc-findings-sub \
  --auto-ack \
  --limit=5 \
  --project=my-project-id
```

If there are no recent findings, you might need to wait or trigger a scan. You can also create a test finding using the SCC API.

## Understanding the Message Format

Each Pub/Sub message contains a JSON payload with the finding details. Here is what the structure looks like:

```json
{
  "notificationConfigName": "organizations/ORGANIZATION_ID/notificationConfigs/scc-critical-findings",
  "finding": {
    "name": "organizations/ORGANIZATION_ID/sources/SOURCE_ID/findings/FINDING_ID",
    "parent": "organizations/ORGANIZATION_ID/sources/SOURCE_ID",
    "resourceName": "//compute.googleapis.com/projects/my-project/zones/us-central1-a/instances/my-vm",
    "state": "ACTIVE",
    "category": "OPEN_FIREWALL",
    "severity": "HIGH",
    "createTime": "2026-02-17T10:30:00.000Z",
    "eventTime": "2026-02-17T10:30:00.000Z"
  }
}
```

## Building a Simple Processing Function

Here is a quick Cloud Function that processes SCC findings from Pub/Sub and sends a Slack notification.

```python
import base64
import json
import requests

def process_scc_finding(event, context):
    """Cloud Function triggered by Pub/Sub message containing an SCC finding."""

    # Decode the Pub/Sub message payload
    pubsub_message = base64.b64decode(event['data']).decode('utf-8')
    finding_data = json.loads(pubsub_message)

    # Extract key details from the finding
    finding = finding_data.get('finding', {})
    category = finding.get('category', 'Unknown')
    severity = finding.get('severity', 'Unknown')
    resource = finding.get('resourceName', 'Unknown')

    # Format a Slack message
    slack_message = {
        "text": f"SCC Finding: {category}\nSeverity: {severity}\nResource: {resource}"
    }

    # Post to Slack webhook
    slack_webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    requests.post(slack_webhook_url, json=slack_message)

    return "OK"
```

## Managing Multiple Notification Configs

You can have up to 500 notification configs per organization. A common pattern is to create separate configs for different teams:

- One config for network-related findings routed to the networking team
- One config for IAM findings routed to the identity team
- One config for all critical findings routed to the incident response channel

```bash
# Network team notifications
gcloud scc notifications create network-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global \
  --pubsub-topic=projects/my-project-id/topics/network-scc-findings \
  --filter='category="OPEN_FIREWALL" OR category="OPEN_SSH_PORT" OR category="OPEN_RDP_PORT"'

# IAM team notifications
gcloud scc notifications create iam-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global \
  --pubsub-topic=projects/my-project-id/topics/iam-scc-findings \
  --filter='category="MFA_NOT_ENFORCED" OR category="ADMIN_SERVICE_ACCOUNT"'
```

## Common Gotchas

There are a few things that trip people up when setting this up:

1. The SCC notification service account name follows a specific pattern. If you use VPC Service Controls or check IAM manually, double-check the service account email format.

2. Notification configs can be organization-, folder-, or project-level resources. Use the same parent and location when you create, list, describe, or delete them.

3. Pub/Sub message ordering is not guaranteed. Do not assume findings arrive in chronological order.

4. If you delete and recreate a notification config with the same name, there may be a delay before messages start flowing again.

## Cleanup

If you need to remove a notification config:

```bash
# Delete a notification config
gcloud scc notifications delete scc-all-findings \
  --organization=organizations/ORGANIZATION_ID \
  --location=global
```

## Wrapping Up

Setting up Pub/Sub notifications for Security Command Center findings is one of those things that takes about fifteen minutes but pays off massively. Instead of checking the SCC dashboard manually, your team gets pinged the moment something goes wrong. Combine this with Cloud Functions or a SIEM integration and you have a solid automated security alerting pipeline.

The key takeaway is to use filters wisely. Do not blast every low-severity finding to your on-call channel or people will start ignoring the alerts. Focus on what matters and route different finding types to the right teams.
