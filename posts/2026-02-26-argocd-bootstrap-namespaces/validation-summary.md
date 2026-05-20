# Validation Summary: How to Bootstrap Namespaces with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Kubernetes Namespaces
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes Pod Security Admission
- Kustomize
- GitOps

## Sources Consulted
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Argo CD Directory Applications documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/

## Issues Found
- The post stated that `prune: false` makes namespace deletion manual and intentional. This is only true for automated pruning; manual sync pruning and Application deletion need separate protections. Updated the text to recommend Argo CD's `Prune=confirm` or `Delete=confirm` sync options for namespace resources.
- The ApplicationSet section implied that adding only a JSON config file would create a namespace, but the example ApplicationSet points to `namespaces/overlays/{{team.name}}`, so a matching overlay must also exist. Updated the text to say teams add both the config file and overlay, and that the ApplicationSet creates the Argo CD Application automatically.

## Review Notes
The Kubernetes manifests use current stable API versions for Namespace, ResourceQuota, and LimitRange. The Argo CD Application and ApplicationSet examples use the current `argoproj.io/v1alpha1` API group. The examples are structurally valid, assuming the referenced Argo CD project, repository, and per-team Kustomize overlays exist.
