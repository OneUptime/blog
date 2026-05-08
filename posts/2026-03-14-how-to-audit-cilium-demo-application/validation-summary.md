# Validation Summary: Auditing Demo Application in Cilium

## Status
validated

## Post Type
Tutorial / Guide

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
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium config view command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg policy get command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes.html
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The policy coverage commands used `cilium endpoint list` and JSON paths such as `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`. Current Cilium API fields use `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`, and cluster-wide endpoint inventory is better retrieved through the `CiliumEndpoint` CRD. Updated the examples to use `kubectl get ciliumendpoints --all-namespaces -o json` and the documented `.status.policy.realized."policy-enabled"` field.
- The configuration consistency example ran `cilium config view` inside Cilium agent pods. The Kubernetes-facing `cilium config view` command is valid from the management CLI, while agent-local inspection is exposed through `cilium-dbg`. Updated the per-pod example to use `cilium-dbg status --verbose`.
- The audit report script used `cilium endpoint list` for cluster-wide endpoint totals and coverage. Updated it to use `kubectl get ciliumendpoints --all-namespaces -o json` so it works across the cluster through Kubernetes APIs.
- The `TOTAL_CCNP` fallback could produce an empty value when `kubectl get ccnp` failed because the pipeline did not reliably trigger the `|| echo 0` fallback. Replaced it with a JSON fallback object before piping into `jq`.
- The verification section used `cilium policy get`, which is documented as deprecated under `cilium-dbg policy get` and is not the preferred way to inventory Kubernetes policy resources. Replaced it with `kubectl get cnp` and `kubectl get ccnp`.
- The endpoint identity verification command used `cilium identity list`, which is agent-local in current Cilium command references. Replaced it with a cluster-wide `CiliumEndpoint` query showing endpoint identity IDs and labels.
- The troubleshooting command suggested grepping `kubectl describe cnp -A` for "Enforcement", which is not a reliable CiliumNetworkPolicy status check. Replaced it with a JSON query of `.status.conditions`.

## Review Notes
- The CiliumNetworkPolicy YAML example is syntactically consistent with the documented Cilium policy model for `endpointSelector`, `fromEndpoints`, `toEndpoints`, and `toPorts`.
- The Hubble `observe --verdict DROPPED` usage is consistent with official Hubble CLI examples. The `--last` and `-o json` flags should be verified against the installed Hubble CLI version in a target environment if this post is used with older client binaries.
