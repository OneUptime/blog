# Validation Summary: How to Use Tuple Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language)
- Terraform-compatible type constraints (tuple, list, object)
- AWS provider (`aws_instance`) — used only for illustrative examples

## Sources Consulted
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- OpenTofu variables documentation: https://opentofu.org/docs/language/values/variables/
- Terraform/OpenTofu expressions & literals documentation

## Issues Found
1. **Invalid use of `tuple()` as a value constructor** in the "When to Use Tuples" section.
   - The post's original example used `tuple([az, var.subnet_cidrs[i]])` inside a `for` expression. In HCL, `tuple(...)` is strictly a *type constraint* construct (used only in a `type = ...` argument). It is **not** a callable function that produces values — calling it in an expression context would error with "There is no function named 'tuple'".
   - Fixed by replacing `tuple([az, var.subnet_cidrs[i]])` with the plain bracket literal `[az, var.subnet_cidrs[i]]`, which is the correct way to construct a tuple value in HCL.

## Review Notes
- All other code samples are syntactically correct: tuple type declarations (`tuple([string, number, bool])`), index access (`var.spec[0]`), the list/tuple/object comparison, the CIDR construction example, and the output example referencing `aws_instance.web.root_block_device[0].volume_size` are all valid.
- The AMI ID `ami-0c55b159cbfafe1f0` is used only as an illustrative placeholder, which is acceptable for a type-system tutorial.
- The conceptual claims (tuples are fixed-length, heterogeneous, index-accessed; objects preferred for user-facing variables) are accurate per the OpenTofu type system.
