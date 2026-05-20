# Validation Summary: How to Handle ArgoCD Recovery After Cluster Failure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- etcd
- eksctl / Amazon EKS
- Google Kubernetes Engine / gcloud
- kubectl
- jq
- Bash
- Python / PyYAML

## Sources Consulted
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD 3.4 installation documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/installation/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Kubernetes `kubectl rollout restart` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes `kubectl rollout status` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- etcd disaster recovery documentation: https://etcd.io/docs/v3.6/op-guide/recovery/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- GKE versioning and support documentation: https://cloud.google.com/kubernetes-engine/versioning
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- eksctl getting started documentation: https://eksctl.io/getting-started/

## Issues Found
- The etcd restore example used `ETCDCTL_API=3 etcdctl snapshot restore`, which is deprecated in current etcd documentation. Changed it to `etcdutl snapshot restore`.
- The EKS example pinned Kubernetes `1.28`, which is no longer supported as of this review date. Updated the example to `1.35`, a currently supported EKS version.
- The GKE example did not specify a release channel. Added `--release-channel regular` so GKE selects a supported channel version instead of implying a stale fixed version.
- The Argo CD HA install example pinned `v2.13.0`, which is no longer an actively supported Argo CD release. Updated it to the current supported `v3.4.2` manifest URL and used the server-side apply flags shown in current Argo CD installation guidance.
- The readiness wait after HA installation only waited for Deployments, even though the HA manifest also includes StatefulSets. Added rollout status checks for `argocd-application-controller` and `argocd-redis-ha-server`.
- The ConfigMap restore loop applied exported ConfigMaps without removing server-managed metadata. Updated it to strip `resourceVersion`, `uid`, `creationTimestamp`, and `managedFields`, matching the existing cleanup used for Secrets, Projects, and Applications.
- The post-restore restart wait also only checked Deployments. Added rollout status checks for the HA StatefulSets there as well.

## Review Notes
The manual restore flow assumes backups were created as separate ConfigMap, Secret, Project, and Application YAML files. Argo CD's official disaster recovery documentation also supports `argocd admin export` and `argocd admin import`; using that built-in format would be simpler for environments that can adopt it.
