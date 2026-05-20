# Validation Summary: How to Deploy HPA Configuration with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments
- Kubernetes Horizontal Pod Autoscaler
- Kustomize
- Prometheus Adapter
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md

## Issues Found
- The Argo CD `ignoreDifferences` example omitted `RespectIgnoreDifferences=true`. Official Argo CD docs state that `ignoreDifferences` is used for diffing by default and is not respected during sync unless this sync option is enabled. Added `syncPolicy.syncOptions: - RespectIgnoreDifferences=true` and clarified the explanation.
- The managed-fields example implied it only ignores HPA replica changes. In practice, `managedFieldsManagers: kube-controller-manager` ignores fields owned by that manager, which is broader than `/spec/replicas`. Updated the text to call out the broader scope.
- The health-check section implied Argo CD requires a custom HPA health check. Argo CD has a built-in health check for `autoscaling/HorizontalPodAutoscaler`, so the wording now frames the snippet as an optional override.
- The Lua health-check snippet used `string.format`, but Argo CD disables standard Lua libraries by default unless explicitly enabled. Replaced it with string concatenation to avoid depending on the `string` library.

## Review Notes
- The Kubernetes HPA examples use the current stable `autoscaling/v2` API and valid fields for resource, pod, and external metrics.
- Kubernetes documentation recommends omitting Deployment `.spec.replicas` when an HPA manages the Deployment, which matches the primary guidance in the post.
- Argo CD documentation notes that HPA controllers may reorder `spec.metrics`, which can cause diffs in some cases. The post does not cover that edge case, but it does not make an incorrect claim about it.
