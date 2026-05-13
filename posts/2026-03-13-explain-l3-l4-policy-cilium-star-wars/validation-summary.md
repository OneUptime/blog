# Validation Summary: Explaining the L3/L4 Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical explainer / guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- L3/L4 network policy
- Cilium Star Wars demo

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium eBPF datapath introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium network policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium command reference for `cilium-dbg bpf policy list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_list/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `policymap` package documentation: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/maps/policymap

## Issues Found
- The post used `cilium` agent-side commands, but current Cilium stable command documentation uses `cilium-dbg` inside the Cilium agent pod for identity, endpoint, BPF policy, and monitor inspection. Updated the commands to use `cilium-dbg`.
- The post used `cilium policy trace`, which is not present in the current stable `cilium-dbg policy` command reference. Removed that outdated trace command and kept real-time policy verdict monitoring with `cilium-dbg monitor --type policy-verdict`.
- The policy map was described as keyed only by security identity and shown as `src_identity + dst_port`. Updated the explanation and diagram to reflect Cilium's endpoint policy map keys more accurately: identity, port, protocol, and traffic direction.
- The L3/L4 enforcement explanation said the eBPF program only evaluates a 5-tuple. Updated this to distinguish policy decisions based on identities and L4 attributes from connection tracking state for flow tuples.
- The post implied `PUT /v1/exhaust-port` and `POST /v1/request-landing` are carried in the same TCP stream. Updated this to say they are allowed by the same L3/L4 rule, which is the relevant Cilium policy behavior.
- The post described a "single eBPF lookup" as determining whether a new TCP connection is allowed. Changed this to "an eBPF lookup" to avoid overstating the exact datapath path across policy, service, and connection tracking lookups.

## Review Notes
The corrected post is technically aligned with current Cilium stable documentation. In future revisions, the examples could mention that Cilium command availability can vary by image/version and that Hubble is often the preferred higher-level tool for observing policy verdicts.
