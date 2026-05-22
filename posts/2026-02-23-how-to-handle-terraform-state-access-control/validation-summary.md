# Validation Summary: How to Handle Terraform State Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- AWS S3
- AWS IAM
- AWS KMS
- AWS CloudTrail
- Amazon CloudWatch Logs
- HCP Terraform / Terraform Enterprise
- Terraform Enterprise provider (`tfe`)

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp TLS provider `tls_private_key` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider `aws_cloudtrail` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail EventSelector API documentation: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CloudTrail documentation for sending events to CloudWatch Logs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- HCP Terraform workspace permissions documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- HCP Terraform team access API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-access

## Issues Found
- The post described S3 with DynamoDB locking as the primary secure backend pattern. Terraform now documents DynamoDB-based S3 backend locking as deprecated, so I changed the guide to use S3 native lockfile locking.
- The backend examples used `dynamodb_table`. Replaced that deprecated backend argument with `use_lockfile = true`.
- The setup snippet created a DynamoDB lock table. Removed that active recommendation and noted that native S3 lockfiles do not require a DynamoDB table.
- The IAM write policy included `s3:DeleteObject` for all state objects and DynamoDB lock table permissions. Terraform's S3 backend does not require deleting the state file, and native lockfiles require `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on `.tflock` objects, so I adjusted the permissions.
- The read-only policy was labeled as suitable for `terraform plan`. Terraform's S3 backend generally requires write and lockfile permissions for normal backend operation, so I changed the label to state inspection and `terraform_remote_state` reads.
- The environment-scoped IAM examples only granted object read/write access. Added bucket listing scoped by `s3:prefix` and lockfile permissions for the environment prefix.
- The CloudWatch metric filter referenced a CloudTrail log group, but the trail snippet did not configure CloudTrail delivery to CloudWatch Logs. Added `cloud_watch_logs_group_arn` and `cloud_watch_logs_role_arn` to the `aws_cloudtrail` example.
- Updated the Terraform Cloud wording to HCP Terraform, which is the current product name used in HashiCorp documentation.

## Review Notes
- Several snippets still assume supporting resources exist, including IAM roles, log buckets, CloudWatch log groups, and CloudTrail log delivery role policies.
- The examples use the older "CMK" wording for KMS keys. The current AWS terminology is "customer managed key", but the usage remains technically understandable.
