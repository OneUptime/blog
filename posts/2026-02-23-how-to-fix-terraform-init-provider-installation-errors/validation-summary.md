# Validation Summary: How to Fix terraform init Provider Installation Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (CLI, provider installation, lock file)
- HashiCorp Terraform Registry (registry.terraform.io)
- Terraform CLI configuration (`.terraformrc`, provider_installation, filesystem_mirror, network_mirror)
- Environment variables: `TF_PLUGIN_CACHE_DIR`, `TF_REGISTRY_CLIENT_TIMEOUT`, `TF_LOG`, `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`
- GitHub Actions (actions/cache)
- AWS Terraform provider, Datadog provider (source address conventions)

## Sources Consulted
- Terraform CLI Configuration File docs (https://developer.hashicorp.com/terraform/cli/config/config-file) — verified `provider_installation`, `filesystem_mirror`, `network_mirror`, `direct`, and `plugin_cache_dir` syntax.
- Terraform Environment Variables docs (https://developer.hashicorp.com/terraform/cli/config/environment-variables) — verified `TF_PLUGIN_CACHE_DIR`, `TF_REGISTRY_CLIENT_TIMEOUT`, `TF_LOG`.
- Terraform `providers lock` command docs (https://developer.hashicorp.com/terraform/cli/commands/providers/lock) — verified the `-platform` flag syntax.
- Terraform `providers mirror` command docs (https://developer.hashicorp.com/terraform/cli/commands/providers/mirror) — verified syntax.
- Terraform Registry HTTP API docs (https://developer.hashicorp.com/terraform/internals/provider-registry-protocol) — verified `/v1/providers/{namespace}/{type}/versions` and `/download/{os}/{arch}` endpoints.
- Datadog provider on the Terraform Registry — verified `DataDog/datadog` is the correct source address.
- GitHub Actions `actions/cache` README — verified current major version is v4.

## Issues Found
1. **Misleading `terraform version -json` usage.** The original code in the "No Available Provider Versions" section claimed `terraform version -json | jq .` would "List available versions of a provider". That command actually shows the installed Terraform CLI version and the providers selected from the local lock file — it does not query the registry for available versions. Replaced with `terraform version` (with an accurate comment) so the only command that actually lists registry versions is the `curl` to the registry API right below it.
2. **Outdated GitHub Actions cache version.** The example used `actions/cache@v3`. The current major version is `v4`. Bumped to `actions/cache@v4`.

## Review Notes
- The illustrative error message for "No Available Provider Versions" uses `~> 6.0` and the fix suggests `~> 5.0`. As of the current date, AWS provider 6.x is available, so the specific constraint in the example is not realistic — but the example is presented as illustrative of a generic constraint-vs-available-version mismatch rather than a specific factual claim, so no change was made.
- The `~/.terraformrc` `plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"` example relies on Terraform's environment variable expansion in the CLI config file, which is supported. Correct as written.
- The `provider_installation` block correctly pairs `filesystem_mirror` with a `direct { exclude = ... }` block; without the exclude, Terraform would still attempt direct installation, which is a common pitfall worth keeping.
- All other commands, env vars, file paths (`.terraform.lock.hcl`, `.terraform/providers`), and registry API URLs check out against current HashiCorp documentation.
