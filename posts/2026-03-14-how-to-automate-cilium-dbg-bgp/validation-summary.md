# Validation Summary: Automating Cilium BGP Debug Operations

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Cilium BGP Control Plane
- `cilium-dbg bgp`
- Kubernetes
- Kubernetes CronJob
- `kubectl exec`
- Bash scripting
- Prometheus text exposition format

## Sources Consulted
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium `cilium-dbg bgp peers` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_peers/
- Cilium `cilium-dbg bgp routes` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_routes/
- Cilium `cilium-dbg bgp route-policies` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_route-policies/
- Cilium upgrade guide notes on `CiliumBGPPeeringPolicy` removal: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The prerequisites referenced `CiliumBGPPeeringPolicy`, which is the removed BGPv1 CRD in current stable Cilium. Updated the prerequisite to the current `cilium.io/v2` resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The collection script used `cilium-dbg bgp routes` without required arguments. Current Cilium requires `<available | advertised> <afi> <safi>`, so the example now collects `cilium-dbg bgp routes available ipv4 unicast`.
- The metrics script used `cilium-dbg bgp routes` without required arguments. Updated it to `cilium-dbg bgp routes available ipv4 unicast`.
- The metrics script used `grep -c ... || echo 0`, which can emit two zero lines because `grep -c` prints `0` and exits non-zero when there are no matches. Changed the fallbacks to `|| true` so each Prometheus metric value is a single number.

## Review Notes
- The examples monitor IPv4 unicast routes. Dual-stack or IPv6-only clusters should add or substitute `ipv6 unicast` route checks.
- The CronJob uses the existing `cilium` service account. That can work in many Cilium installations, but production deployments may prefer a dedicated service account with only `get/list pods` and `create pods/exec` permissions.
