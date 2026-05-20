# Validation Summary: How to Configure GKE Workload Identity for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts
- Kubernetes ServiceAccounts and RBAC
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: GKE access control: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/access-control
- Google Cloud: Authorize actions in clusters using RBAC: https://cloud.google.com/kubernetes-engine/docs/how-to/role-based-access-control
- Google Cloud SDK: gcloud container clusters describe: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/describe
- Google Cloud SDK: gcloud container clusters list: https://cloud.google.com/sdk/gcloud/reference/container/clusters/list
- Argo CD: Declarative Setup, cluster secrets and GKE argocd-k8s-auth example: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/

## Issues Found
- The GKE commands used `--zone` throughout. This is still accepted for zonal clusters, but the current Google Cloud documentation uses `--location` because it works for both regional and zonal control planes. Updated the cluster, node pool, describe, and troubleshooting examples to use `--location`.
- The multi-cluster registration script queried the `zone` field and wrote a `zone` label. GKE cluster listing uses location semantics for both regional and zonal clusters, so the script now queries `location` and writes a `location` label.
- The text described binding `argocd-server` for UI-triggered syncs. Argo CD documentation calls out `argocd-server` for UI features such as showing pod logs, while synchronization is handled by the application controller. Updated the comment.
- Verification and troubleshooting commands used `kubectl exec ... deploy/argocd-application-controller`, but the Argo CD application controller is installed as a StatefulSet in the standard manifests. Updated those commands to target `statefulset/argocd-application-controller`.
- The troubleshooting note implied the metadata endpoint might show the default Compute Engine service account. With this IAM service account impersonation setup, the email endpoint should show the annotated Google Cloud service account, so the comment was corrected.

## Review Notes
The Argo CD cluster Secret format and `argocd-k8s-auth gcp` exec provider configuration match the official Argo CD documentation. The RBAC examples are syntactically valid, but real production deployments should tailor the ClusterRole to the exact Kubernetes resources Argo CD is expected to manage.
