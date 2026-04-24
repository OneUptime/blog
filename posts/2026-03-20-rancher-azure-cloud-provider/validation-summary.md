# Validation Summary: How to Configure Azure Cloud Provider in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Microsoft Azure
- Azure Cloud Controller Manager
- Azure Disk CSI Driver
- Helm
- Azure CLI

## Sources Consulted
- Rancher docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/azure
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- Kubernetes Cloud Controller Manager administration: https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/
- Kubernetes cloud provider integration changes in v1.29: https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/
- Azure CLI `az ad sp create-for-rbac`: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac
- `cloud-provider-azure` Helm chart README: https://github.com/kubernetes-sigs/cloud-provider-azure/tree/master/helm/cloud-provider-azure
- Azure cloud provider config package docs: https://pkg.go.dev/sigs.k8s.io/cloud-provider-azure/pkg/provider/config
- Azure cloud provider rate-limit config docs: https://pkg.go.dev/sigs.k8s.io/cloud-provider-azure/pkg/azclient/policy/ratelimit
- Azure Disk CSI driver Helm chart README: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/charts/README.md
- Azure Disk StorageClass parameters: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk

## Issues Found
- The post mixed in-tree and out-of-tree Azure guidance for Rancher-managed RKE2 clusters. I changed the cluster configuration from `Azure`/`cloud-provider-name: azure` to the current out-of-tree `External`/`cloud-provider-name: external` flow and added the required `--configure-cloud-routes=false` Rancher setting.
- The Azure cloud config example was incomplete for the Rancher-managed Azure path and contained a misnamed rate-limit field. I added `securityGroupResourceGroup`, `routeTableResourceGroup`, and `useInstanceMetadata: true`, corrected `cloudProviderRatelimit` to `cloudProviderRateLimit`, and clarified that VMSS-based clusters should use `primaryScaleSetName` instead of `primaryAvailabilitySetName`.
- The post incorrectly told readers to place the Azure cloud config file on every node. I changed this to saving the file locally and creating a Kubernetes Secret from it, which matches the current out-of-tree Azure CCM workflow.
- The Azure CCM Helm installation commands used the wrong chart name and wrong value keys. I replaced them with the supported `cloud-provider-azure` chart installation flow and added the required `values.yaml` overrides for Rancher-provisioned RKE2 control-plane scheduling and secret-based cloud config loading.
- The Azure Disk CSI installation step was missing control-plane scheduling and explicit secret namespace settings. I added the supported `controller.cloudConfigSecretNamespace`, `controller.runOnControlPlane`, and node secret namespace values.
- The introduction and description overstated what the Azure cloud provider alone provides. I clarified that Azure Managed Disks and Azure Files require the corresponding CSI drivers, and that this guide specifically covers Azure CCM plus the Azure Disk CSI driver.

## Review Notes
- This guide now reflects the out-of-tree Azure provider model required for Kubernetes 1.30 and later.
- Azure Files is not actually installed in the post; a future expansion should add the separate `azurefile-csi-driver` steps if Azure Files support is meant to be covered end-to-end.
- The Helm commands intentionally avoid hardcoding a chart version so the instructions do not pin readers to an outdated release; for production environments, pinning versions to the cluster's Kubernetes minor version may still be preferable.
