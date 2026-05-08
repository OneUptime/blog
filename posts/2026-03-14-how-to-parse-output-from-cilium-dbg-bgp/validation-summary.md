# Validation Summary: Parsing Cilium BGP Debug Output

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium BGP Control Plane
- cilium-dbg CLI
- Kubernetes kubectl
- Bash scripting
- Python 3
- Prometheus text exposition format

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- cilium-dbg bgp command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bgp/
- cilium-dbg bgp peers command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bgp_peers/
- Cilium upgrade notes for removed CiliumBGPPeeringPolicy: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The post used `cilium-dbg bgp` as if it emitted peer state rows. Current Cilium command reference defines `cilium-dbg bgp` as the parent command and `cilium-dbg bgp peers` as the command that lists peer state, so all capture, metrics, report, verification, and conclusion examples were updated to use `cilium-dbg bgp peers`.
- The introduction said Cilium advertises pod and service CIDRs. Current Cilium BGP documentation describes Pod CIDR and Service VIP advertisements, so the wording was corrected to "pod CIDRs and service VIPs."
- The prerequisites and troubleshooting referenced `CiliumBGPPeeringPolicy` and `ciliumbgppeeringpolicies`, which are from the removed BGP v1 API. These were replaced with the current `CiliumBGPClusterConfig` and `CiliumBGPPeerConfig` resources.
- The troubleshooting guidance used the old `enable-bgp-control-plane` config key. Current installation documentation uses the Helm value `bgpControlPlane.enabled=true`, so that guidance was updated.
- The Python parser split headers on whitespace, which breaks Cilium's multi-word columns such as `Local AS`, `Peer Address`, and `Session State`. The parser was changed to parse the fixed-width Cilium peer table headers and preserve values across continuation rows.
- The JSON report example emitted unquoted `node` and `entries` keys because of shell quoting. The echo statement was corrected so the generated report is valid JSON.
- The `jq` prerequisite was removed because no example in the post used `jq`.

## Review Notes
The examples still parse the human-readable table output. Cilium also supports `cilium-dbg bgp peers -o json`, which would be a better future direction for production automation because it avoids table-format parsing.
