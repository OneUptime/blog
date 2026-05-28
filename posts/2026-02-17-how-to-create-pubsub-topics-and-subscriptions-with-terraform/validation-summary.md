# Validation Summary: How to Create Pub/Sub Topics and Subscriptions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Terraform
- HashiCorp Google provider
- Google Cloud IAM
- Pub/Sub push subscriptions with OIDC authentication
- Pub/Sub dead-letter topics

## Sources Consulted
- Terraform Registry: `google_pubsub_topic` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Registry: `google_pubsub_subscription` resource: https://registry.terraform.io/providers/hashicorp/google/5.28.0/docs/resources/pubsub_subscription
- Terraform Registry: `google_pubsub_subscription` import formats: https://registry.terraform.io/providers/hashicorp/google/7.14.1/docs/resources/pubsub_subscription
- Google Cloud Pub/Sub push subscription authentication: https://docs.cloud.google.com/pubsub/docs/create-push-subscription
- Google Cloud Pub/Sub authenticated push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub subscription properties: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub message ordering: https://docs.cloud.google.com/pubsub/docs/ordering

## Issues Found
- The push subscription example configured an `oidc_token` but did not grant Pub/Sub permission to mint OIDC tokens for the user-managed service account. Added a `google_service_account_iam_member` with `roles/iam.serviceAccountTokenCreator` for the Pub/Sub service agent and added a short explanation.
- The reusable DLQ module configured `dead_letter_policy` but did not include the IAM bindings required for Pub/Sub dead-letter forwarding. Added the Pub/Sub service-agent identity, a DLQ topic publisher binding, and subscriber bindings for the generated subscriptions.

## Review Notes
- Terraform CLI was not installed in the local environment, so `terraform validate` could not be run. The HCL snippets were reviewed manually against the official Terraform provider documentation.
- The post uses `hashicorp/google` provider `~> 5.0`. The referenced Pub/Sub resource arguments remain valid in the official provider documentation checked during review.
