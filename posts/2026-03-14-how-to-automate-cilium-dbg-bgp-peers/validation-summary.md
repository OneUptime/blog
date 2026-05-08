# Validation Summary: Automating Cilium BGP Peer Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- `cilium-dbg bgp peers`
- Kubernetes `kubectl exec`
- Kubernetes CronJob
- Bash
- `jq`

## Sources Consulted
- Cilium command reference for `cilium-dbg bgp peers`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bgp_peers/
- Cilium BGP Control Plane overview and installation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane operation guide: https://docs.cilium.io/en/latest/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium BGP Control Plane troubleshooting guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Cilium API model for BGP peer JSON fields: https://pkg.go.dev/github.com/cilium/cilium/api/v1/models#BgpPeer

## Issues Found
- The original monitoring scripts treated any non-empty `cilium-dbg bgp peers` output as healthy. This could mark a node healthy even when BGP peers were not established. Updated the scripts to inspect `session-state` and require at least one peer with all peer sessions in the `established` state.
- The prerequisites referenced `CiliumBGPPeeringPolicy`, while current Cilium BGP Control Plane documentation uses resources such as `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`. Updated the prerequisite and troubleshooting resource checks.
- The troubleshooting note used the old `enable-bgp-control-plane` config wording. Updated it to the current Helm setting `bgpControlPlane.enabled=true`.
- The prerequisites contained an empty bullet. Removed it.
- The Kubernetes CronJob example needed to avoid depending on `jq` inside the `bitnami/kubectl` image. Updated that example to use the `cilium-dbg bgp peers` supported `jsonpath` output format.

## Review Notes
- The post is now technically valid for current Cilium BGP Control Plane usage. In production, users may prefer the cluster-level `cilium bgp peers` command or `CiliumBGPNodeConfig` status for broader monitoring workflows, but this post is specifically scoped to automating `cilium-dbg` from Cilium agent pods.
