# Validation Summary: How to Implement Application Cleanup Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD CLI
- Kubernetes CronJobs
- Kubernetes RBAC
- kubectl
- jq
- Kyverno DeletingPolicy

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD app deletion and cascading deletion: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD ApplicationSet pull request generator: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD ApplicationSet application pruning and deletion: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD official releases: https://github.com/argoproj/argo-cd/releases
- Kyverno cleanup policy documentation: https://kyverno.io/docs/policy-types/cleanup-policy/
- Kyverno DeletingPolicy documentation: https://kyverno.io/docs/policy-types/deleting-policy/
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The ApplicationSet section was titled and described as TTL/Git-generator cleanup, but the manifest uses the pull request generator. Updated the title and introduction to match the actual ApplicationSet generator and lifecycle.
- The Argo CD cleanup CronJob used an outdated Argo CD image and logged in as the initial admin user, which did not align with the dedicated Kubernetes RBAC shown later. Updated the example to use the current official Argo CD image, Kubernetes service account permissions, and `argocd --core` for deletion.
- The cleanup CronJob examples depended on `jq` in images where that dependency is not guaranteed. Replaced those JSON pipelines with `kubectl` Go templates so the examples work with the stated images.
- The Kyverno example used the deprecated `ClusterCleanupPolicy` API and an outdated JMESPath-style time expression. Replaced it with the stable `policies.kyverno.io/v1` `DeletingPolicy` API and CEL conditions.
- The Kyverno text claimed to delete namespaces idle for too long, but the policy checked namespace age rather than activity. Updated the wording to say namespaces older than the retention period.
- The RBAC role granted only `list` and `delete`, which was too narrow for the corrected Argo CD core-mode cleanup flow. Added `get`, `watch`, `patch`, and `update`.

## Review Notes
- The finalizer, ApplicationSet pull request generator fields, automated pruning options, `PrunePropagationPolicy`, and `PruneLast` examples match the official Argo CD documentation.
- The monitoring command still uses `jq`, which is appropriate for a local operator command where `jq` is an explicit command-line dependency.
