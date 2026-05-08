# Validation Summary: Understanding L3/L4 Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- L3/L4 network policy
- HTTP-aware L7 policy
- kubectl

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps.html
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium command reference for cilium-dbg: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for cilium-dbg bpf policy get: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium command reference for cilium-dbg metrics list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Official sw_l3_l4_policy.yaml example: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/minikube/sw_l3_l4_policy.yaml

## Issues Found
- The local policy snippet's description differed from the official Cilium Star Wars L3/L4 policy. Updated it to match the official example.
- The policy apply command used the mutable `HEAD` branch URL. Updated it to the versioned Cilium 1.19.3 URL used by the current stable Cilium Star Wars documentation, making the command reproducible.
- The verification commands used `cilium` inside the Cilium agent pod. Current Cilium documentation uses `cilium-dbg` for local agent inspection inside the pod, so the endpoint, BPF policy map, and metrics commands were updated to `cilium-dbg`.
- The eBPF policy-map explanation described policy entries as keyed by a source/destination identity pair. Cilium policy maps are per-endpoint and documented in terms of allowed identity, port, and protocol entries, so the wording was corrected.

## Review Notes
The L3/L4 and L7 behavior described in the post matches the official Cilium Star Wars demo: the L3/L4 policy allows `tiefighter` traffic to `deathstar` on TCP port 80, blocks `xwing`, and still allows the Empire client to call HTTP paths that require a later L7 policy to restrict.
