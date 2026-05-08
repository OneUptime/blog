# Validation Summary: How to Use cilium-dbg bpf

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- cilium-dbg CLI
- eBPF/BPF maps
- Cilium connection tracking, policy, load balancing, auth, bandwidth, endpoint, NAT, and egress maps

## Sources Consulted
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg bpf`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf bandwidth list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_bandwidth_list.html
- Cilium command reference for `cilium-dbg bpf config list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- Cilium command reference for `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium command reference for `cilium-dbg bpf auth list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_auth_list/
- Cilium command reference for `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html

## Issues Found
- The connection tracking examples used `cilium-dbg bpf ct list global`. Current Cilium documentation lists the syntax as `cilium-dbg bpf ct list [cluster <identifier>] [flags]`, so I removed the obsolete `global` argument.
- The post described `bpf config` as per-endpoint configuration and showed filtering by endpoint ID. Current Cilium documentation describes this command as BPF runtime configuration, so I changed the description, heading, and example placeholder to runtime config terminology.
- The policy map example used `cilium-dbg bpf policy get <endpoint-id>`, but the current command reference documents `cilium-dbg bpf policy get [flags]` with `--all` for dumping all policy maps. I changed the example to `cilium-dbg bpf policy get --all`.
- The load balancer section used `cilium-dbg service list` while describing direct LB map inspection. `cilium-dbg service list` is valid for services, but the BPF map command is `cilium-dbg bpf lb list`, so I changed the examples to use `--frontends` and `--backends`.
- The post described policy maps as allowed/denied flows. Cilium's command reference describes policy BPF maps and policy entries; I changed this wording to "policy entries" to avoid implying that denied flows are stored as flow records in the policy map.

## Review Notes
The examples assume `kubectl exec` can target the `ds/cilium` resource in the cluster and that the selected Cilium pod contains `cilium-dbg`, which is typical for current Cilium agent pods. In clusters with multiple containers in the DaemonSet pod, readers may need to add `-c cilium-agent`.
