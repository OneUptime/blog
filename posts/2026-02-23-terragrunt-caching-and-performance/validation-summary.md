# Validation Summary: How to Handle Terragrunt Caching and Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider installation and plugin caching
- Terraform CLI configuration files
- Terragrunt CLI
- Terragrunt cache and provider cache server
- Terragrunt HCL configuration
- CI/CD caching

## Sources Consulted
- Terragrunt CLI `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags documentation: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt HCL attributes documentation: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt cache documentation: https://docs.terragrunt.com/reference/terragrunt-cache/
- Terragrunt provider cache server documentation: https://docs.terragrunt.com/features/caching/provider-cache-server/
- Terraform CLI configuration documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `providers mirror` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- Replaced deprecated Terragrunt CLI examples using `run-all` and `--terragrunt-*` flags with current `terragrunt run --all`, `--parallelism`, `--no-auto-init`, `--non-interactive`, `--no-auto-retry`, `--queue-include-dir`, and `--queue-exclude-dir` forms.
- Replaced the legacy `TERRAGRUNT_DOWNLOAD` environment variable with current `TG_DOWNLOAD_DIR`.
- Narrowed over-broad cache behavior claims so they describe source URL changes and new Terraform working directories rather than implying every Terragrunt configuration change or every init redownloads providers.
- Corrected provider cache guidance: Terraform's `TF_PLUGIN_CACHE_DIR` is valid, but it is not guaranteed concurrency safe for parallel Terragrunt runs. Added Terragrunt provider cache server guidance for concurrent `run --all` workflows and updated the CI example accordingly.
- Removed the invalid `terragrunt run-all clean` cache-clean command and kept the documented `find ... .terragrunt-cache` cleanup approach.
- Corrected the mock outputs explanation. `mock_outputs` only supplies placeholder outputs when real dependency outputs are unavailable, unless `skip_outputs = true` is set.
- Corrected the Terraform automation note. `TF_IN_AUTOMATION=true` adjusts Terraform's output for automation; Terragrunt prompts are handled with `--non-interactive`.
- Added a caveat to `-lock=false` for plan jobs because Terraform documents state locking as dangerous to disable when concurrent operations may target the same workspace.
- Updated logging examples to use current `TG_LOG_LEVEL` instead of legacy Terragrunt environment variable naming.

## Review Notes
The post is technically relevant and now reflects the current Terragrunt CLI style. Some performance recommendations, such as the ideal parallelism value or provider download size, remain environment-dependent and should be treated as practical guidance rather than universal guarantees.
