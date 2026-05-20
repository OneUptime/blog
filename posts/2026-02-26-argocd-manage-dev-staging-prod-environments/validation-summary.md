# Validation Summary: How to Manage dev/staging/prod Environments with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects and sync windows
- Argo CD RBAC
- Argo CD CLI
- Argo CD Prometheus metrics
- Kubernetes
- Kustomize
- Prometheus / PromQL

## Sources Consulted
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet templates and templatePatch: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD AppProject specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The ApplicationSet example defined `autoSync` values but did not use them, so production would still receive `syncPolicy.automated`. Updated the example to use `goTemplate: true` with `templatePatch`, which is the documented way to conditionally set non-string fields such as automated sync policy.
- The sync policy table listed production as `Auto-Sync: No` and `Self-Heal: Yes`. In Argo CD, `selfHeal` is part of automated sync behavior, so this was corrected to `Self-Heal: No`.
- The AppProject sync window example omitted the Argo CD namespace and allowed source repositories. Added `metadata.namespace: argocd` and `sourceRepos` so the example is a complete project snippet for the shown application.
- The weekend deny sync window was scheduled on both Saturday and Sunday with a 48-hour duration, which would extend the deny period beyond the weekend. Changed it to start once on Saturday for 48 hours.
- The environment parity output was fenced as JSON even though it included shell-style section headers. Changed the fence to `text`.
- The Prometheus query examples used an unnecessary join and grouped sync failures by `dest_namespace`, which is not a documented Argo CD metric label. Updated them to derive `environment` from the application name with `label_replace` and group failures by that derived label.

## Review Notes
The general guidance on separate Applications per environment, Kustomize overlays, RBAC object format, sync windows, and `argocd app get -o json` is consistent with the official documentation. Application labels as Prometheus metrics are disabled by default in Argo CD and require the `--metrics-application-labels` controller flag if teams want to expose custom labels directly.
