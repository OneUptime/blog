# Validation Summary: How to Create GCP Pub/Sub Topics with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Pub/Sub
- Google provider for OpenTofu/Terraform
- HCL
- Google Cloud IAM
- Avro schemas

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Google provider `google_pubsub_topic` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_topic.html.markdown
- Google provider `google_pubsub_subscription` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_subscription.html.markdown
- Google provider `google_pubsub_schema` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_schema.html.markdown
- Google provider `google_pubsub_topic_iam` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_topic_iam.html.markdown
- Google provider `google_pubsub_subscription_iam` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/pubsub_subscription_iam.html.markdown
- Pub/Sub topic properties: https://cloud.google.com/pubsub/docs/topic-properties
- Pub/Sub subscription properties: https://cloud.google.com/pubsub/docs/subscription-properties
- Pub/Sub dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Pub/Sub pull subscriptions: https://cloud.google.com/pubsub/docs/pull
- Pub/Sub push subscriptions: https://cloud.google.com/pubsub/docs/push
- Pub/Sub push authentication: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Pub/Sub schema overview: https://cloud.google.com/pubsub/docs/schemas
- Pub/Sub parse messages from a topic with a schema: https://cloud.google.com/pubsub/docs/schemas-valid

## Issues Found
- The topic `message_retention_duration` comment said it keeps unacknowledged messages for 7 days. I changed it to describe topic retention correctly: Pub/Sub topic retention retains published messages for replay/seek after publication, regardless of acknowledgment state.
- The `message_storage_policy` comment described the topic as "regional" and implied latency and throughput benefits. I changed it to describe the real behavior: it restricts where Pub/Sub may persist message data.
- The dead-letter policy comment said messages move to the DLQ after 5 failed deliveries. I changed it to say "approximately 5 delivery attempts" because Pub/Sub documents dead-letter forwarding as best-effort and the delivery-attempt count as approximate.
- The push subscription comment said `x-goog-version = "v1"` includes message attributes in HTTP headers. I changed it to the correct behavior: it selects the v1 push payload format.
- The IAM example for dead-letter topics was incomplete. I added a `google_pubsub_subscription_iam_member` grant for the Pub/Sub service account on the source subscription because Google documents that dead-letter forwarding requires both publisher access on the dead-letter topic and subscriber access on the source subscription.
- The best-practices bullets overstated dead-lettering and push-vs-pull behavior. I revised them to align with Google Cloud guidance: dead-letter policies are situational, dead-letter forwarding needs both IAM grants, and pull with StreamingPull is the documented choice for maximum throughput and lowest latency.

## Review Notes
- The post is a code-focused infrastructure guide and remains technically relevant after the fixes above.
- The provider version pin `~> 5.10` is older than the current Google provider release available at validation time, but the Pub/Sub resources and arguments used in the post are still supported in current provider documentation.
