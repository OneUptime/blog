# Validation Summary: How to Read Output Values with tofu output Command - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- `tofu output`
- OpenTofu output values and state
- Bash scripting
- GitHub Actions step outputs
- `jq`

## Sources Consulted
- OpenTofu official documentation for `tofu output`: https://opentofu.org/docs/cli/commands/output/
- OpenTofu official documentation for output values: https://opentofu.org/docs/language/values/outputs/
- GitHub Actions official workflow commands documentation for `GITHUB_OUTPUT`: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions
- jq official manual: https://jqlang.org/manual/

## Issues Found
1. **Named string output example omitted quotes**: The post showed `tofu output vpc_id` returning `vpc-0abc123def456789`, but OpenTofu's default named output formatting includes quotes for strings. Changed the example output to `"vpc-0abc123def456789"`. The existing `tofu output -raw vpc_id` example correctly shows the unquoted form.
2. **Working directory wording could imply child module output access**: The post referred to a "specific module directory," but `tofu output` displays output values for the root module represented by the current state. Changed the comment to "specific root module directory" to avoid implying it can directly read arbitrary child module outputs.

## Review Notes
- The `-json`, `-raw`, and `-state=path` examples match the current OpenTofu CLI documentation.
- The post correctly uses `-json` with `jq` for list and map outputs; `-raw` is limited to values OpenTofu can convert to strings.
- The sensitive output examples are correct: normal output redacts sensitive values, while `-json` and `-raw` can display sensitive values in plain text.
