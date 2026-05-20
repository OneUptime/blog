# Validation Summary: ArgoCD Best Practices for Application Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD sync policies and sync options
- Argo CD sync waves
- Argo CD resource health checks with Lua
- Kubernetes manifests and server-side dry runs
- Kustomize
- Argo Rollouts

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo Rollouts FAQ, Argo CD integration: https://argo-rollouts.readthedocs.io/en/latest/FAQ/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply

## Issues Found
- The Application examples showed only `spec.source.path`, which could imply that the snippets were complete manifests. Added a note that common required fields such as `project`, `source.repoURL`, `targetRevision`, and `destination` are omitted for brevity.
- The naming convention YAML example repeated the `metadata.name` key three times to show alternatives. Reworked the alternatives into comments so the YAML snippet no longer contains duplicate keys.
- The Argo Rollouts example said "Custom health check for Rollout" and "ArgoCD understands Rollout health status natively." Updated the comment to state that Argo CD includes a Lua health check for Rollout resources, matching the Argo Rollouts documentation.

## Review Notes
The Argo CD sync options, sync wave annotation, `ignoreDifferences` structure, Lua health check shape, and CLI commands reviewed are current in the official documentation. The examples remain intentionally abbreviated and should be combined with a complete Application spec before use.
