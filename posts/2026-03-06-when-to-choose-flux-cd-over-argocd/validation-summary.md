# Validation Summary: When to Choose Flux CD Over ArgoCD

## Status
validated

## Post Type
Decision guide

## Technologies Covered
- Flux CD
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Flux image automation

## Sources Consulted
- Flux GitOps Toolkit components documentation: https://fluxcd.io/flux/components/
- Flux Helm Controller documentation: https://fluxcd.io/docs/components/helm/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Argo CD architecture documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD Image Updater documentation: https://argocd-image-updater.readthedocs.io/en/stable/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/

## Issues Found
- The post described Argo CD as a monolithic application-server architecture. Argo CD is better described as a centralized control plane with API server, repository server, application controller, and UI components, so the architecture wording and decision matrix were corrected.
- The post said Argo CD users lose Helm lifecycle hooks. Argo CD renders Helm charts and maps many Helm hooks to Argo CD hooks, but Helm itself does not manage the application lifecycle or native release rollbacks. The Helm comparison was updated to reflect that nuance.
- The decision matrix listed Argo CD Kustomize support as partial. Argo CD officially supports Kustomize rendering, so this was changed to "Yes" while preserving the post's Flux-focused discussion of Flux Kustomization CRDs and post-build substitution.
- The security section said Flux has no stored credentials for cluster access. That is true only for the default in-cluster reconciliation model and not for every Flux deployment pattern, especially remote-cluster configurations. The wording was narrowed.
- A comment said `targetNamespace` limits which namespaces Flux can manage. In Flux Kustomizations, `targetNamespace` sets or overrides the target namespace for namespace-scoped resources; RBAC limits come from service account permissions. The comment was corrected.
- The Flux components list omitted `image-reflector-controller`, which is part of Flux image automation alongside `image-automation-controller`. The list was corrected.

## Review Notes
The YAML snippets use current Flux v1/v2 API groups for Kustomization, HelmRelease, and image automation resources. The Flux CLI examples use documented commands and flags. The post remains a high-level decision guide; exact security posture and multi-cluster tradeoffs still depend on installation topology, exposure of Argo CD services, and RBAC configuration.
