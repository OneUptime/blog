# Validation Summary: How to Use Module for_each in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform modules
- Terraform `for_each` meta-argument
- Terraform `moved` blocks
- Terraform provider configurations

## Sources Consulted
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module configuration guide: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform providers within modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform module refactoring and `moved` blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- OneUptime linked posts were checked with HTTP HEAD requests and returned HTTP 200.

## Issues Found
- The introduction described `for_each` as the recommended way to create multiple copies of a module. Terraform documentation recommends choosing between `for_each` and `count` based on whether instances need distinct values or are nearly identical, so this was narrowed to say `for_each` is often best when each copy needs distinct configuration.
- The set/map addressing explanation only mentioned map keys. Terraform uses map keys or set members as instance keys, so the wording was updated in the introduction and summary.
- The workaround comment for unknown apply-time keys mentioned using an index, but the example uses `inst.name`. The comment was updated to describe using a static name or another plan-time value.
- The limitations section said all instances share the same provider. Terraform's limitation is specifically that `for_each` module instances cannot receive different provider configuration mappings, so the wording was made more precise.
- The nested `for_each` section said keys at each level must be independent. Terraform allows chained relationships where keys change together, but all `for_each` keys must be known at plan time. The sentence was corrected accordingly.

## Review Notes
The HCL snippets are illustrative and depend on matching child module variables and outputs, but the Terraform language constructs shown are valid and align with current Terraform documentation.
