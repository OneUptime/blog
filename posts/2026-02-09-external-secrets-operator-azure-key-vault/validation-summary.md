# Validation Summary: How to Use External Secrets Operator with Azure Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure Key Vault
- Azure CLI
- External Secrets Operator
- Helm
- Stakater Reloader

## Sources Consulted
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- Microsoft Learn AKS Workload Identity deployment documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn Azure Key Vault CLI documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn Azure Key Vault secret CLI documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault/secret
- Microsoft Learn Azure Key Vault soft-delete overview: https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/1.4/index.html

## Issues Found
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated them to the current `external-secrets.io/v1` API shown in the official ESO documentation.
- The Workload Identity `SecretStore` examples combined mounted operator service-account configuration with `serviceAccountRef`. Removed `serviceAccountRef` from those examples so they match the earlier steps that annotate and label the External Secrets Operator service account and pod.
- The Service Principal example stored credentials in `external-secrets-system` while using a namespaced `SecretStore` in `production`. Moved the Kubernetes Secret to `production` and removed cross-namespace secret references from the namespaced `SecretStore`.
- The certificate example used unsupported `property: certificate` and `property: key` fields for Azure Key Vault certificates, and placed `type: kubernetes.io/tls` directly under `target`. Replaced it with the ESO-documented PFX-as-secret pattern using `target.template.type`, `pkcs12cert`, and `pkcs12key`.
- The Deployment example placed `envFrom` under the `env` list and put `prefix` inside `secretRef`. Corrected the Kubernetes schema so `envFrom` is a container field and `prefix` is an `EnvFromSource` field beside `secretRef`.
- The rotation section implied that setting a secret expiration configures automatic rotation. Reworded it to state that expiration metadata is set, and that ESO syncs new Key Vault secret versions when they are created.
- The best-practices section said to enable soft delete with `az keyvault update --enable-soft-delete true`, but current Azure Key Vaults have soft delete enabled by default and the update command documents purge protection, not `--enable-soft-delete`. Reworded the recommendation and updated the command to enable purge protection.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against Microsoft Learn rather than local `az --help`.
- YAML snippets were parsed locally with PyYAML after edits.
