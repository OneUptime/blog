# Validation Summary: Auditing DaemonSet Deployment in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Hubble
- jq
- Bash

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro.html
- Cilium API reference for endpoint policy fields: https://docs.cilium.io/en/stable/api.html
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg config get: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_config_get.html
- Cilium command reference for cilium-dbg identity list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium command reference for cilium-dbg policy get deprecation: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Hubble exporter documentation with dropped flow JSON examples: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html

## Issues Found
- The post used `cilium endpoint list` for cluster-wide endpoint inventory. Current Cilium documentation recommends using the `CiliumEndpoint` CRD through `kubectl get cep` for cluster-wide Kubernetes endpoint data, while `cilium-dbg endpoint list` is agent-local. Updated the endpoint audit commands and report script to use `kubectl get cep --all-namespaces -o json`.
- The endpoint policy jq paths used non-existent flattened keys such as `l4-ingress` and `l4-egress`. Cilium's endpoint policy status exposes `policy-enabled` and nested `l4.ingress`/`l4.egress` fields. Updated the examples to use `status.policy.realized."policy-enabled"` for coverage checks.
- The endpoint examples used `.id`, but CiliumEndpoint CRD output stores the Cilium endpoint ID under `.status.id`. Updated the jq output accordingly.
- The per-node configuration audit executed `cilium config view` inside Cilium agent pods. Current agent-local introspection is done with `cilium-dbg`, so the snippet now uses `cilium-dbg config get` for `enable-policy`, `enable-l7-proxy`, and `enable-hubble`.
- The example policy claimed to include audit annotations but did not define any annotations. Added minimal audit annotations to make the YAML match the surrounding explanation.
- The verification section used `cilium policy get`, while current Kubernetes-distributed policies should be inventoried through the Cilium policy CRDs. Updated the command to list `cnp` and `ccnp` resources with `kubectl`.
- The identity verification command used `cilium identity list`, which is agent-local as `cilium-dbg identity list` in current docs. For cluster-wide audit output, replaced it with a `kubectl get cep` command that prints namespace, endpoint name, and identity ID.
- The troubleshooting command searched for an `Enforcement` string in `kubectl describe cnp -A`, which is not a reliable documented status check. Updated it to direct readers to inspect CNP and CCNP descriptions.

## Review Notes
- The CiliumClusterwideNetworkPolicy example with `nodeSelector` is a host policy pattern. Host policies require host firewall support to be enabled in Cilium before they enforce host traffic.
- `cilium-dbg policy get` still exists but is documented as deprecated, so the post now avoids recommending it for the audit summary.
