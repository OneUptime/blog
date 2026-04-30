# Validation Summary: How to Authenticate with GCP Using Service Account Keys in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud IAM and service accounts
- Google Cloud CLI (`gcloud`)
- Google provider for Terraform/OpenTofu
- GitHub Actions

## Sources Consulted
- Google Cloud: Authentication for Terraform - https://cloud.google.com/docs/terraform/authentication
- Google Cloud SDK: `gcloud iam service-accounts create` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK: `gcloud iam service-accounts keys create` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK: `gcloud projects add-iam-policy-binding` - https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud IAM: Create service accounts - https://cloud.google.com/iam/docs/service-accounts-create
- Google Cloud IAM: Create and delete service account keys - https://cloud.google.com/iam/docs/keys-create-delete
- Google Cloud IAM: Service account key rotation - https://cloud.google.com/iam/docs/key-rotation
- HashiCorp Google provider reference - https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference

## Issues Found
- The Step 1 comment said `roles/editor` was the required role for OpenTofu. I changed that comment to mark `roles/editor` as a broad testing-only example, because Google recommends predefined or custom least-privilege roles instead of basic roles like Editor in production.
- The Step 3 inline `GOOGLE_CREDENTIALS` example used unquoted command substitution. I changed it to `export GOOGLE_CREDENTIALS="$(cat opentofu-key.json)"` and updated the provider comment to refer to Application Default Credentials, which matches the current provider authentication guidance.
- The Step 4 GitHub Actions snippet mixed two different auth patterns by writing the key to a file and then authenticating with inline JSON via `GOOGLE_CREDENTIALS`. I corrected the example to write the secret with `printf '%s'` and then point `GOOGLE_APPLICATION_CREDENTIALS` at that file so the workflow is internally consistent.
- The Step 5 least-privilege example granted `roles/iam.serviceAccountUser` to the service account itself. I removed that binding because Google documents `roles/iam.serviceAccountUser` as a role granted to another principal that needs to attach or use a service account, not as a normal project role for the service account doing key-based provider authentication.

## Review Notes
- Google recommends Application Default Credentials as the default authentication approach for Terraform/OpenTofu on Google Cloud, and recommends Workload Identity Federation over service account keys when running outside Google Cloud.
- Service account key creation can be blocked by the `iam.disableServiceAccountKeyCreation` organization policy constraint. Google notes this constraint is enforced by default for organizations created on or after May 3, 2024.
- If service account keys must be used, Google recommends rotating them at least every 90 days.
- Google’s key-rotation guidance notes that Google Secret Manager is not the preferred place to store and rotate service account keys when the workload already has a Google-recognized identity.
