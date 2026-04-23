# Validation Summary: How to Read and Understand tofu plan Output

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan output
- OpenTofu data sources
- JSON plan inspection with `jq`

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu data sources docs: https://opentofu.org/docs/language/data-sources/
- OpenTofu references docs: https://opentofu.org/docs/v1.11/language/expressions/references/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/

## Issues Found
- The introduction said `tofu plan` tells you exactly what changes will be made. I changed this to describe the output as showing what OpenTofu plans to do, which matches the official `tofu plan` documentation and is more accurate because some values remain unknown until apply.
- The change-symbol description for `<=` was too broad. I changed it to "READ DURING APPLY" to match the OpenTofu data source behavior docs, which explain that data resources are read during planning when possible and are only deferred to apply in specific cases.
- The machine-readable plan example used the legacy `tofu show [options] <filename>` form. I updated it to `tofu show -json -plan=plan.tfplan`, which matches the current documented CLI syntax.
- The conclusion referred generically to `-json` output for automated plan analysis. I changed it to `tofu show -json` so it points to the same JSON plan workflow demonstrated in the post.

## Review Notes
- The post is technically sound after the above fixes.
- OpenTofu also supports `tofu plan -json`, but that is a machine-readable UI stream and not the same JSON plan representation returned by `tofu show -json`.
- OpenTofu documents that saved plan files and `tofu show -json` output can expose sensitive data in plain text, so plan artifacts should be handled as sensitive.
