# Validation Summary: Auditing Setup Configuration in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Kubernetes
- Hubble CLI
- kubectl
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api.html
- Cilium Kubernetes policy examples: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium layer 4 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer4.html
- Cilium CLI configuration command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- cilium-dbg command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium-dbg/
- cilium-dbg config get command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_config_get/
- cilium-dbg policy get command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble CLI observe help from the official v1.19.3 release binary.

## Issues Found
- The policy inventory claimed to inventory all Cilium policies but only listed namespaced CiliumNetworkPolicy resources. Added CiliumClusterwideNetworkPolicy inventory with `kubectl get ccnp`.
- The endpoint coverage commands used `cilium endpoint list`, which is agent-local rather than a cluster-wide Kubernetes inventory. Replaced those checks with `kubectl get ciliumendpoints --all-namespaces`, matching the CiliumEndpoint CRD documentation for cluster-wide endpoint status.
- The endpoint policy JSON paths used non-existent `l4-ingress` and `l4-egress` fields. Replaced them with the documented `status.policy.realized."policy-enabled"` field for coverage checks.
- The node configuration loop ran `cilium config view` inside Cilium agent pods. Replaced it with `cilium-dbg config get` for agent-local configuration keys and corrected `enable-l7` to the documented `enable-l7-proxy`.
- The sample policy was described as having audit annotations but did not include annotations. Added example Kubernetes annotations under metadata.
- The audit report script counted endpoints from agent-local CLI output and counted only ingress L4 policy as covered. Replaced endpoint counting with CiliumEndpoint CRDs and counted endpoints whose realized policy enforcement is not `none`.
- The `TOTAL_CCNP` fallback could leave an empty value when `kubectl get ccnp` produced no JSON. Added a shell default of `0`.
- The verification section used `cilium policy get`, which is now documented as `cilium-dbg policy get` and deprecated for node policy information. Replaced the summary with Kubernetes CRD inventory commands.
- The identity verification command used local Cilium identity output. Replaced it with CiliumEndpoint identity status, which directly shows endpoint identity assignments across namespaces.

## Review Notes
The remaining examples are valid for a Cilium-on-Kubernetes environment with the relevant CRDs and Hubble access configured. The Hubble `observe --verdict DROPPED --last 100 -o json` flags were verified against the official Hubble v1.19.3 CLI help.
