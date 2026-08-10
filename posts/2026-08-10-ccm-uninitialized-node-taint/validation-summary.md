# Validation Summary: Why Nodes Stay Tainted `node.cloudprovider.kubernetes.io/uninitialized` After Bootstrap

## Status

validated

## Post Type

Troubleshooting Guide / Operations Guide

## Technologies Covered

- Kubernetes v1.31 and later
- kubelet and kube-controller-manager
- External cloud-controller-manager (CCM) and cloud node controller
- Kubernetes Nodes, provider IDs, topology labels, addresses, taints, and tolerations
- kubectl, JSONPath, and jq
- Kubernetes RBAC, ServiceAccounts, impersonation, and authorization checks
- Lease-based leader election
- Cloud IAM, provider APIs, and bootstrap troubleshooting

## Sources Consulted

- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/) — external-mode component configuration, initialization taint, authorization, leader election, and deployment tolerations.
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/) — Node controller responsibilities and RBAC requirements.
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-cloudprovider-kubernetes-io-uninitialized) — exact uninitialized taint meaning and CCM removal behavior.
- [Kubernetes: The Cloud Controller Manager Chicken and Egg Problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/) — bootstrap scheduling deadlocks, leader election, and recommended tolerations.
- [Kubernetes: Removed Feature Gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/#disablecloudproviders) — v1.31-and-later `--cloud-provider` values.
- [Kubernetes: kubelet Command Reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) — `--cloud-provider`, `--provider-id`, `--node-ip`, and hostname behavior.
- [Kubernetes: kube-controller-manager Command Reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) — external cloud-provider and leader-election flags.
- [Kubernetes: kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) — resource, subresource, namespace, and impersonation syntax.
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — selector behavior and the effective `--tail` default.
- [Kubernetes: kubectl JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — list iteration and command/argument extraction.
- [Kubernetes: kubectl Quick Reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/) and [Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) — current Event sorting and deprecated Event timestamp fields.
- [Kubernetes: kubectl taint](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/) and [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) — `NoSchedule` behavior, tolerations, and taint-removal syntax.
- [Kubernetes cloud-provider v1.31 cloud node controller source](https://github.com/kubernetes/cloud-provider/blob/release-1.31/controllers/node/node_controller.go) — provider ID handling, conditional metadata, Node update, taint removal, and subsequent address-status patching.
- [Kubernetes v1.31 kubelet Node registration source](https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kubelet_node_status.go) — exact taint value and effect added in external mode.
- [Kubernetes client-go v0.31 Lease lock source](https://github.com/kubernetes/client-go/blob/v0.31.0/tools/leaderelection/resourcelock/leaselock.go) — required `get`, `create`, and `update` Lease operations.

## Issues Found

1. **Provider metadata and taint-removal sequencing was too absolute.** The post said the CCM always populated the provider ID and that failure anywhere in the metadata path kept the taint. A kubelet can supply the provider ID, legacy provider interfaces can initialize without one when that capability is not implemented, and provider labels are conditional. The shared cloud node controller also removes the taint in the main Node update before separately patching cloud-provided addresses, so an address-status patch can fail after taint removal. The introduction now describes provider-specific identity and supported labels accurately, distinguishes address reconciliation, and limits the persistent-taint claim to failures before the initialization Node update removes the taint.
2. **The displayed taint omitted its actual value.** External-mode kubelet registration uses `node.cloudprovider.kubernetes.io/uninitialized=true:NoSchedule`. The opening now shows that exact form while the rest of the post continues to refer to the taint by key where appropriate.
3. **The v1.31 component wording was imprecise.** The generic phrase “core components” could imply components that no longer expose the flag. It now names kubelet and `kube-controller-manager`, for which an empty value and `external` are the valid choices described by current documentation.
4. **The kube-controller-manager inspection could miss its flags.** Container options can be split between `.command` and `.args`, while the original JSONPath iterated only `.command` and did not reliably print primitive command entries. The expression now iterates containers and prints both arrays.
5. **The Event command sorted on a deprecated field.** `.lastTimestamp` is legacy Event data. The command now uses `.metadata.creationTimestamp`, matching the current official kubectl quick reference.
6. **The label-selected log command returned only ten lines by default.** With a selector, `kubectl logs` changes its effective tail default to 10 even when `--since` is specified. Added `--tail=-1` so the command actually examines all available logs from the requested 30-minute window.
7. **The RBAC checks tested the wrong Node operation and omitted required permissions.** `kubectl auth can-i update nodes/status` is parsed as an authorization check for a Node named `status`, not the status subresource. In addition, shared Node initialization uses `update` on Nodes, its informers need `list` and `watch`, address reconciliation patches the status subresource, and a new leader-election Lease needs `create` as well as `get` and `update`. The command block now checks those exact operations with `--subresource=status` and notes the impersonation and Lease-namespace requirements.
8. **The bootstrap-toleration wording was incomplete.** The two shown tolerations are valid, but a bootstrap Node can also carry `node.kubernetes.io/not-ready` or another blocking taint. The text now directs readers to include provider-supported tolerations for every taint reported by Pending Pod events.
9. **The success criteria treated optional metadata as universal.** Provider IDs and topology labels depend on the provider interface and provider guarantees. The lead-in now makes absence of the initialization taint universal while requiring only the metadata promised by the installed provider.

## Review Notes

- All six documentation links already present in the post returned HTTP 200 and resolved to the intended Kubernetes pages. The author link also resolved successfully.
- The Kubernetes v1.31 version claim remains correct: in-tree cloud-provider integrations were removed, and the relevant components accept no integration or an external CCM configuration.
- The current general Taints and Tolerations page contains wording that can be read as assigning taint removal to kubelet. The more specific well-known-taints reference, the official 2025 CCM article, and Kubernetes implementation source consistently show kubelet adding the taint and the CCM cloud node controller removing it; the post follows those authoritative sources.
- Provider manifests remain authoritative for labels, ServiceAccount names, Lease namespaces, scheduling placement, additional bootstrap tolerations, and cloud credentials. Older or upgraded clusters may also retain the legacy `node-role.kubernetes.io/master` control-plane taint.
- The remaining kubectl, JSONPath, jq, shell, YAML, and taint-removal examples were checked and are syntactically valid with current Kubernetes tooling.
