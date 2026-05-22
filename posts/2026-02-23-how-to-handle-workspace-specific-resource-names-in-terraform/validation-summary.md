# Validation Summary: How to Handle Workspace-Specific Resource Names in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform workspaces
- Terraform functions and check blocks
- HashiCorp Random provider
- AWS S3, RDS, EC2 tags, IAM roles, and Lambda functions
- Azure Storage accounts and resource groups
- Google Cloud Storage and Compute Engine

## Sources Consulted
- Terraform workspaces documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform validation and check blocks documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform replace function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- HashiCorp Random provider documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS RDS CreateDBInstance API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html
- AWS EC2 tag restrictions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html
- AWS IAM CreateRole API reference: https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateRole.html
- AWS Lambda CreateFunction API reference: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html
- Azure Storage account overview: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Azure resource naming rules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Google Cloud Storage bucket documentation: https://cloud.google.com/storage/docs/buckets
- Google Compute Engine resource naming documentation: https://cloud.google.com/compute/docs/naming-resources

## Issues Found
- Azure storage account sanitization only removed hyphens, but storage account names allow only lowercase letters and numbers. Updated the Azure storage examples and naming module output to remove all non-alphanumeric characters with Terraform's regex-capable `replace` function.
- The Azure storage account hash example appended the hash before truncating to 24 characters, which could truncate the hash away for long workspace names. Updated the example to truncate the sanitized prefix to 20 characters and append the 4-character hash after truncation.
- The S3 validation example described itself as checking S3 naming rules but only covered a subset of the current rules. Updated the wording to "common S3 naming rules" and added checks for adjacent periods and IPv4-address-style names.

## Review Notes
Terraform is not installed in the local workspace, so `terraform fmt` and `terraform validate` could not be run. The snippets were reviewed against current official documentation. Several provider resource examples are intentionally partial snippets focused on naming fields and omit unrelated required arguments such as AMIs, instance sizes, roles, and engine settings.
