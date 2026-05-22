# Validation Summary: How to Use merge to Combine Tag Maps in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `merge`, `lookup`, and `timestamp` functions
- Terraform function argument expansion
- AWS provider `default_tags`
- HCL configuration

## Sources Consulted
- HashiCorp Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- HashiCorp Terraform function calls and argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- HashiCorp Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform provider configuration tutorial, including AWS provider `default_tags`: https://developer.hashicorp.com/terraform/tutorials/configuration-language/configure-providers
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post said `merge` takes "two or more maps." HashiCorp documents `merge` as accepting an arbitrary number of maps or objects, and the post itself includes a single-argument example. Updated the description to say it combines maps or objects from its arguments.
- The dynamic tag example used `timestamp()` for a tag value. HashiCorp documents that using `timestamp()` directly in resource attributes causes a diff on every Terraform run, so the `CreatedAt = timestamp()` tag was removed.
- The "Dynamic Tag Generation with for and merge" heading referenced `for`, but the example uses `lookup` rather than a `for` expression. Updated the heading to match the example.
- The "merge vs Object Spread" section implied variable-length argument expansion was not appropriate. Terraform supports function argument expansion with `...`, and the official `merge` documentation shows this pattern. Updated the paragraph to recommend `merge(list_of_maps...)` when maps are already in a list or tuple.

## Review Notes
The AWS provider `default_tags` example is conceptually correct for resources that support provider-level default tags. Resource-level tag values with the same keys override provider defaults, but provider defaults cannot be excluded per individual resource.
