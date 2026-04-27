# Validation Summary: How to Pass Providers to Child Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL syntax)
- AWS provider (`hashicorp/aws`)
- Google Cloud provider (`google`)
- HCL `module` blocks, `provider` blocks, and `terraform { required_providers { ... } }` blocks
- The `providers` meta-argument and `configuration_aliases` argument

## Sources Consulted
- OpenTofu — Passing Providers to Child Modules: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu — The Resource `provider` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/resource-provider/
- OpenTofu — Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu — Provider Requirements (`required_providers`, `configuration_aliases`): https://opentofu.org/docs/language/providers/requirements/

## Issues Found
No technical issues found.

All examples were verified against the official OpenTofu documentation:

- The default-provider-inheritance example correctly reflects OpenTofu's behavior: child modules automatically inherit the default (unaliased) provider configuration from the calling module.
- The `provider "aws" { alias = "..." }` syntax for declaring additional configurations is correct.
- The `providers = { aws = aws.us_east }` map syntax in a `module` block is correct, and matches the documented behavior that aliased configurations are never inherited automatically and must be passed explicitly.
- The `terraform { required_providers { aws = { source = "hashicorp/aws", version = ">= 5.0" } } }` block is valid; `hashicorp/aws` resolves to the AWS provider via the OpenTofu Registry.
- The `assume_role { role_arn = "..." }` block on the `aws` provider is the correct nested-block syntax (not a deprecated string attribute).
- The `configuration_aliases = [aws.primary, aws.secondary]` argument inside `required_providers` is the documented way for a module to declare it accepts multiple configurations of the same provider.
- Passing aliased configurations with `providers = { aws.primary = aws.us_east, aws.secondary = aws.eu_west }` matches the documented mapping syntax.

## Review Notes
- In the `modules/vpc/main.tf` snippet, the line `provider = aws` on the `aws_vpc` resource is technically valid (per the resource-provider meta-argument docs, you may explicitly reference the default provider this way) but it is redundant — resources already use the default provider for their type when no `provider` argument is given. It does not change behavior, so it has been left in place to preserve the author's voice. A future revision could remove it and clarify that the passed-in provider simply *becomes* the module's default `aws` configuration.
- The post uses `version = ">= 5.0"` for the AWS provider. As of 2026, AWS provider 5.x is still widely used; AWS provider 6.x is also available. The `>= 5.0` constraint is permissive and remains valid.
- OpenTofu also supports a `tofu` block as an alternative to the `terraform` block in newer versions, but the `terraform` block used in the post is still fully supported and is the most portable choice.
