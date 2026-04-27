# Validation Summary: How to Refactor Modules with moved Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL configuration language)
- `moved` block (state refactoring feature)
- AWS provider resources (used in examples: `aws_instance`, `aws_s3_bucket`, `aws_security_group`, `aws_launch_template`, `aws_autoscaling_group`, `aws_iam_role`)

## Sources Consulted
- OpenTofu official documentation on refactoring with `moved` blocks: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu CLI documentation for `tofu plan`

## Issues Found
No technical issues found.

All `moved` block examples use correct syntax:
- The block takes no labels and only `from` and `to` arguments (verified).
- Address types used in examples (resources, resource instances with index/key, module calls, module instances, and nested module addresses) are all supported.
- The supported refactoring scenarios shown — resource renames, moving resources into modules, module call renames, adding `count`, switching between `count` and `for_each` — match the documented capabilities.
- Multiple `moved` blocks in a single file is explicitly supported.
- The `tofu plan` command and the "Plan: 0 to add, 0 to change, 0 to destroy." output line are accurate.
- The recommendation to ship `moved` blocks in published modules to ease consumer upgrades is the documented best practice.

## Review Notes
- The post is concise and practically focused. One possible future enhancement (not an error): the documentation also notes that `moved` blocks cannot be used with `ephemeral` blocks since they are not stored in state — worth mentioning if the post is later expanded.
- The post correctly notes that `moved` blocks can be removed after the state has migrated, or kept for documentation/public-module compatibility.
- All addresses in `from`/`to` correctly omit quotes (HCL traversal references, not strings), which is the proper syntax.
