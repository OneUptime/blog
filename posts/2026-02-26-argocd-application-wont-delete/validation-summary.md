# Validation Summary: How to Handle ArgoCD Application That Won't Delete

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Kubernetes finalizers
- Kubernetes admission webhooks
- jq

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Persistent Volumes documentation, Storage Object in Use Protection: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes API reference for ValidatingWebhookConfiguration: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- The post described three Argo CD deletion behaviors, but Argo CD documents cascade and non-cascade deletion as the two behaviors. Updated the wording to describe cascade and non-cascade deletion behaviors.
- The kubectl deletion example was labeled as "cascade control" but only ran `kubectl delete application my-app`. Argo CD's kubectl workflow requires setting or removing the Application finalizer to control cascading behavior. Updated the example to explicitly remove finalizers before a non-cascade kubectl delete.
- The child-resource finalizer discovery command used `kubectl get all`, which does not cover every namespaced resource and would miss the PVC example discussed in the text. Replaced it with an `api-resources` based loop that checks all listable namespaced resource types.
- The Application finalizer YAML showed `resources-finalizer.argocd.argoproj.io/foreground`, but Argo CD documents the default finalizer as foreground behavior and the explicit variant as `resources-finalizer.argocd.argoproj.io/background`. Updated the comment and finalizer value.

## Review Notes
The remaining commands and explanations align with the official Argo CD and Kubernetes documentation. Removing finalizers is operationally risky because it can orphan resources, and the post correctly frames it as a quick fix when cleanup is not required or cannot complete.
