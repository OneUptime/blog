# Validation Summary: How to Enable Orphaned Resource Monitoring in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- AppProject configuration
- Argo CD CLI
- Argo CD Notifications
- Prometheus metrics

## Sources Consulted
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_set/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD ApplicationTree API type documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/pkg/apis/application/v1alpha1#ApplicationTree

## Issues Found
- The orphaned resource definition was too broad. Argo CD defines orphaned resources as top-level namespaced resources that do not belong to any Argo CD Application, so the definition and scanning explanation were updated.
- The CLI enablement command only set the warning behavior. Updated it to include `--orphaned-resources` as well as `--orphaned-resources-warn`.
- The CLI and API examples used non-existent project status fields and an unsupported `argocd admin proj orphaned-resources` command. Replaced them with `argocd app resources APP --orphaned` and the application resource-tree API's `orphanedNodes` field.
- The notifications example referenced `app.status.orphanedResources`, which is not an Application status field. Updated the trigger to check for the `OrphanedResourceWarning` application condition.
- The metrics section described `argocd_app_orphaned_resources_count` as a per-project metric. Argo CD documents it as a per-application metric, so the PromQL examples now aggregate by project.
- The post implied orphaned resource monitoring can automatically delete resources. Updated the best practice wording because the feature reports and displays orphaned resources; it does not automatically delete them.
- The ignore-list examples and common-resource table implied built-in exceptions like the default ServiceAccount and `kube-root-ca.crt` ConfigMap must be ignored manually. Updated the examples and table to distinguish manual ignore rules from built-in Argo CD exceptions.

## Review Notes
Argo CD's official documentation warns that orphaned resource monitoring has performance implications when enabled on projects covering namespaces with many unmanaged resources. The post now stays technically correct, but a future content update could add that caveat if broader guidance is desired.
