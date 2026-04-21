# Validation Summary: How to Migrate from Terraform Enterprise to OpenTofu

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTofu
- Terraform Enterprise
- HCP Terraform
- Terraform CLI
- Terraform/OpenTofu state backends
- S3 backend
- Terraform provider requirements
- CI/CD command migration

## Sources Consulted
- HashiCorp license announcement: https://www.globenewswire.com/news-release/2023/08/10/2723189/0/en/HashiCorp-adopts-the-Business-Source-License-for-future-releases-of-its-products.html
- OpenTofu migration guide: https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu FAQ: https://opentofu.org/faq/
- OpenTofu Homebrew install documentation: https://opentofu.org/docs/intro/install/homebrew/
- OpenTofu standalone install documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu Debian installer documentation: https://opentofu.org/docs/intro/install/deb/
- OpenTofu `tofu version` command documentation: https://opentofu.org/docs/cli/commands/version/
- OpenTofu `tofu init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `tofu state push` command documentation: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider registry protocol documentation: https://opentofu.org/docs/internals/provider-registry-protocol/
- Terraform CLI `state pull` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform Enterprise workspace documentation: https://developer.hashicorp.com/terraform/enterprise/workspaces
- HCP Terraform Workspaces API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform State Versions API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions

## Issues Found
- The introduction implied OpenTofu is a direct alternative to Terraform Enterprise as a whole. Updated it to clarify that OpenTofu replaces Terraform CLI/language workflows while Terraform Enterprise platform features must be replaced separately.
- The pre-migration workspace command was labeled as listing all workspaces, but `terraform workspace list` lists Terraform CLI workspaces for the current working directory. Clarified the scope and added a TFE/HCP Terraform Workspaces API example.
- The assessment did not call out Terraform version compatibility. Added a version-constraint check and a note to confirm each workspace's Terraform version before migrating.
- The Linux install command piped the OpenTofu installer directly to `sh` without the documented install method. Replaced it with the official standalone installer flow.
- The TFE/HCP Terraform state export example fetched workspace details but did not actually use the workspace ID to download state, and it hardcoded the HCP Terraform hostname. Updated it to keep `terraform state pull` for configured backends and added a working State Versions API download flow with a configurable hostname.
- The state backend migration showed only `tofu init` followed by `tofu state push`. Updated it to use `tofu init -migrate-state` for backend migration and kept `tofu state push` only as a manual fallback.
- The provider registry section incorrectly said OpenTofu uses the same provider registry. Updated it to state that OpenTofu uses the OpenTofu Registry by default and that provider sources should be explicit.
- The TFE-specific resource section suggested OpenTofu equivalents for `tfe` provider-managed workspace resources. Updated it to direct readers to their new automation platform or the TFE/HCP Terraform API until decommissioning.
- The conclusion overstated the migration as straightforward for most configurations and referred to "binary compatibility with Terraform configurations." Updated the language to "many configurations" and "compatibility with Terraform configurations," with platform workflows called out separately.

## Review Notes
Local `terraform`, `tofu`, and `brew` binaries were not installed in the review environment, so CLI behavior was verified against official documentation rather than local `--help` output. Future improvements could add deeper coverage for Sentinel policies, run tasks, variable sets, private registries, and TFE RBAC migration planning.
