# Validation Summary: How to Reference Module Outputs in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform modules
- Terraform output values
- Terraform CLI
- AWS provider resources

## Sources Consulted
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform modules configuration guide: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform count meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform for_each meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found
- The sensitive root output comment said `sensitive = true` keeps the value hidden in CLI output. Terraform redacts sensitive outputs in default human-readable output, but the official CLI docs note that `-json` and `-raw` can display sensitive values in plain text. Changed the comment to "default CLI output" for accuracy.
- The dependency pitfall said that referencing module A's output means Terraform will always create module A's resources before module B's resources. Terraform builds a dependency graph from references and can still parallelize unrelated resources. Changed the sentence to say Terraform orders the resources that depend on the referenced output.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against the current official HashiCorp Terraform documentation instead of local `terraform --help` output.
