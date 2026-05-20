# Validation Summary: How to Deploy Network Policies Across Clusters with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes NetworkPolicy
- Kubernetes Jobs
- kubectl server-side dry-run
- Kustomize repository layout
- netpol-analyzer
- Prometheus metrics
- Calico
- Cilium and Hubble

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD app rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- np-guard netpol-analyzer README: https://github.com/np-guard/netpol-analyzer
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Calico recommended Prometheus metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics

## Issues Found
- Clarified that Kubernetes NetworkPolicy enforcement depends on a network plugin that supports NetworkPolicy. Kubernetes accepts the API object, but enforcement is provided by the networking implementation.
- Fixed the PreSync validation Job. The original Job referenced `/policies/*.yaml` without mounting or fetching any policy files, so it would not validate the repository content. The example now fetches the policy repository into an `emptyDir` before running server-side dry-run validation.
- Updated the named PreSync hook delete policy to include `HookFailed` and `BeforeHookCreation`, so failed or previous hook Jobs do not block later sync attempts.
- Fixed the netpol-analyzer example. The original `go install github.com/np-guard/netpol-analyzer/cmd/npa@latest` path and `npa` command did not match the current upstream CLI documentation. The example now follows the documented build flow and uses `./bin/netpol-analyzer list --output txt`.
- Fixed the Calico metric name from `calico_denied_packets_total` to `calico_denied_packets`, matching Calico documentation.
- Replaced inaccurate Cilium metric examples with documented Cilium datapath and Hubble drop metrics.

## Review Notes
The NetworkPolicy manifests use valid `networking.k8s.io/v1` fields and current namespace label selectors. ApplicationSet cluster generator, matrix generator, cluster labels, hook annotations, automated sync, and rollback command syntax are consistent with Argo CD documentation.
