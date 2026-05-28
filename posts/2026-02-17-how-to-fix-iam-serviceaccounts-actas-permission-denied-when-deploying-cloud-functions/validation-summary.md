# Validation Summary: Fix iam.serviceAccounts.actAs Permission Denied When Deploying Cloud Functions

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI (`gcloud`)
- Cloud Build

## Sources Consulted
- Google Cloud Functions IAM roles: https://cloud.google.com/functions/docs/reference/iam/roles
- Google IAM service account permissions: https://cloud.google.com/iam/docs/service-account-permissions
- Google Cloud CLI `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Build deployment permissions for Cloud Run functions: https://cloud.google.com/build/docs/deploying-builds/deploy-functions
- Google Cloud Run functions deployment guide: https://cloud.google.com/run/docs/deploy-functions
- Google Cloud Functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Google IAM service account delete and undelete documentation: https://cloud.google.com/iam/docs/service-accounts-delete-undelete
- Google Cloud CLI `gcloud iam service-accounts undelete` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/undelete

## Issues Found
- The post stated that Cloud Functions use the App Engine default service account by default. This is accurate for Cloud Functions 1st gen, but Cloud Run functions default to the Compute Engine default service account. Updated the explanation to distinguish the two generations.
- The deploy example used `nodejs20`, which is deprecated as of 2026-04-30. Updated the example to `nodejs22`, which is currently supported.
- The Cloud Functions v2 section implied that `roles/run.admin` is always the deployer role for 2nd gen functions. Updated the section to distinguish functions managed through the Cloud Functions API from Cloud Run functions deployed from source, and added the documented `actAs` requirement on the Cloud Build service account.
- The CI/CD section was incomplete for Cloud Build deployments of Cloud Run functions. Added the supporting roles documented for Cloud Build-based deployments: Cloud Run Admin, Storage Admin, Artifact Registry Writer, and Logs Writer.
- The deleted service account restore example used an unsupported `gcloud iam service-accounts list --include-deleted` flag. Replaced it with the documented flow: find the deleted service account's numeric ID from IAM policy bindings or audit logs, then run `gcloud iam service-accounts undelete ACCOUNT_ID`.

## Review Notes
The core guidance is correct: the deployer needs a role containing `iam.serviceAccounts.actAs`, commonly `roles/iam.serviceAccountUser`, on the runtime service account. Service accounts can normally be undeleted only if they were deleted within the last 30 days and no replacement service account with the same name exists.
