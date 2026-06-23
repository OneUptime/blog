# Validation Summary: How to Get List Index in Terraform for_each

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform `for_each` and `count` meta-arguments
- Terraform for expressions
- Terraform collection and type conversion functions
- AWS provider resource examples

## Sources Consulted
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- Terraform `tostring` function documentation: https://developer.hashicorp.com/terraform/language/functions/tostring
- Terraform `range` function documentation: https://developer.hashicorp.com/terraform/language/functions/range
- Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform `index` function documentation: https://developer.hashicorp.com/terraform/language/functions/index_function
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types

## Issues Found
- The `zipmap` example passed `range(length(var.availability_zones))` directly as the key list. Terraform can often convert primitive types automatically, but the official `zipmap` contract requires the keys list to be strings. Changed the example to convert each index with `tostring(idx)`.
- The nested `global_index` example used `e < env` to compare environment names. Terraform ordering comparison operators expect numbers, so comparing strings this way is invalid. It also passed an empty list to `sum()` for the first environment, and `sum()` fails on an empty list. Replaced the expression with one that uses the lexicographically ordered map keys, `index`, `slice`, `concat`, and `sum` with a zero seed.
- The "Changing List Order" pitfall said changing list order causes resource recreation. That is too absolute: with index-derived keys, changing order reassigns values to the same numeric keys and may update or replace resources depending on which resource arguments changed. Updated the comment to describe the actual risk.

## Review Notes
The AWS resource snippets remain illustrative and omit surrounding provider, variable, and dependent resource definitions such as VPCs, AMIs, and credentials. The Terraform language patterns are valid after the corrections above.
