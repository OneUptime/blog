# Validation Summary: Cilium Policy Troubleshooting

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes NetworkPolicy and CiliumNetworkPolicy
- Cilium eBPF policy enforcement
- Cilium Envoy/L7 policy enforcement

## Sources Consulted
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium deny policies: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_get/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg envoy admin listeners` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Layer 7 visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium/Hubble flow API drop reason reference: https://docs.cilium.io/en/stable/_api/v1/flow/README/#dropreason

## Issues Found
- The introduction described policies as stored directly as compiled eBPF programs. This was corrected to say the agent resolves policy and enforces it using eBPF programs and policy maps keyed to endpoint identities.
- The post used `cilium endpoint`, `cilium identity`, and `cilium monitor` for commands that current Cilium documentation exposes as in-agent `cilium-dbg` commands. These command examples were updated to `cilium-dbg`.
- The endpoint policy JSON path used `.status.policy.realized.ingress`, which does not match the documented endpoint output. It was changed to `.status.policy.realized.l4.ingress`.
- The policy revision example used `cilium policy get --revision`, but the documented `cilium-dbg policy get` command does not support a `--revision` flag. It was changed to inspect the `Revision:` line from `cilium-dbg policy get`.
- The drop reason comments implied that `policy-denied` only means an explicit block. This was corrected to cover both no matching allow rule and matching deny rule cases.
- The `auth-required` explanation was narrowed from generic mTLS failure to Cilium mutual authentication being required.
- The L7 troubleshooting commands assumed only standalone `cilium-envoy` pods and used `cilium proxy list`. The post now notes that Envoy runs inside the Cilium agent by default, keeps the standalone DaemonSet check as conditional, and uses `cilium-dbg envoy admin listeners` to inspect Envoy listeners.
- `kubectl describe ciliumnetworkpolicy allow-frontend` omitted the namespace while the surrounding examples use the `production` namespace. The command now includes `-n production`.
- Agent log examples now specify `-c cilium-agent`, which avoids ambiguity in multi-container Cilium pods.

## Review Notes
The Hubble filtering examples are broadly consistent with Cilium's documented observability workflows. `cilium-dbg policy get` is still used by the official policy troubleshooting documentation, though the command reference marks policy node information as deprecated, so future Cilium releases may prefer CRD-based endpoint and policy inspection.
