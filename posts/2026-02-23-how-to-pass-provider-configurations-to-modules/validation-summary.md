# Validation Summary: How to Pass Provider Configurations to Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform provider configurations
- Terraform provider aliases
- Terraform `required_providers`
- Terraform `configuration_aliases`
- Terraform module `providers` argument
- AWS Terraform provider

## Sources Consulted
- Terraform documentation: Providers Within Modules - https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform documentation: Provider block reference - https://developer.hashicorp.com/terraform/language/block/provider
- Terraform documentation: Use modules in your configuration - https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform AWS Provider documentation: Provider configuration and assume_role - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- Clarified the "only aliased providers" example. Terraform creates an implied empty default provider configuration when every provider block for a type is aliased; the module/resource then fails because the default AWS provider is not configured, not because no default object exists at all.
- Corrected the nested modules section. A child module can implicitly inherit a default provider configuration from its parent even when the parent received that default via an explicit `providers` mapping. Aliased provider configurations are never inherited automatically and must be passed explicitly where needed.
- Tightened the debugging checklist wording about provider blocks inside modules so it does not overstate the interaction with caller-supplied provider mappings.
- Updated the summary to say nested modules need explicit pass-through for aliased providers or non-default mappings, not for every explicit provider use.

## Review Notes
The remaining examples and explanations match current Terraform provider/module behavior. The examples use AWS provider `>= 5.0`, and the `assume_role` block fields shown are valid for the current AWS provider documentation.
