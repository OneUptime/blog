# Validation Summary: How to Use OpenTofu with Existing Terraform Enterprise

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform Enterprise / HCP Terraform
- Terraform CLI
- Terraform state and backends
- S3 remote state backend
- TFE/HCP Terraform API
- Open Policy Agent / Rego
- GitHub Actions
- Private module registries

## Sources Consulted
- OpenTofu Cloud Configuration: https://opentofu.org/docs/language/settings/tf-cloud/
- OpenTofu Cloud Backend CLI Settings: https://opentofu.org/docs/cli/cloud/
- OpenTofu Remote Backend: https://opentofu.org/docs/language/settings/backends/remote/
- OpenTofu S3 Backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Backend Configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu Module Sources: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Registry Protocol: https://opentofu.org/docs/internals/module-registry-protocol/
- Terraform CLI Configuration Credentials: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform State Commands: https://developer.hashicorp.com/terraform/cli/commands/state
- HCP Terraform / Terraform Enterprise Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform / Terraform Enterprise State Versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- Open Policy Agent Terraform guide: https://www.openpolicyagent.org/docs/latest/terraform/
- Open Policy Agent Rego keyword reference: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OpenTofu setup-opentofu GitHub Action: https://github.com/opentofu/setup-opentofu

## Issues Found
- The compatibility section incorrectly stated that OpenTofu does not natively connect to the TFE API and cannot use TFE remote execution directly. Updated it to describe current cloud/remote backend protocol support and the need to verify TFE-version support.
- The state export example used `TFE_TOKEN` as if Terraform CLI would read it for cloud/backend authentication. Updated the example to use `TF_TOKEN_app_terraform_io`, which Terraform CLI officially supports for host-scoped credentials, while keeping `TFE_TOKEN` available for later API examples.
- The parallel workspace section mixed a commented cloud block and an active S3 backend as if `-backend-config` could switch between them. Clarified that cloud and backend settings must be kept separate and added a `backend "remote" {}` example for backend config file usage.
- The API migration script did not check HTTP failures and sent the TFE API authorization header to the hosted state download URL. Added `raise_for_status()` checks and downloaded the signed state URL without the API header.
- The Rego policy used legacy rule syntax. Updated it to current OPA/Rego v1 syntax with `deny contains ... if` and `some ... in`.
- The GitHub Actions example pinned OpenTofu `1.6.2`, which is outdated for a 2026 guide. Updated the examples to `1.11.0`.
- The private registry section implied OpenTofu always requires alternatives to TFE private module registries. Updated the wording because OpenTofu supports private module registries via native registry protocols and TACOS-compatible services.
- The state locking example used an invalid workspace update `PATCH` to set `locked=true`. Replaced it with the official workspace `actions/lock` endpoint and a workspace-ID lookup.

## Review Notes
The migration script remains an illustrative starting point rather than production-ready automation. For large TFE organizations, it should also handle pagination, retries, workspace execution modes, per-workspace backend configuration, and rollback procedures.
