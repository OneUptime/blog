# Validation Summary: How to Speed Up terraform plan with Targeted Planning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state and remote state
- Terraform workspaces
- AWS provider ECS service resource
- Terragrunt

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform plan tutorial and saved plan workflow: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terragrunt HCL dependency block documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/

## Issues Found
- The post described `-target` too broadly as a routine large-configuration speed strategy. HashiCorp documents `-target` as an exceptional-use option, so the guidance was tightened to emphasize temporary/debugging/recovery use and full plans for normal production and CI workflows.
- The `-target` explanation implied Terraform plans only the named resources. Terraform actually focuses on matching resource instances and their dependencies, so the wording was corrected.
- The `aws_ecs_service` example only showed `network_configuration`, which made the resource incomplete as an example of a service resource. Required service arguments were added while keeping the focus on remote state outputs.
- The Terragrunt section used `terragrunt run-all plan`, which is now documented as replaced by `terragrunt run --all plan`. The command and surrounding wording were updated.
- The Terragrunt section said Terragrunt automatically splits state by directory. This was qualified to state that separate Terragrunt units and backend configuration per directory are what produce separate state.

## Review Notes
- The `terraform_remote_state` example is valid, but HashiCorp recommends considering explicit configuration stores or `tfe_outputs` for HCP Terraform/Terraform Enterprise because `terraform_remote_state` access can expose the full state snapshot to readers.
- The resource-count and timing thresholds are reasonable rules of thumb, not Terraform guarantees; actual plan duration depends heavily on providers, data sources, network latency, and API rate limits.
