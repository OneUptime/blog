# Validation Summary: Parsing Cilium BGP Peers Command Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- `cilium-dbg bgp peers`
- Kubernetes `kubectl`
- Bash scripting
- Python 3 JSON parsing
- Prometheus text exposition format

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP operation guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium `cilium-dbg bgp peers` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bgp_peers/
- Cilium source for `cilium-dbg bgp peers` table output: https://github.com/cilium/cilium/blob/main/pkg/bgp/api/printers.go
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The prerequisites referenced the older `CiliumBGPPeeringPolicy` resource. Updated this to `CiliumBGPClusterConfig` and `CiliumBGPPeerConfig`, which are the current BGP Control Plane resources documented by Cilium.
- The shell examples counted every non-empty output row, which over-counts peers when Cilium prints continuation rows for additional address families. Updated the examples to count only peer rows whose first column is the local ASN.
- The shell example described extracting generic first-column values. Updated it to extract unique local ASNs, matching the actual table column.
- The Python parser split the multi-word Cilium table header into incorrect keys such as `local`, `as`, `peer`, and `address`. Replaced it with parsing logic for the documented BGP peer columns and continuation rows, and added support for native JSON output from `cilium-dbg bgp peers -o json`.
- The generated JSON report had invalid shell quoting around JSON object keys. Replaced the `echo` statement with `printf` so the output is valid JSON.
- The troubleshooting section referenced `enable-bgp-control-plane: "true"` in `cilium-config`. Updated it to the documented Helm value `bgpControlPlane.enabled=true`.
- The troubleshooting section checked the old peering-policy resource. Updated it to check current Cilium BGP resources.

## Review Notes
- `cilium-dbg bgp peers` supports native JSON output via `-o json`; using that mode is preferable for production automation when available.
- The examples still assume the Cilium agent pods use the `k8s-app=cilium` label and `cilium-agent` container name, which is accurate for common Cilium installations but may need adjustment for custom deployments.
