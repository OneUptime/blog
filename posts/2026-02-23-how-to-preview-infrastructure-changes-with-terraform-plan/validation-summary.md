# Validation Summary: How to Preview Infrastructure Changes with terraform plan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan files
- Terraform state refresh and drift detection
- Infrastructure as Code CI/CD workflows

## Sources Consulted
- HashiCorp Terraform CLI documentation: `terraform plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI documentation: `terraform apply` command: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform CLI documentation: `terraform show` command: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp tutorial: Create a Terraform plan: https://developer.hashicorp.com/terraform/tutorials/cli/plan

## Issues Found
- The saved-plan explanation implied that a manually changed cloud resource would necessarily make `terraform apply tfplan` fail because "the state has changed." Manual drift does not necessarily update Terraform state. Updated the text to say a saved plan applies only the reviewed actions and avoids applying unreviewed configuration or variable changes.
- The `-target` explanation said Terraform "skips dependency analysis for resources outside the target." Official documentation says Terraform selects targeted resources and the objects they depend on, while warning that targeting can cause undetected drift elsewhere. Updated the wording to match that behavior.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was validated against current official HashiCorp documentation rather than local `terraform --help` output.
- Saved plan files can contain sensitive data in cleartext, even if terminal output obscures it. The post does not mention this caveat, but it is an important future improvement for a production CI/CD workflow.
