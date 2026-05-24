# Validation Summary: How to Handle Large Terraform Runs in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, state management, lifecycle, moved blocks, `-target`, `-parallelism`, `-refresh=false`)
- HCP Terraform / Terraform Cloud (workspaces, run triggers, agents, execution modes, run API)
- `tfe` Terraform provider (`tfe_outputs`, `tfe_run_trigger`, `tfe_workspace`, `tfe_agent_pool`)
- AWS provider resources (`aws_autoscaling_group`, `aws_vpc`, `aws_security_group`, `aws_instance`, `aws_db_instance`)
- jq and curl for API querying
- `.terraformignore` configuration

## Sources Consulted
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli/commands/plan (parallelism default, `-refresh=false`, `-target`)
- Terraform `moved` blocks (introduced in 1.1): https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- `tfe` provider docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs (data source `tfe_outputs`, resources `tfe_run_trigger`, `tfe_workspace`, `tfe_agent_pool`)
- HCP Terraform Run API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run (attribute names, status-timestamps)
- HCP Terraform `.terraformignore`: https://developer.hashicorp.com/terraform/cloud-docs/run/remote-operations
- HCP Terraform operation phase timeout (2 hours): https://support.hashicorp.com/hc/en-us/articles/360039365471
- jq manual on object construction (parenthesizing values containing `|`): https://jqlang.github.io/jq/manual/

## Issues Found
1. **jq syntax error in the "Monitoring Run Performance" script** — the original script used a `|` inside an object construction value without surrounding parentheses, which jq rejects with a syntax error (verified by running the script locally). Wrapped the `if/then/else/end` expression in parentheses so the pipe is correctly scoped to the value.
2. **Non-existent run attributes** — `resource-additions`, `resource-changes`, and `resource-destructions` are not attributes on the HCP Terraform Run object (they belong to the Plan resource and require an `?include=plan` query). Replaced with `has-changes`, which is a real boolean attribute on the run, so the example produces meaningful output without requiring additional API includes.

## Review Notes
- The 2-hour timeout claim for plan/apply phases is consistent with HashiCorp's documented operation-phase limits; users on HCP Terraform Plus / dedicated plans may see different limits.
- `tfe_outputs` (data source) is the modern recommended way to read another workspace's outputs in HCP Terraform; `terraform_remote_state` still works but `tfe_outputs` doesn't require sharing state access.
- Default Terraform parallelism of 10 is correct as of current Terraform versions.
- The `moved` block example references `module.old_module.aws_instance.web` in a new workspace — `moved` blocks only work within the same state, so for splitting workspaces users would still need `terraform state mv` / `terraform import` (or removed-then-import). The author notes both options; the `moved` example is more applicable to refactoring within a single workspace, but the section header is "Move Resources Between Workspaces" — readers should treat the `moved` block as a related, in-workspace refactoring technique rather than a cross-workspace one.
