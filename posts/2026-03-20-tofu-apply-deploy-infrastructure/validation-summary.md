# Validation Summary: How to Use tofu apply to Deploy Infrastructure - Tofu Deploy Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code
- Terraform-style state and plan workflows
- CI/CD deployment workflows

## Sources Consulted
- OpenTofu CLI Command: apply: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu CLI Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI Command: show: https://opentofu.org/docs/cli/commands/show/
- OpenTofu CLI Command: output: https://opentofu.org/docs/cli/commands/output/
- OpenTofu CLI Command: state list: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu CLI Command: workspace select: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu State documentation: https://opentofu.org/docs/cli/state/
- OpenTofu Resource Behavior documentation: https://opentofu.org/docs/language/resources/behavior/

## Issues Found
- The saved-plan benefits said there is "No drift between review and apply." Saved plans prevent implicit re-planning and apply the reviewed plan, but they do not prevent external infrastructure changes from happening after review. Changed this to "No implicit re-planning between review and apply."
- The partial-failure guidance said OpenTofu "won't recreate" already-created resources. OpenTofu avoids recreating resources that were successfully recorded in state, but failed provider operations can require manual inspection or import in edge cases. Clarified the statement to refer to resources successfully recorded in state.
- The conclusion similarly overstated that a retry after a partial failure is always safe from duplicating already-created resources. Updated it to say you can usually re-run after fixing the issue without duplicating resources that were successfully recorded in state.

## Review Notes
- `tofu` was not installed in the local environment, so CLI behavior was validated against current official OpenTofu documentation.
- The command examples for `tofu apply`, saved plans, `-auto-approve`, `-var`, `-var-file`, `-parallelism`, `-target`, `-exclude`, `tofu state list`, `tofu workspace select`, `tofu show`, and `tofu output -json` are valid for current OpenTofu documentation.
- `-exclude` is an OpenTofu-specific targeting option available in current OpenTofu; the post is correctly framed around `tofu`, not Terraform CLI compatibility.
