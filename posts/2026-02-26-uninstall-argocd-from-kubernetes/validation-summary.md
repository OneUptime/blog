# Validation Summary: How to Uninstall ArgoCD Cleanly from Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- Kubernetes finalizers
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Getting Started / install manifest documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD ApplicationSet deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_add/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Helm `helm uninstall` reference: https://helm.sh/docs/helm/helm_uninstall/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The post used `argocd app delete --all --yes`, but the current Argo CD command reference does not document an `--all` flag for `argocd app delete`. I changed this to `argocd app list -o name | while read app; do argocd app delete "$app" --yes --wait; done`, using the documented `app list -o name`, `app delete APPNAME`, `--yes`, and `--wait` options.
- The complete uninstall script's `--delete-apps` mode claimed to delete managed resources by deleting Applications with finalizers, but it did not ensure the Argo CD resource finalizer was present. I added a documented merge patch that sets `resources-finalizer.argocd.argoproj.io` before deleting Applications in that mode.

## Review Notes
- The Argo CD stable install manifest currently includes the three CRDs listed in the post: `applications.argoproj.io`, `applicationsets.argoproj.io`, and `appprojects.argoproj.io`.
- `helm uninstall argocd -n argocd`, `kubectl delete ... --timeout`, `kubectl api-resources --verbs=list --namespaced -o name`, and the namespace finalizer cleanup approach are consistent with the referenced CLI documentation and Kubernetes finalizer behavior.
- The force-removal of namespace finalizers is technically valid but operationally risky; the post already presents it as a stuck-namespace recovery step rather than the normal path.
