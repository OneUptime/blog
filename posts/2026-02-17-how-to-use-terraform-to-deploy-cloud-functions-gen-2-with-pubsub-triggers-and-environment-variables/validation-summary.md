# Validation Summary: How to Use Terraform to Deploy Cloud Functions Gen 2 with Pub/Sub Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run functions / Cloud Functions 2nd generation
- Terraform Google provider
- Google Cloud Pub/Sub
- Eventarc
- Cloud Run IAM
- Secret Manager
- Python Functions Framework
- Google Cloud CLI

## Sources Consulted
- Google Cloud Run functions IAM documentation: https://docs.cloud.google.com/functions/docs/concepts/iam
- Google Cloud Run Pub/Sub trigger documentation: https://docs.cloud.google.com/run/docs/triggering/pubsub-triggers
- Google Eventarc Pub/Sub Terraform quickstart: https://docs.cloud.google.com/eventarc/standard/docs/run/create-trigger-pub-sub-terraform
- Google Cloud Run functions source and Functions Framework documentation: https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud Functions local Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/running/direct
- Google Cloud Functions logs CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Terraform Google provider `google_cloudfunctions2_function` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Terraform Google provider `google_pubsub_topic` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Google provider `google_secret_manager_secret_version` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version
- Terraform sensitive and ephemeral values documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data

## Issues Found
- The Python example imported `functions_framework`, but the post did not show the required `requirements.txt` dependency. Added a minimal `functions-framework==3.*` snippet.
- The Eventarc IAM snippet granted Cloud Run invocation to the runtime service account, but the function trigger did not set `event_trigger.service_account_email`, so Terraform would default the trigger identity to the Compute Engine default service account. Added `service_account_email` to the trigger and aligned the IAM grants with that identity.
- The Pub/Sub service agent token creator role was described as generally required. Updated the wording to reflect Google Cloud's current guidance that this is only needed for projects where the Pub/Sub service agent was enabled on or before April 8, 2021.
- The Secret Manager example used `secret_data = var.api_key` while recommending Secret Manager to avoid Terraform state exposure. The Google provider stores `secret_data` in raw Terraform state, so the example now uses `secret_data_wo` with an ephemeral variable and notes the Terraform 1.11 requirement.

## Review Notes
Terraform and gcloud were not installed in the local workspace, so CLI behavior was verified against official references rather than by executing the examples. The post still uses a project-level `roles/run.invoker` grant for the Eventarc trigger service account to avoid a Terraform dependency cycle during function creation; a production module could tighten that binding after the underlying Cloud Run service exists.
