# Validation Summary: How to Handle Terraform in Air-Gapped Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider mirrors
- Terraform CLI configuration files
- Terraform modules
- Terraform Enterprise
- Terraform S3, pg, and Consul backends
- GitLab CI/CD
- nginx
- MinIO and S3-compatible storage

## Sources Consulted
- Terraform CLI configuration: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform provider network mirror protocol: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- Terraform `providers mirror` command: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform module sources: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform S3 backend for v1.7.x: https://developer.hashicorp.com/terraform/language/v1.7.x/backend/s3
- Terraform Consul backend: https://developer.hashicorp.com/terraform/language/backend/consul
- Terraform version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform Enterprise air-gapped installation: https://developer.hashicorp.com/terraform/enterprise/install/automated/automating-airgap

## Issues Found
- The nginx provider mirror example was marked as a Bash code block. Changed the fence to `nginx` so the configuration is not presented as shell syntax.
- The Terraform Enterprise air-gap download example used a non-official direct airgap bundle URL pattern. Updated it to reflect the documented flow: use the airgap bundle URL from the setup email, download the Replicated installer bootstrapper, extract it, and run `install.sh airgap`.
- The S3-compatible backend example used deprecated S3 backend arguments `endpoint` and `force_path_style` for Terraform 1.7.x. Replaced them with `endpoints = { s3 = ... }` and `use_path_style = true`, and added `skip_requesting_account_id = true` for non-AWS S3-compatible storage.
- The text described `TF_CLI_CONFIG_FILE` as configuring a project's CLI configuration. Clarified that it points Terraform at a specific CLI configuration file.

## Review Notes
Terraform was not installed in the review environment, so CLI behavior was checked against official Terraform documentation rather than local `terraform --help` output. The guide pins Terraform 1.7.3, which is older than current Terraform releases but remains internally consistent for the examples after the backend argument corrections.
