# Validation Summary: Explaining the CiliumNetworkPolicy in the Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF policy maps
- Envoy-based L7 proxying
- Cilium Star Wars demo

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `bpf policy list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_list/
- Cilium `monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium Envoy admin listeners command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/stable/network/ebpf/maps.html

## Issues Found
- The command examples used `cilium` inside the Cilium agent pod. Current Cilium documentation uses `cilium-dbg` for interacting with the local Cilium agent from inside the pod, so the examples were updated accordingly.
- The policy inspection example used `cilium policy get`, and the current `cilium-dbg policy get` equivalent is documented as deprecated. It was replaced with `kubectl describe cnp rule1`.
- The BPF policy map example used `cilium bpf policy get $DS_EP_ID`, but the current documented command for dumping policy maps is `cilium-dbg bpf policy list` or `cilium-dbg bpf policy get --all`. The example was changed to `cilium-dbg bpf policy list`.
- The proxy inspection example used `cilium bpf proxy list`, which is not in the current documented command reference. It was replaced with `cilium-dbg envoy admin listeners`, which is the documented way to inspect Envoy listeners.
- The runtime tracing example used `cilium policy trace` with flags that are not present in the current `cilium-dbg` command reference. It was replaced with a supported `cilium-dbg endpoint get` command that inspects the realized endpoint policy.

## Review Notes
The conceptual explanation is broadly accurate: Cilium derives security identities from labels, stores endpoint policy in per-endpoint BPF policy maps keyed by identity plus port/protocol, and redirects L7 HTTP policy traffic through node-local Envoy.
