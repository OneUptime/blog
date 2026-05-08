# Validation Summary: Parsing Cilium BGP Route Policies Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- `cilium-dbg` CLI
- Kubernetes `kubectl`
- Bash scripting
- Python JSON parsing
- `jq`
- Prometheus text exposition format

## Sources Consulted
- Cilium command reference for `cilium-dbg bgp route-policies`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_route-policies/
- Cilium BGP Control Plane installation documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium API reference for `/bgp/route-policies`: https://docs.cilium.io/en/stable/api/
- Cilium BGP troubleshooting documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting/

## Issues Found
- The post parsed the default human-readable command output as a whitespace table. The official `cilium-dbg bgp route-policies` command supports `-o json`, so the examples were updated to collect and parse JSON for structured extraction.
- The prerequisites and troubleshooting text referenced `CiliumBGPPeeringPolicy`, which is not the current resource model in the stable Cilium BGP Control Plane documentation. Updated references to `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The generated JSON report example had invalid shell quoting around JSON keys. Replaced the `echo` line with `jq -n` so node names are escaped correctly and the output remains valid JSON.
- The counting examples used line counting on table output, which could miscount headers or empty output. Updated counts to use `jq 'length'` on the JSON output.
- The troubleshooting note for enabling BGP used the agent/config-map option name. Updated it to the documented Helm/Cilium CLI setting `bgpControlPlane.enabled=true`.

## Review Notes
The examples assume the Cilium pod contains `cilium-dbg`, which is consistent with running the command through the `cilium-agent` container. Future improvements could add error handling for failed `kubectl exec` calls before emitting metrics or JSON reports.
