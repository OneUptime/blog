# Validation Summary: How to Debug Access Not Configured Errors for Google Cloud APIs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud APIs
- Google Cloud CLI (`gcloud`)
- Google Cloud Service Usage
- Cloud Billing
- IAM service accounts and project IAM bindings
- Organization Policy Service
- API Keys API
- Terraform Google provider
- Python Google Cloud Compute client library

## Sources Consulted
- Google Cloud CLI reference: `gcloud services list` - https://docs.cloud.google.com/sdk/gcloud/reference/services/list
- Google Cloud CLI reference: `gcloud services enable` - https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud CLI reference: `gcloud billing projects describe` - https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/describe
- Google Cloud CLI reference: `gcloud billing projects link` - https://cloud.google.com/sdk/gcloud/reference/billing/projects/link
- Google Cloud CLI reference: `gcloud projects add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud CLI reference: `gcloud resource-manager org-policies describe` - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- Google Cloud CLI reference: `gcloud services api-keys describe` - https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/describe
- Google Cloud Organization Policy constraints - https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud Restrict Resource Service Usage organization policy - https://cloud.google.com/resource-manager/docs/organization-policy/restricting-resources
- Python Google Cloud Compute `InstancesClient.list` reference - https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.instances.InstancesClient
- Terraform Google provider `google_project_service` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service

## Issues Found
- The service account IAM example used `gcloud projects add-iam-binding`, which is not the documented command. Changed it to `gcloud projects add-iam-policy-binding`.
- The organization policy examples passed `constraints/serviceuser.services` and `constraints/gcp.restrictServiceUsage` to `gcloud resource-manager org-policies describe`. The documented command examples use the org policy ID form such as `serviceuser.services`, so the snippets were updated to `serviceuser.services` and `gcp.restrictServiceUsage`.
- The API key restriction snippet used `gcloud services api-keys get-key-string`, which retrieves the key string rather than metadata and restrictions. Changed it to `gcloud services api-keys describe KEY_ID --project=my-project`.

## Review Notes
The Google Cloud CLI and Terraform tools were not installed in the local environment, so command verification was performed against official Google Cloud CLI documentation and the Terraform provider registry. The Terraform `google_project_service` snippet is valid for the current provider documentation, including `disable_on_destroy = false` and resource timeouts.
