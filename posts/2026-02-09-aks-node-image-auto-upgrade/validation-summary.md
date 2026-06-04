# Validation Summary: How to Upgrade AKS Clusters with Node Image Upgrades and Auto-Upgrade Channels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes
- Terraform AzureRM provider
- Azure Monitor activity log alerts

## Sources Consulted
- Microsoft Learn: Automatically upgrade an Azure Kubernetes Service cluster - https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster
- Microsoft Learn: Autoupgrade node OS images - https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-node-os-image
- Microsoft Learn: Upgrade Azure Kubernetes Service node images - https://learn.microsoft.com/en-us/azure/aks/upgrade-node-image
- Microsoft Learn: az aks maintenanceconfiguration CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/maintenanceconfiguration
- Microsoft Learn: az aks nodepool CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Terminate a long running operation on AKS - https://learn.microsoft.com/en-us/azure/aks/manage-abort-operations
- Terraform Registry: azurerm_kubernetes_cluster resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster

## Issues Found
- The post treated cluster auto-upgrade channels as the primary mechanism for both Kubernetes and node OS image automation. Updated the wording and examples to distinguish cluster auto-upgrade channels from the separate node OS auto-upgrade channel.
- The manual node image upgrade script only checked whether `latestNodeImageVersion` was non-null. Updated it to compare the current `nodeImageVersion` with `latestNodeImageVersion` before starting an upgrade.
- The Terraform example used older AzureRM provider attributes. Updated `automatic_channel_upgrade` to `automatic_upgrade_channel` and added the current `node_os_upgrade_channel = "NodeImage"` setting.
- The `node-image` cluster auto-upgrade channel was described as the most conservative option. Updated it to note that Microsoft now treats it as legacy and recommends the separate `NodeImage` node OS auto-upgrade channel for node image automation.
- The stable and rapid channel descriptions were imprecise. Updated them to specify that AKS upgrades to the latest supported patch release on the relevant minor version.
- The planned maintenance commands used `--weekday` and `--start-hour` with `aksManagedNodeOSUpgradeSchedule`, but those flags apply to the `default` maintenance configuration only. Updated the examples to use `--schedule-type`, `--day-of-week`, `--interval-weeks`, `--start-time`, `--duration`, and `--utc-offset` for managed auto-upgrade and node OS schedules.
- The maintenance exclusion example used unsupported `--not-allowed-start` and `--not-allowed-end` flags. Replaced it with a supported maintenance configuration JSON file using `notAllowedDates`.
- The monitoring example used `az aks operation-status list`, which is not a current AKS CLI command. Replaced it with `az aks operation show-latest` and an activity log query.

## Review Notes
The examples remain illustrative and assume the Azure CLI, kubectl, and Terraform provider versions that support the documented flags and attributes. The Azure CLI binary was not installed in the local environment, so CLI verification was performed against current Microsoft Learn command references rather than local `az --help` output.
