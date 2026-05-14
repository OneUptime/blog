# Validation Summary: Cilium BGP Cluster Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes custom resources
- BGP
- Cilium CLI
- Kubernetes node labels

## Sources Consulted
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/latest/network/bgp-control-plane/bgp-control-plane-operation.html
- Cilium BGP Control Plane Troubleshooting Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting.html
- Cilium CLI `cilium bgp peers` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_peers.html
- Cilium Upgrade Guide custom resource version notes: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The Cilium BGP custom resources used `apiVersion: cilium.io/v2alpha1`. Current Cilium documentation uses the stable `apiVersion: cilium.io/v2` for `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`, and the upgrade guide calls out migration to the `cilium.io/v2` BGP CRDs. Updated all three manifests to `cilium.io/v2`.
- The introduction said `CiliumBGPClusterConfig` references `CiliumBGPNodeConfig`. The operation guide describes `CiliumBGPNodeConfig` as an operator-managed resource associated with matching nodes, not a resource referenced directly from the cluster config. Updated the text to say the cluster config references `CiliumBGPPeerConfig` and the operator creates node configs for matching nodes.
- The architecture diagram showed `CiliumBGPClusterConfig` using an `advertisementRef` to `CiliumBGPAdvertisement`. Cilium selects advertisements through the `advertisements` label selector under `CiliumBGPPeerConfig.spec.families`, not through a cluster config advertisement reference. Updated the diagram edge accordingly.

## Review Notes
The remaining commands and field names are consistent with the current Cilium documentation. The post still notes that the newer BGP resources were introduced in Cilium v1.16, while the examples now use the current stable `cilium.io/v2` API.
