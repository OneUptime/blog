# Validation Summary: Diagnosing Including Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium security identities
- CiliumNetworkPolicy label selectors
- Cilium CLI and cilium-dbg
- Hubble
- eBPF, bpftool, and bpftrace

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: cilium-dbg identity list command reference - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium documentation: cilium-dbg monitor command reference - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium documentation: cilium-dbg bpf ct list command reference - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium documentation: cilium-dbg bpf nat list command reference - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium documentation: Command Cheatsheet for cilium-dbg endpoint and monitor usage - https://docs.cilium.io/en/latest/cheatsheet/
- Cilium documentation: Kubernetes configuration and ConfigMap restart behavior - https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium documentation: Hubble setup and CLI access - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: CiliumNetworkPolicy endpoint selector examples - https://docs.cilium.io/en/stable/security/policy/language/
- Hubble project README: Hubble CLI compatibility and observe examples - https://github.com/cilium/hubble

## Issues Found
- The post treated an empty `labels` value as "all labels are included (no filtering)". Cilium actually has documented default exclusions, so the explanation now says that empty output means Cilium uses its default identity-relevant label behavior.
- The post described `labels` as a simple include list. Cilium uses regex label patterns, with default inclusive patterns added when custom inclusive patterns are configured. The wording and diagnostic script were updated to reflect pattern matching.
- Several examples used `cilium identity`, `cilium endpoint`, `cilium bpf`, and `cilium monitor`, but the official command reference exposes these as `cilium-dbg` agent-local commands. The examples now execute `cilium-dbg` through `kubectl -n kube-system exec ds/cilium --`.
- The BPF connection tracking example used `cilium bpf ct list global`, which is not the current documented syntax. It now uses `cilium-dbg bpf ct list`.
- The policy-label comparison used exact string comparison against the configured labels value, which is incorrect because Cilium label configuration uses regex patterns and default inclusions/exclusions. The script now checks policy label keys against inclusive and exclusive regex patterns.
- The prerequisites omitted `hubble` and `jq`, both of which are required by commands in the post. They were added.

## Review Notes
- The Hubble and BPF tracing sections are general diagnostic aids rather than label-specific checks, but the commands are plausible and technically relevant.
- Commands using `kubectl exec ds/cilium` inspect one Cilium agent pod. In a multi-node cluster, operators may need to run equivalent `cilium-dbg` commands on multiple Cilium pods for node-local state.
