# Validation Summary: How to Use tofu refresh to Sync State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform (referenced as related ecosystem)
- Infrastructure as Code state management
- AWS provider resources (used in examples: `aws_s3_bucket`, `aws_instance`)

## Sources Consulted
- OpenTofu CLI `refresh` command documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu CLI `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` command documentation (for `-refresh-only`, `-target`, `-refresh=false` flags)

## Issues Found
No technical issues found.

All commands and flags described in the post are accurate against the current OpenTofu CLI documentation:
- `tofu refresh` exists and updates state to match remote infrastructure without modifying resources.
- `tofu plan -refresh-only` and `tofu apply -refresh-only` are valid alternative workflows.
- `-refresh=false` is a valid flag for `plan` and `apply` to skip state synchronization.
- `-target` is supported with `-refresh-only`.
- `-detailed-exitcode` returns exit codes 0 (no changes), 1 (error), and 2 (changes present), as the CI/CD example correctly uses.
- The deprecation note is accurate — OpenTofu's official docs explicitly recommend `tofu apply -refresh-only` over `tofu refresh` due to the latter's unsafe default behavior with misconfigured provider credentials.

## Review Notes
- The phrasing "It is a read-only operation - it never creates, updates, or destroys resources" is technically scoped to *infrastructure resources* — `tofu refresh` does write to the state file. The post's surrounding context ("updates the state file to reflect their actual current attributes") makes this clear, so no change is needed, but readers should understand state file mutation still occurs.
- The illustrative `-refresh-only` drift output is paraphrased/simplified compared to the actual CLI output (which typically shows a `Note: Objects have changed outside of OpenTofu` block with a full resource diff). The inline comments in the snippet make it clear this is illustrative, so no correction is required.
- One nuance worth noting in future revisions: `tofu refresh` is effectively an alias for `tofu apply -refresh-only -auto-approve`, which is the precise reason the official docs flag it as unsafe — calling this out explicitly would strengthen the deprecation section.
