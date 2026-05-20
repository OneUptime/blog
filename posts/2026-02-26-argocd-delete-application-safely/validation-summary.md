# Validation Summary: How to Delete an ArgoCD Application Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- Kubernetes custom resources and finalizers
- GitOps app-of-apps workflows
- Argo CD RBAC

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Cluster Bootstrapping / app-of-apps documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/

## Issues Found
- The UI deletion steps listed only Foreground and Non-cascade deletion. Current Argo CD documentation describes three UI propagation options: Foreground, Background, and Non-Cascading. Updated the UI step to include Background cascade deletion.
- The declarative Git deletion section said resource cascade deletion depends on the parent application's prune setting. Pruning controls whether the parent removes the child Application resource; deletion of the child application's managed resources depends on the child Application's Argo CD resources finalizer. Updated the explanation accordingly.
- The scenario for removing Argo CD management said to clean up tracking labels/annotations but only removed labels. Added an annotation cleanup command for `argocd.argoproj.io/tracking-id`.

## Review Notes
The main CLI commands and flags match current Argo CD documentation, including `argocd app delete --cascade`, `--cascade=false`, `--propagation-policy`, `-y`, `argocd app resources`, `argocd app get --output tree`, and `argocd app list -p ... -o name`. The local environment did not have `argocd` or `kubectl` installed, so command verification was performed against official command references rather than local `--help` output.
