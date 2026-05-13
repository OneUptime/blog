# Validation Summary: How to Configure Flux with AKS Automatic Cluster Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Flux CD
- Kubernetes
- HelmRelease resources
- Kustomization resources
- PodDisruptionBudget resources
- Flux notification alerts

## Sources Consulted
- Microsoft Learn: Automatically upgrade an Azure Kubernetes Service cluster - https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster
- Microsoft Learn: Autoupgrade node OS images in AKS - https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-node-os-image
- Microsoft Learn: az aks maintenanceconfiguration CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/maintenanceconfiguration
- Microsoft Learn: az aks CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Flux: Helm API reference v2 - https://fluxcd.io/flux/components/helm/api/v2/
- Flux: Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux: Notification Provider documentation - https://fluxcd.io/flux/components/notification/providers/
- Flux: Notification Alert documentation - https://fluxcd.io/flux/components/notification/alerts/
- Flux source manifests: controller labels - https://github.com/fluxcd/flux2/tree/main/manifests/bases
- Kubernetes: PodDisruptionBudget documentation - https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post used `--auto-upgrade-channel node-image` as the node OS upgrade command. Current AKS documentation treats node OS autoupgrade as a separate channel configured with `--node-os-upgrade-channel NodeImage`, so the command and description were updated.
- The post recommended `patch` or `stable` for most production clusters and implied both avoid breaking API changes. Current Microsoft documentation recommends patch in the portal and marks `stable` as no longer recommended and planned for deprecation, so the guidance was narrowed to `patch` and clarified for `stable`.
- The Flux controller PDB examples selected pods with `app: source-controller` and `app: kustomize-controller`. Current Flux manifests label controller pods with `app.kubernetes.io/component` and `app.kubernetes.io/part-of`, so the selectors were corrected.
- The Flux controller PDB examples used `minAvailable: 1`, which can block voluntary eviction for a single-replica controller. They were changed to `maxUnavailable: 1` to allow node drains to proceed.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation lists the notification API as `notification.toolkit.fluxcd.io/v1beta3`, so both Provider and Alert examples were updated.
- The troubleshooting section referred to `kubectl convert` generically. The wording was updated to call it the `kubectl convert` plugin.

## Review Notes
The AKS planned maintenance commands match the current Azure CLI reference shape, including the `aksManagedAutoUpgradeSchedule` and `aksManagedNodeOSUpgradeSchedule` schedule names. The Flux HelmRelease and Kustomization examples use current API versions and valid fields. The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI documentation rather than local `az --help` output.
