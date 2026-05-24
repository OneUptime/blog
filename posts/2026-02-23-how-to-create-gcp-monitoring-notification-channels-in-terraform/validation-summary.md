# Validation Summary: How to Create GCP Monitoring Notification Channels in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- Google Cloud Platform (GCP)
- Google Cloud Monitoring (`google_monitoring_notification_channel`, `google_monitoring_alert_policy`)
- Google Cloud Pub/Sub (`google_pubsub_topic`, `google_pubsub_subscription`)
- Notification channel types: email, slack, pagerduty, webhook_tokenauth, webhook_basicauth, sms, pubsub
- hashicorp/google provider v5.x

## Sources Consulted
- [Terraform Registry: google_monitoring_notification_channel](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel)
- [terraform-provider-google source on GitHub (resource_monitoring_notification_channel.go)](https://github.com/hashicorp/terraform-provider-google/blob/main/google/services/monitoring/resource_monitoring_notification_channel.go)
- [terraform-provider-google docs markdown](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/monitoring_notification_channel.html.markdown)
- [Google Cloud: Create and manage notification channels by API](https://cloud.google.com/monitoring/alerts/using-channels-api)
- [Google Cloud: Notification options](https://cloud.google.com/monitoring/support/notification-options)
- [Google Cloud: Create and manage notification channels with Terraform](https://cloud.google.com/monitoring/alerts/notification-terraform)

## Issues Found
1. **Incorrect `sensitive_labels.password` field used with `webhook_tokenauth` type.** The Terraform provider schema (and the underlying GCP API) only accepts `password` in `sensitive_labels` for the `webhook_basicauth` type. For `webhook_tokenauth`, there is no `auth_token`/`password` sensitive label — the token must be embedded in the URL itself. The original example would fail at apply time.
   - **Fix:** Rewrote the Webhook section to remove the invalid `sensitive_labels { password = ... }` block under `webhook_tokenauth` and marked the URL variable as `sensitive` (since the URL contains the token). Added a second example demonstrating `webhook_basicauth`, which is the channel type where `password` in `sensitive_labels` is actually valid (and which also needs a `username` label).

2. **PagerDuty `service_key` placed in `labels` block instead of `sensitive_labels`.** While the GCP API permits `service_key` in either location, putting a credential in `labels` stores it in plaintext in Terraform state and contradicts the post's own "Best Practices" section that explicitly recommends `sensitive_labels` for tokens/passwords.
   - **Fix:** Moved `service_key` from `labels` to a `sensitive_labels` block in the PagerDuty example for internal consistency and to follow the documented best practice.

## Review Notes
- The `sms` notification channel type is correctly named with a `number` label, but readers should note that SMS channels created via Terraform/API still require manual phone-number verification through the GCP Console before they can receive notifications. The post does mention verification generally but not specifically for SMS.
- `verification_status` is a valid computed attribute on the resource, so the output example is correct.
- `google_pubsub_topic.alerts.id` returns the full resource name (`projects/{project}/topics/{name}`), which is what the `topic` label requires — this is correct.
- The uptime check alert policy example uses `ALIGN_NEXT_OLDER` with `REDUCE_COUNT_FALSE` and `threshold_value = 1` — this is a valid (though strict) pattern for detecting more than one failed uptime check in the alignment window.
- The provider version constraint `~> 5.0` is appropriate; the resource schema referenced (including the `sensitive_labels` block and write-only variants) is current as of the v5/v6/v7 generations of the provider.
- The hashicorp/google provider's current major version at time of review is v6+, so the `~> 5.0` pin will become outdated; the post may want to consider widening to `>= 5.0` in a future revision.
