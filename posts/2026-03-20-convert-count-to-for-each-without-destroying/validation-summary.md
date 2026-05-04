# Validation Summary: How to Convert Between count and for_each Without Destroying Resources

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (compatible HCL syntax)
- HCL state addressing (`count` and `for_each`)
- `tofu state` subcommands (`list`, `mv`, `show`)
- HCL `moved` blocks
- Bash scripting (for the bulk migration helper)

## Sources Consulted
- OpenTofu CLI `state mv` docs — https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu CLI `state list` docs — https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu CLI `state show` docs — https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu refactoring / `moved` block docs — https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu 1.6.0 GA announcement — https://opentofu.org/blog/opentofu-is-going-ga/
- Terraform 1.1 changelog (introduction of `moved` blocks)

## Issues Found
- **Incorrect version claim for `moved` blocks.** The original heading "Using moved Blocks (OpenTofu 1.1+)" is misleading: OpenTofu's first GA release was 1.6.0 (January 2024); there is no OpenTofu 1.1. The "1.1+" version refers to Terraform, where `moved` blocks were introduced. Since `moved` blocks are available in every OpenTofu release, the version qualifier was simply removed. The heading is now "Using moved Blocks". No code changes were needed.

## Review Notes
- All `tofu state list`, `tofu state mv`, and `tofu state show` invocations match the official CLI syntax, including the single-quoting around addresses containing brackets and double-quoted keys (required on Unix shells).
- The `moved { from = ... to = ... }` block syntax is correct.
- The HCL examples for `count` and `for_each` are syntactically valid and the resulting state addresses (`aws_instance.app[0]` vs `aws_instance.app["server-1"]`) are accurate.
- The plan-output expectation in Step 4 (a `~ update` for the `Name` tag with no replacement) is consistent with what `tofu plan` would produce after a successful `state mv`, since the count-based config produces `Name = "app-1"`/`"app-2"` while the for_each config produces `Name = "server-1"`/`"server-2"`.
- The bulk-migration bash script is correct: arrays, indexing, and quoting of the new address (with escaped double quotes around the key) all work as written.
- Minor future improvement (not a defect): the post could note that with `moved` blocks the manual `tofu state mv` calls are unnecessary — running `tofu apply` will perform the relocation automatically. Both approaches are valid, but the current ordering (manual `state mv` first, then a `moved` block section) may suggest both are needed in tandem.
