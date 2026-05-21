# Validation Summary: How to Add a Self-Managed Kubernetes Cluster to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes RBAC
- Kubernetes ServiceAccounts and service account token Secrets
- kubeadm
- k3s
- RKE2
- MicroK8s
- GitOps cluster registration

## Sources Consulted
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccount concepts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Secret documentation for service account token Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- k3s cluster access documentation: https://docs.k3s.io/cluster-access
- RKE2 CLI tools documentation: https://docs.rke2.io/reference/cli_tools
- MicroK8s services and ports documentation: https://canonical.com/microk8s/docs/ports
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_get/

## Issues Found
- The post said to use `argocd cluster add ... --insecure` for remote clusters with self-signed certificates. The Argo CD command reference lists `--insecure` as an inherited client option for skipping verification of the Argo CD API server connection, not the remote Kubernetes API server. I replaced that command with guidance to keep the remote cluster CA in kubeconfig, and clarified what `--insecure` actually affects.
- The post described service account tokens only as long-lived tokens. Current Kubernetes supports short-lived TokenRequest tokens as well as manually created long-lived token Secrets, so I updated the wording to cover both.
- The credential extraction examples assumed the kubeconfig context name and cluster name were identical. That is common but not guaranteed by kubeconfig. I added `CLUSTER_NAME` extraction from the context and used it when reading the cluster CA and server URL.

## Review Notes
- The manually created service account token Secret approach is technically valid for external clients such as Argo CD, but Kubernetes documentation recommends considering the security implications of non-expiring tokens and using shorter-lived mechanisms where practical.
- The restricted RBAC example is a starting point. Real least-privilege policies should be generated from the actual resource kinds Argo CD is expected to manage, especially if applications include CRDs or cluster-scoped resources.
