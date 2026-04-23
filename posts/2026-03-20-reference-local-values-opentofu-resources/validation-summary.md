# Validation Summary: How to Reference Local Values in OpenTofu Resources - Resources

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- OpenTofu
- HCL
- Infrastructure as Code
- AWS provider examples for OpenTofu-compatible configuration

## Sources Consulted
- OpenTofu documentation: Local Values — https://opentofu.org/docs/language/values/locals/
- OpenTofu documentation: References to Named Values — https://opentofu.org/docs/language/expressions/references/
- OpenTofu documentation: The `for_each` Meta-Argument — https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu documentation: Output Values — https://opentofu.org/docs/language/values/outputs/
- OpenTofu documentation: Command: console — https://opentofu.org/docs/cli/commands/console/

## Issues Found
1. The `for_each` example referenced `local.name_prefix` without declaring it. I added `name_prefix` to the `locals` block so the example is internally consistent.
2. The `for_each` example included a `count` field inside each map value, which had no effect on resource creation and could mislead readers into thinking it controlled instance multiplicity. I removed the unused `count` fields.
3. The output example referenced `local.full_domain` and `local.common_tags` without defining either local value. I added the missing `locals` block so the example is technically correct.

## Review Notes
- Core claims in the post are accurate per the OpenTofu docs: locals are declared in `locals` blocks, referenced as `local.<name>`, scoped to the current module, and may reference other locals as long as no circular dependency is introduced.
- `tofu` was not installed in the local review environment, so the `tofu console` example was verified against the official CLI documentation rather than local command output.
