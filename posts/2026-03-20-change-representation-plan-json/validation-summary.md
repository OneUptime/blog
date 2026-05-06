# Validation Summary: How to Read the OpenTofu Plan JSON Change Representation

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON output
- `jq`
- Shell scripting for CI/CD policy gates

## Sources Consulted
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `show` command docs for v1.7.x: https://opentofu.org/docs/v1.7/cli/commands/show/
- OpenTofu `show` command docs for current explicit target-selection usage: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- jq manual: https://jqlang.org/manual/dev/

## Issues Found
- The top-level plan JSON example used undocumented fields and an incorrect `format_version` value for the official OpenTofu JSON output format. I replaced it with documented top-level fields such as `prior_state`, `configuration`, `checks`, `errored`, and `timestamp`, and corrected `format_version` to `1.0`.
- The post described `replace` as a literal action value, but OpenTofu documents replacement as `["delete", "create"]` or `["create", "delete"]`. I corrected the action table and the summary to match the documented change representation.
- The action table omitted other documented valid action values, including `["read"]` and `["forget"]`. I added them so the table reflects the official schema.
- The `jq` example labeled as checking whether IAM resources were being modified would also return IAM resources with `["no-op"]` actions, because `resource_changes` includes all resources in the configuration. I updated the filter to exclude `["no-op"]` and adjusted the comment to say "have changes planned."

## Review Notes
- `tofu show -json tfplan` is still valid per the OpenTofu 1.7 documentation and remains supported as legacy usage in newer versions. Newer docs also recommend the more explicit `-plan=FILENAME` form.
- Saved plan files can contain sensitive values in cleartext, and `tofu show -json` can expose sensitive state data in plain text. The post’s commands are correct, but this is an important operational caveat for future revisions.
