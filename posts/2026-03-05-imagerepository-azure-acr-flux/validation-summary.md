# Validation Summary: How to Configure ImageRepository for Azure ACR in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux ImageRepository API
- Kubernetes ServiceAccounts, Secrets, and Deployments
- Azure Container Registry
- Azure Kubernetes Service
- Azure Workload Identity
- Azure CLI

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Microsoft Learn, Deploy and configure Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn, Use Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn, Azure Container Registry authentication options: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn, Azure Container Registry authentication with service principals: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Microsoft Learn, az identity federated-credential CLI reference: https://learn.microsoft.com/cli/azure/identity/federated-credential
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The Workload Identity setup did not mention that AKS must have OIDC issuer and Workload Identity enabled. Added the official `az aks update --enable-oidc-issuer --enable-workload-identity` command for an existing AKS cluster.
- The Workload Identity Kubernetes snippet only annotated and labeled the ServiceAccount. Flux and AKS documentation require the workload identity label on the controller pod template as well, so the snippet was changed to a Flux bootstrap Kustomization patch covering both the ServiceAccount and Deployment.
- The service principal section created a Docker registry Secret but did not show how to use it from an ImageRepository. Added the matching `secretRef` example.
- The AKS attach-to-ACR section stated that Flux uses its own identity and needs separate configuration. Flux documentation says the Azure provider can use the kubelet managed identity when it has ACR access, so the wording was corrected to say that `provider: azure` is still required for that path.

## Review Notes
The examples use the current Flux `image.toolkit.fluxcd.io/v1` ImageRepository API and valid Azure CLI / kubectl command forms. The post could be improved later by noting Flux's object-level workload identity option with `spec.serviceAccountName`, but that is not required for the controller-level configuration shown here.
