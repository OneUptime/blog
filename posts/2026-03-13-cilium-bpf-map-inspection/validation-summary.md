# Validation Summary: Cilium BPF Map Inspection

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- BPF maps
- Cilium debug CLI (`cilium-dbg`)

## Sources Consulted
- Cilium command reference for `cilium-dbg bpf`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf/
- Cilium command reference for `cilium-dbg map list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_map_list/
- Cilium command reference for `cilium-dbg bpf ct list` and `ct flush`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_flush/
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium command reference for `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium command reference for `cilium-dbg bpf nat list` and `bpf egress list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_nat_list/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_egress_list/
- Cilium eBPF maps and map capacity documentation: https://docs.cilium.io/en/stable/network/ebpf/maps/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post used `cilium bpf ...` commands throughout. Current in-agent BPF inspection commands are documented under `cilium-dbg`, so the command examples and prose were updated to use `cilium-dbg`.
- `cilium bpf list` is not the documented command for listing open BPF maps. It was changed to `cilium-dbg map list`.
- Load balancer flags were singular (`--frontend`, `--backend`), but the documented flags are `--frontends` and `--backends`. The examples were corrected.
- `cilium service list --all` used an unsupported `--all` flag. It was changed to `cilium-dbg service list`.
- `cilium bpf policy get ${ENDPOINT_ID}` did not match the current documented syntax for `cilium-dbg bpf policy get`. The example now gets endpoint details with `cilium-dbg endpoint get ${ENDPOINT_ID}` and dumps policy BPF maps with `cilium-dbg bpf policy get --all`.
- Conntrack flushing was shown as `ct flush global`, but the documented flush command takes no `global` argument. It was corrected to `cilium-dbg bpf ct flush`.
- The BPF map capacity config name `bpf-ct-global-max-entries` was incorrect. It was changed to the documented `bpf-ct-global-tcp-max` and `bpf-ct-global-any-max`.
- Several map names were outdated or inaccurate, including service, backend, and SNAT map examples. They were corrected to names aligned with Cilium's current eBPF maps documentation.
- The conclusion claimed this visibility is unavailable in any other CNI plugin, which was too broad to validate. It was narrowed to a Cilium-specific strength of the eBPF datapath.

## Review Notes
The command examples were verified against current Cilium stable documentation, but they were not executed locally because this workspace does not include a running Kubernetes cluster with Cilium pods.
