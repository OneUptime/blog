# Validation Summary: How to Import ArgoCD Applications During Recovery

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD REST API
- Kubernetes
- kubectl
- Bash
- jq
- Python YAML/JSON conversion

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Swagger definition for `POST /api/v1/applications`: https://github.com/argoproj/argo-cd/blob/master/assets/swagger.json
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD ApplicationSet documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/

## Issues Found
- The full-restore command used stdin redirection without passing `-` as the required `SOURCE` argument to `argocd admin import`. Changed it to `argocd admin import - -n argocd < argocd-backup.yaml`, matching the official command syntax.
- The version mismatch example included a no-op `sed` command that replaced `argoproj.io/v1alpha1` with the same value. Replaced it with commands that check backup API versions and verify the installed Argo CD API resources.
- The repository error validation `jq` selected applications with `ComparisonError` but printed `.status.conditions[0].message`, which could report the wrong condition. Updated it to print the matched condition's message.
- The sync and health distribution checks could print raw `null` for newly imported applications without populated status. Updated them to report `Unknown` instead.

## Review Notes
The Argo CD REST API example is consistent with the current Swagger definition: `POST /api/v1/applications` accepts an Application body and `upsert` as a query parameter. Server-side apply and `--force-conflicts` usage is consistent with Kubernetes Server-Side Apply documentation, but should be used intentionally because it takes ownership of conflicting fields.
