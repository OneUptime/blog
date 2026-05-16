# Validation Summary: How to Provision Talos Clusters with CAPI on vSphere

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Cluster API (CAPI) / clusterctl
- Cluster API Provider vSphere (CAPV)
- Cluster API Bootstrap Provider Talos (CABPT) / Cluster API Control Plane Provider Talos (CACPPT)
- VMware vSphere / vCenter
- govc CLI
- Kubernetes (v1.30.0)
- Cilium CNI (via Helm)
- Talos VIP (Virtual IP) for control plane endpoint

## Sources Consulted
- Talos Linux VMware documentation: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/virtualized-platforms/vmware/
- Sidero CABPT repository: https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Cluster API Provider vSphere repository: https://github.com/kubernetes-sigs/cluster-api-provider-vsphere
- CAPV identity management docs: https://github.com/kubernetes-sigs/cluster-api-provider-vsphere/blob/main/docs/identity_management.md
- Verified Talos OVA download URL (HTTP 200 returned for `https://github.com/siderolabs/talos/releases/download/v1.7.0/vmware-amd64.ova`)

## Issues Found
No technical issues found.

Verified during review:
- The Talos OVA download URL (`vmware-amd64.ova` for v1.7.0) is correct and resolves to a valid asset.
- `govc` commands (`import.ova`, `vm.markastemplate`, `folder.create`, `pool.create`, `about.cert -thumbprint`) use correct subcommands and flags.
- `clusterctl init --bootstrap talos --control-plane talos --infrastructure vsphere` is the correct invocation.
- API versions used (`cluster.x-k8s.io/v1beta1`, `controlplane.cluster.x-k8s.io/v1alpha3`, `bootstrap.cluster.x-k8s.io/v1alpha3`, `infrastructure.cluster.x-k8s.io/v1beta1`) match the documented examples in the respective providers.
- VSphereCluster `identityRef` with `kind: Secret` is a valid, documented usage in CAPV.
- Talos VIP configuration (`/machine/network/interfaces` with `vip.ip`) matches the Talos documentation pattern for control plane VIP.
- `talosVersion: v1.7.0` and `version: v1.30.0` (Kubernetes) are valid release versions.

## Review Notes
- `cloneMode: linkedClone` requires the source template to have at least one snapshot — this is a CAPV requirement that the post does not explicitly mention. Readers may run into a clone failure if they forget to snapshot the template before deploying.
- The `helm install cilium cilium/cilium` step assumes the Cilium Helm repo (`helm repo add cilium https://helm.cilium.io/`) has already been added; this prerequisite is implied but not stated.
- The `MachineDeployment` uses an empty `matchLabels: {}` selector. CAPI auto-injects machine-set labels, so this works in practice, but explicit labels matching the template metadata would be more conventional.
- The CABPT compatibility matrix indicates support for `v1beta2` of the bootstrap/control-plane APIs in newer releases (v1.11+). The `v1alpha3` versions used here remain valid for installations using the older provider releases that ship with the linked Talos examples.
