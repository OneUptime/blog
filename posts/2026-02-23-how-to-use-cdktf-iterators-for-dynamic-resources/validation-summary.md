# Validation Summary: How to Use CDKTF Iterators for Dynamic Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- TypeScript
- TerraformIterator
- Terraform for_each
- AWS provider for Terraform/CDKTF

## Sources Consulted
- HashiCorp CDKTF iterator documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/iterators
- HashiCorp CDKTF TypeScript API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes
- HashiCorp Terraform for_each meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform cidrsubnet function reference: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp Terraform index function reference: https://developer.hashicorp.com/terraform/language/functions/index_function
- Current npm package metadata and generated TypeScript declarations for `cdktf@0.21.0` and `@cdktf/provider-aws@21.22.1`

## Issues Found
- The description said CDKTF iterators are equivalent to both Terraform `for_each` and `count`. CDKTF uses `TerraformIterator` for `for_each`-style iteration and `TerraformCount` for `count`, so the description and introduction were corrected.
- The post repeatedly described data source and variable values as "only known at apply time." Terraform `for_each` values must be known before remote resource operations, and the CDKTF distinction is that they are not known at synthesis time. The wording was corrected.
- The first dynamic subnet example used an availability zone name as the subnet `cidrBlock`, which would produce an invalid AWS subnet configuration. The example now calculates the CIDR with `Fn.cidrsubnet`.
- The complex-list example used a `TerraformLocal` static expression while presenting `fromComplexList` as the pattern for complex object iteration. The example now uses a Terraform variable containing a list of objects and passes `subnets.value` to `TerraformIterator.fromComplexList`.
- The dynamic-block section claimed to show iterators for dynamic blocks but used a native TypeScript `Array.map`. The example now uses `TerraformIterator.fromList` with `iterator.dynamic`, which matches the documented CDKTF pattern for list attributes.
- The chaining section claimed to show chaining but only transformed values with Terraform functions. It now demonstrates `TerraformIterator.fromResources`, the documented chaining API.
- The post did not mention CDKTF's current maintenance status. A short note was added that HashiCorp deprecated CDKTF on December 10, 2025 and no longer supports or maintains it.

## Review Notes
The examples remain CDKTF-specific and are accurate for the final documented CDKTF API surface, but CDKTF itself is deprecated. Future updates should consider adding migration guidance or replacing CDKTF tutorials with Terraform HCL, OpenTofu, Pulumi, AWS CDK, or another actively maintained infrastructure-as-code tool.
