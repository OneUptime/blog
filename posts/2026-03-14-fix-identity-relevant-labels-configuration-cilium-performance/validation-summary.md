# Validation Summary: Fixing Identity-Relevant Labels Configuration in Cilium Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Helm
- kubectl
- Cilium CLI and cilium-dbg
- jq
- iperf3 and netperf

## Sources Consulted
- Cilium official documentation on limiting identity-relevant labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium official documentation on identity management mode: https://docs.cilium.io/en/stable/network/kubernetes/identity-management-mode.html
- Cilium official command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium official command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium official command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium official documentation on Kubernetes policy resources: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium official documentation on using Kubernetes constructs in Cilium policy: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium official documentation examples using `kubectl exec ds/cilium -- cilium-dbg`: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free.html

## Issues Found
- The Helm examples used source-prefixed label strings such as `k8s:app` and `k8s:io.kubernetes.pod.namespace`. Cilium's identity-relevant `labels` setting is documented as a space-separated list of label-key regular expression patterns, so the examples were changed to escaped label-key patterns such as `io\\.kubernetes\\.pod\\.namespace app$`.
- The original label examples included `k8s:io.cilium.k8s.policy`, but Cilium automatically includes default policy-related label patterns such as `io.cilium.k8s.policy.cluster` and `io.cilium.k8s.policy.serviceaccount` when inclusive patterns are configured. The examples were narrowed to policy-relevant workload labels.
- The policy compatibility check only inspected namespaced `CiliumNetworkPolicy` resources. Cilium also supports cluster-scoped `CiliumClusterwideNetworkPolicy`, so a `kubectl get ccnp` check was added.
- The restart guidance only restarted Cilium agents. Cilium documentation states that when the Operator is managing identities, both the Cilium Operator and Agents must be restarted to pick up the new label pattern setting, so the operator restart and rollout status commands were added.
- The post used local-agent commands such as `cilium identity list`, `cilium monitor`, and `cilium endpoint list`. Current Cilium documentation exposes these local agent operations through `cilium-dbg`, typically run inside a Cilium pod, so those examples were changed to `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...`.

## Review Notes
- The post is technically relevant and implementation-focused.
- The `labels` Helm value appends patterns to Cilium's defaults rather than replacing the full default configuration. Operators who need an exact declarative allowlist should review Cilium's `label-prefix-file` option.
- The policy label audit command extracts `matchLabels` keys. Policies using `matchExpressions` should be reviewed as well before changing identity-relevant labels.
