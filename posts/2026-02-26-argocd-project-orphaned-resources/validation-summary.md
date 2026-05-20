# Validation Summary: How to Configure Project Orphaned Resources Monitoring in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- AppProject and Application custom resources
- Argo CD CLI
- Argo CD Notifications
- Prometheus metrics

## Sources Consulted
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD FAQ, "How to view orphaned resources?": https://argo-cd.readthedocs.io/en/stable/faq/
- Argo CD CLI reference for `argocd app resources`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD CLI reference for `argocd proj get`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/
- Argo CD CLI reference for `argocd app list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD API/controller source for orphaned resource conditions and `orphanedNodes`: https://github.com/argoproj/argo-cd
- Expr language definition for notification trigger predicates: https://expr-lang.org/docs/v1.15/language-definition

## Issues Found
- The post defined orphaned resources as resources in any project destination namespace that were not created by Argo CD. Updated this to match Argo CD's definition: top-level namespaced resources in an application target namespace that do not belong to any Argo CD Application.
- The detection logic implied broad "system resources" are excluded. Updated it to the documented built-in exclusions and project/ignore-rule checks.
- The UI section described project-page warnings and namespace counts. Updated it to match Argo CD's application sync panel condition and "Show Orphaned" application details view.
- The CLI/Kubernetes API examples referenced `status.orphanedResources`, which is not an Application or AppProject status field. Replaced them with `argocd app resources APP --orphaned` and a query for `OrphanedResourceWarning` application conditions.
- The Argo CD Notifications example used the nonexistent `app.status.orphanedResources` field. Replaced it with an Expr predicate over `app.status.conditions` for `OrphanedResourceWarning`.
- The Prometheus example used a nonexistent `orphaned_resources` label on `argocd_app_info`. Replaced it with the documented `argocd_app_orphaned_resources_count` metric.
- The development example said `orphanedResources: {}` disables monitoring. Corrected it to say orphaned resource monitoring is disabled by omitting `orphanedResources`; a non-null setting enables monitoring, with `warn` controlling warning conditions.

## Review Notes
The ignore-rule examples are syntactically valid. Some exclusions, such as legacy service account token Secrets, may be unnecessary on newer Kubernetes clusters where those Secrets are no longer automatically created, but they remain valid ignore patterns for clusters that still have them.
