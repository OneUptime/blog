# Validation Summary: How to Handle Import with for_each Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI and HCL configuration language)
- Terraform `import` blocks (introduced in Terraform 1.5)
- Terraform `moved` blocks (introduced in Terraform 1.1)
- Terraform `for_each` meta-argument
- `terraform state mv` command
- `terraform console` command
- AWS provider resources (`aws_s3_bucket`, `aws_db_instance`, `aws_vpc`) used as examples
- Bash shell scripting (associative arrays, heredocs)
- PowerShell quoting

## Sources Consulted
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `import` block documentation: https://developer.hashicorp.com/terraform/language/import
- Terraform CLI `import` command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform `moved` block documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `state mv` documentation: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `console` documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- HashiCorp Terraform release notes for v1.1 (moved blocks) and v1.5 (import blocks)
- PowerShell about_Quoting_Rules: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules

## Issues Found
- **PowerShell quoting example** (around line 50): The original example used `"aws_s3_bucket.data[\`"logs\`"]"`, which mixes backslashes with PowerShell's backtick escape. PowerShell uses only the backtick (`` ` ``) as its escape character; the backslash is unnecessary and confusing. While the original command might still produce a correct argument via Windows CRT argument parsing of `\"`, it does not match HashiCorp's documented convention. Replaced with the cleaner, HashiCorp-recommended pattern `'aws_s3_bucket.data[\"logs\"]'` (single quotes preserve the string literally; the backslash-escaped quotes are interpreted by terraform.exe's CRT argument parser on Windows). The accompanying comment was updated to match.

## Review Notes
- All HCL syntax (resource definitions, `for_each` with `toset()` and maps, `import` blocks, `moved` blocks, module addressing with keyed instances) is correct and matches current Terraform 1.5+ documentation.
- The `terraform import` CLI syntax for Bash (single-quoted address and double-quoted address with backslash-escaped quotes) is correct.
- The `terraform state mv` syntax for converting count-based to key-based addresses is correct.
- The Bash associative array script using `declare -A` and heredoc is valid Bash 4+ syntax.
- The recommendation to prefer `import` blocks over CLI commands aligns with current HashiCorp guidance.
- The error message text ("Invalid resource instance key", "Resource already managed by Terraform") matches typical Terraform output.
- The `terraform console` example correctly shows that evaluating a `for_each` resource reference returns all instances.
- No version-specific information is outdated; Terraform 1.5+ (current latest is 1.x) supports all features mentioned.
