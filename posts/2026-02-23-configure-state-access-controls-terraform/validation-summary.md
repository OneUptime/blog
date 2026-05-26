# Validation Summary: How to Configure State Access Controls in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- AWS IAM, S3, CloudTrail, and SSM
- Google Cloud Storage IAM
- Azure Storage RBAC and network rules
- HCP Terraform / Terraform Enterprise team access

## Sources Consulted
- HashiCorp Developer: S3 backend - https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Developer: GCS backend - https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Developer: HCP Terraform workspace permissions - https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- Terraform Registry: `tfe_team_access` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- Terraform Registry: `google_storage_bucket_iam_member` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam
- Terraform Registry: `google_project_iam_custom_role` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam_custom_role
- Terraform Registry: `azurerm_storage_account_network_rules` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules
- Microsoft Learn: Azure built-in roles for Storage Blob Data Reader and Contributor - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Terraform Registry: `aws_cloudtrail` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail DataResource documentation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudtrail-trail-dataresource.html

## Issues Found
- The S3 backend examples used DynamoDB lock table permissions as the current locking pattern. HashiCorp now documents native S3 lock files with `use_lockfile` and marks DynamoDB-based locking as deprecated. Updated the S3 IAM examples to use S3 lock file permissions instead of DynamoDB permissions.
- The original S3 IAM examples grouped `s3:ListBucket` with object ARNs. S3 bucket listing applies to the bucket ARN, while object read/write permissions apply to object ARNs. Split the list and object permissions into separate statements.
- The environment-specific S3 policies omitted bucket-level `s3:ListBucket` permissions needed by the S3 backend. Added scoped list statements with `s3:prefix` conditions.
- The GCS read-only role was described as planner access. HashiCorp's GCS backend documentation says backend credentials should have Storage Object Admin permissions, so `roles/storage.objectViewer` is better described as read-only state consumer access. Updated the comment.
- The Azure network control section was labeled as a private endpoint example, but the snippet uses `azurerm_storage_account_network_rules`, not `azurerm_private_endpoint`. Updated the heading to match the resource being configured.
- The `tfe_team_access` custom permissions block omitted the required `run_tasks` field. Added `run_tasks = false` so the example matches the current provider schema.

## Review Notes
The remaining Terraform resource types, role names, CloudTrail S3 object data event selector format, Google Cloud custom role reference, Azure Storage Blob Data Reader/Contributor role names, and HCP Terraform `state_versions = "read-outputs"` explanation match current official documentation. The S3 examples are still illustrative; production policies should usually scope object ARNs to exact backend keys or workspace prefixes rather than the whole bucket.
