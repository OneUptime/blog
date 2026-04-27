# Validation Summary: Using for_each with Providers in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.9+)
- HCL (HashiCorp Configuration Language)
- Terraform-style provider configuration
- AWS provider (multi-region, multi-account, assume_role)
- Module composition with `providers` meta-argument

## Sources Consulted
- [Provider Configuration | OpenTofu](https://opentofu.org/docs/language/providers/configuration/)
- [The Module providers Meta-Argument | OpenTofu](https://opentofu.org/docs/language/meta-arguments/module-providers/)
- [OpenTofu 1.9.0 release announcement](https://opentofu.org/blog/opentofu-1-9-0/)
- [What's new in OpenTofu 1.7?](https://opentofu.org/docs/v1.7/intro/whats-new/)
- [env0 — OpenTofu 1.9 Introduces the 'exclude' Flag and 'for_each' for Providers](https://www.env0.com/blog/opentofu-1-9-introduces-the-exclude-flag-and-for-each-for-providers)
- [OpenTofu RFC: Static Evaluation of Providers (2024-05-13)](https://github.com/opentofu/opentofu/blob/main/rfc/20240513-static-evaluation-providers.md)

## Issues Found

1. **Wrong version attribution.** The post stated provider `for_each` was introduced in OpenTofu **1.7**. According to the OpenTofu 1.9 release announcement and the `whats-new` page for 1.7, provider `for_each` actually shipped in **OpenTofu 1.9** (1.7 only added `for_each` to `import` blocks). Updated the description, the section heading, the intro paragraph, and the conclusion to say 1.9.

2. **Dynamic alias on provider blocks (`alias = each.key`).** Per the official Provider Configuration docs, the `alias` argument on a provider block using `for_each` must be a **static string** that names the configuration block — instances are then keyed by `for_each`. A dynamic alias produces an "alias must be a valid name" error. Replaced `alias = each.key` with static aliases (`"by_region"`, `"by_account"`) in every provider block that uses `for_each`.

3. **Wrong provider reference syntax (`aws[each.key]`).** The correct reference for an instance of an aliased provider configuration is `<PROVIDER>.<ALIAS>[<INSTANCE_KEY>]`, e.g. `aws.by_region[each.key]`. Updated every `provider = aws[each.key]` line and every module `providers = { aws = aws[each.key] }` block to use the alias-qualified form.

4. **Resource and module `for_each` identical to provider `for_each`.** The docs explicitly require that "the `for_each` expression for a resource must _be different_ from the `for_each` expression for its associated provider configuration" so OpenTofu can plan destruction safely. Several examples used `for_each = var.regions` on both the provider and the consuming resource/module. Introduced a `disabled_regions` variable and switched the resource/module side to `setsubtract(var.regions, var.disabled_regions)`, matching the idiomatic pattern shown in the official docs.

5. **Outputs block referencing potentially-missing module instances.** The output iterated `for region in var.regions` and indexed `module.regional_infrastructure[region]`. After the `setsubtract` fix the module no longer has an instance for disabled regions, which would cause an evaluation error. Rewrote the output to iterate the module's actual instance map: `for region, instance in module.regional_infrastructure`.

6. **Added a brief explanatory paragraph** under the "for_each on Provider Blocks" heading covering the static-alias rule, the `aws.<alias>[key]` reference syntax, and the differing-`for_each` constraint, since these are easy footguns. Conclusion was also extended with a one-sentence list of the current 1.9 limitations (static alias required, static-evaluation constraint on `for_each` expression, resource/module `for_each` must differ from provider's).

## Review Notes

- The "Problem Before for_each" section is unchanged — it accurately depicts the pre-1.9 boilerplate pattern (manual aliased provider blocks and resource-by-resource provider assignment with `provider = aws.us_east_1`).
- The AWS provider's `assume_role { role_arn = "..." }` nested-block syntax is current and correct for AWS provider 5.x/6.x.
- The `required_providers` block in the child module example pinning `hashicorp/aws` at `>= 5.0` is valid; OpenTofu reads the same registry source addresses as Terraform.
- OpenTofu 1.9's static-evaluation requirement means `for_each` on a provider can only reference variables and locals whose values are known statically (not data sources or resources). The post now mentions this in the conclusion. Future-readers should note that later OpenTofu releases may relax this.
- Stylistic cleanup (e.g., consistently using `each.value` for `set(string)` since it equals `each.key`) was deliberately left alone to preserve the author's voice.
