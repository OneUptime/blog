# Validation Summary: How to Use Version Constraints for Terraform Modules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform module blocks
- Terraform Registry modules
- Terraform version constraints
- Terraform CLI validation
- Semantic versioning

## Sources Consulted
- HashiCorp Terraform documentation: Version Constraints - https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- HashiCorp Terraform documentation: module block reference - https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform documentation: Use modules in your configuration - https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform documentation: Registry API - https://developer.hashicorp.com/terraform/registry/api-docs
- HashiCorp Terraform documentation: terraform validate command - https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp go-version constraint implementation and tests - https://github.com/hashicorp/go-version
- Terraform Registry module page checked: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest

## Issues Found
- The post said Terraform supports six version constraint operators, but it listed seven operator forms documented by Terraform: exact match/no operator, `!=`, `>`, `>=`, `<`, `<=`, and `~>`. Changed the wording to seven operator forms.
- The post claimed `~> 5` is equivalent to `>= 5.0.0, < 6.0.0`. Single-component pessimistic constraints should not be used to express a major-version upper bound. Replaced the example and recommendation with the explicit range `>= 5.0.0, < 6.0.0`.
- The version conflict section implied that two modules requiring different versions of the same nested module may conflict. Terraform installs module packages per module block, so that is not the usual cross-module conflict behavior. Rewrote the example to show an unsatisfiable constraint on a single module block and clarified that cross-module conflicts are more typical for providers than modules.
- The `terraform validate` section omitted that validation requires an initialized working directory with referenced modules installed. Added `terraform init -backend=false` before `terraform validate`.

## Review Notes
The registry API command and referenced registry page were checked and returned successful responses. The local environment does not have the Terraform CLI installed, so command behavior was verified against official Terraform CLI documentation rather than local execution.
