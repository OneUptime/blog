# Validation Summary: How to Troubleshoot Argo CD show resources permanently out-of-sync

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Cilium
- Kubernetes
- Helm
- eBPF

## Sources Consulted
- Cilium documentation: Troubleshooting Cilium deployed with Argo CD - https://docs.cilium.io/en/latest/configuration/argocd-issues.html
- Argo CD documentation: Resource Exclusion/Inclusion - https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD documentation: Compare Options and IgnoreExtraneous - https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD upgrade notes: default Cilium resource exclusions in Argo CD 3.0 - https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.14-3.0/
- Cilium CLI command reference: `cilium status`, `cilium connectivity test`, and `cilium sysdump` - https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium agent CLI command reference: `cilium-dbg` commands - https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium troubleshooting guide: `cilium-dbg status`, `cilium-health status`, and tunnel checks - https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Helm values reference - https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The post described Argo CD resources being permanently out of sync but did not include the required Argo CD `resource.exclusions` configuration. Added a focused `argocd-cm` example for `CiliumIdentity`, `CiliumEndpoint`, and `CiliumEndpointSlice`, plus the controller restart needed to clear cached excluded resources from the Application view.
- Several commands used agent-local Cilium commands as top-level `cilium` CLI commands, such as `cilium identity list`, `cilium metrics list`, `cilium bpf tunnel list`, `cilium bpf lb list`, and `cilium endpoint list`. Updated these to run through `kubectl exec -n kube-system ds/cilium -- cilium-dbg ...`.
- Replaced `cilium health status` with `kubectl exec -n kube-system ds/cilium -- cilium-health status --verbose`, matching the Cilium health client documented for agent pods.
- Updated the Cilium operator selector from `name=cilium-operator` to the current `io.cilium/app=operator` selector used by Cilium tooling.
- Replaced the outdated Helm value `labels.exclude` with the documented `labels` value for identity-relevant label patterns.
- Replaced `cilium policy get` examples with Kubernetes policy resource checks using `kubectl get cnp,ccnp -A`, because `cilium-dbg policy get` is deprecated in current command references.
- Removed a fixed Linux kernel version claim and changed it to a version-specific requirement note, since Cilium kernel requirements vary by Cilium version and enabled features.

## Review Notes
Argo CD 3.0 and later includes default exclusions for several high-churn Cilium resources, but older installations or installations with overridden defaults may still need the explicit `resource.exclusions` configuration shown in the post. The remaining Cilium operational commands are general troubleshooting steps and may require appropriate RBAC, installed CRDs, and a Cilium deployment layout matching the default `kube-system` namespace and `cilium` DaemonSet name.
