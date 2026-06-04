# Validation Summary: How to implement Kustomize with ArgoCD for GitOps deployments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kustomize
- Argo CD Applications
- Argo CD Image Updater
- Argo CD sync waves and custom health checks
- Argo Rollouts
- External Secrets Operator
- Prometheus Operator
- GitHub Actions

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/health/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/latest/configuration/applications/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-strategies/
- Argo Rollouts specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/v0.8.11/api/externalsecret/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- actions/checkout documentation: https://github.com/actions/checkout
- actions/github-script documentation: https://github.com/actions/github-script

## Issues Found
- The Argo CD Image Updater example used legacy Application annotations and the renamed `latest` update strategy. Replaced it with the current `ImageUpdater` custom resource format, `writeBackConfig`, `writeBackTarget: kustomization`, and `updateStrategy: newest-build`.
- The pull request preview workflow created a Kustomize overlay only in the GitHub Actions runner workspace. Argo CD reads manifests from Git, so it would not find the generated overlay. Added checkout of the PR branch, write permissions, and a commit/push step before creating the Argo CD Application.
- The generated preview `kustomization.yaml` used the deprecated `bases` field. Replaced it with `resources`.
- The GitHub Actions example used older action major versions. Updated `actions/checkout` to `v6` and `actions/github-script` to `v9`.
- The Argo Rollouts example omitted `spec.selector` and matching pod template labels, which are required for a valid Rollout. Added a selector and matching `template.metadata.labels`.
- The custom Deployment health check could mark a Deployment healthy when replicas were updated but not yet available. Tightened the Lua check to require observed generation, updated replicas, and available replicas.
- The Prometheus alert for failed syncs queried the raw `argocd_app_sync_total` counter, which would remain positive after historical failures. Changed it to `increase(argocd_app_sync_total{phase="Failed"}[10m]) > 0`.

## Review Notes
The examples remain illustrative and still assume the necessary controllers, CRDs, repository credentials, Argo CD Projects, and GitHub Actions permissions are installed and configured in the target environment.
