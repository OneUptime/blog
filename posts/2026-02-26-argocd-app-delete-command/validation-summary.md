# Validation Summary: How to Use argocd app delete Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD CLI
- Argo CD Applications
- Kubernetes garbage collection and deletion propagation
- Kubernetes finalizers
- Argo CD RBAC
- Argo CD sync options
- Bash and jq

## Sources Consulted
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD App Deletion guide: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Sync Options guide: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD RBAC Configuration guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/

## Issues Found
- The post said that basic `argocd app delete my-app` behavior depends on whether the Application already has a finalizer. Current Argo CD documentation states that `argocd app delete APPNAME` is a cascade delete by default and that the CLI adds the resources finalizer automatically for cascade deletion. Updated the explanation accordingly.
- The post showed `argocd app delete my-app --propagation-policy orphan`, but the official CLI reference only supports `foreground` and `background` for `--propagation-policy`. Updated the example and explanation to use `--cascade=false` for orphaning managed application resources.
- The critical app YAML used `argocd.argoproj.io/sync-options: "Delete=false"` as a metadata annotation on the Application. Official docs show application-level `Delete=false` under `spec.syncPolicy.syncOptions`, while the annotation form applies to individual managed resources. Updated the YAML to use `spec.syncPolicy.syncOptions`.
- The post implied that simply omitting finalizers from an Application prevents accidental cascade deletion. Since the CLI can add the cascade finalizer during `argocd app delete`, this was changed to focus on `Delete=false` for retaining resources during Application deletion.
- The post described `Delete=false` as preventing deletion during sync. Official docs describe it as "No Resource Deletion" for retaining resources during Application deletion; pruning during sync is controlled separately. Updated the wording.

## Review Notes
The remaining commands and examples align with current Argo CD documentation. The cleanup examples are intentionally broad; `kubectl get all` does not list every Kubernetes resource type, so future revisions could mention `argocd app resources` or explicit resource inventories when documenting production cleanup checks.
