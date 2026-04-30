# Validation Summary: How to Force Resource Recreation with -replace in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu resource addressing
- OpenTofu state inspection
- Bash shell scripting

## Sources Consulted
- OpenTofu docs: `tofu plan` https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply` https://opentofu.org/docs/cli/commands/apply/
- OpenTofu docs: `tofu taint` https://opentofu.org/docs/cli/commands/taint/
- OpenTofu docs: `tofu show` https://opentofu.org/docs/cli/commands/show/
- OpenTofu docs: `tofu state show` https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu docs: Resource Addressing https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu docs: Forcing Re-creation of Resources https://opentofu.org/docs/cli/state/taint/
- OpenTofu docs: Module Blocks https://opentofu.org/docs/language/modules/syntax/

## Issues Found
- The introduction and conclusion implied `-replace` helps recover from "corrupted state." I changed that wording to refer to damaged remote objects, because the official docs describe `-replace` as a way to replace degraded or damaged objects, not to repair a corrupted state file.
- The `tofu show replace-plan.tfplan` example used legacy positional plan-file syntax. I updated it to `tofu show -plan=replace-plan.tfplan`, which matches the current explicit form documented by OpenTofu.
- The `-replace vs Taint` section described `-replace` as "atomic." I changed that wording because OpenTofu does not describe `apply` as an atomic all-or-nothing operation; the important distinction is that `-replace` stays in the plan/apply workflow while `tofu taint` writes taint state ahead of apply.
- The `-target` section said targeting includes a resource and its dependents. I corrected that to dependencies, matching the OpenTofu docs for resource targeting.

## Review Notes
- Current OpenTofu docs prefer `tofu show -plan=FILENAME`, but the older positional `tofu show <filename>` form remains available as legacy usage.
