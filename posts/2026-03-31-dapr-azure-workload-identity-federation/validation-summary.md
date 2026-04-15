# Validation Summary: How to Use Dapr with Azure Workload Identity Federation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Azure Kubernetes Service (AKS)
- Azure Workload Identity Federation
- Azure Managed Identity (user-assigned)
- Azure Key Vault (secret store)
- Azure Service Bus (pub/sub)
- Kubernetes Service Accounts, Deployments
- Azure CLI (`az`)
- kubectl

## Sources Consulted
- Azure CLI reference for `az identity federated-credential create` — https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Entra Workload ID federation setup — https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust-user-assigned-managed-identity
- AKS Workload Identity deployment guide — https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Dapr Azure Key Vault secret store component reference — https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Azure Service Bus Topics pub/sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Azure authentication overview — https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/
- Kubernetes Deployment spec (apps/v1) — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Sibling blog post `2026-01-30-azure-aks-workload-identity` and `2026-03-31-dapr-workload-identity-aks` in this repo for cross-reference

## Issues Found
1. **Incorrect Azure CLI flag `--audience` (singular)**: The `az identity federated-credential create` command used `--audience` but the correct Azure CLI parameter is `--audiences` (plural). Fixed to `--audiences "api://AzureADTokenExchange"`.

2. **Deployment YAML missing required `spec.selector` field**: The Kubernetes Deployment (apps/v1) was missing the mandatory `spec.selector.matchLabels` field and a corresponding app label on the pod template. Without this, `kubectl apply` would reject the manifest with a validation error. Added `spec.selector.matchLabels.app: my-dapr-app` and the matching `app: my-dapr-app` label to the pod template metadata.

## Review Notes
- The `azureClientId` metadata field in the Dapr component definitions is technically optional when using workload identity — the identity is inferred from the service account annotation `azure.workload.identity/client-id` and injected via the mutating webhook. However, including it explicitly is not incorrect and can be useful in multi-identity scenarios. The sibling post (`dapr-workload-identity-aks`) omits it. This is a stylistic choice, not an error.
- The post refers to "Azure Active Directory" which Microsoft rebranded to "Microsoft Entra ID" in July 2023. The old name remains widely recognized but may become confusing as Microsoft phases it out of documentation.
- The Dapr Secrets API endpoint `http://localhost:3500/v1.0/secrets/secretstore/my-secret` in the verification section is correct for Dapr's HTTP API.
- All Azure RBAC role names ("Key Vault Secrets User", "Azure Service Bus Data Owner") are valid built-in roles.
- The OIDC issuer URL query path `oidcIssuerProfile.issuerUrl` is correct for the AKS resource model.
