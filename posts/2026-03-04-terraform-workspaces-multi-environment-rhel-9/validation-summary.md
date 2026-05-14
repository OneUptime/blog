# Validation Summary: How to Use Terraform Workspaces for Multi-Environment Deployment on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform S3 backend
- AWS EC2
- AWS provider for Terraform
- Red Hat Enterprise Linux 9 AMIs
- Bash

## Sources Consulted
- HashiCorp Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform state workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform workspace select command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- HashiCorp Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Red Hat RHEL AMIs on AWS documentation: https://access.redhat.com/solutions/15356

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated, so the example now uses `use_lockfile = true`.
- The automation script created a saved plan for production and then ran `terraform apply "tfplan-prod"`. Terraform applies saved plans without prompting, so this did not provide the stated manual production confirmation. The production branch now runs `terraform plan` followed by `terraform apply`, while non-production still applies a saved plan.
- The EC2 example referenced `data.aws_ami.rhel9.id` without defining the `aws_ami` data source. Added a Red Hat-owned RHEL 9 AMI lookup using Red Hat's published AWS owner ID.
- The final paragraph overstated workspace isolation for production use. Updated it to clarify that CLI workspaces share the same backend and are not appropriate for deployments requiring separate credentials or strict access controls.
- The opening sentence said separate configuration copies always lead to drift and duplication. Updated it to "can lead" to avoid an absolute claim.

## Review Notes
Terraform CLI workspaces are technically correct for simple, similar deployments, but HashiCorp recommends separate configurations and backends when environments require strong separation, separate credentials, or different access controls.
