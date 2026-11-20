# Validation summary

Reviewed exact address mappings, no-op plan semantics, per-state completion, retained migration history, and explicit reversal. Actual Terraform commands exercised a disposable local built-in resource and preserved its object ID.

## Checks

- Terraform 1.11.4 actual disposable terraform_data baseline, renamed/keyed move plan and saved-plan apply; object ID preserved
- Follow-up plan clean; missing moved declaration and code-only reversal produced create/delete actions
- State mv dry-run left exact state bytes unchanged
- Nine negative JSON fixtures rejected by Python 3.11.13 gate
- Published HCL/Python match tested files; shell syntax and HCL validation passed
- Mermaid seven nodes/six edges structurally checked
- Generated social image visually reviewed, readable and unclipped

## Limitations

- Only local built-in resource state changed; no cloud resources or remote backends exercised
- No cross-backend migration, live CI approval, concurrency or artifact-transfer test
- Gate deliberately scoped to reviewed Terraform 1.11.4/JSON 1.2 and exact migration mapping
- Mermaid not rendered

## Sources checked

- https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- https://developer.hashicorp.com/terraform/language/resources/terraform-data
- https://developer.hashicorp.com/terraform/language/block/moved
- https://developer.hashicorp.com/terraform/internals/json-format
- https://developer.hashicorp.com/terraform/cli/commands/show
- https://developer.hashicorp.com/terraform/cli/commands/apply
- https://developer.hashicorp.com/terraform/language/modules/develop/refactoring#remove-a-move-block
- https://developer.hashicorp.com/terraform/cli/commands/state/mv

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
