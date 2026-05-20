# Validation Summary: How to Handle Database Changes with ArgoCD GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource hooks, sync phases, sync waves, and automated sync
- Kubernetes Jobs, Deployments, and init containers
- GitOps workflows
- Database schema migrations and rollback strategy
- GitHub Actions CI workflow snippets
- SQL schema changes
- Django-style migration commands

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Cluster Bootstrapping and App of Apps Pattern: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Fixed the named PreSync hook examples to use `HookSucceeded,BeforeHookCreation`. Argo CD documentation states named hooks are created only once unless `BeforeHookCreation` or `generateName` is used, so the original `HookSucceeded`-only example could block reruns after a failed named Job.
- Clarified the hook delete policy explanation and failure-debugging command comments so failed Jobs are described as retained until the next hook creation, not permanently rerunnable with only `HookSucceeded`.
- Added the required Kubernetes Deployment `.spec.selector` and matching `.spec.template.metadata.labels` to the init-container example. Kubernetes `apps/v1` Deployments require an explicit selector matching template labels.
- Replaced an inaccurate "Use advisory lock" comment in the init-container snippet. The command shown did not acquire an advisory lock, so the text now says to use this only with migration tooling that safely handles concurrent starts.
- Updated the separate migration Application pattern to state that sync waves order child Application resources when they are synced by a parent app-of-apps Application. Standalone Argo CD Applications do not get ordered merely by annotating each Application independently.
- Added `spec.project: default` and `targetRevision: HEAD` to the Argo CD Application examples to align with official Application manifest examples and make the snippets complete.
- Adjusted the `selfHeal: false` comment to describe live-state drift behavior rather than claiming it alone guarantees migrations run only once.

## Review Notes
Local `kubectl`, `argocd`, and `kustomize` binaries were not installed in the review environment, so command and manifest validation was performed against official documentation instead of local CLI help output. The SQL examples are intentionally generic and valid for common relational databases, but production migrations should account for engine-specific locking and online DDL behavior.
