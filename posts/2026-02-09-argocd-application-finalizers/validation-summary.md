# Validation Summary: How to use ArgoCD Application finalizers for cleanup operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and Application finalizers
- Kubernetes finalizers and deletion propagation
- Argo CD CLI
- kubectl JSON and merge patch commands
- Argo CD sync options and resource hooks
- Kubernetes Jobs and PersistentVolumeClaims

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_app_delete/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/commands/argocd_app_list/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- The post said Argo CD Applications include the standard resources finalizer by default. Argo CD's declarative Application docs state the finalizer should be added only when cascading deletion is desired, and the declarative setup docs warn that deleting an Application without it will not delete managed resources. I changed the text to clarify that declarative Applications only have the finalizer when it is explicitly added, while `argocd app delete` adds it automatically for cascading deletion.
- The background finalizer steps said the Application object is removed after all resources are deleted. Argo CD documents background propagation as deleting resources in the background and allowing faster Application removal, so I changed the sequence to say the Application can be removed before child resources finish deleting.
- The selective cleanup example used `Prune=false` to preserve a PVC during Application deletion. Argo CD's sync options distinguish pruning from Application deletion; `Delete=false` is the documented annotation for retaining resources after the Application is deleted. I updated the annotation and explanatory text to use `Delete=false`.
- The Application example in the selective cleanup section included `PruneLast=true`, which is a valid sync option but not relevant to preserving resources during Application deletion. I removed it from that example to avoid implying it controls deletion finalizer behavior.

## Review Notes
PreDelete hooks are documented in the current Argo CD Sync Phases and Waves documentation and run only during full Application deletion, not ordinary pruning. Older Argo CD documentation only listed PostDelete hooks, so readers on older Argo CD versions should confirm their installed version supports PreDelete hooks.
