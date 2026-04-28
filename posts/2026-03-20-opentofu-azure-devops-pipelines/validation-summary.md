# Validation Summary: How to Set Up OpenTofu with Azure DevOps Pipelines - Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.7.0)
- Azure DevOps Pipelines (YAML)
- AzureCLI@2 task
- DownloadGitHubRelease@0 task
- AzureRM Terraform provider OIDC / Workload Identity Federation
- Azure Pipelines Environments and approval gates

## Sources Consulted
- OpenTofu releases on GitHub (verified `tofu_1.7.0_linux_amd64.zip` asset name): https://github.com/opentofu/opentofu/releases/tag/v1.7.0
- AzureRM provider OIDC guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- Azure DevOps blog – Workload identity federation for Azure Pipelines: https://devblogs.microsoft.com/devops/public-preview-of-workload-identity-federation-for-azure-pipelines/
- Azure DevOps blog – ID Token Refresh and Terraform Task v5: https://devblogs.microsoft.com/devops/introducing-azure-devops-id-token-refresh-and-terraform-task-version-5/
- Azure CLI task v2 documentation (`addSpnToEnvironment` behavior)
- Cellenza guide – Integrating Terraform with OIDC and WIF in Azure DevOps

## Issues Found
1. **Broken OIDC environment configuration in the Plan stage.**
   - The original `env:` block on the AzureCLI@2 task referenced `$(servicePrincipalId)`, `$(tenantId)`, and `$(subscriptionId)` as if they were pipeline variables. They are not — `addSpnToEnvironment: true` exposes them as shell environment variables only inside the inline script context, so the pipeline-style `$(…)` macros would resolve to literal/empty strings at task time.
   - The required `ARM_OIDC_TOKEN` (sourced from `$idToken`) was missing entirely. Without it, the AzureRM provider cannot complete OIDC authentication.
   - Fix: removed the task-level `env:` block and exported `ARM_USE_OIDC`, `ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_OIDC_TOKEN`, and `ARM_SUBSCRIPTION_ID` inside the inline script using the env vars exposed by `addSpnToEnvironment: true`, plus `az account show` for the subscription ID. This matches Microsoft's documented Workload Identity Federation pattern for Terraform/AzureRM.

2. **Apply stage was missing OIDC env vars.**
   - The Apply stage's AzureCLI@2 task did not set any `ARM_*` variables. `tofu apply` against the saved plan would still attempt to refresh state and call providers, which would fail without provider credentials. The post explicitly states the workflow uses OIDC, so the Apply stage was inconsistent with the stated design.
   - Fix: added the same `export ARM_*` block inside the inline script for the Apply stage.

## Review Notes
- OpenTofu 1.7.0 is real and the `tofu_1.7.0_linux_amd64.zip` asset name is correct, but 1.7.0 is now well behind the current OpenTofu line. Readers may want to bump `tofu_version` to a more recent release.
- The `unzip … -d /usr/local/bin` step assumes write access to `/usr/local/bin`. On Microsoft-hosted `ubuntu-latest` agents this generally works because the agent user has passwordless sudo and `/usr/local/bin` is world-writable on most images, but on hardened/self-hosted agents it may need `sudo`. Left as-is since it works on the documented hosted image.
- `-auto-approve` on `tofu apply <planfile>` is redundant (OpenTofu silently ignores the flag when a saved plan is supplied) but not incorrect; left in place to preserve the author's style.
- The phrase "Azure DevOps Pipelines integrates natively with OpenTofu" is a slight stretch — there is no first-party OpenTofu task, but integration via the AzureCLI/script tasks is straightforward and the post's example reflects that, so the wording is acceptable.
