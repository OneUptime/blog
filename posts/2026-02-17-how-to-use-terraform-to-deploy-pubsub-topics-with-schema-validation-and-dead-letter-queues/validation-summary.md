# Validation Summary: How to Use Terraform to Deploy Pub/Sub Topics with Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub schemas
- Dead letter topics
- Terraform Google provider
- Google Cloud CLI
- Cloud Monitoring alert policies
- Cloud Run push subscriptions
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Pub/Sub documentation: Publish messages to a topic with a schema: https://docs.cloud.google.com/pubsub/docs/publish-topics-schema
- Google Cloud Pub/Sub documentation: Associate a schema with a topic: https://docs.cloud.google.com/pubsub/docs/associate-schema-topic
- Google Cloud Pub/Sub documentation: Dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub REST reference for subscriptions and PushConfig: https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Google Cloud Pub/Sub documentation: Authentication for push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Terraform Registry: google_pubsub_topic resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Registry: google_pubsub_subscription resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Registry: google_pubsub_schema resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_schema
- Terraform Registry: google_monitoring_alert_policy resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- Dead letter delivery was described as happening exactly after five processing failures. Google Cloud documents `max_delivery_attempts` as approximate and best-effort, so the diagram, explanatory text, and Terraform comment were updated to avoid implying exact forwarding after five attempts.
- The dead letter IAM explanation said forwarding silently fails without the service agent permissions. Google Cloud documents that Pub/Sub only counts delivery attempts when the dead letter topic and IAM permissions are configured correctly, so the wording was changed to state that Pub/Sub cannot correctly forward dead letter messages or count delivery attempts for the policy.
- The push subscription example used `push_config.attributes` as if it supported arbitrary custom HTTP headers. Pub/Sub PushConfig currently supports `x-goog-version` for controlling push message format, so the example was changed to use `x-goog-version = "v1"` and the comment was corrected.

## Review Notes
- The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform syntax were verified against official Google Cloud and Terraform provider documentation rather than local command output.
- For private Cloud Run push endpoints, the service account used in `oidc_token` also needs the appropriate Cloud Run invocation permissions, and older projects may need an explicit Service Account Token Creator grant for the Pub/Sub service agent. The post's push subscription section is an alternative snippet rather than a full Cloud Run IAM walkthrough.
