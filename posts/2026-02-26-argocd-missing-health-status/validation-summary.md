# Validation Summary: How to Handle 'Missing' Health Status in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Helm
- Kustomize
- jq

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD AppProject specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The "RBAC Restrictions" section stated that AppProject kind restrictions will show the resource as "Missing". This was too absolute; AppProject restrictions can cause sync failures or leave resources absent. Updated the wording to avoid claiming a guaranteed `Missing` status.
- The Helm/Kustomize conditional resources section implied a resource not rendered by the template engine can be marked "Missing". Argo CD tracks rendered manifests, so a non-rendered resource is not part of desired state. Updated the section to clarify this.
- The scale-checking command used `argocd app resources "$app" -o json`, but current Argo CD command docs list only `tree` and `tree=detailed` output for `argocd app resources`. Replaced it with `argocd app get "$app" -o json` and inspected `.status.resources[]?`.
- The sync hooks note said hooks are deleted after sync unconditionally. Argo CD hook cleanup depends on hook delete policy, with `BeforeHookCreation` as the default behavior. Updated the text to mention `HookSucceeded` as the case where hooks may be removed after sync.

## Review Notes
The post is technically relevant and broadly accurate after the targeted corrections. The Ingress example correctly points readers away from `extensions/v1beta1` to `networking.k8s.io/v1`; future improvements could include showing the required `networking.k8s.io/v1` Ingress field changes such as `pathType` and the nested `service` backend format.
