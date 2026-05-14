# Validation Summary: How to Map ArgoCD Application to Flux Kustomization

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Argo CD Application resources
- Flux CD GitRepository resources
- Flux CD Kustomization resources
- Kubernetes manifests and namespaces
- Kustomize patches
- GitOps reconciliation

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux CLI `get kustomizations` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/

## Issues Found
- The conceptual mapping said `spec.syncPolicy.automated` maps to `Kustomization.spec.interval`. Flux's `interval` controls reconciliation cadence and drift correction; it is not a direct replacement for Argo CD's automated sync policy. Changed the mapping to "Kustomization reconciliation" and clarified the example comment.
- The public GitRepository example referenced `secretRef.name: flux-system`, which would only be valid if a same-namespace Secret with suitable Git credentials exists. Removed the `secretRef` from the public repository example and left authentication details in the dedicated private-repository section.
- The health-check section said Flux only uses standard Kubernetes readiness and availability conditions. Flux also supports kstatus-compatible custom resources and CEL health check expressions. Updated the sentence to reflect the supported mechanisms.

## Review Notes
- Flux `targetNamespace` does not auto-create namespaces; the post's guidance to include a Namespace manifest or use a separate dependency Kustomization matches the official Flux documentation.
- The Flux `healthChecks`, `timeout`, `dependsOn`, `prune`, `sourceRef`, and `path` examples match the current `kustomize.toolkit.fluxcd.io/v1` API.
- The Argo CD `CreateNamespace=true`, `ignoreDifferences`, automated sync, prune, and self-heal examples match the current Argo CD Application documentation.
