# Validation Summary: How to Fix 'Permission Denied' IAM Errors in GCP

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud resource hierarchy and IAM policy inheritance
- Google Cloud CLI (`gcloud`)
- Cloud Storage IAM and `gsutil`
- IAM Conditions
- Custom IAM roles
- Policy Troubleshooter
- Terraform Google provider IAM resources
- Cloud Audit Logs and IAM Recommender

## Sources Consulted
- Google Cloud SDK reference: `gcloud projects get-iam-policy` - https://docs.cloud.google.com/sdk/gcloud/reference/projects/get-iam-policy
- Google Cloud SDK reference: `gcloud projects add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK reference: `gcloud iam roles create` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud SDK reference: `gcloud policy-troubleshoot iam` - https://docs.cloud.google.com/sdk/gcloud/reference/policy-troubleshoot/iam
- Google Cloud IAM documentation: Test permissions for custom user interfaces - https://docs.cloud.google.com/iam/docs/testing-permissions
- Cloud Resource Manager REST reference: `projects.testIamPermissions` - https://docs.cloud.google.com/resource-manager/reference/rest/v1/projects/testIamPermissions
- Cloud Storage JSON API reference: `buckets.testIamPermissions` - https://docs.cloud.google.com/storage/docs/json_api/v1/buckets/testIamPermissions
- Google Cloud IAM documentation: Create and manage custom roles - https://docs.cloud.google.com/iam/docs/creating-custom-roles
- Cloud Storage IAM roles documentation - https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Terraform Registry: Google provider IAM resources for projects and Cloud Storage buckets - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam

## Issues Found
- The permissions testing section said you can test whether "a principal" has permissions. Google Cloud's `testIamPermissions()` methods test permissions for the currently authenticated caller. Updated the wording to avoid implying arbitrary-principal checks.
- The post used `gcloud projects test-iam-permissions`, but this command is not listed in the current official `gcloud projects` reference. Replaced the example with the documented Resource Manager `projects.testIamPermissions` REST call.
- The Cloud Storage permission test used the Resource Manager project endpoint for `storage.objects.*` permissions. Replaced it with the Cloud Storage JSON API bucket `iam/testPermissions` endpoint, which is the resource-specific API documented for bucket-level storage permission tests.
- The conditional IAM binding example used `roles/editor`. Google Cloud rejects IAM Conditions on basic roles such as Owner, Editor, and Viewer. Changed the role to `roles/browser`, a predefined non-basic role suitable for a time-limited example.
- The Policy Troubleshooter command used stale flags (`--principal` and `--resource`). Updated it to the current documented syntax: resource as the positional argument and `--principal-email` for the principal.

## Review Notes
The remaining examples are technically plausible and align with the current documentation. Local `gcloud` and `terraform` binaries were not installed in the review environment, so CLI validation was done against official Google Cloud and Terraform provider documentation rather than local `--help` output.
