# Validation Summary: How to Use Command Cheatsheet for Cilium

## Status
validated

## Post Type
Reference

## Technologies Covered
- Cilium
- Cilium CLI
- cilium-dbg
- cilium-bugtool
- Kubernetes
- kubectl
- eBPF maps
- Cilium BGP Control Plane
- Cilium FQDN/DNS policy cache

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium `cilium-dbg map list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_map_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg service list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list/
- Cilium `cilium-dbg fqdn cache list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium `cilium-dbg bgp peers` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_peers/
- Cilium `cilium-dbg bgp routes` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_routes/
- Cilium `cilium-bugtool` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-bugtool/

## Issues Found
- The architecture diagram implied that the general `cilium` CLI talks directly to Hubble Relay and the Cilium Operator for the shown workflow. Updated it to show the local CLI using the Kubernetes API to inspect Cilium pods and operator state.
- `cilium-dbg endpoint health` was missing its required endpoint ID argument. Added `<id>`.
- `cilium-dbg policy get` is deprecated and does not show compiled endpoint policy as described. Replaced it with `cilium-dbg bpf policy get --all` for policy BPF map inspection.
- `cilium-dbg policy trace --src-label ... --dst-label ...` is not a current documented command. Replaced it with `cilium-dbg monitor --type policy-verdict` to watch real policy verdict events.
- `cilium-dbg bpf config list` lists runtime config entries, not BPF maps. Replaced it with `cilium-dbg map list`.
- The FQDN lookup example used a local shell pipe where Cilium provides a documented `--matchpattern` flag. Replaced the pipe with `cilium-dbg fqdn cache list --matchpattern api.example.com`.
- `cilium-dbg bgp routes advertised` was incomplete because the command requires AFI and SAFI arguments. Added `ipv4 unicast`.
- `cilium-bugtool --archivetype=tgz` used the wrong flag spelling and unsupported archive type. Replaced it with the documented `--archiveType=gz`.

## Review Notes
The examples use `kubectl exec ... ds/cilium`, which depends on Kubernetes support for executing against a workload resource and selecting a backing pod. For node-specific troubleshooting, using the exact Cilium pod name for the target node remains clearer.
