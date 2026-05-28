# Validation Summary: How to Configure Cloud Run to Use a Custom Service Account with Least-Privilege

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI (`gcloud`)
- Cloud Storage IAM
- Pub/Sub IAM
- Secret Manager IAM
- Cloud SQL IAM
- Cloud Logging
- IAM Recommender
- Terraform Google provider

## Sources Consulted
- Cloud Run service identity overview: https://cloud.google.com/run/docs/securing/service-identity
- Cloud Run service identity configuration: https://cloud.google.com/run/docs/configuring/services/service-identity
- `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Storage IAM roles: https://cloud.google.com/storage/docs/access-control/iam-roles
- Cloud Storage IAM and `gsutil iam` permissions: https://cloud.google.com/storage/docs/access-control/iam-gsutil
- Pub/Sub IAM binding command reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/add-iam-policy-binding
- Secret Manager IAM and access control: https://cloud.google.com/secret-manager/docs/access-control
- `gcloud secrets add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/add-iam-policy-binding
- Cloud SQL from Cloud Run documentation: https://cloud.google.com/sql/docs/mysql/connect-run
- Cloud Logging for Cloud Run: https://cloud.google.com/run/docs/logging
- `gcloud logging read` reference: https://cloud.google.com/sdk/gcloud/reference/logging/read
- IAM roles overview and permissions references: https://cloud.google.com/iam/docs/roles-overview
- Terraform `google_cloud_run_v2_service` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The post stated that Cloud Run's default Compute Engine service account has the Editor role by default. Updated this to reflect current Google Cloud behavior: the default service account might have Editor depending on organization policy, and organizations created after May 3, 2024 enforce the automatic-grants constraint by default.
- The post stated that Editor lets the Cloud Run container read every secret and modify IAM policies. Updated this because the Editor role does not include Secret Manager payload access and does not provide general IAM allow-policy management permissions.
- The post's practical impact list overstated "access every other service in the project." Updated the wording to "call many Google Cloud APIs with broad project-level permissions," which preserves the security warning without overstating the role.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI syntax was verified against official Google Cloud SDK reference documentation instead of local `--help` output.
- The Cloud SQL Client role is project-level for the Cloud SQL project; if the Cloud Run service account is in a different project from the Cloud SQL instance, the role must be granted in the project that contains the Cloud SQL instance.
