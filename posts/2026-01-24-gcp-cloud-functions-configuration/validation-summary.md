# Validation Summary: How to Configure Cloud Functions in GCP

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Google Cloud CLI (`gcloud functions`, `gcloud scheduler`)
- Python Functions Framework
- Pub/Sub triggers
- Cloud Storage Eventarc triggers
- Cloud Scheduler HTTP jobs with OIDC
- Secret Manager
- Serverless VPC Access
- IAM and service accounts
- Terraform Google provider (`google_cloudfunctions2_function`, `google_cloud_run_service_iam_member`)

## Sources Consulted
- Google Cloud SDK reference: `gcloud functions deploy` - https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference: `gcloud functions add-invoker-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- Cloud Run functions: Write functions with the Functions Framework - https://docs.cloud.google.com/run/docs/write-functions
- Cloud Run functions sample: Pub/Sub CloudEvent in Python - https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Cloud Run functions sample: Cloud Storage CloudEvent in Python - https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Cloud Run: Configure memory limits - https://docs.cloud.google.com/run/docs/configuring/services/memory-limits
- Cloud Run: Configure CPU limits - https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Cloud Run: Authenticating service-to-service - https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Cloud Run functions runtime support / Python runtime IDs - https://docs.cloud.google.com/functions/docs/runtime-support and https://docs.cloud.google.com/run/docs/runtimes/python
- Google Cloud sample: Cloud Functions 2nd gen with Cloud Storage trigger using Terraform - https://docs.cloud.google.com/functions/docs/samples/functions-v2-basic-gcs
- Terraform Google provider `google_cloudfunctions2_function` resource documentation - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The memory and CPU table showed fixed memory tiers and CPU defaults that do not match current Gen 2 / Cloud Run functions resource constraints. I replaced it with the current CPU-to-memory constraint table, including 6 and 8 vCPU options and the 32Gi memory maximum.
- The ID token validation example used `audience='my-project'`. For authenticated Cloud Run functions / Cloud Run service-to-service invocation, the ID token audience should be the receiving service URL or a configured custom audience. I changed the example audience to the function URL used elsewhere in the post.
- The Cloud Scheduler example created an authenticated HTTP job but did not grant the scheduler service account invoker permission on the function. I added `gcloud functions add-invoker-policy-binding` for the scheduler service account before creating the job.

## Review Notes
- `gcloud` and `terraform` were not installed in the local environment, so CLI and Terraform details were verified against official Google Cloud SDK and Terraform provider documentation instead of local command output.
- Python `python312` is still a supported Cloud Run functions runtime as of this review date.
- The Terraform IAM example uses `google_cloud_run_service_iam_member` for the underlying Cloud Run service of a Gen 2 function. This remains a common and valid pattern for granting `roles/run.invoker`.
