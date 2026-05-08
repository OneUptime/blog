# Validation Summary: Securing gRPC Client-Server Access in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- gRPC over TCP
- Helm
- kubectl

## Sources Consulted
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium config command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium network policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium DNS policy examples: https://docs.cilium.io/en/latest/security/dns.html
- Cilium Hubble CLI guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- The post checked `policy-enforcement` in `cilium config view`, but Cilium documents the agent flag/config key as `enable-policy` and the Helm value as `policyEnforcementMode`. Updated the grep examples to use `enable-policy`.
- The post used `cilium policy get -o json`, but current policy management for Kubernetes CiliumNetworkPolicy resources should be done through Kubernetes resources, and direct agent policy import/listing is deprecated in Cilium documentation. Replaced this with `kubectl get cnp -A -o json`.
- The post used `cilium identity list`, which is an agent-local `cilium-dbg` command in current Cilium command references. Updated the example to execute `cilium-dbg identity list` through the Cilium DaemonSet.
- The verification section used `cilium endpoint list` to verify policy application. Replaced it with `kubectl get cnp -n production`, which directly verifies the applied CiliumNetworkPolicy resource.
- The post used `cilium monitor --type drop --output json`, but current documentation exposes this as `cilium-dbg monitor` with `--type` and `--json`. Updated the command to run `cilium-dbg monitor --type drop --json` inside the Cilium agent pod.
- The troubleshooting section used `cilium endpoint list -o json` for labels. Updated it to inspect CiliumEndpoint resources with `kubectl get cep -n production -o json`.

## Review Notes
The CiliumNetworkPolicy examples use valid `cilium.io/v2` resources and L3/L4 `toPorts` rules suitable for gRPC on TCP port 50051. The default-deny example intentionally permits DNS egress on port 53 while denying other unspecified ingress and egress for selected endpoints. The Hubble examples align with Cilium's Hubble CLI documentation, assuming Hubble Relay or an accessible Hubble API is configured.
