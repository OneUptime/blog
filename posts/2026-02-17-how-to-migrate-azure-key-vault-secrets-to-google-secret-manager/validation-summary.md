# Validation Summary: How to Migrate Azure Key Vault Secrets to Google Secret Manager

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Key Vault
- Google Secret Manager
- Google Cloud KMS
- Google Certificate Manager
- Azure CLI
- Google Cloud CLI
- Python
- Node.js
- Kubernetes
- External Secrets Operator
- Cloud Functions
- Cloud Scheduler

## Sources Consulted
- Azure Key Vault overview: https://learn.microsoft.com/en-us/azure/key-vault/general/overview
- Azure Key Vault keys, secrets, and certificates overview: https://learn.microsoft.com/en-us/azure/key-vault/general/about-keys-secrets-certificates
- Azure CLI `az keyvault secret` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/secret
- Azure Key Vault Python SecretClient reference: https://learn.microsoft.com/en-us/python/api/azure-keyvault-secrets/azure.keyvault.secrets.secretclient
- Azure Key Vault Python quickstart: https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python
- Azure Key Vault JavaScript quickstart: https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node
- Google Secret Manager create and access secrets documentation: https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Secret Manager labels documentation: https://cloud.google.com/secret-manager/docs/add-labels-to-secrets
- Google Secret Manager delayed destruction documentation: https://cloud.google.com/secret-manager/docs/delay-destruction-of-secret-versions
- Google Secret Manager rotation schedules documentation: https://cloud.google.com/secret-manager/docs/secret-rotation
- Google Secret Manager IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/secretmanager
- Google Cloud CLI Secret Manager IAM reference: https://cloud.google.com/sdk/gcloud/reference/secrets/add-iam-policy-binding
- Google Cloud Functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Scheduler HTTP job reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- GKE Secret Manager add-on documentation: https://cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- GKE Secret Manager secret synchronization documentation: https://cloud.google.com/secret-manager/docs/sync-k8-secrets
- External Secrets Operator Google Secret Manager provider documentation: https://external-secrets.io/latest/provider/google-secrets-manager/

## Issues Found
- The service mapping described Azure Key Vault soft delete as equivalent to disabled Secret Manager versions. Updated it to reference Secret Manager delayed destruction of secret versions, which is the closer Google Cloud feature.
- The service mapping suggested purge protection could be handled by organization policies. Updated it to clarify that delayed destruction applies to versions and that deleted Secret Manager secrets do not have soft-delete recovery.
- The service mapping listed custom Cloud Functions as the rotation equivalent. Updated it to reflect Secret Manager rotation schedules with Pub/Sub subscribers or Cloud Functions.
- The GKE example described direct Secret Manager environment variables, but the YAML used a Kubernetes `secretKeyRef`. Updated the wording to state that this pattern requires a synchronized Kubernetes Secret.
- The rotation section implied Cloud Scheduler was the primary replacement. Updated it to mention Secret Manager rotation schedules and keep Cloud Scheduler as a valid external scheduling option.

## Review Notes
The migration script is technically valid for a simple direct transfer, but production use should also account for duplicate or pre-existing target secret names, secret name length limits, IAM bootstrap permissions, binary or non-UTF-8 secret payloads, regional replication requirements, and whether disabled Azure secret versions should be preserved or intentionally skipped.
