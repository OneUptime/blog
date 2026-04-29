# Validation Summary: How to Merge Multiple Modules into One in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL configuration
- OpenTofu modules
- OpenTofu `moved` blocks
- OpenTofu CLI

## Sources Consulted
- OpenTofu official refactoring documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu official module syntax documentation: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu official `tofu state list` command documentation: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu official `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu official `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The post said to remove `moved` blocks after a successful apply because they were "no longer needed once all states are updated." OpenTofu's refactoring docs say removing `moved` blocks is generally a breaking change and recommend retaining historical `moved` blocks unless you are certain every affected state has already applied the migration. I updated that sentence to reflect the documented caveat.

## Review Notes
- No other technical issues were found in the module refactoring flow, HCL snippets, or OpenTofu CLI usage.
- The example addresses are correct for single-instance resources. If the moved resources or module calls use `count` or `for_each`, the `from` and `to` addresses would need explicit instance keys.
