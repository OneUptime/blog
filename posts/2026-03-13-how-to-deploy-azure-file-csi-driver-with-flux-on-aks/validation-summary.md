# Validation Summary: How to Deploy Azure File CSI Driver with Flux on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure File CSI Driver
- Azure Files
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and Deployments
- Flux HelmRepository, HelmRelease, and Kustomization
- Helm
- SMB and NFS storage protocols

## Sources Consulted
- Microsoft Learn: Use Container Storage Interface (CSI) drivers on Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Microsoft Learn: Create and manage persistent volumes with Azure Files in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Kubernetes SIGs Azure File CSI Driver README - https://github.com/kubernetes-sigs/azurefile-csi-driver
- Kubernetes SIGs Azure File CSI Driver parameters - https://github.com/kubernetes-sigs/azurefile-csi-driver/blob/master/docs/driver-parameters.md
- Kubernetes SIGs Azure File CSI Driver Helm chart repository - https://raw.githubusercontent.com/kubernetes-sigs/azurefile-csi-driver/master/charts/index.yaml
- Flux HelmRepository documentation - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 API reference - https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Azure CLI prerequisite used version 2.40 or later, while current AKS CSI driver documentation lists Azure CLI 2.42 or later. Updated the prerequisite to 2.42 or later.
- The built-in driver statement was too broad. Updated it to specify that AKS clusters running Kubernetes 1.21 or later enable the Azure File CSI Driver by default.
- The Helm deployment wording implied Flux could directly manage the managed AKS add-on by installing the open-source chart. Clarified that the Helm repository path is for running the open-source driver instead of the managed AKS add-on.
- The HelmRelease pinned the driver to `1.30.*`, which is outdated relative to the current Azure File CSI Driver chart series and does not cover newer Azure Files features documented for driver 1.35.x. Updated it to `1.35.*`.
- The Flux Kustomization health check targeted a non-existent Deployment named `azurefile-csi-driver-controller`. Updated it to health-check the `HelmRelease` that the Kustomization applies, which matches Flux guidance for Kustomizations containing HelmRelease resources.
- The NFS and SMB comparison overstated or misstated authentication and tier support. Updated the text to match Azure Files guidance: NFS requires SSD file shares plus VNet or private endpoint access and does not use storage account keys for mount authentication; SMB uses key-based authentication and dynamic provisioning stores storage account credentials in Kubernetes secrets by default.

## Review Notes
All YAML snippets parse successfully. The static PV example is syntactically valid, but in a real deployment the referenced `azure-storage-secret` must exist and contain the storage account name and key expected by the Azure File CSI Driver.
