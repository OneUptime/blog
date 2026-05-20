# Validation Summary: How to Implement the Namespace-per-Environment Pattern

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects
- GitOps
- Kubernetes Namespaces
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kustomize overlays and image overrides
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes-sigs Kustomize README and kubectl integration notes: https://github.com/kubernetes-sigs/kustomize

## Issues Found
- The namespace setup text said the examples used labels and annotations, but the manifests only set labels. Changed the sentence to say "labels" only.
- The ApplicationSet example templated `spec.syncPolicy.automated.prune` as a quoted string. Argo CD's Application spec expects `prune` to be a boolean, and Argo CD ApplicationSet documentation notes that ordinary templating is only available on string fields. Updated the example to enable `goTemplate` and use `templatePatch` so `prune` renders as a boolean.
- The ApplicationSet example included `autoSync` values in the list generator but never used them. Removed the unused values while preserving automated sync behavior in the template.
- The monitoring command `argocd app list -l env=production` filters by Application labels, but the example Applications did not define those labels. Added `env` labels to the manual Application examples and the ApplicationSet template metadata.
- The cross-namespace NetworkPolicy example used separate `namespaceSelector` and `podSelector` peer entries, which means "pods in the staging namespace OR backend pods in the data namespace." Changed the selectors into a single peer entry so the rule means "backend pods in namespaces labeled staging."

## Review Notes
- The Kubernetes and Argo CD API versions used in the examples are current and appropriate for the resources shown.
- `kubectl`, `argocd`, and `kustomize` were not installed in the local workspace, so CLI syntax was checked against official command documentation rather than local `--help` output.
