# Validation Summary: How to Debug Terraform with TF_LOG Environment Variable

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, environment variables, debugging)
- TF_LOG, TF_LOG_CORE, TF_LOG_PROVIDER, TF_LOG_PATH environment variables
- AWS Provider (retry configuration)
- PowerShell environment variable syntax
- Bash shell utilities (grep, tee)
- Graphviz (`dot`) for dependency graph visualization
- `terraform console`, `terraform state`, `terraform graph`, `terraform providers` subcommands

## Sources Consulted
- [Debugging Terraform (HashiCorp docs)](https://developer.hashicorp.com/terraform/internals/debugging)
- [terraform refresh command](https://developer.hashicorp.com/terraform/cli/commands/refresh)
- [terraform apply command](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [terraform graph command](https://developer.hashicorp.com/terraform/cli/commands/graph)
- [terraform providers command](https://developer.hashicorp.com/terraform/cli/commands/providers)
- [terraform console command](https://developer.hashicorp.com/terraform/cli/commands/console)
- [cidrsubnet function](https://developer.hashicorp.com/terraform/language/functions/cidrsubnet)
- [AWS Provider documentation (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## Issues Found
No technical issues found.

Verifications performed:
- The five TF_LOG levels (TRACE, DEBUG, INFO, WARN, ERROR) are correct per the HashiCorp debugging docs.
- TF_LOG_CORE and TF_LOG_PROVIDER are valid scoped logging environment variables.
- TF_LOG_PATH writes to a single file; the post's note that "TF_LOG_PATH captures both if set" is accurate (no separate TF_LOG_PATH_CORE / TF_LOG_PATH_PROVIDER variables exist).
- PowerShell `$env:TF_LOG = "DEBUG"` syntax is correct.
- `cidrsubnet("10.0.0.0/16", 8, 1)` correctly returns `"10.0.1.0/24"` (prefix 16 + 8 newbits = /24, netnum 1 → second subnet).
- AWS provider `retry_mode = "adaptive"` and `max_retries = 25` are valid options (25 is in fact the AWS provider default).
- `-parallelism=N` flag is valid for `terraform apply` (default is 10).
- `terraform graph | dot -Tsvg > graph.svg` is the documented usage pattern.
- `terraform console`, `terraform state pull`, `terraform state show`, `terraform providers`, and `terraform version` are all valid commands.
- crash.log behavior on panic is real Terraform behavior (handled by Terraform's panic handler in source).

## Review Notes
- `terraform refresh` is officially deprecated in modern Terraform versions in favor of `terraform apply -refresh-only`. The command still works and the post's usage is not incorrect, but readers on current Terraform should be aware of the preferred replacement.
- The example log lines shown in the post (e.g., `[TRACE] provider.aws: HTTP Request: ...`) are simplified for illustration; real Terraform log lines also include timestamps and slightly different provider naming. This is appropriate for a tutorial.
- The post does not mention the `JSON` log format, which is also a valid `TF_LOG` value for machine-parseable logs. Not an error — just an optional addition the author could consider in the future.
- `TF_LOG_CORE` / `TF_LOG_PROVIDER` were introduced in Terraform 0.15; the post does not mention this version requirement, which could be useful for readers on older versions.
