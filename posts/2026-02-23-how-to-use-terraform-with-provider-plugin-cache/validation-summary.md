# Validation Summary: How to Use Terraform with Provider Plugin Cache

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider plugin cache
- Terraform CLI configuration file
- Terraform provider installation mirrors
- Terraform dependency lock file
- GitHub Actions
- GitLab CI

## Sources Consulted
- Terraform CLI configuration file and provider plugin cache: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform provider installation configuration and filesystem mirrors: https://developer.hashicorp.com/terraform/cli/config/config-file#provider-installation
- Terraform `providers mirror` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform dependency lock file and checksum verification: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- GitHub Actions dependency caching reference: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows

## Issues Found
- The GitHub Actions example used `~/.terraform.d/plugin-cache` without ensuring the cache directory exists. Terraform requires the plugin cache directory to already exist, so the example now creates `.terraform-plugin-cache` before `terraform init` and points `TF_PLUGIN_CACHE_DIR` at an absolute workspace path.
- The shared team cache section did not mention Terraform's documented concurrency caveat. A warning was added that Terraform does not guarantee safe behavior when multiple `terraform init` processes write to the same plugin cache directory at the same time.

## Review Notes
The post's core explanation of `plugin_cache_dir`, `TF_PLUGIN_CACHE_DIR`, provider cache reuse, checksum verification, manual cleanup, and filesystem mirror configuration matches the official Terraform documentation. The filesystem mirror example is valid for restricting HashiCorp providers to a local mirror while allowing other providers to use direct installation.
