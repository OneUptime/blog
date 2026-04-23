# Validation Summary: How to Rename Resources Without Destroying Them in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- OpenTofu CLI

## Sources Consulted
- OpenTofu refactoring docs: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu state move docs: https://opentofu.org/docs/cli/state/move/
- Terraform refactoring docs: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved

## Issues Found
- The introduction said the `moved` block was "introduced in Terraform 1.1 / OpenTofu". I changed this to "introduced in Terraform 1.1 and supported by OpenTofu" to make the version history precise.
- The cleanup section said `moved` blocks can be safely removed after all team members and environments have applied the change. I corrected this to match the OpenTofu and Terraform docs: removing a `moved` block is generally a breaking change, and it should only be removed cautiously when you are certain all private environments have already applied the migration.

## Review Notes
- The HCL address examples for resource renames, module renames, moving resources into child modules, moving a module call to a keyed instance, and remapping `count` instances to `for_each` keys are consistent with the official refactoring syntax.
- `tofu plan` is the correct command to verify that the refactor does not introduce unintended infrastructure changes.
