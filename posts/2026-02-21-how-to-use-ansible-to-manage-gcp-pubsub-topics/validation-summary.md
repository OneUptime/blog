# Validation Summary: How to Use Ansible to Manage GCP Pub/Sub Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Cloud Pub/Sub topics
- Google Cloud Pub/Sub subscriptions
- Google Cloud CLI
- Pub/Sub schemas
- Pub/Sub push subscriptions with OIDC
- Pub/Sub dead-letter topics

## Sources Consulted
- Ansible `google.cloud.gcp_pubsub_topic` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_pubsub_topic_module.html
- Ansible `google.cloud.gcp_pubsub_subscription` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_pubsub_subscription_module.html
- Google Cloud Pub/Sub subscription properties: https://cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub schemas overview: https://cloud.google.com/pubsub/docs/schemas
- Google Cloud Pub/Sub schema creation guide: https://cloud.google.com/pubsub/docs/create-schemas
- Google Cloud SDK `gcloud pubsub topics create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK `gcloud pubsub schemas create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/schemas/create

## Issues Found
- The prerequisites used `gcloud` commands but did not list the Google Cloud CLI as a prerequisite. Added a prerequisite for the Google Cloud CLI to be installed and authenticated.
- The post stated that `604800s` / 7 days was the maximum subscription message retention duration. Current Pub/Sub documentation lists subscription message retention as configurable up to 31 days, so the "maximum" wording was removed.
- The dead-letter subscription example did not grant the Pub/Sub service agent the required permissions to publish to the dead-letter topic and acknowledge messages on the source subscription. Added `gcloud pubsub topics add-iam-policy-binding` and `gcloud pubsub subscriptions add-iam-policy-binding` tasks using the documented Pub/Sub service agent email pattern.
- The dead-letter explanation said messages are forwarded after exactly 5 delivery attempts. Pub/Sub documents this as approximate and best-effort, so the wording was changed to "approximately 5 delivery attempts."

## Review Notes
The Ansible examples use documented `google.cloud.gcp_pubsub_topic` and `google.cloud.gcp_pubsub_subscription` parameters. The schema example uses `gcloud` because the post does not introduce an Ansible schema module; that command form is consistent with Google Cloud CLI documentation.
