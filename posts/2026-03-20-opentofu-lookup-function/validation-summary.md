# Validation Summary: How to Use the lookup Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (HCL language)
- Terraform-compatible configuration language
- AWS provider (used in examples: `aws_instance`, AMI IDs)
- `tofu console` CLI

## Sources Consulted
- OpenTofu official documentation on the `lookup` function: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu documentation on the `try` function: https://opentofu.org/docs/language/functions/try/
- OpenTofu CLI reference for `tofu console`: https://opentofu.org/docs/cli/commands/console/
- HCL syntax reference for map/object indexing
- AWS AMI ID format reference (17 hex characters following `ami-` prefix)

## Issues Found
No technical issues found.

The post correctly describes:
- The `lookup(map, key, default)` signature.
- The behavior when the key is missing (returns default).
- The note that `default` is optional but recommended (accurate — without it, a missing key raises an error).
- The contrast against `map[key]` (errors on missing key) and `try(map[key], default)` (returns default).
- HCL map literal syntax in `tofu console` examples.
- AMI ID format (17 hex characters after the `ami-` prefix).

## Review Notes
- The placeholder `"ami-default"` used as a fallback in the Region-Specific AMI Lookup example is illustrative only — it is not a real AMI ID and would fail at apply time. This is acceptable as a documentation example, but readers should substitute a real default AMI in production code.
- In some Terraform/OpenTofu styles, `lookup` with a known-static map is being superseded by direct map access combined with `try`, but `lookup` remains fully supported and idiomatic in OpenTofu, so the post's recommendations are current.
- The `enable_waf` value comparison in the Optional Feature Flags example silently relies on the lookup default's type matching `map(bool)`, which it does — no issue.
