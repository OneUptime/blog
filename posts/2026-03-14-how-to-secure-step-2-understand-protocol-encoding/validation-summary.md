# Validation Summary: Securing Protocol, Encoding, Framing and Types in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Helm
- kubectl
- jq

## Sources Consulted
- Cilium Network Policy overview and policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Kubernetes Network Policy resource formats: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Layer 4 policy reference: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium DNS policy examples using `protocol: ANY`: https://docs.cilium.io/en/stable/security/dns/
- Cilium command reference for `cilium` and `cilium-dbg`: https://docs.cilium.io/en/latest/cmdref/
- Cilium command cheatsheet for agent diagnostics: https://docs.cilium.io/en/stable/cheatsheet/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble setup and CLI access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- Several commands used the standalone `cilium` CLI for agent-local diagnostics (`endpoint list`, `policy get`, `identity list`, and `monitor`). Current Cilium documentation exposes those diagnostic commands through `cilium-dbg`, typically run inside a Cilium agent pod. Updated the examples to use `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...` where appropriate.
- The prerequisite list mentioned Hubble being enabled but did not mention the Hubble CLI even though the post uses `hubble observe`. Added the Hubble CLI/access prerequisite.
- The default-deny description overstated the scope of the sample namespaced policy. Clarified that it applies to selected production workloads and still permits explicitly allowed egress.
- The default-deny example used `ingress: []`, but Cilium documents empty ingress/egress lists as not applying in that direction. Changed it to `ingress: - {}` so the selected endpoints enter ingress default-deny mode without allowing ingress peers.
- The Helm upgrade example changed `policyEnforcementMode` without preserving existing Helm values. Added `--reuse-values` to avoid implying that unrelated settings should be reset during the upgrade.
- The cross-namespace Hubble aggregation command emitted multi-line JSON objects and then piped them through `sort | uniq`, which would sort individual lines rather than complete records. Changed the `jq` output to tab-separated rows before sorting and counting.
- The active policy listing example used `cilium policy get -o json | jq '.[].metadata.name'`, which does not match the recommended Kubernetes CRD workflow. Replaced it with `kubectl get cnp -A` and `kubectl get ccnp`.

## Review Notes
The CiliumNetworkPolicy examples use valid `cilium.io/v2` syntax, and `protocol: ANY` is accepted by Cilium `PortProtocol`. The post remains a broad hardening guide rather than a deep protocol parsing tutorial; future revisions could include an explicit L7 policy example if the intent is to demonstrate protocol-aware enforcement rather than L3/L4 segmentation.
