# Validation Summary: How to Manage Talos Linux Secrets Securely

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Talos Linux (machine configuration, talosctl, secret bundles)
- Kubernetes (Secrets, encryption at rest, kubeconfig)
- HashiCorp Vault (KV v2)
- External Secrets Operator (ESO)
- Sealed Secrets (kubeseal)
- age / SOPS (file encryption)
- OpenSSL (certificate generation)

## Sources Consulted
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos cert management: https://docs.siderolabs.com/talos/v1.7/security/cert-management
- Talos issue #6362 (secretbox vs aescbc)
- age README: https://github.com/FiloSottile/age
- SOPS docs: https://github.com/getsops/sops
- ESO stability/support: https://external-secrets.io/latest/introduction/stability-support/
- ESO Vault provider: https://external-secrets.io/latest/provider/hashicorp-vault/
- Sealed Secrets repo: https://github.com/bitnami-labs/sealed-secrets
- Vault kv docs: https://developer.hashicorp.com/vault/docs/commands/kv/put

## Issues Found
1. **`talosctl gen config --output-dir`** — The flag was renamed to `--output` in current Talos versions. Changed `--output-dir configs/` to `--output configs/`.
2. **External Secrets Operator API version** — The post used `external-secrets.io/v1beta1`, which is deprecated; the `unsafeServeV1Beta1` support flag is scheduled for removal as of 2026-05-01. Updated both the `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.
3. **ESO Vault remoteRef key** — For a `SecretStore` with `path: "secret"` and `version: "v2"`, the `remoteRef.key` should be the logical path within the mount only; ESO inserts `data/` automatically and the mount path comes from the SecretStore's `path` field. Changed `key: secret/data/production/database` to `key: production/database` for both data entries.

## Review Notes
- `cluster.aescbcEncryptionSecret` is still a valid field but is effectively deprecated; Kubernetes rates AESCBC as "Weak" due to a padding-oracle issue and `secretboxEncryptionSecret` takes precedence when both are set. The post correctly uses `secretboxEncryptionSecret` in the actual config example, so no change was made to the introductory bullet list.
- `vault kv put secret/path key=@file` uses the legacy positional form; the modern documented form is `vault kv put -mount=secret path key=@file`. The positional form still works, so this was left unchanged.
- `base64 -w0` is a GNU coreutils flag; on macOS users would need `base64` without `-w0` (or `| tr -d '\n'`). Worth noting for cross-platform users but not strictly incorrect.
- The Talos admin certificate subject `/O=os:admin/CN=admin-...` is correct — Talos derives roles from the certificate Organization field (valid roles include `os:admin`, `os:reader`, `os:operator`, `os:etcd:backup`).
