# Validation Summary: How to Secure HTTP Cloud Functions with IAM Authentication Instead of API Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Google Cloud IAM
- Cloud Run Invoker role
- Google Cloud CLI (`gcloud`)
- Google Auth Library for Node.js
- Google Auth Library for Python
- Cloud Scheduler HTTP targets with OIDC
- Terraform Google provider

## Sources Consulted
- Google Cloud Run functions: Authenticate for invocation: https://cloud.google.com/functions/docs/securing/authenticating
- Google Cloud Run functions: Authorize access with IAM: https://cloud.google.com/functions/docs/securing/managing-access-iam
- Google Cloud Run: Authenticating service-to-service: https://cloud.google.com/run/docs/authenticating/service-to-service
- Google Cloud Run: Authenticate developers: https://cloud.google.com/run/docs/authenticating/developers
- Google Cloud Authentication: Get an ID token: https://cloud.google.com/docs/authentication/get-id-token
- Google Cloud Scheduler: Use authentication with HTTP targets: https://cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud SDK: `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: `gcloud functions remove-invoker-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/functions/remove-invoker-policy-binding
- Google Cloud SDK: `gcloud scheduler jobs create http`: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Terraform Google provider: `google_cloudfunctions2_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Terraform Google provider: Cloud Run service IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam
- Google Auth Library for Node.js `GoogleAuth.getIdTokenClient`: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/googleauth
- Google Auth Library for Python ID token usage via Google Cloud service-to-service examples: https://cloud.google.com/run/docs/authenticating/service-to-service

## Issues Found
- The introduction said HTTP Cloud Functions are publicly accessible by default. Current Google Cloud documentation says authenticated invocation is the default for Cloud Run functions unless unauthenticated access is enabled. Updated the wording to say functions are public when unauthenticated invocation is allowed.
- The deploy example said to omit `--allow-unauthenticated` to require authentication. The `gcloud functions deploy` command supports `--no-allow-unauthenticated`, and Google documentation notes that deployment can prompt for invocation permissions and that subsequent deployments do not change existing public access. Updated the example to use `--no-allow-unauthenticated` explicitly.
- The GKE example implied a pod simply has a Google service account. Updated the text to call out Workload Identity Federation for GKE, which is the standard way pods use Google service account identity.
- The local JavaScript example implied plain user ADC from `gcloud auth application-default login` is sufficient for audience-bound ID-token client calls. Updated the comment to specify service account credentials or service account impersonation with ADC, while keeping the existing `gcloud auth print-identity-token` shell example for user-based local testing.

## Review Notes
- The Gen 2 invoker role guidance using `roles/run.invoker` on the underlying Cloud Run service is correct for functions created with the Cloud Functions v2 API.
- The Cloud Scheduler OIDC command and Python/Node.js identity-token examples match current Google Cloud guidance, with the usual production caveat that the token audience should match the receiving service URL and not include query parameters.
