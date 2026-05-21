# Validation Summary: How to Add an AKS Cluster to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Azure Kubernetes Service (AKS)
- Kubernetes RBAC and service accounts
- Microsoft Entra ID authentication
- Azure managed identities
- Azure CLI
- kubelogin
- Sealed Secrets

## Sources Consulted
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Azure CLI `az aks` command reference: https://learn.microsoft.com/en-us/cli/azure/aks
- AKS kubelogin authentication documentation: https://learn.microsoft.com/en-us/azure/aks/kubelogin-authentication
- Azure kubelogin installation documentation: https://azure.github.io/kubelogin/install.html
- Microsoft kubelogin Linux installation example: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/azure-rbac
- Kubernetes service account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- AKS Microsoft Entra ID with Kubernetes RBAC documentation: https://learn.microsoft.com/en-us/azure/aks/kubernetes-rbac-entra-id
- AKS managed identity overview: https://learn.microsoft.com/en-us/azure/aks/managed-identity-overview
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The first method was titled "Local Account with Static Token", but `az aks get-credentials --admin` retrieves an admin kubeconfig, not a static bearer token. Changed the heading to "Local Account with Admin Kubeconfig".
- The service account method described a long-lived token as recommended for simplicity without noting the security tradeoff. Updated the heading and explanation to clarify that this is a simple static credential and that non-static authentication is preferred for production where possible.
- The custom Argo CD image used an outdated `quay.io/argoproj/argocd:v2.10.0` base image. Updated it to `v3.4.1`, which is current as of the validation date.
- The kubelogin Dockerfile unzipped the release directly into `/usr/local/bin`, but the Linux release archive places the binary under `bin/linux_amd64/kubelogin`. Updated the Dockerfile to install required packages, move the binary to `/usr/local/bin/kubelogin`, and make it executable.
- The managed identity example used only the kubelet identity object ID and configured `kubelogin --login msi` without specifying the managed identity client ID. Updated the Azure CLI example to capture both client ID and object ID, and added `--client-id` to the kubelogin exec provider configuration for a user-assigned managed identity.
- The summary implied service account tokens were a good quick setup without emphasizing they are static credentials. Adjusted the wording to "simple setups" while keeping the production recommendation on managed identity.

## Review Notes
The examples remain broad and intentionally permissive for a tutorial. In a production implementation, the `argocd-manager-role` should usually be reduced from cluster-wide `*` permissions to the minimum resources and namespaces Argo CD needs to manage.
