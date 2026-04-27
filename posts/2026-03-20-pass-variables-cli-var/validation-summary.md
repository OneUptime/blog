# Validation Summary: How to Pass Variables via the CLI with -var in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu plan`, `tofu apply`)
- HCL (variable declarations, validation blocks)
- Bash scripting
- AWS Secrets Manager (referenced in security example)

## Sources Consulted
- OpenTofu — Input Variables / Variable Definition Precedence: https://opentofu.org/docs/language/values/variables/
- OpenTofu — CLI command reference for `tofu plan` and `tofu apply` (`-var`, `-var-file`, `-auto-approve` flags): https://opentofu.org/docs/cli/commands/plan/ and https://opentofu.org/docs/cli/commands/apply/

## Issues Found

1. **Incorrect variable precedence (significant technical error).** The post originally stated that `-var` had *lower* precedence than `TF_VAR_` environment variables, and listed precedence as: defaults < `.tfvars` < `-var-file` < `-var` < `TF_VAR_`. According to the official OpenTofu documentation, the actual order (lowest to highest) is: defaults → `TF_VAR_` environment variables → `terraform.tfvars` / `terraform.tfvars.json` → `*.auto.tfvars` / `*.auto.tfvars.json` → `-var` and `-var-file` (processed in command-line order). I rewrote the "Variable Precedence with -var" section to reflect the correct order, and clarified that `-var` and `-var-file` share the same (top) precedence tier, with the order they appear on the command line being the tiebreaker. I also amended the inline comment on the `-var-file ... -var` example to note that the override happens because `-var` comes *after* `-var-file` on the command line.

## Review Notes
- The security recommendation to use `TF_VAR_` for secrets (instead of `-var`) is correct: command-line arguments are visible in process listings (e.g., `ps`) and shell history, while environment variables are not. This guidance is independent of precedence — `-var` would still override a `TF_VAR_` value if both were set, but for secrets the visibility concern outweighs the precedence question.
- The HCL `variable` block, including `validation { condition / error_message }`, matches current OpenTofu syntax.
- All `-var` invocation patterns (string, number, boolean, list/map/object via embedded JSON, multiline `\` continuations) are valid for both OpenTofu and Terraform CLIs.
- The `-auto-approve` flag on `tofu apply` is correct.
- The shell quoting guidance (single quotes around the whole `key=value` to allow embedded JSON double quotes) is the standard recommended approach.
