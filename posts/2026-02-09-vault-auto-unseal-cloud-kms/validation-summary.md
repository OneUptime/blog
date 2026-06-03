# Validation Summary: How to implement Vault auto-unsealing with cloud KMS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault auto-unseal
- Vault CLI
- Vault Helm chart for Kubernetes
- AWS KMS and IAM
- Google Cloud KMS
- Azure Key Vault
- Kubernetes service accounts

## Sources Consulted
- HashiCorp Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- HashiCorp Vault GCP Cloud KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/gcpckms
- HashiCorp Vault Azure Key Vault seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/azurekeyvault
- HashiCorp Vault seal/unseal concepts and seal migration: https://developer.hashicorp.com/vault/docs/concepts/seal
- HashiCorp Vault operator init command: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault operator unseal command: https://developer.hashicorp.com/vault/docs/commands/operator/unseal
- HashiCorp Vault operator generate-root command: https://developer.hashicorp.com/vault/docs/commands/operator/generate-root
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/platform/k8s/helm/configuration
- Google Cloud KMS IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/cloudkms
- Microsoft Azure CLI Key Vault command reference: https://learn.microsoft.com/en-us/cli/azure/keyvault

## Issues Found
- The Helm service account example used a standalone Kubernetes ServiceAccount manifest that would conflict with the official Vault Helm chart's managed service account unless additional chart settings were changed. I changed it to use `server.serviceAccount.annotations` in Helm values.
- The Helm install command targeted a namespace but did not create it. I added `--create-namespace` so the command works for a fresh namespace.
- The production-oriented Vault listener snippet disabled TLS without any caveat. I added a concise comment that production deployments should configure `tls_cert_file` and `tls_key_file`.
- The auto-unseal initialization command mixed Shamir unseal-key flags with recovery-key flags. I removed `-key-shares` and `-key-threshold` so the command matches Vault's auto-unseal recovery-key initialization flow.
- The Google Cloud KMS permissions granted only encrypt/decrypt access. Vault also needs `cloudkms.cryptoKeys.get` for key metadata, so I added a `roles/cloudkms.viewer` binding.
- The Azure Key Vault access policy granted only `encrypt` and `decrypt`. Vault must be able to read key metadata, so I added the `get` key permission.
- The migration example used a non-existent `vault operator unseal-migrate` subcommand. I changed it to `vault operator unseal -migrate`, which is the documented seal migration flow.
- The root token recovery example used a non-existent `generate-root -recovery-key` flag. I removed that flag; Vault uses recovery keys automatically for auto-unseal generate-root operations.

## Review Notes
The remaining examples are intentionally concise and use placeholder IDs, regions, and principals. For a real production deployment, the TLS listener configuration, KMS key lifecycle controls, IAM boundaries, Vault storage snapshots, and seal migration order for HA Raft clusters should be tested in a staging environment before applying to production.
