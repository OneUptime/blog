# Validation Summary: How to Use the Terraform Replace Command for Resource Recreation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform resource addressing
- Terraform lifecycle meta-arguments
- Infrastructure as Code workflows

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform recreate resources / taint documentation: https://developer.hashicorp.com/terraform/cli/state/taint
- Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

## Issues Found
- The post said `terraform plan -replace` output would mark the resource with `# forces replacement`. HashiCorp's documented `-replace` output marks the resource as `will be replaced, as requested`; `# forces replacement` is normally associated with attribute-level replacement reasons. Updated the example text and output snippet.
- The post said `taint` is deprecated as of Terraform v1.x and may be removed in future versions. HashiCorp documents `terraform taint` as deprecated in favor of `-replace`, which was introduced in Terraform v0.15.2. Updated the wording to avoid the inaccurate version claim.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against current official HashiCorp documentation rather than local `terraform --help` output.
