# Validation Summary: Cilium Host Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Host Firewall
- Cilium Host Policies
- CiliumClusterwideNetworkPolicy
- Kubernetes networking
- Hubble
- eBPF

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/stable/security/policy/host.html
- Cilium Layer 3 policy entities documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- The introduction implied services such as kube-scheduler and etcd are universally accessible to any pod that can reach a node IP. This depends on deployment topology and bind addresses, so the claim was softened to "can leave" those services reachable when they listen on routable node addresses.
- The prerequisites only mentioned `hostFirewall.enabled=true`. Cilium's host policy documentation also discusses the `devices` Helm value, with auto-detection available when omitted, so an optional devices note was added.
- The host firewall verification command used `cilium status`, but the documented host firewall state is shown by `cilium-dbg status` inside the Cilium agent pod. The command was updated.
- The example ingress policy allowed `fromEntities: cluster` without a port restriction, which would allow pods and other cluster endpoints to reach all host ports and undermine the stated kubelet/SSH restriction. It now allows node-to-node traffic with `remote-node` and Cilium health checks with `health`.
- The validation command used the old `cilium endpoint list` form and omitted the `cilium-agent` container. It now uses `cilium-dbg endpoint list` against `ds/cilium` and checks for `reserved:host`.
- The Hubble drop example used `--type drop`; the documented Hubble filtering pattern uses `--verdict DROPPED`, so the command was updated.
- The metrics example searched for `host_policy`, which is not the documented metric naming. It now checks `cilium_host_firewall_enabled` and `cilium_host_network_policies_total`, and notes that Prometheus metrics must be enabled.
- The ICMP example used type `0`, which is Echo Reply. For allowing inbound ping diagnostics, the Cilium docs use `EchoRequest`, so the snippet was corrected.
- The architecture diagram said pod-to-node traffic was allowed, which contradicted the restrictive example. It now says pod-to-node traffic is denied unless explicitly allowed.

## Review Notes
- The guide is accurate after the fixes, but host policies can lock operators out of nodes or block control-plane dependencies. The post already recommends staging validation; a future expansion could include Cilium's documented host endpoint audit mode workflow before enforcement.
