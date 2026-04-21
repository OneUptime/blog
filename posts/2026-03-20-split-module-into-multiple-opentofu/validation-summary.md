# Validation Summary: How to Split a Module into Multiple Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu modules
- OpenTofu `moved` blocks
- OpenTofu CLI commands: `tofu init`, `tofu plan`, `tofu apply`, `tofu state list`
- HCL configuration

## Sources Consulted
- OpenTofu Refactoring documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu Module Blocks documentation: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Splat Expressions documentation: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `tofu state list` command documentation: https://opentofu.org/docs/cli/commands/state/list/

## Issues Found
- The subnet output used `aws_subnet.public[*].id`, but the later `moved` example uses a string instance key (`["us-east-1a"]`), which implies `for_each`. OpenTofu resources using `for_each` appear as maps, and splat expressions cannot be used directly with maps. Changed the output to `[for subnet in aws_subnet.public : subnet.id]`.
- The workflow changed module blocks and then went straight to `tofu plan`. OpenTofu documentation says to re-run `tofu init` after adding, removing, or modifying module blocks. Added `tofu init` before `tofu plan`.
- The cleanup section said to remove `moved` blocks after applying. OpenTofu documentation says removing `moved` blocks is generally a breaking change for long-lived or shared modules, and is only safe when all private workspaces or consumers have applied the change. Updated the cleanup guidance to preserve the upgrade path.

## Review Notes
- The `moved` block examples use valid OpenTofu refactoring syntax for resources inside child modules, assuming the addresses match the current state exactly.
- For resources with multiple instances, a resource-level `moved` block can move all instances when the entire resource moves unchanged; per-instance moved blocks are valid when instances need explicit mapping.
- The OpenTofu CLI was not installed in this workspace, so validation was performed against official documentation rather than by running local `tofu` commands.
