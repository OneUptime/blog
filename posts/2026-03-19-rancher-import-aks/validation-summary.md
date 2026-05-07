# Validation Summary: How to Import an AKS Cluster into Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Azure Kubernetes Service (AKS)
- Kubernetes
- Azure CLI
- `kubectl`
- Rancher Monitoring
- Microsoft Entra ID

## Sources Consulted
- Rancher: Registering Existing Clusters - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher: Creating an AKS Cluster - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/aks
- Rancher: AKS Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/aks-cluster-configuration
- Rancher: Cluster Configuration - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration
- Rancher: Enable Monitoring - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher: Helm Chart Options - https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher: Registered Clusters troubleshooting - https://ranchermanager.docs.rancher.com/v2.14/troubleshooting/other-troubleshooting-tips/registered-clusters
- Microsoft Learn: `az ad sp` CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: `az aks` CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure built-in roles for Containers - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers

## Issues Found
- The prerequisites were missing Rancher's documented AKS import requirements. I added the need for local accounts to be enabled and for the importing user to have `cluster-admin` access in the cluster.
- The prerequisites said a managed identity could be used for this flow, but Rancher's documented AKS cloud credential flow is based on a service principal with client ID and client secret. I corrected that prerequisite and marked the service-principal and cloud-credential steps as AKS-type-import only.
- The service principal example used role guidance that did not match Rancher's documented AKS setup flow. I updated the example and troubleshooting text to use the documented `Contributor` role assignment at resource-group scope.
- The AKS-type import section implied that existing AKS clusters appear immediately in Rancher's registration list. Rancher documents that this can take time, possibly hours depending on region, so I added that caveat.
- The AKS-specific UI guidance pointed readers to **Nodes** for node pool settings and included an unsupported claim about Azure AD integration status. I corrected this to use **Edit Config** for reviewing AKS node-pool, networking, and scaling settings.
- The Microsoft Entra sentence implied Rancher would work alongside AKS authentication without mentioning the local-account restriction. I replaced it with the documented requirement that local accounts must be enabled before import.
- The monitoring installation path was too narrow for current Rancher UI flows. I updated it to the documented **Cluster Tools** or **Apps > Charts** paths.

## Review Notes
- Rancher `v2.7` is archived in the current documentation. The guide remains technically valid after the fixes, but readers should prefer a currently supported Rancher release.
- Rancher also documents a custom `Rancher AKSv2` role for least-privilege Azure access. The post now uses the simpler documented `Contributor` path rather than introducing a larger least-privilege detour.
- `az` and `kubectl` are not installed in this workspace, so CLI syntax was verified against Microsoft Learn rather than local `--help` output.
