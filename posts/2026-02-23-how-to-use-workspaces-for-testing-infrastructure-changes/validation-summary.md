# Validation Summary: How to Use Workspaces for Testing Infrastructure Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform configuration language
- Terraform AWS provider resources
- AWS EC2 Spot Instances
- AWS RDS DB instances
- GitHub Actions CI/CD workflows
- Bash scripting

## Sources Consulted
- HashiCorp Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform workspace command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace
- HashiCorp Terraform automation guidance for `TF_WORKSPACE`: https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform
- HashiCorp Terraform named value references for `terraform.workspace`: https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_spot_instance_request` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_instance_request
- AWS EC2 Spot Instance documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-spot-instances-work.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The workspace-aware configuration treated `dev` as a standard workspace but did not include a `dev` key in `environment_config`. Added a `dev` configuration so `var.environment_config[local.env_key]` resolves correctly when the `dev` workspace is selected.
- The GitHub Actions example used `TF_WORKSPACE` as a general workflow variable while also running `terraform workspace select`. Terraform's automation documentation says `TF_WORKSPACE` overrides workspace selection, so the example now uses `TEST_WORKSPACE` instead.
- The `test-infrastructure.sh` comment said it applied a saved plan, but the script runs `terraform apply -auto-approve` against the current configuration. Updated the comment to match the command.
- The stale workspace script claimed to find workspaces older than 24 hours, but it only read `.serial` from Terraform state. Terraform state serial is a state version counter, not an age or timestamp. Updated the text and script so it lists test workspaces for manual cleanup instead of claiming age detection.

## Review Notes
The article's main workspace workflow aligns with HashiCorp's documented use case for temporary, parallel test infrastructure. The post correctly notes that CLI workspaces share a backend and should not be treated as a complete isolation boundary for complex deployments with separate credentials or access controls.
