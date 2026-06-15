# Validation Summary: How to Configure State Locking in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform state locking
- Terraform S3 backend
- Amazon S3
- Amazon DynamoDB
- AWS IAM
- AWS CloudWatch
- AzureRM backend and Azure Blob Storage leases
- Google Cloud Storage backend
- HCP Terraform and Terraform Enterprise
- Consul backend

## Sources Consulted
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Consul backend documentation: https://developer.hashicorp.com/terraform/language/backend/consul
- Terraform apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform force-unlock command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- HCP Terraform workspace settings and locking documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform run management and workspace locking documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/manage
- AWS CLI DynamoDB create-table documentation: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- Azure Blob Lease REST API documentation: https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob
- Terraform AWS provider documentation for DynamoDB and CloudWatch alarm resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The AWS section presented DynamoDB as the normal S3 backend locking mechanism. Terraform now recommends S3 native lockfiles and marks `dynamodb_table` as deprecated. Updated the main AWS backend examples to use `use_lockfile = true` and labeled DynamoDB as legacy migration guidance.
- The verification step claimed Terraform plan would normally show lock acquire/release messages. Terraform only prints lock status messages when lock acquisition takes longer than expected. Updated the example to use `terraform apply` and describe the message condition accurately.
- The S3 locking mechanism was missing from the explanation. Added a short explanation of the `.tflock` object created next to the state object.
- The Azure Blob lease section claimed Terraform uses a 60-second lease that auto-renews and expires after 60 seconds on crashes. Terraform's backend docs guarantee native Azure Blob Storage locking, but do not document those Terraform-specific timing details. Removed the timing claims and kept the accurate lease behavior.
- The GCS section described the locking mechanism as object metadata coordination. The official Terraform backend docs state that the GCS backend supports state locking but do not document that mechanism. Removed the unsupported implementation detail.
- The HCP/Terraform Cloud section used older product naming and imprecise stuck-lock language. Updated it to HCP Terraform terminology and referenced force-canceling stuck runs.
- The `-lock-timeout` comment incorrectly said the default waits indefinitely. The documented default is `0s`, which causes immediate failure if the lock is already held. Corrected the command comment.
- The AWS IAM example omitted `dynamodb:DescribeTable` for legacy DynamoDB locking and did not include the required S3 `.tflock` permissions for S3 native locking. Split S3 bucket, state object, and lockfile permissions and added the legacy DynamoDB permission.
- The per-environment example used separate DynamoDB lock tables. Updated it to separate S3 state keys with `use_lockfile = true`, which creates separate lockfile objects.
- The CloudWatch alarm example claimed to detect locks older than one hour using DynamoDB read capacity metrics. CloudWatch DynamoDB capacity metrics do not expose individual lock age. Reworded the section to monitor unusual legacy lock table activity instead of stuck lock age.
- Troubleshooting and conclusion text still assumed DynamoDB locking was the AWS default. Updated the wording to prefer S3 lockfiles and mention DynamoDB only for legacy configurations.

## Review Notes
The guide is technically relevant and includes implementation details. DynamoDB locking remains documented only as deprecated legacy/migration guidance; future revisions could remove the DynamoDB examples entirely once support for old Terraform versions is no longer a concern.
