# Validation Summary: How to Use tofu destroy to Remove Infrastructure - Tofu Remove Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language and lifecycle meta-arguments
- Infrastructure as Code
- AWS EC2 / AWS CLI
- Bash scripting

## Sources Consulted
- OpenTofu command documentation: `tofu destroy` - https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu command documentation: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu command documentation: `tofu apply` - https://opentofu.org/docs/cli/commands/apply/
- OpenTofu command documentation: `tofu show` - https://opentofu.org/docs/cli/commands/show/
- OpenTofu command documentation: `tofu state list` - https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu command documentation: `tofu state rm` - https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu command documentation: `tofu workspace select` - https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu resource behavior and lifecycle documentation - https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu resource graph internals - https://opentofu.org/docs/v1.6/internals/graph/
- AWS CLI command documentation: `aws ec2 describe-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- Clarified the scope of `tofu destroy` to the current OpenTofu configuration and workspace. This matches OpenTofu's documented behavior and avoids implying that other workspaces are affected.
- Updated the destroy-order example to show that subnet and security group resources can be independent and may be processed in parallel. OpenTofu walks the dependency graph in parallel once dependencies are satisfied, so the previous linear example was too strict.
- Replaced `tofu show destroy.tfplan` with `tofu show -plan=destroy.tfplan`, the current explicit syntax documented by OpenTofu for inspecting saved plan files.
- Added `set -euo pipefail` and changed `ENVIRONMENT="${1}"` to `ENVIRONMENT="${1:-}"` in the cleanup script. Without this, a failed workspace selection or plan command could allow the script to continue in an unintended workspace.

## Review Notes
The local `tofu` CLI was not installed in the review environment, so command behavior was validated against official OpenTofu documentation. `-target` usage is technically valid but should remain an exceptional workflow because targeted plans can bypass unrelated changes that a full plan would otherwise show. AWS EC2 may briefly return recently terminated instances in `describe-instances`, so cloud verification can require a short wait after destroy.
