# Validation Summary: ArgoCD Best Practices for CI/CD Integration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes
- GitOps
- GitHub Actions
- GitLab CI
- Kustomize
- Docker
- Git

## Sources Consulted
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD local user management: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/user-management/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater migration guide: https://argocd-image-updater.readthedocs.io/en/stable/configuration/migration/
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The Argo CD Image Updater example used the older annotation-based Application configuration and the `latest` strategy name. Updated it to the current `ImageUpdater` CRD style and used `newest-build`, which is the current name for the most-recent-build strategy.
- The custom polling section said it was for pipelines that do not use the ArgoCD CLI, but the example used `argocd app get`. Changed the lead-in to accurately describe polling ArgoCD JSON output.
- The RBAC example denied `applications, update`, which would prevent the earlier `argocd app set --kustomize-image` examples from working. Updated the example to allow `update` only for the named staging and production applications while still denying delete.
- The production promotion workflow checked out a separate config repository without passing a token. Added the same config repository token used elsewhere so checkout and push can authenticate.
- The rollback command did not mention that Argo CD rollback is not available for automated-sync applications. Added a concise note that the command applies to manual-sync apps.

## Review Notes
The examples are still simplified and assume registry authentication, Git credentials, Argo CD login details, and target Application names/projects are configured for the reader's environment. Git revert remains the better GitOps rollback pattern, especially for automated-sync applications.
