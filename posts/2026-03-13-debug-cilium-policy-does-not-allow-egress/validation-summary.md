# Validation Summary: How to Debug Why a Cilium Policy Does Not Allow Expected Egress Traffic

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Cilium
- Kubernetes NetworkPolicy and CiliumNetworkPolicy
- Hubble CLI
- cilium-dbg CLI
- eBPF policy enforcement

## Sources Consulted
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium layer 3 policy examples: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium `cilium-dbg policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Hubble repository CLI examples: https://github.com/cilium/hubble

## Issues Found
- The introduction said Cilium becomes default-deny whenever any policy applies to an endpoint. Updated this to clarify that default-deny is per direction and depends on a selecting policy with an ingress or egress section.
- The post claimed Hubble shows exactly which policy rule caused a drop. Hubble can show policy-denied drops, but a denied packet is usually the absence of a matching allow rule rather than a specific deny-causing rule. Reworded this claim.
- The Step 3 `cilium-dbg policy get --resolve --from-label --to-cidr --dport` command used unsupported documented flags. Replaced it with the documented troubleshooting pattern: read egress `derived-from-rules` from `cilium-dbg endpoint get`, then pass those labels to `cilium-dbg policy get`.
- The temporary allow-all egress YAML was only a partial manifest and used `egress: - {}`. Replaced it with a complete `CiliumNetworkPolicy` using `toEntities: all`, which is the documented Cilium form for allowing all entity destinations.
- The text referenced a specific `drop_reason` field without using JSON output. Reworded it to the generic drop reason so it matches both compact and structured Hubble output.

## Review Notes
The Hubble `observe --namespace`, `--from-label`, and `--verdict DROPPED` usage is consistent with Hubble CLI examples and documented filtering behavior. The `cilium-dbg policy get` command is marked deprecated in current Cilium command references, but Cilium's own troubleshooting documentation still uses it for mapping endpoint `derived-from-rules` labels back to source policy definitions.
