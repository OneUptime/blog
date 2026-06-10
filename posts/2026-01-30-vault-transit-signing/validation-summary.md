# Validation Summary: How to Implement Vault Transit Signing

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- HashiCorp Vault (Transit secrets engine)
- Vault CLI (`vault write`, `vault read`, `vault audit`, `vault secrets enable`)
- HashiCorp Vault HCL policies
- Vault rate-limit quotas (`sys/quotas/rate-limit`)
- Asymmetric signing key types: Ed25519, ECDSA (P-256/P-384/P-521), RSA (2048/3072/4096)
- Signature algorithms: PKCS#1 v1.5, RSA-PSS, EdDSA
- Marshaling formats: ASN.1 DER, JWS
- Python (`hvac` library)
- Go (`github.com/hashicorp/vault/api`)
- Node.js (`node-vault` library)
- SHA-256 hashing (file streaming)

## Sources Consulted
- Vault Transit API docs: https://developer.hashicorp.com/vault/api-docs/secret/transit
- Vault Transit secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/transit
- Vault rate-limit quotas API: https://developer.hashicorp.com/vault/api-docs/system/rate-limit-quotas
- Vault rate-limit quotas concept docs: https://developer.hashicorp.com/vault/docs/concepts/resource-quotas
- hvac Python library docs: https://hvac.readthedocs.io/en/stable/usage/secrets_engines/transit.html
- hashicorp/vault/api Go client reference

## Issues Found

1. **Wrong endpoint for `min_decryption_version`** — The post used `vault write transit/keys/my-signing-key min_decryption_version=2`, but updating key configuration requires the `/config` sub-path per the Vault API. Fixed to `vault write transit/keys/my-signing-key/config min_decryption_version=2`.

2. **JWS marshaling shown on Ed25519 key** — Vault docs explicitly state `marshaling_algorithm` "currently only applies to ECDSA keys." The example used `my-signing-key` (Ed25519). Fixed to use `ecdsa-key` and added a clarifying comment "(for JWT use cases, ECDSA keys only)".

3. **Rate-limit `interval=60` is not a duration string** — Vault docs document `interval` as a duration string (e.g. `1s`, `2m`). A bare integer `60` is ambiguous/invalid. Fixed to `interval=1m`.

4. **Prehashed example used an Ed25519 key without qualification** — Per Vault docs, Ed25519 prehashed signing is a Vault Enterprise feature and requires `sha2-512` (Ed25519ph). The example computed a SHA-256 hash and passed it to `my-signing-key` (Ed25519) without `hash_algorithm`, which would not work on Community Vault. Fixed the example to use `ecdsa-key` and added a comment noting the Enterprise/sha2-512 requirement for Ed25519.

## Review Notes

- The post's claim that public-key export requires `exportable=true` at key creation aligns with the current Vault API documentation (`"The key must be exportable to support this operation"`). Left as-is. (Historically, some Vault versions allowed public-key export without the flag; the current docs are stricter, so the post's guidance is the safer recommendation.)
- The performance categorizations in the key-types table (e.g. ECDSA P-384 marked "Fast", P-521 "Medium") are subjective summary labels rather than benchmarked claims. Reasonable as written, though P-384 is meaningfully slower than P-256.
- The `hvac` Python library calls correctly use the `hash_input=` parameter (not `input=`), which matches the current hvac signature.
- All listed signing key types (rsa-2048/3072/4096, ecdsa-p256/p384/p521, ed25519) are valid per current Vault docs.
- The Go example uses `vault.DefaultConfig()` + `vault.NewClient(config)` + `client.SetToken(...)`, which is the current idiomatic usage of `github.com/hashicorp/vault/api`.
- The HCL policy capabilities (`update` for sign/verify/rotate, `read` for key read) match Vault's path semantics.
- The audit-device enable command (`vault audit enable file file_path=...`) is current and correct.
- The default `marshaling_algorithm` for ECDSA is already `asn1`; the post's explicit example of `marshaling_algorithm=asn1` is redundant but not incorrect.
