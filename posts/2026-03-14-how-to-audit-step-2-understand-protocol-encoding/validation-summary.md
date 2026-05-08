# Validation Summary: Auditing Protocol, Encoding, Framing and Types in Cilium

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
- jq
- Bash

## Sources Consulted
- Cilium command reference for the Kubernetes-facing `cilium` CLI: https://docs.cilium.io/en/latest/cmdref/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium command reference for `cilium-dbg` and `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg config get`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_config_get.html
- Cilium command reference for `cilium-dbg identity list` and `cilium-dbg version`: https://docs.cilium.io/en/latest/cmdref/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_version.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api.html
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Hubble exporter JSON flow example showing `drop_reason_desc`: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html
- Cilium CNP schema validation example for `toPorts.ports.protocol`: https://docs.cilium.io/en/latest/network/kubernetes/configuration.html

## Issues Found
- The policy inventory command only listed namespaced `CiliumNetworkPolicy` resources even though the text said all Cilium network policies. I changed it to include both `cnp` and `ccnp` and to show namespace or cluster scope.
- The endpoint policy coverage commands used `cilium endpoint list`, which is not part of the current Kubernetes-facing Cilium CLI, and used incorrect JSON fields such as `"l4-ingress"` and `"l4-egress"`. I changed these checks to use cluster-wide `CiliumEndpoint` CRDs and the documented `.status.policy.realized."policy-enabled"` field.
- The audit report script counted endpoints through `cilium endpoint list` and checked the incorrect `"l4-ingress"` field. I updated it to count `CiliumEndpoint` objects and use the documented policy-enabled status.
- The per-node configuration audit ran `cilium config view` inside agent pods. Current Cilium documentation separates the Kubernetes-facing `cilium config view` from agent-local `cilium-dbg`; I changed the node loop to use `cilium-dbg config get` for `enable-policy`, `enable-l7-proxy`, and `enable-hubble`.
- The verification command used `cilium policy get`, while current docs expose node-local policy inspection as `cilium-dbg policy get` and mark it deprecated. For a cluster audit summary, I changed the command to list CNP and CCNP resources with `kubectl`.
- The identity verification command used `cilium identity list`, which is an agent-local debug command in current docs. I changed it to run `cilium-dbg identity list` in a Cilium agent pod.
- The troubleshooting note recommended `cilium version` for agent version consistency. Current command references document `cilium-dbg version` for agent-local version information, so I updated the note to use `cilium status` plus `cilium-dbg version` inside agent pods.

## Review Notes
Local `cilium`, `hubble`, and `kubectl` binaries were not installed in the review environment, so command validation was performed against official Cilium and Hubble documentation rather than local `--help` output. Some examples still assume conventional Cilium labels and container names, such as `k8s-app=cilium` and `cilium-agent`, which match common Cilium deployments but may differ in customized installations.
