# Validation Summary: How to Provision Talos Clusters with CAPI on Azure

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Cluster API (CAPI)
- Cluster API Provider Azure (CAPZ)
- Cluster API Bootstrap/Control Plane Provider Talos (CABPT / CACPPT)
- Microsoft Azure (VMs, VHDs, NSGs, Storage Accounts, Managed Images)
- Kubernetes (v1.30.0)
- `clusterctl`, `kubectl`, `az` CLI, `talosctl`
- Helm (Cilium CNI, Azure cloud-provider-azure CCM)

## Sources Consulted
- Cluster API Provider Azure source — SubnetSpec / SecurityRule types: https://github.com/kubernetes-sigs/cluster-api-provider-azure/blob/main/api/v1beta1/types.go
- CAPZ custom networking docs: https://cluster-api-azure.sigs.k8s.io/topics/custom-network
- Sidero Labs cluster-api-control-plane-provider-talos README: https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- Sidero Labs cluster-api-bootstrap-provider-talos README: https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Azure CLI reference (`az ad sp create-for-rbac`, `az image create`, `az storage blob upload`)

## Issues Found
- **Incorrect CAPZ `SecurityRule` field names in `azure-cluster.yaml`.** The post used Azure REST-API style field names (`sourceAddressPrefix`, `destinationPortRange`, `access`), but CAPZ v1beta1's `SecurityRule` struct uses different JSON tags. I updated both NSG rules to use the correct CAPZ field names:
  - `sourceAddressPrefix` → `source`
  - `destinationPortRange` → `destinationPorts`
  - `access` → `action`

  These manifests would otherwise be rejected by the CAPZ webhook / fail schema validation.

## Review Notes
- The TalosControlPlane (`controlplane.cluster.x-k8s.io/v1alpha3`) and TalosConfigTemplate (`bootstrap.cluster.x-k8s.io/v1alpha3`) API versions match what the upstream Sidero Labs providers currently ship — these are correct, despite the `v1alpha3` suffix looking dated. CAPI users should still verify the API version matches the installed provider's CRDs in their environment.
- The Talos v1.7.0 / Kubernetes v1.30.0 pairing is consistent (Talos 1.7 ships with Kubernetes 1.30 as its default).
- The `talosVersion: v1.7.0` and `version: v1.30.0` references will eventually become outdated as newer Talos / Kubernetes releases ship; readers should substitute current versions.
- The post uploads a Talos VHD and then registers it as a managed image. As an alternative, Sidero Labs publishes pre-built Azure images via the Image Factory; readers may find that simpler than manually uploading VHDs.
- `sshPublicKey: ""` is technically valid (CAPZ allows empty), and irrelevant for Talos which doesn't run sshd — left as-is since the post's intent is to make the unused field explicit.
- The post does not show how to provide the Azure credentials Secret to the AzureCluster (e.g., `AzureClusterIdentity`); modern CAPZ deployments often use `AzureClusterIdentity` instead of environment-variable based credentials. This is a stylistic / completeness gap rather than a technical error, so it was not changed.
