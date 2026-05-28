# Validation Summary: Configure Cloud Functions to Use a Custom Service Account Instead of the Default

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI (`gcloud`)
- Cloud Storage IAM
- Cloud Logging IAM
- Secret Manager IAM
- Terraform Google provider

## Sources Consulted
- Google Cloud: Function identity: https://docs.cloud.google.com/functions/docs/securing/function-identity
- Google Cloud SDK: `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: `gcloud functions describe`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/describe
- Google Cloud SDK: `gcloud iam service-accounts create`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK: `gcloud projects add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK: `gcloud storage buckets add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud IAM: Service account types and default service account role grants: https://docs.cloud.google.com/iam/docs/service-account-types
- Google Cloud Organization Policy: Restrict IAM service account usage: https://docs.cloud.google.com/organization-policy/restrict-service-accounts
- Google Cloud Functions IAM: Runtime and administrative service accounts: https://docs.cloud.google.com/functions/docs/concepts/iam
- Google Cloud IAM: Requiring permission to attach service accounts: https://docs.cloud.google.com/iam/docs/service-accounts-actas
- Google Cloud Runtime support schedule: https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud Storage IAM roles: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Logging IAM roles: https://docs.cloud.google.com/logging/docs/access-control
- Google Cloud Run logging: https://docs.cloud.google.com/run/docs/logging
- Google Cloud Secret Manager IAM roles: https://docs.cloud.google.com/secret-manager/docs/access-control
- Terraform Google provider: `google_cloudfunctions_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions_function

## Issues Found
- The post said the default compute service account typically has Editor on the project. Updated this to explain that it might have Editor depending on organization policy and creation date, and noted that organizations created on or after May 3, 2024 enforce the policy that prevents automatic Editor grants by default.
- The post implied Editor lets a function read Secret Manager secret payloads. Google Secret Manager documentation says `roles/editor` does not include `secretmanager.versions.access`, so the bullet was changed to a broader accurate statement about excessive project access.
- The examples used the decommissioned `nodejs18` runtime. Updated `gcloud` and Terraform examples to `nodejs22`, which is supported for both 1st gen and Run functions.
- The Cloud Storage write-access example used `gsutil iam ch` with a shorthand role. Replaced it with the current `gcloud storage buckets add-iam-policy-binding` form using `roles/storage.objectCreator`.
- The verification command only checked the Gen 1 `serviceAccountEmail` field. Added the Gen 2 `--gen2` command using `serviceConfig.serviceAccountEmail`.
- The Cloud Functions service agent note implied an explicit service-account-level grant is always required. Updated it to state that the permission is normally supplied by `roles/cloudfunctions.serviceAgent` on the project, with explicit grants needed when that binding is changed or the custom service account is in another project.
- The logging role comment said Cloud Functions need `roles/logging.logWriter`. Updated it to clarify that this role is only needed when application code writes through the Cloud Logging API or client libraries; stdout and stderr logs are collected automatically by the platform.

## Review Notes
- The Terraform example uses the first-generation `google_cloudfunctions_function` resource. That is valid for a Gen 1 example, but a future post update could add `google_cloudfunctions2_function` for Gen 2 coverage.
