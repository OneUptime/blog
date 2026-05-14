# Validation Summary: How to Configure Flux CD with Azure Key Vault for SOPS Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- SOPS
- Azure Key Vault
- Azure CLI
- Microsoft Entra Workload ID for AKS
- Kubernetes Secrets and Kustomize

## Sources Consulted
- SOPS README, Azure Key Vault and `.sops.yaml` configuration: https://github.com/getsops/sops/blob/main/README.rst
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Azure integration and Workload Identity guidance: https://fluxcd.io/flux/integrations/azure/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Microsoft Learn, AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn, Azure CLI Key Vault quickstart: https://learn.microsoft.com/en-us/azure/key-vault/general/quick-create-cli
- Microsoft Learn, `az identity federated-credential create`: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn, Azure Key Vault key types and operations: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details
- Microsoft Learn, Azure built-in Key Vault Crypto User role: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security

## Issues Found
- The setup used a demo resource group but did not create it. Added `az group create` so the Key Vault creation commands work in a clean walkthrough.
- The SOPS explanation implied the Azure Key Vault RSA key directly encrypts all secret values. Updated it to describe SOPS envelope encryption more accurately: SOPS encrypts values with a data key and uses Azure Key Vault to encrypt/decrypt that data key.
- The Workload Identity patch only annotated/labeled the ServiceAccount. Flux and AKS Workload Identity documentation require the controller pod template to carry `azure.workload.identity/use: "true"` so the webhook mutates the pod. Added a Deployment patch and updated the Flux kustomization patch list.
- The Workload Identity patch did not include the tenant annotation recommended by Flux controller-level Azure Workload Identity documentation. Added `azure.workload.identity/tenant-id` and the command to retrieve the managed identity tenant ID.
- The `.sops.yaml` Azure Key Vault URLs omitted both the key version and the trailing slash required when using the latest key version form. Updated the examples to use versioned key identifiers and added a note about the trailing slash form.

## Review Notes
The local environment did not have `az`, `sops`, or `flux` installed, so CLI syntax was verified against official documentation rather than local `--help` output. The `Key Vault Crypto User` role is broader than the minimum decrypt-only permission, but it is valid for the workflow because it includes key read, encrypt, decrypt, wrap, and unwrap data actions.
