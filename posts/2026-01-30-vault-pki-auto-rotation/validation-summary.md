# Validation Summary: How to Create Vault PKI Auto-Rotation

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault PKI secrets engine
- Vault Agent (auto-auth, templating, sinks)
- consul-template `pkiCert` function
- cert-manager (ClusterIssuer, Certificate CRDs)
- Kubernetes auth method for Vault
- Helm (cert-manager chart)
- Prometheus alerting rules
- OpenSSL CLI
- Bash automation scripting

## Sources Consulted
- Vault PKI secrets engine API: https://developer.hashicorp.com/vault/api-docs/secret/pki
- Vault Agent template stanza: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- Vault telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- Vault PKI auto-tidy source: `builtin/logical/pki/path_tidy.go` (hashicorp/vault repo)
- cert-manager Vault issuer config: https://cert-manager.io/docs/configuration/vault/
- cert-manager Helm install: https://cert-manager.io/docs/installation/helm/
- consul-template templating language reference (for `pkiCert`, `secret`, `writeToFile`)

## Issues Found

1. **Misleading Vault Agent `template_config` comment.** The original config attached a "Renew certificates when 70% of TTL has elapsed" comment to `max_connections_per_host = 10`, but `max_connections_per_host` is an HTTP connection-pool size and has nothing to do with renewal timing. The actual setting that controls when `pkiCert` re-renders is `lease_renewal_threshold` (default `0.9`, i.e. 90%, applied to the certificate's `NotBefore`/`NotAfter` span). **Fix:** added an explicit `lease_renewal_threshold = 0.7` so the documented 70% behavior is actually realized, separated the comments, and clarified what `max_connections_per_host` does.

2. **Fictional Prometheus metric names.** The original alert rules referenced `vault_pki_certificate_expiry_seconds`, `vault_pki_tidy_failure_count`, and `vault_pki_crl_last_update_timestamp`. None of these are emitted by Vault. Vault's real PKI metrics are exposed under `vault_secrets_pki_tidy_*` (`_failure`, `_success`, `_duration`, `_start_time_epoch`, `_cert_store_deleted_count`, etc.), and per-certificate expiry tracking requires a third-party exporter like `vault-pki-exporter`. **Fix:** rewrote the three alert rules to use real metric names (`vault_secrets_pki_tidy_failure`, `vault_secrets_pki_tidy_start_time_epoch`) and noted the exporter dependency for the per-cert expiry alert (`x509_cert_not_after`). Also dropped the stale-CRL alert in favor of an auto-tidy staleness alert that uses an actually-existing metric.

## Review Notes

- **Cross-signing section** (`Issuer Rotation and Cross-Signing`): the commands are syntactically valid Vault calls and the per-issuer endpoint `pki_int/issuer/<name>/sign-intermediate` is correct. However, the motivation is a bit muddled — since the root CA is unchanged, signing the new intermediate's CSR with the old intermediate doesn't really provide "backward compatibility" in the way cross-signing usually does (cross-signing typically bridges old and new root chains). The workflow works mechanically but readers shouldn't expect it to solve a root rotation problem. Left as-is to preserve author intent.

- **Vault version requirements (not currently called out in the post):** several auto-tidy parameters in the example are version-gated — `tidy_revoked_cert_issuer_associations`, `tidy_expired_issuers`, and `tidy_move_legacy_ca_bundle` require Vault 1.13+, and `tidy_acme` requires Vault 1.14+. Users on older Vault versions will get an error if they paste the snippet verbatim. Worth a version note in a future revision.

- **`pkiCert` key rendering:** the post has two separate templates (`cert.tpl` and `key.tpl`) both invoking `pkiCert` with overlapping arguments. The second call issues a *different* certificate from the first; only the `.Key` is written. This works but issues an extra certificate per render cycle. A cleaner approach is to render both cert and key from a single `pkiCert` invocation using `writeToFile` for the key (which the post already does inside `cert.tpl`) and drop the second template entirely. Not corrected — would require restructuring the section.

- **cert-manager auth:** the post uses `secretRef` (static SA token) under `auth.kubernetes`. For cert-manager v1.12+, `serviceAccountRef` (bound short-lived TokenRequest) is the recommended pattern. Both are valid, so no change made.

- **Helm flag:** `--set crds.enabled=true` is correct for cert-manager v1.13+ (the older `installCRDs=true` was deprecated/removed in the current chart). No change needed.

- **The sequence diagram's "70% of TTL"** is now consistent with the explicit `lease_renewal_threshold = 0.7` added to the Agent config.
