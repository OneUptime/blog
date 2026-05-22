# Validation Summary: How to Use Read-Only State Access in Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform
- Terraform state and `terraform_remote_state`
- HCP Terraform / Terraform Cloud workspace state sharing
- AWS S3 backend permissions and CloudTrail data events
- Google Cloud Storage IAM
- Azure Blob Storage RBAC

## Sources Consulted
- HashiCorp Terraform documentation: `terraform_remote_state` data source - https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform documentation: output values and sensitive outputs - https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform documentation: remote backend - https://developer.hashicorp.com/terraform/language/backend/remote
- HashiCorp HCP Terraform documentation: workspace settings and remote state sharing - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- AWS CloudTrail documentation: S3 object data events and event selectors - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CloudTrail API documentation: `EventSelector` - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- Google Cloud Storage IAM roles documentation - https://cloud.google.com/storage/docs/access-control/iam-roles
- Microsoft Azure built-in roles documentation - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles

## Issues Found
- The post implied that exposing only outputs avoids granting access to the full state file. HashiCorp documents that `terraform_remote_state` exposes only root outputs to Terraform configuration, but the reader still needs access to the full state snapshot. Updated the section heading and text to clarify that backend-level readers can access the full state directly.
- The sensitive output discussion implied only plan-output redaction. Updated it to state that Terraform hides sensitive outputs in normal CLI output, while sensitive output values are still stored in state.
- The Terraform Cloud section did not mention HashiCorp's current recommendation for HCP Terraform / Terraform Enterprise output sharing. Added a note that `tfe_outputs` is recommended when only outputs are needed because it avoids full state access.
- The best-practices list said to never grant access to full state, which is not accurate for `terraform_remote_state` backed by direct state access. Updated the guidance to warn that backend-level state readers can access the full snapshot.

## Review Notes
The IAM and RBAC snippets use valid read-oriented roles or permissions for S3, GCS, and Azure Blob Storage. The examples are illustrative and omit surrounding provider configuration and some production hardening, such as S3 bucket policy details for CloudTrail log delivery and tighter `s3:ListBucket` prefix conditions.
