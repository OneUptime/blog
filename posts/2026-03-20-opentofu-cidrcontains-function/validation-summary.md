# Validation Summary: How to Use the cidrcontains Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (built-in `cidrcontains` function)
- HCL (HashiCorp Configuration Language)
- CIDR / IP networking (IPv4)
- `tofu console` CLI

## Sources Consulted
- [OpenTofu cidrcontains Function (official docs)](https://opentofu.org/docs/language/functions/cidrcontains/)
- [OpenTofu Functions index](https://opentofu.org/docs/language/functions/)
- [OpenTofu CHANGELOG](https://github.com/opentofu/opentofu/blob/main/CHANGELOG.md)
- [What's new in OpenTofu 1.11](https://opentofu.org/docs/intro/whats-new/)

## Issues Found
No technical issues found.

The function signature, semantics, and all numeric/boolean results in the examples were verified against the official OpenTofu documentation:

- `cidrcontains("10.0.0.0/8", "10.5.3.1")` → `true` ✓
- `cidrcontains("10.0.0.0/8", "10.1.0.0/16")` → `true` ✓
- `cidrcontains("10.0.0.0/8", "192.168.1.1")` → `false` ✓
- `cidrcontains("192.168.0.0/16", "192.168.1.100")` → `true` ✓
- `cidrcontains("10.0.0.0/24", "10.0.1.0")` → `false` ✓ (10.0.0.0/24 covers 10.0.0.0–10.0.0.255)

The "filtering IP lists" output (`["10.0.1.5", "10.0.2.10"]`) and the public-access detection logic are also correct.

## Review Notes
- The post does not mention a minimum OpenTofu version. `cidrcontains` is a relatively recent addition to OpenTofu's built-in function set (not present in Terraform proper at the time of writing), so readers on older OpenTofu releases or Terraform may see "function not found" errors. Adding a version note in a future revision would be helpful but is not a technical inaccuracy.
- The "Verifying Subnet is Within VPC" example references `var.vpc_cidr` from inside the `validation` block of a different variable. Cross-variable references in validation conditions are supported in modern OpenTofu (1.8+); this is correct on current versions but would have been rejected on older releases.
- In the "Detecting Internet-Accessible Ranges" example, `cidr == "0.0.0.0/0"` is logically redundant given `cidrcontains(cidr, "0.0.0.0")` already returns `true` for `0.0.0.0/0`. The expression is still correct, just slightly belt-and-braces.
- Argument names in the syntax block (`containing_cidr`, `contained_ip_or_cidr`) are author-friendly labels, not the names used in the official docs (`network_prefix`, `address_or_prefix`). Both are accurate descriptions; this is a stylistic choice, not an error.
