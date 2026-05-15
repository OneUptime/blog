# Validation Summary: How to Encrypt Secrets with SOPS and Azure Key Vault for Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD Kustomization decryption
- SOPS
- Azure Key Vault
- Azure CLI
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Kubernetes Secrets

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Microsoft Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- SOPS Azure Key Vault documentation: https://github.com/getsops/sops
- Microsoft Learn AKS Workload Identity deployment documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn Azure CLI Key Vault documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault

## Issues Found
- Azure Key Vault creation did not specify the access policy authorization model, but the tutorial later uses `az keyvault set-policy`. Current Azure CLI documentation shows new vaults default to RBAC authorization, where access policies are ignored. Updated the `az keyvault create` command to include `--enable-rbac-authorization false` so the later `set-policy` commands work as written.

## Review Notes
- Flux documentation recommends Azure RBAC with the `Key Vault Crypto User` role for Azure Key Vault access, while this post now consistently uses the Key Vault access policy model. A future update could modernize the tutorial to use Azure RBAC role assignments instead.
- The AKS Workload Identity service account annotations, pod template label, federated credential subject, and Flux `decryption.provider: sops` configuration match the current Flux and Microsoft documentation for controller-level Workload Identity.
- The SOPS `--azure-kv`, `--encrypted-regex`, and `.sops.yaml` `azure_keyvault` usage matches current SOPS documentation.
