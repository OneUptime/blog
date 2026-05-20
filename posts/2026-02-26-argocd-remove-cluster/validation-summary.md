# Validation Summary: How to Remove a Cluster from ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application and ApplicationSet resources
- Kubernetes
- kubectl
- jq

## Sources Consulted
- Argo CD command reference: `argocd app list` - https://argo-cd.readthedocs.io/en/release-3.1/user-guide/commands/argocd_app_list/
- Argo CD command reference: `argocd app set` - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Argo CD command reference: `argocd app delete` - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_delete/
- Argo CD command reference: `argocd cluster rm` - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rm/
- Argo CD declarative setup documentation for cluster Secrets - https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD ApplicationSet cluster generator documentation - https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Kubernetes service account administration documentation - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes kubectl command reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post used `argocd app list --dest-server` and `argocd app list --dest-name`, but current Argo CD CLI documentation lists `--cluster` / `-c` for filtering applications by destination cluster. Updated the pre-flight, bulk delete, and verification examples to use `argocd app list --cluster`.
- The remote cluster cleanup section described deleting a fixed `argocd-manager-token` Secret for Kubernetes 1.24+, but Kubernetes 1.24 and newer no longer auto-create service account token Secrets, and manually created long-lived token Secrets do not have a guaranteed fixed name. Updated the example to delete a manually created token Secret by its actual name, if one exists.
- The stuck application check used `kubectl get applications -n argocd | grep Deleting`, which depends on human-readable table output and may miss resources with a deletion timestamp. Updated it to query the Application objects as JSON and select items with `metadata.deletionTimestamp`.

## Review Notes
The migration example correctly shows changing an Application destination and syncing it to the new cluster. In practice, teams should separately decide how to clean up resources that were already deployed to the old cluster, because changing an Application destination does not by itself provide a complete decommissioning workflow for the old cluster's live resources.
