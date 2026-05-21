# Validation Summary: How to Add a GKE Cluster to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Google Kubernetes Engine
- Kubernetes RBAC
- Google Cloud IAM service accounts
- Workload Identity Federation for GKE
- Google Cloud CLI
- Kubernetes Secrets

## Sources Consulted
- Argo CD declarative cluster setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd-k8s-auth` GCP source: https://raw.githubusercontent.com/argoproj/argo-cd/master/cmd/argocd-k8s-auth/commands/gcp.go
- GKE authentication to Kubernetes API server documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/api-server-authentication
- GKE RBAC documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/role-based-access-control
- Workload Identity Federation for GKE documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE network isolation and private cluster documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation

## Issues Found
- The Workload Identity prerequisite incorrectly said Workload Identity must be enabled on both the ArgoCD cluster and the target GKE cluster. Updated it to say Workload Identity must be enabled on the GKE cluster running ArgoCD; the target cluster must authorize the IAM service account and be reachable.
- The Workload Identity setup only bound and annotated `argocd-application-controller`. Argo CD documentation also calls out `argocd-server` for UI-side cluster operations such as showing pod logs, so the IAM binding and Kubernetes service account annotation were added for `argocd-server`.
- The Workload Identity cluster secret used a vague `<ca-data>` placeholder. Updated it to `<base64-encoded-ca-cert>` to match Argo CD's cluster secret schema.
- The multi-cluster registration script used `zone`, which misses regional GKE clusters and no longer matches the general GKE location terminology. Updated the script to use `location` and `--location`.
- The troubleshooting section checked `/var/run/secrets/tokens/gcp-ksa`, which is not a default GKE Workload Identity token path. Replaced it with a pod-based Google Cloud SDK check using the ArgoCD service account.
- The private cluster note implied that authorized networks are always the fix. Updated it to distinguish public control plane endpoints with authorized networks from private endpoints that require private network connectivity.

## Review Notes
The static-token method remains technically valid but uses long-lived Kubernetes service account credentials. The post correctly recommends Workload Identity for production.
