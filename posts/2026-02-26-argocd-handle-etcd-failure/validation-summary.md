# Validation Summary: How to Handle ArgoCD After etcd Failure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- etcd
- Redis
- kubectl
- jq

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_admin_export/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD `argocd app terminate-op` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_app_terminate-op/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes etcd operations documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The stuck sync example removed `/operation` from an Application with `kubectl patch`, but the official and supported command is `argocd app terminate-op APPNAME`. Updated the loop to use `argocd app terminate-op`.
- The snapshot restore explanation implied deployed Kubernetes objects could remain newer than the restored etcd state. Clarified that Kubernetes resource objects revert to the snapshot state, while running workloads or external resources changed after the snapshot may still need reconciliation.
- The auto-sync explanation was too broad. Updated it to note that live drift requires `selfHeal: true` and automatic deletion of resources no longer in Git requires `prune: true`.
- The missing applications example used `kubectl apply -f` against a raw GitHub directory URL, which is not a valid Kubernetes manifest URL. Replaced it with a local Git checkout followed by `kubectl apply -f argocd-config/applications/`.
- The Argo CD import command omitted the required `SOURCE` argument. Updated it to `argocd admin import - --namespace argocd < argocd-export-backup.yaml`.
- The diagram label "Deployed Resources" was imprecise because etcd stores Kubernetes API resource objects, not the running workload process state itself. Updated the label to "Kubernetes Resource Objects".

## Review Notes
The guide is generally accurate for standard Argo CD installations. Some commands assume the default `argocd` namespace, default component names, a non-HA Redis deployment, and an authenticated Argo CD CLI session; those are reasonable examples but may need adaptation for Helm or HA installs.
