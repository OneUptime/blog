# Validation Summary: How to Handle Orphaned Resources in Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform JSON plan output
- Terraform resource addressing
- Terraform lifecycle meta-arguments
- jq
- Bash

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform machine-readable UI output reference: https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform move resources documentation: https://developer.hashicorp.com/terraform/cli/state/move
- Terraform resource addressing reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform destroy resources documentation: https://developer.hashicorp.com/terraform/language/resources/destroy
- Terraform providers schema command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/schema
- Terraform refactor modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform removed block reference: https://developer.hashicorp.com/terraform/language/block/removed
- OneUptime linked related post: https://oneuptime.com/blog/post/2026-02-23-refresh-terraform-state-without-applying/view
- OneUptime linked related post: https://oneuptime.com/blog/post/2026-02-23-handle-state-renaming-terraform-resources/view

## Issues Found
- The "Compare State List to Configuration" example used `terraform providers schema -json` as if it listed resource addresses from the current configuration. That command returns provider/resource schemas for providers used by the configuration, not declared resource addresses. I replaced it with JSON plan filtering for delete reasons that indicate missing configuration, missing module, or invalid count/for_each keys.
- The script-based orphan detection and bulk cleanup examples treated every planned delete as an orphan. Planned deletes can also happen for intentional replacements or other reasons. I narrowed the examples to Terraform's machine-readable planned-change delete reasons that match orphan-like state entries.
- The `-target` explanation said it limits the destroy to just the orphaned resource. Terraform also includes dependencies of targeted resources and documents targeting as an exceptional workflow. I updated the wording to reflect that behavior and caveat.
- The `prevent_destroy` section said it would prevent destruction if the configuration was accidentally removed. Terraform only enforces `prevent_destroy` while that lifecycle rule remains in configuration; removing the resource block removes the guardrail. I corrected that explanation.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- For Terraform 1.1 and later, `moved` blocks are generally preferred for documenting refactors in configuration, while `terraform state mv` remains valid for direct state operations.
- For Terraform 1.7 and later, `removed` blocks with `destroy = false` are an additional configuration-driven alternative to `terraform state rm` for removing objects from state without destroying them.
