# Validation Summary: How to Handle Server-Side Apply Conflicts in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes Server-Side Apply
- Kubernetes managedFields and field managers
- kubectl apply
- Argo CD sync options, ignoreDifferences, and notifications
- Horizontal Pod Autoscaler and admission webhooks

## Sources Consulted
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/triggers/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/

## Issues Found
- The post claimed SSA could be enabled globally with `application.sync.options: ServerSideApply=true` in `argocd-cm`. I could not verify this as a documented Argo CD setting, so I replaced it with the documented resource-level `argocd.argoproj.io/sync-options: ServerSideApply=true` annotation.
- The post said `argocd app sync my-app --force` should be used to force SSA conflict ownership. Current Argo CD documentation says `ServerSideApply=true` uses `kubectl apply --server-side --force-conflicts`, while `argocd app sync --force` is not documented as the Kubernetes SSA `--force-conflicts` override. I changed the guidance to use `argocd app sync my-app --server-side` for ad hoc SSA syncs and `kubectl apply --server-side --force-conflicts` for direct kubectl conflict forcing.
- The post stated that force-applying replicas means an HPA can no longer change them. Kubernetes updates can still change managed fields, so I changed this to describe the more accurate field ownership fight with the HPA.
- The post used an undocumented `server.side.apply.field.manager` ConfigMap key. I replaced it with the documented `argocd.argoproj.io/client-side-apply-migration-manager` annotation and clarified that it customizes the client-side apply migration manager.
- The notification trigger used `app.status.operationState.phase` without optional chaining. Current Argo CD notification docs recommend `app.status?.operationState.phase` because `operationState` can be absent, so I updated the trigger expression.

## Review Notes
Local `kubectl` and `argocd` binaries were not installed in the workspace, so CLI flags were verified against official command reference documentation instead of local `--help` output.
