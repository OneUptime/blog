# Validation Summary: How to Pass Variables to OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu test` command and the `.tftest.hcl` testing framework)
- HCL (HashiCorp Configuration Language) for `variables`, `run`, `mock_provider`, and `assert` blocks
- `.tfvars` variable files
- `TF_VAR_*` environment variables
- GitHub Actions (matrix-based CI example)

## Sources Consulted
- OpenTofu CLI test command docs: https://opentofu.org/docs/cli/commands/test/ — for variable precedence order, file-level vs run-level variables blocks, and supported flags (`-var`, `-var-file`).
- OpenTofu language tests reference: https://opentofu.org/docs/language/tests/ — for `variables`, `run`, `mock_provider`, and `assert` block syntax and the valid `command = plan|apply` values.
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/ — for `TF_VAR_*` environment variable behavior and `.tfvars` file format.

## Issues Found
1. **Incorrect variable precedence list.** The post originally listed `-var`, `-var-file`, and `TF_VAR_*` as having higher precedence than the test file's `variables` blocks. Per the OpenTofu test docs, the actual order (highest to lowest) is: run-block `variables`, file-level `variables`, `-var`/`-var-file`, `tests/*.tfvars`, current-dir `*.tfvars`, then `TF_VAR_*`. Updated the precedence section to match the documented order and added the missing `tfvars` tiers.
2. **Misleading comment in Method 3.** The post claimed `-var` flags "override values in the test file's variables blocks", which is the opposite of how OpenTofu test variable resolution works — file-level and run-block `variables` win over `-var`. Reworded the comment to accurately describe the relationship: a `-var` only takes effect for variables not already set in a `variables` block.

## Review Notes
- All HCL snippets (`variables`, `run`, `mock_provider`, `assert` blocks, and `command = plan`) use current OpenTofu test framework syntax.
- The CLI examples (`tofu test`, `-var`, `-var-file`, positional test file paths) match supported flags.
- The `mock_provider "aws" {}` example assumes the reader has a module that uses the AWS provider; this is consistent with how OpenTofu's mocking works but the example does not show the underlying module — readers should know the assertions are illustrative and depend on a corresponding module configuration.
- The post does not specify a minimum OpenTofu version. The features described (test framework, `mock_provider`, top-level and run-level `variables` blocks) are stable in OpenTofu 1.7+ / 1.8+; readers on older versions may need to upgrade.
