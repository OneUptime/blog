# Validation Summary: How to Use SOPS with Multiple Cloud KMS Providers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization SOPS decryption
- Kubernetes Secrets and ServiceAccounts
- SOPS
- AWS KMS
- Google Cloud KMS
- Azure Key Vault
- AWS IAM Roles for Service Accounts
- GKE Workload Identity
- Azure Workload Identity
- age encryption keys

## Sources Consulted
- SOPS official README: https://github.com/getsops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux workload identity documentation: https://fluxcd.io/flux/installation/configuration/workload-identity/
- Flux Google Cloud integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Google Cloud CLI documentation for `gcloud kms keys create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud KMS key creation documentation: https://cloud.google.com/kms/docs/create-key
- AWS CLI documentation for `aws kms create-alias`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/kms/create-alias.html
- Azure CLI Key Vault documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure AKS Workload Identity documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview

## Issues Found
- The SOPS `.sops.yaml` examples used `azure_kv`, but the supported creation rule field is `azure_keyvault`. Updated all Azure Key Vault examples to use `azure_keyvault` so SOPS can load the Key Vault recipient from `.sops.yaml`.
- The Azure Key Vault creation command omitted `--location`. Azure CLI examples and common usage include a location when creating a vault, so the command was updated with `--location eastus`.
- The Azure Workload Identity Flux example placed only the workload identity label on the ServiceAccount and did not label the controller pod template. Current Azure Workload Identity guidance requires the pod template label `azure.workload.identity/use: "true"` so the webhook mutates the pod. Updated the example to add the tenant annotation and a Deployment patch with the required pod template label.

## Review Notes
- Flux supports SOPS decryption through `.spec.decryption.provider: sops`, and the Kustomization API version shown is current.
- The AWS KMS, GCP KMS, and SOPS encryption command examples are consistent with official CLI documentation.
- In real deployments, the cloud identities also need the relevant KMS permissions, such as AWS KMS decrypt, Google Cloud KMS encrypter/decrypter, or Azure Key Vault crypto permissions. The post covers this at a prerequisite level.
