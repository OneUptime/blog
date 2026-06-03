# Validation Summary: How to Configure Vault Seal Wrap for Extra Secret Protection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault Enterprise and HCP Vault Dedicated
- Vault seal wrap and auto-unseal
- AWS KMS, Google Cloud KMS, and Azure Key Vault seal configuration
- Vault KV v2, Transit, and PKI secrets engines
- Vault ACL policies and Kubernetes auth roles
- Vault audit logging and Prometheus telemetry
- Kubernetes ConfigMaps
- Go Vault API client
- Python hvac client

## Sources Consulted
- HashiCorp Vault seal wrap overview: https://developer.hashicorp.com/vault/tutorials/auto-unseal/seal-wrap
- HashiCorp Vault seal stanza documentation: https://developer.hashicorp.com/vault/docs/configuration/seal
- HashiCorp Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- HashiCorp Vault GCP Cloud KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/gcpckms
- HashiCorp Vault Azure Key Vault seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/azurekeyvault
- HashiCorp Vault secrets enable command: https://developer.hashicorp.com/vault/docs/commands/secrets/enable
- HashiCorp Vault secrets tune command: https://developer.hashicorp.com/vault/docs/commands/secrets/tune
- HashiCorp Vault secrets list command: https://developer.hashicorp.com/vault/docs/commands/secrets/list
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault kv put command: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault seal/unseal concepts and seal migration notes: https://developer.hashicorp.com/vault/docs/concepts/seal
- HashiCorp Vault sealwrap rewrap API: https://developer.hashicorp.com/vault/api-docs/system/sealwrap-rewrap
- HashiCorp Vault operator rekey command: https://developer.hashicorp.com/vault/docs/commands/operator/rekey
- HashiCorp Vault audit logging documentation: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault file audit device documentation: https://developer.hashicorp.com/vault/docs/audit/file
- HashiCorp Vault telemetry documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry
- HashiCorp Vault Go API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac KV v2 usage documentation: https://python-hvac.org/en/v2.4.0/usage/secrets_engines/kv_v2.html

## Issues Found
- The post implied seal wrap is generally available in Vault. Updated it to state that seal wrap requires Vault Enterprise or HCP Vault Dedicated with a supported seal.
- The post described seal wrap as always adding FIPS 140-2 compliant encryption. Updated wording to FIPS 140-2/3-aligned requirements with supported seals, since compliance depends on the deployment and seal provider.
- The post used `vault secrets tune -seal-wrap=true`, but official docs state seal wrap is set at mount time and cannot currently be changed later. Replaced those examples with `vault secrets enable -seal-wrap ...`.
- The migration section incorrectly suggested rekeying recovery keys to force seal wrapping. Replaced it with guidance to create a new seal-wrapped mount and copy KV v2 data into it.
- The Python KV v2 migration example only handled top-level keys and rewrote to the same mount. Updated it to recursively copy from a source mount to a destination seal-wrapped mount.
- The Transit section referred to private keys for an AES key. Updated it to refer to transit key material and policy data.
- The PKI section claimed all issued certificate private keys are protected by seal wrap. Updated it to clarify that PKI CA issuer keys are stored and protected, while leaf certificate private keys from `pki/issue/*` are returned to clients and not stored by Vault.
- The policy section claimed ACL policies enforce seal wrap usage. Updated it to describe restricting access to seal-wrapped mounts.
- The audit log example filtered on undocumented `request.seal_wrap` data. Replaced it with an audit query for requests to known seal-wrapped mount paths.
- The Prometheus alert used an undocumented `vault_core_auto_unseal_failures_total` metric. Replaced it with an alert for missing `vault_core_unsealed` telemetry.
- The DR section used invalid `vault seal migrate -config=...` syntax and implied snapshots include seal configuration. Updated it to back up Vault storage and seal configuration separately and point to the documented seal migration flow.
- The performance section claimed a typical 5-10% write overhead and negligible read overhead. Updated it to reflect HashiCorp's warning that overhead depends on HSM/KMS latency and can be much higher for remote seals.
- The best practices section implied manual Shamir unseal can be used with seal wrap. Updated it to state that Shamir seals do not support seal wrap.

## Review Notes
The examples are intentionally generic and omit production hardening details such as TLS listener configuration, IAM role setup, Kubernetes service accounts for cloud credentials, and recursive handling of every KV v2 metadata edge case. Those are acceptable omissions for this guide, but a production deployment guide should cover them explicitly.
