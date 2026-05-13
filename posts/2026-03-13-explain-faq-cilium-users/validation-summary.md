# Validation Summary: Explaining the Cilium FAQ: Common Questions and Why They Come Up

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- Hubble
- WireGuard
- DNS-based network policy with toFQDNs

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/policy/language/#dns-based
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium operations troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg fqdn cache list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium command reference for cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium WireGuard encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/

## Issues Found
- The kernel requirement stated a base requirement of 4.9.17+, which is outdated for current Cilium releases. Updated it to Linux 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel.
- The kernel feature examples included stale or unsupported examples for current documentation. Replaced them with documented advanced feature requirements for multicast and BIG TCP, and clarified WireGuard's kernel module requirement.
- Agent-side commands used `cilium` where current Cilium documentation uses `cilium-dbg` inside Cilium pods. Updated endpoint, status, FQDN cache, and monitor commands.
- The policy behavior section described selected endpoints as entering `"policy-enforcement: always"` mode. Corrected this to default-deny mode per selected direction.
- The policy troubleshooting example used `cilium policy trace`, which is not present in the current documented command reference. Replaced it with `cilium-dbg endpoint get <endpoint-id>` for inspecting realized endpoint policy.
- The `toFQDNs` example omitted the required DNS egress rule needed for Cilium to observe DNS responses and populate FQDN policy data. Added an egress rule allowing DNS to kube-dns with L7 DNS visibility.

## Review Notes
The examples are now aligned with current Cilium stable documentation. The `cilium-dbg policy get` command is still documented but marked deprecated in newer docs, so future updates should prefer Kubernetes resources and endpoint inspection where possible.
