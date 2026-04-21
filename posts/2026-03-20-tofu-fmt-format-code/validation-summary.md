# Validation Summary: How to Use tofu fmt to Format Code - Tofu Format Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- `tofu fmt`
- OpenTofu native HCL syntax and JSON syntax
- GitHub Actions
- pre-commit hooks
- VS Code, Vim / Neovim, and IntelliJ IDEA editor integration

## Sources Consulted
- OpenTofu `fmt` command documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `tofu fmt -help` output from OpenTofu v1.11.0 downloaded from the official GitHub release: https://github.com/opentofu/opentofu/releases/tag/v1.11.0
- OpenTofu style conventions: https://opentofu.org/docs/language/syntax/style/
- OpenTofu JSON syntax documentation: https://opentofu.org/docs/language/syntax/json/
- OpenTofu VS Code extension documentation: https://github.com/opentofu/vscode-opentofu
- OpenTofu setup GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- pre-commit-terraform OpenTofu support documentation: https://github.com/antonbabenko/pre-commit-terraform
- JetBrains Terraform/OpenTofu documentation: https://www.jetbrains.com/help/idea/terraform.html

## Issues Found
- The post said `tofu fmt -diff` showed diffs without modifying files. `-diff` only displays diffs; it does not imply `-write=false`. Updated the command to `tofu fmt -diff -write=false`.
- The formatter capability list claimed that `tofu fmt` removes excess blank lines and formats string concatenation. OpenTofu formatting preserves blank lines in many cases and does not provide string-concatenation formatting as described. Replaced those bullets with accurate spacing and structure formatting behavior.
- The CI examples used `tofu fmt -check -recursive` followed by checking `$?`. GitHub Actions uses fail-fast shell behavior, so the step can exit before the conditional runs. Changed examples to `if ! tofu fmt -check -recursive; then ... fi`.
- The pre-commit example used `terraform_fmt` without forcing the OpenTofu binary. `pre-commit-terraform` can use OpenTofu, but Terraform takes precedence if both binaries are present. Added `--hook-config=--tf-path=tofu`.
- The VS Code settings used the HashiCorp Terraform formatter while the section was for the OpenTofu extension. Replaced them with the OpenTofu extension's documented formatter ID and language selectors.
- The IntelliJ note referred to the HashiCorp Terraform plugin and automatic save formatting. Updated it to the current Terraform and HCL plugin behavior: it can invoke `terraform fmt` or `tofu fmt` when reformatting code, with save-time reformatting controlled by the IDE.
- The JSON section incorrectly said `tofu fmt` automatically handles `.tf.json`. OpenTofu v1.11.0 help states JSON files are not modified, and specifying a JSON file to `tofu fmt` returns an error. Updated the section to use `python3 -m json.tool` for JSON formatting and validation.
- The "does not format" list did not mention JSON-format configuration files and overstated comment/template handling. Updated the bullets to identify JSON-format files and clarify that comment text and template content inside strings or heredocs are not formatted.

## Review Notes
The `tofu fmt -check` implementation returned exit code 3 for formatting differences in local OpenTofu v1.11.0 testing, but the official documentation only guarantees a non-zero exit status for unformatted input.
