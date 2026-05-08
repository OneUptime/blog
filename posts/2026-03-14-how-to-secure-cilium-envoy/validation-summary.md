# Validation Summary: Securing Envoy Proxy Integration in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Envoy proxy
- Hubble
- eBPF networking
- Helm
- kubectl
- jq

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium debug endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium debug identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium debug monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/

## Issues Found
- The default-deny policy used `ingress: []`, which Cilium documents as an empty ingress section that does not apply at ingress. Changed it to `ingress: - {}` so the selected endpoints enter ingress default-deny mode without allowing ingress peers.
- Several commands used agent-local debug subcommands through the standalone `cilium` Kubernetes CLI, including `cilium policy get`, `cilium identity list`, `cilium endpoint list`, and `cilium monitor`. Updated them to either use Kubernetes CRDs (`kubectl get cnp`, `kubectl get ciliumendpoints`) or run `cilium-dbg` inside the Cilium DaemonSet.
- The cross-namespace Hubble aggregation piped pretty-printed JSON objects into `sort` and `uniq`, which would aggregate individual JSON lines instead of complete flow records. Changed the `jq` command to emit tab-separated single-line records before sorting.

## Review Notes
The HTTP L7 policy fields (`method`, `path`, and `headers`) match Cilium's documented policy schema. L7 policy traffic is correctly described as being proxied through node-local Envoy, which can add latency compared with L3/L4-only policy.
