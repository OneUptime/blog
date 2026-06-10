# Validation Summary: How to Create Vault PKI Root CA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (PKI secrets engine)
- X.509 PKI (Root CA, Intermediate CA, CRL)
- OpenSSL (verification utilities)
- cert-manager (Kubernetes integration)
- Vault CLI (`vault` commands)

## Sources Consulted
- HashiCorp Vault PKI Secrets Engine docs: https://developer.hashicorp.com/vault/docs/secrets/pki
- HashiCorp Vault PKI API docs: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault PKI considerations: https://developer.hashicorp.com/vault/docs/secrets/pki/considerations
- cert-manager Vault Issuer docs: https://cert-manager.io/docs/configuration/vault/

## Issues Found

1. **Misleading comment on `vault write pki/tidy`** — The bash comment read "Check certificate expiration", which misrepresents the operation. `pki/tidy` cleans up expired certificate entries from storage; it does not check expiration. Changed comment to "Clean up expired certificates from storage" to accurately describe the command's effect.

2. **cert-manager `Issuer` YAML missing required auth field** — The `spec.vault.auth.kubernetes` block contained only `role` and `mountPath`. Per cert-manager's Vault Issuer documentation, a `serviceAccountRef` (or legacy `secretRef`) is required for cert-manager to obtain a Kubernetes ServiceAccount token to exchange for a Vault token. Added `serviceAccountRef.name: cert-manager` so the example would actually authenticate.

## Review Notes

- Verified that `vault write pki/revoke certificate=@compromised.crt` is valid — the `/pki/revoke` endpoint accepts either `serial_number` or `certificate` (PEM) as either-or parameters. Initially this looked wrong but the Vault API docs explicitly support both.
- Confirmed `vault list pki/issuers` and `issuer_ref="root-2026"` usage are correct for Vault 1.11+ multi-issuer support, which is the relevant baseline for this post.
- Confirmed `key_bits=256` is valid for `key_type=ec` (allowed: 224, 256, 384, 521).
- The Option 2 "Generate CSR for External Signing" section uses `pki/intermediate/generate/internal` against the `pki` mount. This is correct: when an external CA signs Vault's CA cert, Vault's mount operates as an intermediate of that external root, so the intermediate-style endpoint is the right one.
- Dev-mode setup, `vault secrets tune -max-lease-ttl=87600h`, role parameter list, and the OpenSSL verification/inspection commands all check out against current docs.
- For future improvements, the post could mention OCSP (only CRL is covered) and the newer `pki/tidy` autotidy feature, but neither is incorrect as written.
