# Validation Summary: Explaining the Cilium Star Wars Demo: How It Works

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- Cilium security identities
- Cilium BPF policy maps

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium Operator identity allocation documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium eBPF datapath introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/
- Cilium component overview and debug CLI documentation: https://docs.cilium.io/en/stable/overview/component-overview/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html

## Issues Found
- The post said Cilium embeds security identity in packets using Kubernetes "security context". Kubernetes security context is not how Cilium identity works. I changed this to describe Cilium's identity store, `CiliumIdentity` CRDs, kvstore mode, ipcache, and optional VXLAN/Geneve metadata.
- The post used `cilium` for agent debug commands. Current Cilium documentation identifies `cilium-dbg` as the debug CLI installed with the Cilium agent, so I updated the endpoint, identity, and BPF policy map commands to use `cilium-dbg`.
- The post described `cilium bpf policy get --all` as inspecting loaded eBPF programs. That command dumps policy BPF maps, not programs, so I corrected the comment.
- The post used deprecated `cilium policy get` as the example for viewing a specific endpoint policy map. I replaced it with `cilium-dbg bpf policy get <endpoint-id>`.
- The comparison table said L7 awareness is "not possible" for IP-based rules. That was too broad, so I narrowed it to Kubernetes NetworkPolicy, where L7 policy is not part of the standard API.

## Review Notes
- The `CiliumNetworkPolicy` YAML matches the official Star Wars demo L3/L4 policy structure.
- The post is intentionally high level and does not pin a Cilium version. The review used current stable Cilium documentation available on 2026-05-13.
