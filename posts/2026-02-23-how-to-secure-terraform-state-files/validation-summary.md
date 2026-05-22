# Validation Summary: How to Secure Terraform State Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform state and remote backends
- AWS S3 backend
- AWS KMS
- AWS IAM
- AWS CloudTrail
- AWS CLI
- Azure Blob Storage backend
- Google Cloud Storage backend
- pre-commit hooks

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- AWS CLI `s3api list-object-versions` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api get-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- Amazon S3 encryption in transit documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryptionInTransit.html
- pre-commit-terraform repository documentation: https://github.com/antonbabenko/pre-commit-terraform

## Issues Found
- The AWS S3 backend example used `dynamodb_table` and described DynamoDB-based locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile locking with `use_lockfile`. Updated the heading, backend configuration, and setup snippet to use native S3 locking and removed the DynamoDB lock table resource.
- The IAM policy granted `s3:DeleteObject` broadly on the state bucket and used DynamoDB permissions for locking. Terraform's S3 backend documentation says `s3:DeleteObject` is not required for the state file, but is required for the `.tflock` lock file when `use_lockfile` is enabled. Updated the policy to remove broad state deletion and add lockfile-specific S3 permissions.
- The pre-commit configuration referenced `https://github.com/antonbabenko/pre-commit-tf`, but the maintained repository is `https://github.com/antonbabenko/pre-commit-terraform`. Updated the repository URL and added the required `rev` field using the latest release found during review.

## Review Notes
The remaining examples are illustrative snippets rather than complete standalone Terraform modules. The KMS policy is intentionally broad for a guide example; in production it should be narrowed to the specific key actions and principals required by the organization.
