# Validation Summary: How to Use CIDR Functions in OpenTofu

## Status
validated

## Post Type
Reference / Tutorial — covers OpenTofu's five CIDR functions with example invocations and HCL configuration snippets.

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible CIDR functions: `cidrhost`, `cidrnetmask`, `cidrsubnet`, `cidrsubnets`, `cidrcontains`
- IPv4 / CIDR addressing concepts

## Sources Consulted
- [OpenTofu cidrhost docs](https://opentofu.org/docs/language/functions/cidrhost/)
- [OpenTofu cidrnetmask docs](https://opentofu.org/docs/language/functions/cidrnetmask/)
- [OpenTofu cidrsubnet docs](https://opentofu.org/docs/language/functions/cidrsubnet/)
- [OpenTofu cidrsubnets docs](https://opentofu.org/docs/language/functions/cidrsubnets/)
- [OpenTofu cidrcontains docs](https://opentofu.org/docs/language/functions/cidrcontains/)
- [OpenTofu v1.7 CHANGELOG](https://github.com/opentofu/opentofu/blob/v1.7/CHANGELOG.md) — confirmed `cidrcontains` was added in v1.7.0 (PR #366)
- [Terraform cidrhost docs (HashiCorp)](https://developer.hashicorp.com/terraform/language/functions/cidrhost) — confirmed negative `hostnum` counts from end
- [Terraform PR #13765](https://github.com/hashicorp/terraform/pull/13765/files) — origin of negative-host-number support in `cidrhost`

## Issues Found
1. **`cidrsubnets` example output was incorrect.** The post claimed the fourth result of `cidrsubnets("10.0.0.0/16", 4, 4, 8, 4)` was `"10.0.33.0/20"`. This is wrong: the function aligns each subnet to its required prefix-length boundary, so after the `10.0.32.0/24` block, the next `/20`-aligned block is `10.0.48.0/20` (not `10.0.33.0/20`, which is not even a valid `/20` network address since 33 is not a multiple of 16). Verified against the official OpenTofu docs example for `cidrsubnets("10.1.0.0/16", 4, 4, 8, 4)` which yields `[..., "10.1.48.0/20"]`. **Fixed:** changed `"10.0.33.0/20"` to `"10.0.48.0/20"` and updated the inline comment from "continues after the /24" to "next /20-aligned block after the /24".

2. **Incorrect version requirement for `cidrcontains`.** The post stated `cidrcontains` requires OpenTofu 1.5+. The function was actually added in OpenTofu v1.7.0 per the v1.7 CHANGELOG (PR #366). **Fixed:** changed "OpenTofu 1.5+" to "OpenTofu 1.7+".

## Review Notes
- The opening sentence says OpenTofu provides "five" CIDR functions — this is correct (`cidrhost`, `cidrnetmask`, `cidrsubnet`, `cidrsubnets`, `cidrcontains`).
- Negative `hostnum` support in `cidrhost` is real and behaves as described, even though the OpenTofu docs page itself does not currently document this behavior; the feature has existed since Terraform PR #13765 and OpenTofu inherits it.
- All `cidrsubnet` arithmetic in the example (public_subnets / private_subnets blocks) was verified manually and is correct.
- All `cidrnetmask` outputs are correct.
- `cidrhost` outputs for `/24` (1, 254, -2) verified correct.
- The `cidrcontains` examples are consistent with the official docs (correct return values for IPv4 addresses and subnet membership).
