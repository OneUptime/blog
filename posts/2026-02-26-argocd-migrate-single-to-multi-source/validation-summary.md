# Validation Summary: How to Migrate Single-Source Apps to Multi-Source in ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source Applications
- Argo CD CLI
- Argo CD ApplicationSets
- Helm values files
- Kubernetes custom resources

## Sources Consulted
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD App Deletion: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD ApplicationSet controller integration: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Argo-CD-Integration/

## Issues Found
- The post said `source` and `sources` are mutually exclusive and that both cannot be present. Official Argo CD documentation says that when `sources` is specified, Argo CD ignores the singular `source` field. Updated the wording to recommend using one or the other while accurately describing precedence.
- The blue-green migration method was described as "zero-risk." Because syncing a second Application that targets the same live resources can affect Argo CD resource tracking, changed this to "lower-risk" and added a short caution about keeping the new Application on manual sync until rendered manifests are compared.
- The Helm external values verification command compared `argocd app manifests` to a local `helm template` command that assumed a local chart path and could diverge from Argo CD rendering behavior. Replaced it with an Argo CD manifest before/after comparison.
- The ApplicationSet section said generated Applications would be recreated. Official ApplicationSet documentation describes create, update, and delete behavior; a template change normally updates generated Applications. Changed "recreated" to "updated."

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI flags were checked against official Argo CD command reference documentation instead of local `--help` output.
