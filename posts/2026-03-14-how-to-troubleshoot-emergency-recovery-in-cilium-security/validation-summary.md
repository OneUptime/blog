# Validation Summary: Troubleshooting Emergency Recovery in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Hubble
- eBPF/BPF policy and endpoint maps
- kubectl
- jq

## Sources Consulted
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 entities documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium `cilium-dbg endpoint log` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_log/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg bpf endpoint list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_endpoint_list/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- Several examples used `cilium endpoint`, `cilium identity`, and `cilium bpf` commands for agent-local diagnostics. Current Cilium documentation exposes these as `cilium-dbg` commands, typically run inside a Cilium agent pod. Updated those examples to use `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg ...`.
- The verification step used `cilium endpoint health` without an endpoint ID. The documented command requires an endpoint ID, so the verification now lists endpoints first and then checks `cilium-dbg endpoint health <ENDPOINT_ID>` for remaining problematic endpoints.
- The troubleshooting section recommended `cilium endpoint regenerate all`, but current `cilium-dbg endpoint` command reference does not expose a regenerate subcommand. Replaced it with endpoint inspection and affected pod recreation to force a fresh endpoint allocation.
- The prerequisites mentioned only CiliumNetworkPolicy resources. The post includes a CiliumClusterwideNetworkPolicy example, so the prerequisite now covers both resource types.

## Review Notes
- The emergency allow-all CiliumClusterwideNetworkPolicy uses `endpointSelector: {}` with `fromEntities: all` and `toEntities: all`, which matches Cilium policy semantics for selecting all Cilium-managed endpoints and allowing all known communication. This is appropriate only as a temporary recovery policy.
- Hubble examples use valid filtering/output patterns, but operational behavior depends on Hubble or Hubble Relay being enabled and reachable.
