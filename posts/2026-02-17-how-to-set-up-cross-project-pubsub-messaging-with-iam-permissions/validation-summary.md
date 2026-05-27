# Validation Summary: How to Set Up Cross-Project Pub/Sub Messaging with IAM Permissions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud IAM
- Google Cloud CLI
- Terraform Google provider
- Python Google Cloud Pub/Sub client library
- Mermaid diagrams

## Sources Consulted
- Google Cloud Pub/Sub access control documentation: https://cloud.google.com/pubsub/docs/access-control
- Google Cloud Pub/Sub roles and permissions documentation: https://cloud.google.com/iam/docs/roles-permissions/pubsub
- Google Cloud Pub/Sub create pull subscriptions documentation: https://cloud.google.com/pubsub/docs/create-subscription
- Google Cloud SDK reference for `gcloud pubsub subscriptions create`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Python Pub/Sub `PublisherClient.publish` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Google Cloud Python Pub/Sub subscriber documentation: https://cloud.google.com/python/docs/reference/pubsub/latest
- Terraform Google provider `google_pubsub_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The cross-project subscription section incorrectly said the Pub/Sub service agent in Project A needed subscriber access on the Project B topic. Google Cloud Pub/Sub checks `pubsub.subscriptions.create` on the subscription project and `pubsub.topics.attachSubscription` on the target topic for the identity creating the subscription. I changed the prose, gcloud example, Terraform example, and troubleshooting note to grant topic-level `roles/pubsub.subscriber` to the subscription-creating service account instead.

## Review Notes
The custom subscriber role example is intentionally narrower than the predefined `roles/pubsub.subscriber` role. If that same custom role is reused to create cross-project subscriptions, it would also need `pubsub.topics.attachSubscription` on the topic and `pubsub.subscriptions.create` in the subscription project.
