# Validation Summary: How to Use Azure Container Registry as OCI Registry for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Container Registry
- OCI registries and OCI artifacts
- ORAS CLI
- Azure CLI
- Terraform `azurerm` and `azuread` providers

## Sources Consulted
- OpenTofu OCI Registry Integrations: https://opentofu.org/docs/cli/oci_registries/
- OpenTofu Provider Mirrors in OCI Registries: https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu Module Packages in OCI Registries: https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `providers mirror` command: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu Module Sources: https://opentofu.org/docs/v1.9/language/modules/sources/
- Azure Container Registry authentication options: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Azure Container Registry geo-replication: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication
- Azure Container Registry private endpoints: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Azure CLI `az acr token`: https://learn.microsoft.com/en-us/cli/azure/acr/token?view=azure-cli-latest
- Azure Container Registry roles overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Terraform Registry `azuread_service_principal`: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/service_principal
- Terraform Registry `azurerm_private_endpoint`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint

## Issues Found
- The OpenTofu CLI config example used `~/.terraform.rc` and `oci_mirror.url`, which do not match the current OpenTofu OCI mirror configuration. I corrected this to `~/.tofurc` and `repository_template`.
- The provider publishing example used an incorrect OCI repository layout and an unsupported single-manifest ORAS push format. OpenTofu provider mirrors require per-platform `application/vnd.opentofu.provider-target` manifests plus a top-level `application/vnd.opentofu.provider` index manifest. I rewrote the script to match the documented OCI provider mirror format and corrected the repository path to `opentofu-providers/<namespace>/<type>`.
- The module publishing example used `tar.gz` plus incorrect OpenTofu media types. OpenTofu OCI module packages require a `.zip` layer with media type `archive/zip` and artifact type `application/vnd.opentofu.modulepkg`. I corrected the archive format, media types, and the `oras tag` usage.
- The module consumption example used `:2.1.0` as if OCI module versions were part of the path. OpenTofu selects OCI module tags via query arguments, so I changed it to `?tag=2.1.0`.
- The RBAC example referenced `azurerm_service_principal`, which is not the correct Terraform resource type for a Microsoft Entra service principal. I corrected it to `azuread_service_principal`.
- The ACR token example created the token before the scope map it depended on, and it referenced provider repository names that no longer matched the corrected OpenTofu OCI layout. I reordered the commands and fixed the repository names.
- The post used outdated Azure AD terminology in places where Microsoft documentation now uses Microsoft Entra ID. I updated those references.

## Review Notes
- OpenTofu OCI support for modules and provider mirrors is current in the latest OpenTofu docs and was introduced in the 1.10 line, so readers need a modern OpenTofu version for these examples.
- The provider publishing flow relies on ORAS features documented for ORAS v1.3+.
- Premium ACR is correctly required here for geo-replication and private endpoints.
