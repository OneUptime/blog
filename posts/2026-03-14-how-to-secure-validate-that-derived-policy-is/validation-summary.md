# Validation Summary: Securing Derived Policy Validation in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Cilium CLI / cilium-dbg
- Hubble
- jq
- Bash

## Sources Consulted
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg policy selectors`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_selectors.html
- Cilium command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium command reference for `cilium-dbg policy get` deprecation: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium command reference for `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium policy enforcement documentation: https://docs.cilium.io/en/latest/security/network/policyenforcement/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/

## Issues Found
- The post used `cilium endpoint list` and `cilium endpoint get` as standalone Cilium CLI commands. Current Cilium documentation exposes endpoint inspection through the agent-side `cilium-dbg` CLI, so I changed those examples to run `cilium-dbg` inside Cilium agent pods with `kubectl exec`.
- The post claimed `.status.policy.realized.cidr-policy` showed which policies were applied to an endpoint. That path does not show policy source objects, and the useful validation target is the endpoint's realized policy state. I changed the example to inspect `.status.policy.realized`.
- The validation script queried only one local endpoint list and assumed policy identity arrays always exist. I changed it to iterate over Cilium agent pods and use null-safe jq expressions for allowed ingress and egress identities.
- The post used `cilium policy trace`, which is no longer present in the current Cilium command reference. I replaced the trace section with current selector and identity inspection commands and directed readers to compare that output with Hubble verdicts.
- The verification section used `cilium policy get`, which is documented as deprecated under `cilium-dbg policy get`. I replaced it with `kubectl get ciliumendpoints --all-namespaces` and `cilium-dbg bpf policy get --all` for endpoint and datapath policy-map inspection.

## Review Notes
The corrected examples validate Cilium's realized endpoint policy state and datapath policy maps, but they still require operators to compare the observed identities, selectors, ports, and Hubble verdicts against their intended access model. The commands assume the default `kube-system` namespace and `k8s-app=cilium` DaemonSet label.
