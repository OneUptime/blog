# Validation Summary: How to Store Terraform State Remotely with S3 Backend on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform S3 backend
- Amazon S3
- AWS CLI
- RHEL/Linux workstation usage

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/init
- Terraform state pull command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform force-unlock command documentation: https://docs.hashicorp.com/terraform/cli/commands/force-unlock
- AWS CLI create-bucket command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- Amazon S3 AWS CLI getting started guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/GettingStartedS3CLI.html
- AWS Prescriptive Guidance for Terraform backend best practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html

## Issues Found
- The post used DynamoDB state locking via `dynamodb_table`, but Terraform now marks DynamoDB-based locking for the S3 backend as deprecated and recommends S3 native lock files with `use_lockfile = true`. I updated the description, diagram, backend configuration, backend config files, and state-locking explanation to use S3 lock files.
- The setup section created a DynamoDB table solely for Terraform state locking. Because the corrected backend uses S3 native locking, I removed the DynamoDB table creation command.

## Review Notes
The AWS S3 bucket creation, versioning, public access block, bucket encryption, bucket policy, `terraform init`, `terraform state pull`, backend config file usage, and `terraform force-unlock` examples are consistent with the reviewed documentation. The example uses `us-east-1`, where AWS CLI bucket creation does not require a `LocationConstraint`; other regions would require `--create-bucket-configuration LocationConstraint=<region>`.
