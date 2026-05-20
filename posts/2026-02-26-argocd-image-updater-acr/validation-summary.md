# Validation Summary: How to Configure ArgoCD Image Updater with ACR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Applications
- Kubernetes ConfigMaps, ServiceAccounts, and Secrets
- Azure Container Registry
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure CLI
- Azure DevOps Pipelines
- Helm and Kustomize image write-back

## Sources Consulted
- Argo CD Image Updater container registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater image configuration and update strategies: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods and Git write-back targets: https://argocd-image-updater.readthedocs.io/en/release-0.13/basics/update-methods/
- Azure CLI `az aks update --attach-acr` and `az aks check-acr`: https://learn.microsoft.com/en-us/cli/azure/aks
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Azure Container Registry authentication options and admin account guidance: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry Microsoft Entra roles: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Azure built-in role details for AcrPull and repository roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers
- AKS Microsoft Entra Workload ID overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- AKS Workload ID deployment and federated credential commands: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure Container Registry geo-replication: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication

## Issues Found
- The managed identity section incorrectly implied that AKS kubelet identity access from `--attach-acr` was enough for Argo CD Image Updater registry API calls. Updated it to use Microsoft Entra Workload ID with a user-assigned managed identity, federated service account, external credentials script, and `credentials: ext:/app/auth/auth.sh`, which matches the current Image Updater ACR guidance.
- The command block granted AcrPull to the kubelet identity while describing Image Updater permissions. Updated it to create or reuse a dedicated Image Updater managed identity and assign AcrPull to that identity.
- The application example used `argocd-image-updater.argoproj.io/myapp.semver-constraint`, which is not a supported Image Updater annotation. Moved the semver constraint into the `image-list` entry as `myapp=myacrregistry.azurecr.io/myapp:>=1.0.0`.
- The branch-tag example used the old `latest` strategy name. Updated it to `newest-build`, the current name documented by Argo CD Image Updater.
- The troubleshooting text said tag listing required more than pull access. Updated the wording to reflect AcrPull for registry RBAC mode and noted the newer RBAC plus ABAC repository permission mode, where repository-reader permissions are used for repository reads.
- The introduction described ACR as the default container registry for Azure Kubernetes teams and referred to managed identity. Updated it to the more accurate "common container registry" wording and aligned the authentication wording with Workload Identity.

## Review Notes
The post still uses legacy Application annotations rather than the newer ImageUpdater custom resource style. The annotations remain supported when ImageUpdater application references are configured to use annotations, but a future update could add a CRD-based example for newer installations.
