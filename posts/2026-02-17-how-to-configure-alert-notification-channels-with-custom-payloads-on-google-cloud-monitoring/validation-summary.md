# Validation Summary: How to Configure Alert Notification Channels with Custom Payloads

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Monitoring alerting and notification channels
- Google Cloud CLI
- Terraform Google provider
- Cloud Monitoring webhooks
- Pub/Sub notification channels
- Cloud Run / Flask webhook receivers
- Cloud Run functions with Pub/Sub CloudEvents
- Slack incoming webhooks
- PagerDuty Events API v2

## Sources Consulted
- Google Cloud Monitoring: Create and manage notification channels: https://cloud.google.com/monitoring/support/notification-options
- Google Cloud Monitoring: Create and manage notification channels by API: https://cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud Monitoring: Terraform notification channels: https://docs.cloud.google.com/monitoring/alerts/notification-terraform
- Terraform Registry: `google_monitoring_notification_channel`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Cloud Run functions Pub/Sub CloudEvent decoding sample: https://docs.cloud.google.com/functions/docs/running/direct
- PagerDuty Events API v2: https://developer.pagerduty.com/docs/events-api-v2/overview/
- Slack incoming webhooks: https://api.slack.com/messaging/webhooks

## Issues Found
- The post described native Cloud Monitoring webhook payloads as customizable. Cloud Monitoring sends a documented webhook schema, so I changed the wording to describe transforming and routing payloads in a receiver.
- The PagerDuty Terraform example placed `service_key` in `labels`. The Google Terraform provider documents `service_key` under `sensitive_labels`, so I moved it there.
- The `webhook_tokenauth` example used a `sensitive_labels.auth_token` block and the Flask receiver expected a Bearer token. Cloud Monitoring token authentication uses a query string parameter in the endpoint URL, so I moved the token into the webhook URL and updated the Flask check to read `request.args["auth_token"]`.
- The Pub/Sub Terraform example omitted the required `roles/pubsub.publisher` grant for the Cloud Monitoring notification service account. I added the topic IAM member resource.
- The Pub/Sub Cloud Function attempted to parse the Pub/Sub `message.data` field directly as JSON. Pub/Sub CloudEvent data is base64 encoded, so I added base64 decoding before `json.loads`.
- The alert policy example claimed to alert on an API error percentage, but the metric threshold calculated a 5xx request rate with `ALIGN_RATE`. I updated the alert names and documentation text to describe a 5xx request rate over 5 requests per second.
- The verification section showed `gcloud beta monitoring channels verify CHANNEL_ID` as a test notification command. I removed that command and replaced it with console-based webhook and Pub/Sub test instructions from the Cloud Monitoring documentation.

## Review Notes
The snippets are illustrative and still use placeholder secrets, Slack webhook URLs, and internal runbook links. Terraform configurations that include webhook query tokens can expose those values in state; production setups should protect Terraform state and consider Secret Manager-backed deployment workflows for the receiving service.
