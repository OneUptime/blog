# Validation Summary: How to Provision Azure Clusters with Cluster API and Flux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cluster API (CAPI)
- Cluster API Azure Provider (CAPZ)
- Flux CD (kustomize-controller)
- Microsoft Azure (VMs, VNet, Managed Disks, Service Principal)
- Kubernetes (v1.29.2)
- Kubeadm (KubeadmControlPlane, KubeadmConfigTemplate)
- SOPS (for secret encryption)
- Calico CNI
- clusterctl, kubectl, az CLI

## Sources Consulted
- Cluster API Azure (CAPZ) book: https://capz.sigs.k8s.io/
- CAPZ API reference and CRDs: https://github.com/kubernetes-sigs/cluster-api-provider-azure
- Cluster API book — clusterctl generate provider: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-provider
- KubeadmControlPlane and MachineDeployment API: https://cluster-api.sigs.k8s.io/developer/architecture/controllers/control-plane.html
- Azure VM sizes (Dv5/Dsv5 series — Hyper-V Generation 2 only): https://learn.microsoft.com/azure/virtual-machines/dv5-dsv5-series
- Azure VM Generation 2 reference: https://learn.microsoft.com/azure/virtual-machines/generation-2
- CNCF upstream CAPI marketplace images (publisher `cncf-upstream`, offer `capi`)
- Flux CD Kustomization API (`kustomize.toolkit.fluxcd.io/v1`): https://fluxcd.io/flux/components/kustomize/kustomizations/
- Calico installation manifests: https://github.com/projectcalico/calico/releases

## Issues Found
1. **Generation 1 image SKU paired with Generation 2-only VM sizes.** The original post used `sku: ubuntu-2004-gen1` in both the control-plane and worker `AzureMachineTemplate` resources while specifying `Standard_D4s_v5` and `Standard_D8s_v5` VM sizes. Azure's Dv5/Dsv5 series VMs are Hyper-V Generation 2 only and cannot boot a Generation 1 image — provisioning would fail. Updated both SKUs to `ubuntu-2204-gen2`, which is a Generation 2 image from the `cncf-upstream/capi` marketplace offering and is the current Ubuntu LTS pattern used by CAPZ tooling.

## Review Notes
- The post specifies `cloud-provider: azure` in `kubeletExtraArgs` for both control plane and worker `kubeadmConfigSpec`. The in-tree Azure cloud provider is deprecated and was disabled by default starting in Kubernetes 1.29 (the `DisableCloudProviders` feature gate became GA / on-by-default in later 1.29/1.30 releases). For new clusters, the recommended approach is `cloud-provider: external` paired with the out-of-tree cloud-provider-azure (Azure Cloud Controller Manager) installed as an add-on. The in-tree value still functions in 1.29.x for now, so this was left as-is, but readers building production clusters should migrate to the external provider.
- CAPZ `v1.13.0` is older than what would typically be current at the post's date (2026-03). The version is a working release, but readers may want to pin to a newer minor (e.g., v1.17+) to pick up CRD improvements and AKS managed-cluster enhancements.
- `prune: false` on the Flux Kustomization is appropriate here — deletion-by-Git of a `Cluster` resource would tear down live infrastructure, so disabling prune protects against accidental destruction. This is a reasonable choice that some readers might want to revisit once they have stronger GitOps guardrails (e.g., approvals, drift detection).
- The post references an existing VNet but does not call out that CAPZ requires the management cluster to have outbound connectivity to the Azure API and to the workload cluster API endpoint. Not an error — just a footnote for readers in restricted-egress environments.
- The example places the `AzureClusterIdentity` `clientSecret` inline as `stringData` with the note "should be SOPS-encrypted before committing." This is correct in spirit; readers must remember to actually SOPS-encrypt before pushing.
