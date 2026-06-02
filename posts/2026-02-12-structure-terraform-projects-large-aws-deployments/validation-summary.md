# Validation Summary: How to Structure Terraform Projects for Large AWS Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS
- Terraform S3 backend
- Terraform remote state
- AWS Systems Manager Parameter Store
- Terraform AWS provider
- Terragrunt

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform remote state overview: https://docs.hashicorp.com/terraform/language/state/remote
- Terraform AWS provider `aws_ssm_parameter` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter.html
- Terraform AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt migration guide for root `terragrunt.hcl`: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/

## Issues Found
- The Terraform S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend now marks DynamoDB-based locking as deprecated and recommends native S3 locking with `use_lockfile = true`. Updated the backend snippet accordingly.
- The Terragrunt `remote_state` example also used `dynamodb_table`. Updated it to `use_lockfile = true` to match current S3 backend locking guidance.
- The compute module source path was one directory too shallow for the shown layout. Changed `../../../modules/ecs-cluster` to `../../../../modules/ecs-cluster`.
- The Terragrunt root configuration example used a root `terragrunt.hcl` and `find_in_parent_folders()` with no filename. Current Terragrunt guidance recommends naming the shared root config `root.hcl` and using `find_in_parent_folders("root.hcl")`; updated the snippet to avoid the legacy pattern.

## Review Notes
The remaining examples are illustrative and omit provider/version/backend bootstrap details that a production repository would normally include. The remote state and SSM Parameter Store patterns are technically valid; remote state readers should be granted carefully scoped access because access to outputs generally requires access to the state snapshot.
