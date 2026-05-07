# Validation Summary: How to Avoid Using Default Workspace for Production in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI workspaces
- OpenTofu configuration language (HCL)
- CI/CD shell scripting with Bash
- State backend and environment isolation patterns

## Sources Consulted
- OpenTofu Docs: Managing Workspaces — https://opentofu.org/docs/cli/workspaces/
- OpenTofu Docs: Command: workspace show — https://opentofu.org/docs/cli/commands/workspace/show/
- OpenTofu Docs: Workspaces — https://opentofu.org/docs/language/state/workspaces/
- OpenTofu Docs: Custom Conditions — https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Docs: The terraform_data Managed Resource Type — https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu Docs: Command: apply — https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found

1. **The workspace persistence example was incorrect.** The original post said opening a new terminal would put you back in the `default` workspace. OpenTofu stores the currently selected workspace locally in the `.terraform` directory for that working directory, so merely opening a new terminal does not reset it. Updated the example to show the real risk: running from a different initialized working directory that points at the same backend.

2. **The first guard example did not fail as described.** Creating a `null_resource` conditionally with `count` and a `triggers` map does not raise an error; it only creates a resource. Replaced it with a `terraform_data` resource using a documented `lifecycle.precondition` that actually fails when `terraform.workspace == "default"`.

3. **The second guard example used an invalid validation pattern.** Local values do not support validation blocks, and the `tobool(...)` trick was not an appropriate or documented way to enforce workspace policy here. Replaced it with a `terraform_data` resource and a `precondition` that checks the allowed workspace list and returns a clear error message.

## Review Notes
- The post's recommendation to prefer separate configurations/directories for persistent environments is consistent with the OpenTofu docs, especially when deployments require stronger isolation, different credentials, or different access controls.
- OpenTofu also notes that multiple working directories have operational tradeoffs, including separate plugin/module caches and reinitialization overhead. That caveat does not invalidate the post's core recommendation.
