# Validation Summary: How to Handle GitOps Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitOps
- Kubernetes
- Argo CD Applications and ApplicationSets
- Argo CD sync waves and hooks
- Flux image automation
- kubectl
- kubesec
- Conftest
- Git

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_rollback/
- Flux Image Update Automation API: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubesec usage documentation: https://github.com/controlplaneio/kubesec
- Conftest options documentation: https://www.conftest.dev/options/

## Issues Found
- The Flux image policy marker was shown on a separate comment line before the `image` field. Flux documents the marker as an inline setter comment on the field being updated, so the example was changed to `image: registry.example.com/myapp:1.2.3 # {"$imagepolicy": "flux-system:myapp"}`.
- The image-update Deployment snippet omitted the required Deployment selector and matching pod template labels. These were added so the example is a valid Kubernetes Deployment fragment rather than an invalid manifest.
- The database migration Job was annotated as an Argo CD `PreSync` hook while the text and wave comments described it running after the Namespace and ConfigMap. Argo CD orders by phase before wave, so a `PreSync` hook would run before normal Sync-phase resources. The hook was changed to `Sync` so wave 1 correctly runs after wave -1 and wave 0 and before the wave 2 Deployment.

## Review Notes
- The examples are intentionally generic and assume placeholder repository URLs, image names, cluster contexts, and paths are replaced with real values.
- `kubectl apply --dry-run=server` requires access to a Kubernetes API server with the relevant CRDs installed for custom resources.
