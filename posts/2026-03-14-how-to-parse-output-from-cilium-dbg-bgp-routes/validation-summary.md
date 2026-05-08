# Validation Summary: Parsing Cilium BGP Routes Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Cilium `cilium-dbg` CLI
- Kubernetes `kubectl`
- Bash scripting
- Python 3
- JSON and `jq`
- Prometheus text exposition format

## Sources Consulted
- Cilium `cilium-dbg bgp routes` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_routes/
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane operation guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium upgrade guide for BGPv1 removal notes: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The `cilium-dbg bgp routes` examples omitted required positional arguments. Current Cilium documentation requires `<available | advertised> <afi> <safi>`, so the examples now use `cilium-dbg bgp routes available ipv4 unicast`.
- The prerequisites referenced `CiliumBGPPeeringPolicy`, which has been removed in current Cilium releases. The post now references `CiliumBGPClusterConfig` and related BGP resources.
- The Python parser split every whitespace-delimited token, which broke the multi-token `Attrs` column shown in Cilium BGP route output. The parser now limits splitting to the number of header columns so the final attribute field is preserved.
- The JSON report example emitted invalid JSON because the shell quoting removed the quotes around `node` and `entries`. It now uses `jq -n` to construct each object safely.
- Troubleshooting guidance referenced the old `enable-bgp-control-plane` config value, `CiliumBGPPeeringPolicy`, and `exportPodCIDR`. These were updated to the current `bgpControlPlane.enabled=true`, `CiliumBGPClusterConfig`, and `CiliumBGPAdvertisement` terminology.

## Review Notes
The examples are scoped to IPv4 unicast available routes. Users who need IPv6 or advertised routes should substitute `ipv6 unicast` or `advertised` according to the documented Cilium command syntax.
