# Validation Summary: How to Use the type Function in Terraform Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Console
- Terraform type system
- Terraform built-in functions
- HCL expressions

## Sources Consulted
- Terraform `type` function documentation: https://developer.hashicorp.com/terraform/language/functions/type
- Terraform console command documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform built-in functions overview: https://developer.hashicorp.com/terraform/language/functions
- Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- Empirical checks with Terraform CLI v1.13.5 from official HashiCorp releases.

## Issues Found
- The post did not mention that the `type` function is available only in Terraform 1.0 and later. Added that version note to match the official documentation.
- The examples for `type(keys({ a = 1, b = 2 }))` and `type(values({ a = 1, b = 2 }))` showed `list(...)`, but Terraform console reports tuple types for these literal object examples. Updated the displayed types to `tuple([...])`.
- The example for `type(zipmap(["a", "b"], [1, 2]))` showed `map(number)`, but Terraform console reports an object with attributes `a` and `b` for this expression. Updated the displayed type.
- The `for_each` resource example showed `map(object(...))`, but Terraform console reports a resource collection as an object keyed by resource instance keys. Updated the example wrapper to `object({ ... })`.
- The runtime checking snippet used names like `is_string`, but `can(tostring(...))` checks convertibility rather than exact type identity. Renamed the examples to `can_convert_to_*` and adjusted the surrounding sentence.

## Review Notes
Terraform was not installed in the workspace initially, so a temporary Terraform CLI v1.13.5 binary was downloaded from the official HashiCorp release site to verify console output. Terraform reported that newer CLI versions exist, but the checked behavior is for Terraform 1.0+ console type inspection and aligns with current official documentation.
