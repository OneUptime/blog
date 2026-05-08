# Validation Summary: Auditing Go Extensions in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRD
- Kubernetes
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium command reference: `cilium config view` - https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium command reference: `cilium-dbg endpoint list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference: `cilium-dbg identity list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium command reference: `cilium-dbg policy get` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium Endpoint CRD documentation - https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint policy fields - https://docs.cilium.io/en/stable/api/
- Cilium policy language documentation - https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy enforcement documentation - https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium policy creation with Hubble documentation - https://docs.cilium.io/en/latest/security/policy-creation/
- Hubble project documentation and CLI examples - https://github.com/cilium/hubble

## Issues Found
- The post said the policy inventory command listed all Cilium network policies, but it only listed namespace-scoped CiliumNetworkPolicy resources. Added a `kubectl get ccnp` command so clusterwide Cilium policies are included.
- The policy coverage commands used `cilium endpoint list` as if it were a cluster-wide Cilium CLI command. Current Cilium documentation exposes endpoint inspection as `cilium-dbg` inside agents, while the CiliumEndpoint CRD is the documented cluster-wide Kubernetes view. Updated those examples to use `kubectl get ciliumendpoints --all-namespaces -o json`.
- The endpoint policy JSON paths used non-existent `l4-ingress` and `l4-egress` keys. Cilium documents these as `status.policy.realized.l4.ingress` and `status.policy.realized.l4.egress`, with `status.policy.realized.policy-enabled` indicating whether policy is enabled. Updated coverage checks to use `policy-enabled`.
- The example described a policy as having audit annotations but did not include any annotations. Added Kubernetes metadata annotations to match the surrounding explanation.
- The generated audit report counted endpoints with `cilium endpoint list` and counted coverage from the incorrect `l4-ingress` key. Updated the report to use CiliumEndpoint CRDs and `policy-enabled`.
- The per-node configuration check ran `cilium config view` inside Cilium agent pods. Updated it to use the documented in-pod `cilium-dbg config --all` command.
- The verification command used deprecated agent-local policy inspection through `cilium policy get`. Replaced it with Kubernetes queries for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy names.
- The identity verification command used `cilium identity list`, but current documentation lists this as `cilium-dbg identity list` inside a Cilium agent pod. Updated the command accordingly.
- The troubleshooting command grepped for an `Enforcement` field in `kubectl describe cnp`, which is not a reliable documented status check. Replaced it with a JSON query of the CiliumNetworkPolicy status field.

## Review Notes
The guide remains a general Cilium policy audit guide rather than a Go-extension-specific implementation guide. The remaining commands assume a working Kubernetes context with Cilium installed and may need namespace or relay configuration adjustments in clusters that do not use the default `kube-system` Cilium namespace.
