# Validation Summary: How to Create Pub/Sub Subscriptions with Push and Pull in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud IAM
- Google BigQuery
- OpenTofu
- Terraform Google provider
- HTTPS push endpoints
- OIDC authentication

## Sources Consulted
- HashiCorp Google provider docs for `google_pubsub_topic`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_topic.html.markdown
- HashiCorp Google provider docs for `google_pubsub_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_subscription.html.markdown
- HashiCorp Google provider docs for `google_pubsub_topic_iam`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_topic_iam.html.markdown
- HashiCorp Google provider docs for `google_pubsub_subscription_iam`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_subscription_iam.html.markdown
- HashiCorp Google provider docs for `google_service_account_iam`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_service_account_iam.html.markdown
- HashiCorp Google provider docs for `google_project` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/project.html.markdown
- Google Cloud Pub/Sub dead-letter topics docs: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub push subscriptions docs: https://cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push docs: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub BigQuery subscription docs: https://cloud.google.com/pubsub/docs/create-bigquery-subscription
- Google Cloud Pub/Sub retry policy docs: https://cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud Pub/Sub replay and retention docs: https://cloud.google.com/pubsub/docs/replay-overview

## Issues Found
- The Step 1 comment incorrectly described dead-letter support as a topic feature. Dead-letter configuration is a subscription property, so the comment was changed to describe schema validation instead.
- The Step 1 retention comment said topic retention ranges from 1 hour to 31 days. The provider docs state topic message retention can be from 10 minutes to 31 days, so the comment was corrected.
- The pull subscription comment said Pub/Sub would retry exactly 5 times before dead-lettering. Google documents max delivery attempts as approximate and best-effort, so the wording was corrected.
- The push subscription used `oidc_token` with a custom service account but omitted the required permission for the Pub/Sub service agent to mint OIDC tokens. A `google_service_account_iam_member` grant for `roles/iam.serviceAccountTokenCreator` was added, along with a dependency from the subscription.
- The dead-letter examples omitted the required Pub/Sub service agent IAM grants to publish to the dead-letter topic and acknowledge messages on the source subscriptions. Topic and subscription IAM members were added for the service agent.
- The BigQuery subscription example omitted the required IAM grant for the Pub/Sub service agent to write to BigQuery. A `google_project_iam_member` grant for `roles/bigquery.dataEditor` was added, along with a dependency from the subscription.
- The BigQuery example enabled `write_metadata` without noting the destination table requirement. A comment was added to clarify that the table must include the required data and metadata columns.
- The summary sentence overstated the delivery guarantee. It was revised to say dead-letter topics and retry policies help manage failed deliveries rather than ensure reliable delivery.

## Review Notes
- The examples are technically valid after correction, but they still assume referenced resources such as `google_pubsub_schema.order_schema`, `google_service_account.*`, `google_bigquery_dataset.events`, and `google_bigquery_table.orders` exist elsewhere in the OpenTofu configuration.
- In the BigQuery example, `drop_unknown_fields` only affects behavior when `use_topic_schema` or `use_table_schema` is enabled. As shown, it is harmless but does not change behavior.
