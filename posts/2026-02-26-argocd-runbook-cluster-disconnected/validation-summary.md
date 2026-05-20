# Validation Summary: ArgoCD Runbook: Cluster Disconnected

## Status
validated

## Post Type
Operational runbook

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes RBAC
- Kubernetes service accounts and Secrets
- Amazon EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- AWS CLI
- Google Cloud CLI
- Azure CLI

## Sources Consulted
- Argo CD Cluster Management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_get/
- Argo CD `argocd cluster rm` command reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_cluster_rm/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Declarative Setup EKS cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Security documentation for external cluster credentials and default RBAC resources: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes `kubectl logs` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl config view` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- AWS CLI `eks describe-cluster` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster.html
- Google Cloud CLI `gcloud container clusters describe` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/describe
- Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The EKS re-add example incorrectly passed an EKS cluster ARN as the `argocd cluster add` argument. Argo CD expects a kubeconfig context and provides EKS authentication through `--aws-cluster-name` and optional `--aws-role-arn`, so the command was updated accordingly.
- The service account token explanation claimed that many managed Kubernetes services rotate service account tokens. Argo CD currently stores cluster credentials in Secrets, and Kubernetes token behavior depends on whether the token is TokenRequest-based or Secret-based, so the wording was corrected to cover expired, revoked, or invalidated tokens.
- The certificate diagnostic comments said the commands checked whether the cluster certificate expired and whether the CA matched the current CA. The commands actually inspect stored client certificate and CA certificate expiration dates, so the comments were corrected.
- The RBAC recovery section used `argocd-manager-role` as the ClusterRoleBinding name. Argo CD's default external-cluster RBAC uses `argocd-manager-role-binding` for the ClusterRoleBinding and `argocd-manager-role` for the ClusterRole, so the check and manifest were corrected.

## Review Notes
The connectivity commands assume the Argo CD application controller container includes tools such as `wget`, `nc`, and `nslookup`; some images may not. In those environments, operators may need to use an ephemeral debug container or a temporary troubleshooting pod in the `argocd` namespace.
