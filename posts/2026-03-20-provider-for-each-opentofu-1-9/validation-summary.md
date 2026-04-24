# Validation Summary: How to Use Provider for_each Introduced in OpenTofu 1.9

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu 1.9
- OpenTofu CLI
- HCL
- AWS provider configuration
- Amazon S3

## Sources Consulted
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Module `providers` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- What's new in OpenTofu 1.9?: https://opentofu.org/docs/v1.9/intro/whats-new/
- OpenTofu 1.9.0 release post: https://opentofu.org/blog/opentofu-1-9-0/

## Issues Found
- The post used dynamic provider instances as `aws[each.key]` and set `alias = each.key`. OpenTofu requires `for_each` on providers to be used with an aliased provider configuration, and provider instances are referenced as `aws.<alias>[<key>]`. I corrected the examples to use static aliases such as `by_region` and `by_account`.
- The resource and module examples used the same `for_each` collections as their associated provider configurations. OpenTofu explicitly warns that this can break future destroy operations because the provider instance must outlive the resource or module instance it manages. I changed the examples to keep provider iteration broader than resource and module iteration by introducing separate deployment collections.
- The module example derived `vpc_cidr` from `index(tolist(var.regions), each.key)`, which depends on the iteration order of a set. I changed it to sort the regions first so the example is deterministic.
- The `tofu plan -target` comment implied the flag targets "a provider's resources". OpenTofu targets resource addresses, not providers, and documents `-target` as an exceptional-use option. I corrected the wording.

## Review Notes
- Provider `for_each` was introduced in OpenTofu 1.9.0 and remains documented in current OpenTofu documentation.
- `tofu` was not installed in the local environment, so CLI syntax was verified against the official OpenTofu command documentation instead of local `--help` output.
