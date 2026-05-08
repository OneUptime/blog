# Validation Summary: Auditing Clean-Up Procedures in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Hubble CLI
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint policy fields: https://docs.cilium.io/en/stable/api/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg config`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium command reference for `cilium-dbg policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble flow API documentation for `drop_reason_desc`: https://docs.cilium.io/en/stable/_api/v1/flow/README/

## Issues Found
- The policy coverage examples used `cilium endpoint list` as a cluster-wide user CLI command and referenced non-existent flattened fields such as `.status.policy.realized."l4-ingress"`. I changed these examples to query `kubectl get ciliumendpoints --all-namespaces -o json` and use the documented `.status.policy.realized."policy-enabled"` field.
- The endpoint label extraction used `.status.labels.id`, which is not the documented CiliumEndpoint shape. I changed the examples to report `.status.identity.id` and `.status.identity.labels`.
- The per-node configuration check executed `cilium config view` inside Cilium agent pods. Current Cilium command references expose node-local agent inspection through `cilium-dbg`, so I changed the in-pod command to `cilium-dbg config --all`.
- The audit report script counted endpoints through `cilium endpoint list` and only counted ingress L4 rules as coverage. I changed it to count CiliumEndpoint objects and treat endpoints with `policy-enabled != "none"` as covered.
- The verification section used `cilium policy get`, which is tied to direct agent policy state and documented as deprecated in current Cilium docs. I changed the policy summary to list Kubernetes CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy resources with `kubectl`.
- The identity verification example used `cilium identity list` as a user-facing cluster command. I changed it to list identity assignments from CiliumEndpoint CRDs, which is more appropriate for cluster-wide Kubernetes auditing.

## Review Notes
The Hubble dropped-flow command and `drop_reason_desc` field are consistent with current Hubble documentation. The sample CiliumNetworkPolicy uses the current `cilium.io/v2` API and valid `endpointSelector`, `fromEndpoints`, and `toPorts` fields. The guide is technically valid after the command and JSON path corrections above.
