# Validation Summary: Auditing Derived Policy Creation in Cilium

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEndpoint, CiliumNetworkPolicy, and CiliumClusterwideNetworkPolicy CRDs
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API Reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/

## Issues Found
- The post used `cilium endpoint list`, but the current Cilium CLI is for installing and managing Kubernetes clusters and does not expose that endpoint inspection command. The documented endpoint inspection command is `cilium-dbg endpoint list`, and cluster-wide Kubernetes endpoint data is available through `CiliumEndpoint` resources. I changed the examples to use `kubectl get ciliumendpoints --all-namespaces -o json`, which matches the post's cluster-wide audit goal.
- The prerequisite listed the Cilium CLI, but the corrected examples only require `kubectl` and `jq`. I updated the prerequisite accordingly.
- The policy enforcement check compared `.status.policy.spec."policy-enabled"` to a boolean `true`, but Cilium documents `policy-enabled` as a string with modes such as `none`, `ingress`, `egress`, and `both`. I changed the checks to inspect `.status.policy.realized."policy-enabled"` and compare against the documented string modes.
- The ingress enforcement check counted endpoints with no allowed ingress identities, which is not the same as checking whether ingress policy enforcement is enabled. I changed it to count endpoints whose realized policy mode is not `ingress` or `both`.
- The "allowing all identities" comment was too strong for a heuristic based on identity count. I changed it to "allowing many ingress identities" while keeping the broad-selector audit intent.
- The verification commands used `cilium endpoint list` and `cilium policy get`, which do not match the corrected Kubernetes-based workflow. I changed them to `kubectl get ciliumendpoints`, `kubectl get ciliumnetworkpolicies`, and `kubectl get ciliumclusterwidenetworkpolicies`.

## Review Notes
The audit remains heuristic: a high count of allowed identities can indicate broad selectors, but it is not proof that an endpoint allows all sources. The examples also depend on CiliumEndpoint status being available in the Kubernetes API, which is the documented way to fetch endpoint status cluster-wide.
