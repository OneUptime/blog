# How to Configure Error Reporting Notifications via Email Slack and Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Error Reporting, Notification, Slack, Webhook, Monitoring

Description: Learn how to set up Google Cloud Error Reporting notifications through email, Slack, and webhooks so your team gets alerted when new errors appear in production.

---

Getting errors in production is inevitable. The real question is how quickly your team finds out about them. Google Cloud Error Reporting does a solid job of catching and grouping errors, but if nobody is watching the dashboard, those errors might as well be invisible. That is where notification channels come in.

In this guide, I will walk you through setting up Error Reporting notifications via email, Slack, and custom webhooks. By the end, you will have a system that pings the right people the moment something goes wrong.

## Prerequisites

Before you start, make sure you have the following:

- A GCP project with Error Reporting enabled
- The Cloud Monitoring API enabled (Error Reporting notifications flow through Cloud Monitoring)
- Appropriate IAM roles. You need a role such as Monitoring Editor to create notification channels, and Error Reporting User, Error Reporting Admin, Project Editor, or Project Owner to select those channels for Error Reporting notifications.
- A Slack workspace (if setting up Slack notifications)

## Understanding How Error Reporting Notifications Work

Error Reporting uses Cloud Monitoring notification channels, but you configure the Error Reporting notifications from the Error Reporting page. Error Reporting sends notifications when a new error group is created, or when an error event occurs in an error group that was previously marked as resolved.

This means you need to set up two things: notification channels in Cloud Monitoring, and then select those channels in Error Reporting.

## Setting Up Email Notifications

Email is the simplest notification channel to configure. You can do it directly in the Cloud Console.

Navigate to Cloud Monitoring, then go to Alerting, and click on Edit Notification Channels. Under the Email section, click Add New.

You can also set this up using the gcloud CLI. Here is how to create an email notification channel:

```bash
# Create an email notification channel for error alerts

gcloud beta monitoring channels create \
  --display-name="Error Reporting Email" \
  --type=email \
  --channel-labels=email_address=oncall@yourcompany.com \
  --project=my-gcp-project
```

Once the channel is created, note its display name and channel ID from the output. This makes it easier to identify when you select channels in Error Reporting.

## Setting Up Slack Notifications

Slack integration requires a few more steps because you need to connect your Slack workspace to Google Cloud Monitoring.

First, go to the Cloud Console and navigate to Monitoring, then Alerting, then Edit Notification Channels. Under Slack, click Add New. This will prompt you to authenticate with your Slack workspace and select the channel where notifications should be posted.

After authorizing, you can list the notification channel:

```bash
# List existing notification channels to find your Slack channel ID
gcloud beta monitoring channels list \
  --project=my-gcp-project \
  --filter='type="slack"'
```

The Slack integration supports rich formatting out of the box. When an error triggers a notification, the Slack message includes the error message, service name, and a direct link to the error in Cloud Error Reporting.

One thing I have found useful is creating a dedicated Slack channel for production errors. Mixing error notifications with general team chat is a recipe for missed alerts.

## Setting Up Webhook Notifications

Webhooks give you the most flexibility. You can route notifications to any HTTP endpoint, which means you can integrate with PagerDuty, Opsgenie, custom dashboards, or your own incident management system.

Here is how to create a webhook notification channel:

```bash
# Create a webhook notification channel pointing to your endpoint
gcloud beta monitoring channels create \
  --display-name="Error Webhook" \
  --type=webhook_tokenauth \
  --channel-labels=url=https://your-endpoint.example.com/webhook?auth_token=1234-abcd,auth_token=1234-abcd \
  --project=my-gcp-project
```

The Error Reporting webhook payload follows a specific schema. Here is an example of what the JSON body looks like:

```json
{
  "version": "1.0",
  "subject": "New error in my-service",
  "group_info": {
    "project_id": "my-gcp-project",
    "detail_link": "https://console.cloud.google.com/errors/detail/..."
  },
  "exception_info": {
    "type": "RuntimeError",
    "message": "Something went wrong"
  },
  "event_info": {
    "service": "my-service",
    "version": "v1",
    "log_message": "RuntimeError: Something went wrong"
  }
}
```

If you are building a webhook receiver, here is a minimal example in Python:

```python
# Simple Flask webhook receiver for Error Reporting notifications
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_alert():
    # Parse the incoming alert payload
    payload = request.get_json()
    event_info = payload.get('event_info', {})
    exception_info = payload.get('exception_info', {})

    # Extract the key fields
    error_summary = payload.get('subject', 'Unknown error')
    service_name = event_info.get('service', 'Unknown service')
    exception_message = exception_info.get('message', 'No exception message')

    # Do something with the alert - log it, page someone, update a dashboard
    print(f"Error in {service_name}: {error_summary} - {exception_message}")

    # Return 200 to acknowledge receipt
    return jsonify({"status": "received"}), 200

if __name__ == '__main__':
    app.run(port=8080)
```

## Selecting Notification Channels

Now that you have notification channels configured, you need to select them in Error Reporting.

```bash
# First, get the notification channel IDs you created earlier
gcloud beta monitoring channels list --project=my-gcp-project
```

Then go to Error Reporting, click Configure notifications, and select the notification channels you want to use. You can select multiple channels for the same project.

## Configuring Notification Frequency

One problem teams run into is notification fatigue. If your service is throwing thousands of the same error, you do not want thousands of Slack messages. Error Reporting handles this by notifying on new error groups and on errors in groups that were previously marked as resolved, not on every individual error occurrence.

Error Reporting also rate-limits notifications. At most 5 notifications per error group are sent in a 60-minute window. If that limit is exceeded, further notifications for that group are silenced for the next six hours.

## Best Practices for Error Notifications

After running Error Reporting across several production services, here are some patterns that have worked well:

**Use tiered notification channels.** Send new Error Reporting groups to a Slack channel for visibility, but only page oncall engineers for higher-volume failures. For threshold-based paging, create separate Cloud Monitoring alerting policies from logs or log-based metrics.

**Label your services consistently.** Error Reporting groups errors by service and version. If your service names are inconsistent, your notifications will be hard to route. Set consistent service and version values when you write structured error logs or report errors with the Error Reporting API.

**Review and tune regularly.** Check your error groups at least weekly. Mute errors that are known issues or low priority so they do not trigger unnecessary notifications.

**Test your notification pipeline.** Do not wait for a real production error to find out your Slack integration is broken. Throw a test error and verify the notification arrives end to end.

## Troubleshooting Common Issues

If notifications are not arriving, check these common issues:

1. Make sure the Cloud Monitoring API is enabled.
2. Verify the notification channel is in a verified state. Email channels require clicking a verification link.
3. Check that the notification channel is selected in Error Reporting under Configure notifications.
4. For webhooks, ensure your endpoint returns a 200 status code. Cloud Monitoring will retry on failures but will eventually stop if the endpoint is consistently unreachable.
5. For Slack, make sure the Google Cloud Monitoring app has permissions to post in the target channel. Private channels require inviting the app manually.

## Wrapping Up

Error notifications are one of those things that feel optional until you need them. Setting up email, Slack, and webhook notifications for Cloud Error Reporting takes about 15 minutes and can save you hours of debugging time by catching issues early. Start with email or Slack for simplicity, and add webhook integrations when you need more sophisticated routing or integration with incident management tools.
