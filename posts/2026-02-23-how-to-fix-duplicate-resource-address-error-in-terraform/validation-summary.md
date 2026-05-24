# Validation Summary: How to Fix Duplicate Resource Address Error in Terraform

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform CLI commands (`fmt`, `validate`, `plan`, `state list`, `state rm`, `state mv`, `import`)
- Terraform `moved` blocks (introduced in Terraform 1.1)
- Terraform `count` and `for_each` meta-arguments
- AWS provider examples (`aws_instance`)
- Shell utilities (`grep`, `sort`, `uniq`)

## Sources Consulted
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform refactoring modules: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- `terraform state mv` reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- `terraform plan` reference (exit codes): https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform resource addressing: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp issue on duplicate resource configuration error: https://github.com/hashicorp/terraform/issues/7072

## Issues Found

1. **Fictional "Duplicate resource address" error message**: The second error block presented a literal "Error: Duplicate resource address" message that does not exist in Terraform. State enforces uniqueness internally and does not emit this specific error. Replaced with the actual "Moved object still exists" error that Terraform produces when a `moved` block conflicts with an existing resource declaration — this matches the scenario the post is illustrating.

2. **Contradictory comment in Cause 3 (module duplication)**: The HCL example had the comment `# WRONG - but this actually works since module names are different` immediately above two module blocks that both used the identical name `web_server`. The comment was self-contradictory and misleading. Replaced with a clear comment stating that both calls use the same name.

3. **Misleading `terraform state list | sort | uniq -d` command**: This command would never produce results in a valid Terraform state because the state backend enforces unique resource addresses. Replaced with a plain `terraform state list` (with a hint to review it visually) and tightened the `grep` invocation to recursively search `.tf` files properly with `--include='*.tf'` so it works as advertised.

## Review Notes

- The illustrative AMI IDs (e.g., `ami-0123456789abcdef0`) are placeholder values — appropriate for documentation.
- The `moved` block guidance is accurate for Terraform 1.1+. If users are on an older version, they need to fall back to `terraform state mv`. The post covers both, which is good.
- The `for_each` example for modules is valid Terraform syntax and correctly demonstrates the alternative to duplicate module calls.
- The `terraform import` example uses the legacy CLI form. As of Terraform 1.5+, `import` blocks in configuration are the recommended approach, but the CLI form still works and remains supported.
- The shell command `grep -rh '^resource "' . --include='*.tf'` now correctly searches recursively for resource declarations across all `.tf` files.
