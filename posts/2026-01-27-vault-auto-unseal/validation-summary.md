# Validation Summary: How to Configure Vault Auto-Unseal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (server, auto-unseal seal stanzas, Raft storage, transit secrets engine, operator commands)
- AWS KMS (key creation, aliases, IAM policy, IRSA on EKS)
- Azure Key Vault (vault creation, key creation, service principal, Azure Workload Identity on AKS)
- GCP Cloud KMS (key rings, crypto keys, service accounts, Workload Identity on GKE)
- Kubernetes (Deployment, StatefulSet, ConfigMap, Secret, ServiceAccount, probes)
- Prometheus (alerting rules using Vault telemetry metrics)
- Bash / curl / jq (token renewal script)

## Sources Consulted
- Vault `awskms` seal config: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- Vault `azurekeyvault` seal config: https://developer.hashicorp.com/vault/docs/configuration/seal/azurekeyvault
- Vault `gcpckms` seal config: https://developer.hashicorp.com/vault/docs/configuration/seal/gcpckms
- Vault `transit` seal config: https://developer.hashicorp.com/vault/docs/configuration/seal/transit
- Vault seal concepts & migration: https://developer.hashicorp.com/vault/docs/concepts/seal
- Vault `operator init` reference: https://developer.hashicorp.com/vault/docs/commands/operator/init
- Vault telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- Azure CLI `az keyvault create`: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure CLI `az keyvault key create`: https://learn.microsoft.com/en-us/cli/azure/keyvault/key#az-keyvault-key-create
- Azure built-in roles (Key Vault Crypto User): https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- GCP `gcloud kms keys create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- EKS IRSA: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- GKE Workload Identity: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity

## Issues Found

1. **Incorrect Shamir-to-auto-unseal migration procedure.** The post instructed users to run `vault server -config=... -migrate`, but `-migrate` is not a `vault server` flag. The correct procedure (Vault 1.5.1+) is to update the configuration with the new auto-unseal stanza, start Vault normally, and then pass `-migrate` to each `vault operator unseal` call when supplying the Shamir keys. Fixed by rewriting the Step 3 command sequence to use `vault operator unseal -migrate <shamir-key>` and removing the bogus `vault server -migrate` invocation.

2. **Non-existent Prometheus metric `vault_seal_unwrap_error`.** Vault does not expose a metric by that name. Replaced the `VaultAutoUnsealError` alert with one based on the real `vault.seal.decrypt.time` (`vault_seal_decrypt_time`) summary metric, which catches the same failure mode (KMS connectivity/throttling) via tail latency.

3. **Deprecated `--enable-soft-delete true` flag on `az keyvault create`.** Soft delete has been mandatory and always-on for Key Vaults since end of 2020, and the flag now emits a deprecation warning. Removed the flag and added a clarifying comment. Also added `--enable-rbac-authorization true` because the subsequent `az ad sp create-for-rbac --role "Key Vault Crypto User"` step uses Azure RBAC, which requires the vault to be in RBAC mode (otherwise the role assignment has no effect and Vault would not be able to access the key).

4. **Misleading example values in commented-out `seal "transit"` fields.** `tls_skip_verify = false` and `disable_renewal = false` were shown beneath comments describing the opposite behavior — both `false` is the default, so uncommenting the line as written would do nothing. Updated the example values to `true` and clarified the defaults in the accompanying comments so the option matches what the comment describes.

## Review Notes
- The post pins `hashicorp/vault:1.15` (released September 2023). Vault has had several releases since; readers may want to use a newer minor (1.17+/1.18+) in production. Not a bug, but worth noting.
- The AWS KMS IAM policy includes `kms:Encrypt`, `kms:Decrypt`, and `kms:DescribeKey`, which matches the HashiCorp guidance. If the post ever adds Vault seal rewrap/rotation guidance, `kms:GenerateDataKey` may also be relevant depending on usage.
- The Azure key is created with `--kty RSA --size 2048`. Vault auto-unseal supports this, but `RSA-HSM` (with premium SKU) is generally preferable for HSM-backed protection. Left as-is because the post is illustrative.
- The Azure RBAC role "Key Vault Crypto User" grants broad crypto operations including sign/verify/encrypt/decrypt; for strict least-privilege auto-unseal, only wrap/unwrap are strictly needed. A custom role could be tighter. Out of scope for this fix.
- The example `seal "transit"` block hardcodes a token (`token = "hvs.CAE..."`); the post already notes that `VAULT_TRANSIT_SEAL_TOKEN` env var is preferred. Good.
- The migration rollback section does `sudo rm -rf /opt/vault/data` before `vault operator raft snapshot restore`. In a real rollback, `snapshot restore` requires Vault to be running and initialized, so the actual recovery path is more nuanced (typically initialize a fresh node, then restore). The high-level outline is fine for an illustrative example.
- The Prometheus rule `vault_core_unsealed == 0` is correct (Vault telemetry `vault.core.unsealed`).
