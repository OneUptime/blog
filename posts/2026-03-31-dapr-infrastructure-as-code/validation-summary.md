# Validation Summary: How to Implement Infrastructure as Code for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- AzureRM Terraform Provider (~> 3.0)
- Helm Terraform Provider (~> 2.0)
- Kubernetes Terraform Provider (~> 2.0)
- Azure Kubernetes Service (AKS)
- Azure Cache for Redis
- Dapr (version 1.13.0)
- Dapr Helm Chart
- Pulumi (TypeScript)
- Pulumi Kubernetes SDK

## Sources Consulted
- Terraform AzureRM Provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM Features Block guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- AzureRM `azurerm_redis_cache` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- AzureRM `azurerm_kubernetes_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Helm Provider `helm_release` docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Kubernetes Provider `kubernetes_manifest` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Dapr Helm Charts repository: https://dapr.github.io/helm-charts/
- Dapr Helm chart values (HA configuration, subchart naming): cross-referenced with other validated blog posts in this repository
- Dapr Component spec for `pubsub.redis`: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Pulumi Kubernetes `helm.v3.Release` docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/
- AzureRM v3.114.0 release notes (attribute renaming): https://github.com/hashicorp/terraform-provider-azurerm/releases/tag/v3.114.0

## Issues Found

### Issue 1: Missing mandatory `provider "azurerm"` block (Critical)
- **What was wrong:** The `main.tf` code block defined `required_providers` for `azurerm` but did not include a `provider "azurerm" { features {} }` block. The AzureRM provider mandates this block (since v2.0); without it, `terraform init` / `terraform plan` will fail with an error.
- **What was changed:** Added `provider "azurerm" { features {} }` between the `terraform {}` block and the first resource definition.
- **Why:** The AzureRM provider will refuse to initialize without an explicit `features {}` block. This is a hard requirement, not optional.

### Issue 2: Deprecated attribute `enable_non_ssl_port` (Minor)
- **What was wrong:** The `azurerm_redis_cache` resource used `enable_non_ssl_port = false`, which was renamed to `non_ssl_port_enabled` in AzureRM provider v3.114.0 as part of a boolean attribute naming standardization.
- **What was changed:** Replaced `enable_non_ssl_port` with `non_ssl_port_enabled`.
- **Why:** While the old name still works in some 3.x versions, it generates deprecation warnings and will be removed in v4.0. Using the current name avoids warnings and is forward-compatible.

## Review Notes
- **`dapr_sentry.replicaCount` is redundant when HA is enabled:** The Helm release sets both `global.ha.enabled = true` and `dapr_sentry.replicaCount = 3`. When HA mode is enabled, the Dapr Helm chart uses `global.ha.replicaCount` (which defaults to 3) for all control plane components and ignores individual component `replicaCount` values. The setting is harmless but has no effect. Future revision could remove it or replace it with `global.ha.replicaCount` for clarity.
- **Missing `provider "kubernetes"` configuration:** The `components.tf` file uses `kubernetes_manifest` but no `provider "kubernetes" {}` block is shown. The blog implicitly assumes this would be configured alongside the Helm provider in `dapr.tf`. Not an error per se (blog posts commonly omit boilerplate), but readers may need to add this themselves.
- **AzureRM provider version:** The constraint `~> 3.0` is valid but AzureRM 4.x has been released. The code is correct for 3.x but readers starting new projects may want to use `~> 4.0`.
- **Dapr version 1.13.0:** This is a valid released version. Newer Dapr versions exist; readers should check for the latest stable release.
- **All Dapr Helm chart details verified:** Repository URL, HA value path, subchart naming convention (underscores), and `dapr-system` namespace are all correct.
- **Pulumi code is correct:** Imports, resource types (`k8s.helm.v3.Release`, `k8s.core.v1.Namespace`), and `repositoryOpts` syntax are all valid.
- **Azure Redis port 6380 for TLS:** Correctly uses port 6380, which is the standard Azure Redis TLS port.
