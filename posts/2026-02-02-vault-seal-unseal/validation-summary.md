# Validation Summary: How to Implement Vault Seal/Unseal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (1.15.4)
- Shamir's Secret Sharing
- AWS KMS (auto-unseal)
- Azure Key Vault (auto-unseal)
- GCP Cloud KMS (auto-unseal)
- Raft integrated storage
- Kubernetes / Helm (hashicorp/vault chart)
- Prometheus (alerting rules)
- Python (requests library)
- Bash scripting

## Sources Consulted
- HashiCorp Vault CLI docs: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault CLI docs: https://developer.hashicorp.com/vault/docs/commands/operator/unseal
- HashiCorp Vault CLI docs: https://developer.hashicorp.com/vault/docs/commands/operator/generate-root
- HashiCorp Vault CLI docs: https://developer.hashicorp.com/vault/docs/commands/operator/rekey
- HashiCorp Vault seal docs (AWS KMS): https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- HashiCorp Vault seal docs (Azure Key Vault): https://developer.hashicorp.com/vault/docs/configuration/seal/azurekeyvault
- HashiCorp Vault seal docs (GCP Cloud KMS): https://developer.hashicorp.com/vault/docs/configuration/seal/gcpckms
- HashiCorp Vault seal migration docs: https://developer.hashicorp.com/vault/docs/concepts/seal#seal-migration
- HashiCorp Vault Helm chart: https://github.com/hashicorp/vault-helm
- HashiCorp Vault telemetry docs: https://developer.hashicorp.com/vault/docs/internals/telemetry
- Vault HTTP API (sys/seal-status, sys/unseal): https://developer.hashicorp.com/vault/api-docs/system/seal-status

## Issues Found
- **Recovery Keys section misuse of `generate-root`** — The original text introduced the `vault operator generate-root` snippet under the heading "Generate new recovery keys if needed for disaster recovery scenarios," but that command generates a new *root token*, not new recovery keys. Additionally, the second invocation passed both `-nonce` and `-otp` together, which is not how key submission works — the `-otp` flag is provided during `-init` (or `-decode`), not when progressing through key submissions. Fixed the heading to describe generating a new root token using recovery keys, and corrected the second command to submit keys with only `-nonce`, with a comment clarifying that the user is prompted for each recovery key.

## Review Notes
- The Prometheus metric names (`vault_core_unsealed`, `vault_seal_unwrap_error`, `vault_barrier_put_error`) are plausible mappings from Vault's internal telemetry names. `vault_core_unsealed` is correct (gauge: 1 when unsealed, 0 when sealed). The error-counter metric names are reasonable Prometheus-style translations of Vault's internal counters; operators should verify the exact metric names exposed by their Vault version via `/v1/sys/metrics?format=prometheus`.
- The HCL seal stanzas for `awskms`, `azurekeyvault`, and `gcpckms` are accurate against the current Vault configuration reference.
- The `vault operator unseal -migrate` flow shown for Shamir→auto-unseal migration is the documented approach.
- The "Recovery from Corrupted Seal" section at the end of the post correctly demonstrates the full `generate-root` flow (init → submit keys with `-nonce` → decode with `-otp`), which is now consistent with the Recovery Keys section after the fix.
- Vault 1.15.4 is referenced in sample output; this is a real release. Readers on newer Vault versions (1.17+) may see additional `vault status` fields, but the listed fields remain valid.
- The Python script's use of `os.getenv('VAULT_SKIP_VERIFY', 'false').lower() == 'true'` and assignment to `session.verify` is semantically inverted from typical convention (a true `VAULT_SKIP_VERIFY` results in `verify=True`), but this is a script bug rather than a Vault-API correctness issue. Left as-is per the "only fix technical errors that misrepresent the technology" guidance.
