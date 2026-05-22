# Validation Summary: How to Import Large Numbers of Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform import blocks
- Terraform S3 backend
- AWS CLI
- Terraform AWS provider
- Terraformer
- cf-terraforming
- GNU coreutils split
- GNU findutils xargs
- Bash
- Python subprocess

## Sources Consulted
- Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform import and configuration generation documentation: https://developer.hashicorp.com/terraform/language/import/generating-configuration
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider aws_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS CLI describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Terraformer upstream repository and README: https://github.com/GoogleCloudPlatform/terraformer
- Terraformer AWS provider source: https://raw.githubusercontent.com/GoogleCloudPlatform/terraformer/master/providers/aws/aws_provider.go
- cf-terraforming upstream repository and README: https://github.com/cloudflare/cf-terraforming
- GNU coreutils split help output from local environment
- GNU findutils xargs help output from local environment

## Issues Found
- Terraformer is now deprecated: added a note that the upstream Terraformer repository was archived and marked deprecated in March 2026.
- Incorrect Terraformer AWS resource names: changed `ebs_volume` to `ebs` and `security_group` to `sg`, matching Terraformer's AWS provider service names.
- AWS discovery script did not actually skip terminated EC2 instances: updated the AWS CLI JMESPath query to filter out instances where `State.Name` is `terminated`.
- Generated Terraform resource names could collide or become awkward when EC2 Name tags were duplicated: included the EC2 instance ID in the generated Terraform name before sanitization.
- Generated files started with an unnecessary blank line: changed `echo "" > file` to `: > file` so batch splitting starts cleanly.
- Batch splitting used four lines per import block even though the generated import blocks use five lines including the separator: changed the split calculation to `BATCH_SIZE * 5`.
- S3 backend locking example used deprecated DynamoDB-based locking: replaced `dynamodb_table` with `use_lockfile = true`, matching current Terraform S3 backend guidance.

## Review Notes
The examples are still illustrative and should be adapted before production use, especially the generated `aws_instance` configuration and the parallel `terraform import` workflow. Terraform CLI, AWS CLI, and cf-terraforming commands were checked against current documentation where available; Terraform, AWS CLI, and Terraformer binaries were not installed locally, so those commands could not be executed in this workspace.
