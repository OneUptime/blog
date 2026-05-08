# Validation Summary: Auditing Elasticsearch Integration in Cilium

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
- Elasticsearch network ports and HTTP API paths

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint policy, label, and identity fields: https://docs.cilium.io/en/stable/api/
- Cilium command cheatsheet for JSON output and CiliumEndpoint policy paths: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Layer 7 HTTP policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium CLI configuration command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg config get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get.html
- Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble CLI inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium agent command reference for policy, L7 proxy, and Hubble flags: https://docs.cilium.io/en/stable/cmdref/cilium-agent/

## Issues Found
- The endpoint policy coverage examples used `cilium endpoint list` with JSON paths such as `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`. Current Cilium documentation exposes endpoint policy details under `realized.l4.ingress`, `realized.l4.egress`, and `policy-enabled`; CiliumEndpoint CRDs provide a cluster-wide Kubernetes API source for this data. Updated the examples to use `kubectl get cep --all-namespaces -o json` and `.status.status.policy.realized."policy-enabled"`.
- The audit report script counted covered endpoints by checking only L4 ingress policy. That misses endpoints with egress-only or non-L4 policy enforcement. Updated the coverage calculation to count endpoints where `policy-enabled` is not `none`.
- The configuration audit searched for non-current or imprecise keys such as `policy-enforcement` and `enable-l7` inside Cilium agent pods. Updated the checks to use documented config keys: `enable-policy`, `enable-l7-proxy`, and `enable-hubble`, and to use `cilium-dbg config get` for per-agent inspection.
- The verification section used `cilium policy get`, which is documented as deprecated in current `cilium-dbg` command references and is daemon-local rather than a Kubernetes-wide policy inventory. Replaced it with `kubectl get cnp --all-namespaces` and `kubectl get ccnp`.
- The endpoint identity verification example used `cilium identity list`, which is not the best cluster-wide source for endpoint identity assignments. Updated it to query CiliumEndpoint CRDs for endpoint names, identity IDs, and identity labels.

## Review Notes
The CiliumNetworkPolicy YAML example is syntactically consistent with documented Cilium v2 policy structure for L4 and HTTP L7 rules. The Hubble dropped-flow command and `.flow.drop_reason_desc` field are consistent with Hubble JSON output examples. The post remains version-sensitive because Cilium CLI behavior differs between the Kubernetes-facing `cilium` CLI and the agent-local `cilium-dbg` CLI.
