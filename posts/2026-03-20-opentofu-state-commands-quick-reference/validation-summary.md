# Validation Summary: How to Use the OpenTofu State Commands Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform-compatible state management
- jq (used in JSON inspection examples)
- Bash (shell examples)

## Sources Consulted
- OpenTofu `tofu state list` docs: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu `tofu state show` docs: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `tofu state mv` docs: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu `tofu state rm` docs: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu `tofu state pull` docs: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu `tofu state push` docs: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu `tofu taint` docs: https://opentofu.org/docs/cli/commands/taint/
- OpenTofu Resource Addressing docs: https://opentofu.org/docs/cli/state/resource-addressing/

## Issues Found

1. **Invalid wildcard pattern in `tofu state list`** — The example `tofu state list 'aws_security_group.*'` was presented as a way to list resources with a specific prefix. OpenTofu's resource addressing format does not support wildcard/glob patterns; it requires a concrete `resource_type.resource_name[index]` form. The `.*` would be interpreted as a literal resource name and would match nothing. Replaced with a valid concrete-address example: `tofu state list aws_security_group.web` (with comment "List a specific resource address").

2. **Incorrect `-lock=false` example on `tofu state list`** — The safety-practices section showed `tofu state list -lock=false` with the comment "Use -lock=false only for read-only operations in emergencies". The OpenTofu docs do not list a `-lock` option for `tofu state list` (it is read-only and does not acquire a state lock). The `-lock` flag is intended for state-mutating commands like `state mv`, `state rm`, and `state push`. Replaced the example with `tofu state rm -lock=false aws_s3_bucket.old` and updated the comment to "Use -lock=false only when a lock is stuck and no one else is operating", which reflects accurate guidance.

## Review Notes
- All other commands and flags verified against OpenTofu documentation: `-state=path` on `state list`, `-dry-run` on `state mv` and `state rm`, `-state`/`-state-out` on `state mv` (legacy local-state form), `-force` on `state push`, `for_each` instance addressing with single-quoted bracket syntax, module-level addressing for `state mv`/`state rm`, and the deprecation of `taint`/`untaint` in favor of `tofu apply -replace=...` are all correct.
- The `tofu apply -refresh-only` and `tofu plan -refresh-only` examples are correct and align with the modern OpenTofu drift-detection workflow.
- Note for future revisions: the `-state` and `-state-out` legacy options on `state mv` only work with local state backends; the post does not call this out explicitly but the example is technically valid for that use case.
- The `tofu state pull | jq '.terraform_version'` example reads the legacy field name preserved in OpenTofu state for cross-tool compatibility — this is correct as of current OpenTofu versions.
