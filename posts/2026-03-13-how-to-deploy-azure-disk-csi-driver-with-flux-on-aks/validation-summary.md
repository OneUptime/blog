# Validation Summary: How to Deploy Azure Disk CSI Driver with Flux on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Disk CSI Driver
- Flux CD
- HelmRelease and HelmRepository resources
- Kubernetes StorageClass, PersistentVolumeClaim, and VolumeSnapshot resources
- Azure CLI

## Sources Consulted
- Microsoft Learn: Use Container Storage Interface (CSI) drivers on AKS - https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Microsoft Learn: Azure storage CSI driver and volume provisioning - https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi
- Microsoft Learn: Supported Kubernetes versions in AKS - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Azure Disk CSI Driver GitHub repository - https://github.com/kubernetes-sigs/azuredisk-csi-driver
- Azure Disk CSI Driver Helm chart values - https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts/v1.34.3/azuredisk-csi-driver/values.yaml
- Azure Disk CSI Driver parameters - https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/docs/driver-parameters.md
- Flux HelmRelease API reference - https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository API reference - https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes StorageClass documentation - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI external-snapshotter documentation - https://github.com/kubernetes-csi/external-snapshotter

## Issues Found
- The prerequisites listed Kubernetes 1.24 or later for AKS. AKS 1.24 is no longer a supported AKS version, so this was changed to require a currently supported AKS Kubernetes version.
- The prerequisites listed Azure CLI 2.40 or later. Current AKS CSI driver documentation requires Azure CLI 2.42 or later, so this was updated.
- The Flux Kustomization health check referenced `azuredisk-csi-driver-controller`, but the Azure Disk CSI Helm chart creates the controller Deployment using `controller.name`, which defaults to `csi-azuredisk-controller`. The health check name was corrected.
- The troubleshooting guidance suggested disabling the managed disk driver only on cluster creation. Current AKS documentation supports disabling it on an existing cluster with `az aks update --disable-disk-driver`, so the guidance was updated to use that command before deploying a custom driver.

## Review Notes
The tutorial is technically valid after the fixes. The Azure Disk CSI Driver project notes that manually deploying the open-source driver on AKS is not the officially supported Microsoft-managed experience; the post's conflict warning is important for readers who choose this path.
