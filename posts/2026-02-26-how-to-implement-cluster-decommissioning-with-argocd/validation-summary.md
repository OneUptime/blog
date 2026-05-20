# Validation Summary: How to Implement Cluster Decommissioning with ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Velero
- AWS Route 53
- Amazon EKS / eksctl
- Google Kubernetes Engine / gcloud
- Azure Kubernetes Service / Azure CLI
- jq

## Sources Consulted
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_delete/
- Argo CD `argocd cluster rm` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rm/
- Argo CD declarative cluster secret setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes `kubectl cordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Velero Backup API type: https://velero.io/docs/v1.17/api-types/backup/
- Velero Restore Reference: https://velero.io/docs/v1.17/restore-reference/
- AWS CLI Route 53 `change-resource-record-sets` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/route53/change-resource-record-sets.html
- Amazon EKS delete cluster documentation: https://docs.aws.amazon.com/eks/latest/userguide/delete-cluster.html
- Google Cloud SDK `gcloud container clusters delete` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/delete
- Azure CLI `az aks delete` reference: https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The post used `argocd app list --dest-server`, but the current `argocd app list` command filters by destination cluster with `--cluster`. Updated all examples and the automation job to use `--cluster`.
- The Route 53 canary example claimed 10% traffic to the new cluster but only upserted the new weighted record. Because Route 53 weighted routing is based on each record's weight divided by the total for matching name/type records, updated the example to upsert both old and new cluster records with 90/10 weights.
- The post used `kubectl cordon --all`, but `kubectl cordon` accepts node names or a selector, not `--all`. Replaced it with a `kubectl get nodes -o name | xargs kubectl cordon` pipeline scoped to the old cluster context.

## Review Notes
- The Velero backup and restore snippets are representative, but real stateful migrations still depend on storage provider support, CSI snapshot configuration, BackupStorageLocation/VolumeSnapshotLocation setup, and application-level consistency.
- The final `kubectl get all --all-namespaces` backup captures common built-in workload resources, but it is not a complete cluster backup for CRDs or every namespaced and cluster-scoped resource.
