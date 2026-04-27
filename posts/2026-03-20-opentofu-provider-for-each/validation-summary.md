# Validation Summary: How to Use Provider for_each for Dynamic Provider Instances in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.9+)
- Terraform / HCL configuration language
- AWS provider (multi-region and multi-account patterns)
- Kubernetes provider (multi-cluster pattern)
- Module composition with the `providers` meta-argument

## Sources Consulted
- [OpenTofu — Provider Configuration](https://opentofu.org/docs/language/providers/configuration/)
- [OpenTofu — The Module providers Meta-Argument](https://opentofu.org/docs/language/meta-arguments/module-providers/)
- [OpenTofu — The Resource provider Meta-Argument](https://opentofu.org/docs/language/meta-arguments/resource-provider/)
- [OpenTofu PR #2138 — Initial documentation updates for dynamic provider instances](https://github.com/opentofu/opentofu/pull/2138)
- [env0 — OpenTofu 1.9 introduces 'exclude' and 'for_each' for providers](https://www.env0.com/blog/opentofu-1-9-introduces-the-exclude-flag-and-for-each-for-providers)
- [HashiCorp — Terraform `provider` block reference](https://developer.hashicorp.com/terraform/language/block/provider) (to confirm Terraform does not support `for_each` on providers)

## Issues Found

1. **`alias = each.key` was incorrect.** The post originally set the provider `alias` to `each.key` and described the alias as a per-instance unique identifier. According to the OpenTofu documentation, the `alias` on a multi-instance provider must be a **static string** that names the provider configuration group as a whole. Individual instances are distinguished by the `for_each` key, not by the alias. Updated the syntax block, all four code examples (multi-region, modules, multi-account, Kubernetes), and the corresponding bullet in "Important Notes" to use static aliases (`by_region`, `by_account`, `by_cluster`).

2. **Reference syntax `aws[each.key]` was incorrect.** The proper reference syntax is `<PROVIDER>.<ALIAS>[<KEY>]`, e.g. `aws.by_region[each.key]`. Without the alias segment, OpenTofu cannot resolve which multi-instance provider configuration is being referenced. Updated both the module example and the multi-account example to use `aws.by_region[each.key]` and `aws.by_account[each.key]`, and corrected the bullet in "Important Notes".

3. **Module `for_each` reused the provider's `for_each` expression verbatim.** Both code samples that combined a multi-instance provider with `for_each` modules used `for_each = var.aws_regions` (or `var.aws_accounts`) on both the provider and the module. The OpenTofu docs explicitly require these two expressions to be different — provider instances must outlive their associated resources during destroy operations, so the dependency graph requires the expressions not to match exactly. Rewrote the module `for_each` arguments to use a `for` comprehension (`{ for region, config in var.aws_regions : region => config }`), which mirrors the pattern from the official OpenTofu documentation, and added an explanatory paragraph plus a new bullet in "Important Notes".

4. **"Values used in `for_each` must be known before `tofu init` runs" was misleading.** The actual constraint is that the value must be a map, object, or set of strings and must be resolvable at plan time, which is the same constraint that applies to `for_each` elsewhere — there is no special "before init" requirement. Replaced with the accurate constraint and added the allowed value types.

5. **Added the version where the feature was introduced.** Clarified that provider `for_each` was added in OpenTofu 1.9, which is verifiable from the release notes and was missing from the original post.

## Review Notes

- The claim that provider `for_each` is unavailable in stock Terraform is correct as of April 2026; the HashiCorp `provider` block reference still documents only `alias` for multiple configurations.
- Region values like `us-east-1` and `eu-west-1` are unquoted map keys in the `var.aws_regions` default — this is valid HCL because they are syntactically valid identifiers, but readers copy-pasting unusual region names (with characters that aren't valid identifiers) would need to quote them. Not a correctness issue, so left as-is.
- The `assume_role` block under the `aws` provider is the correct argument name for the AWS provider (verified against current AWS provider docs).
- `base64decode` is a valid OpenTofu function for decoding the Kubernetes cluster CA certificate, which matches the typical EKS auth pattern.
