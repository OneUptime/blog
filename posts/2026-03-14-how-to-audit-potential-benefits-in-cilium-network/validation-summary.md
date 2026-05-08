# Validation Summary: Auditing Potential Benefits in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy CRDs
- CiliumEndpoint CRDs
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium command reference for the Kubernetes-facing `cilium` CLI: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium `cilium-dbg config get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 3 and Layer 4 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/ and https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html

## Issues Found
- The post used `cilium endpoint list -o json`, but the documented endpoint inspection command is `cilium-dbg endpoint list`, and cluster-wide Kubernetes endpoint audit data is better retrieved from `CiliumEndpoint` CRDs. Replaced these examples with `kubectl get ciliumendpoints --all-namespaces -o json`.
- The post referenced non-existent endpoint JSON fields `status.policy.realized."l4-ingress"` and `status.policy.realized."l4-egress"`. Updated the policy coverage checks to use the documented `status.policy.realized."policy-enabled"` field.
- The generated report script counted endpoints and covered endpoints with invalid `cilium endpoint list` commands and incorrect JSON paths. Updated it to count `CiliumEndpoint` resources and use `policy-enabled`.
- The per-node configuration example executed `cilium config view` inside the Cilium agent pod. Updated it to use the in-agent `cilium-dbg config get` command for selected keys.
- The verification section used `cilium policy get` and `cilium identity list`, which are not commands in the Kubernetes-facing `cilium` CLI. Replaced the policy summary with `kubectl get cnp --all-namespaces` and the identity check with `kubectl exec ... cilium-dbg identity list`.
- The troubleshooting grep looked for `Enforcement`, which is not a reliable CiliumNetworkPolicy status field. Broadened the check to `Status|Valid|Error`.

## Review Notes
The CiliumNetworkPolicy YAML snippet uses valid `cilium.io/v2` fields and standard L3/L4 policy structure. The Hubble dropped-flow command is consistent with the documented `hubble observe --verdict DROPPED` usage and JSON output examples.
