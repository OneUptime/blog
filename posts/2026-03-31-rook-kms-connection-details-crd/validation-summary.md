# Validation Summary: How to Configure KMS Connection Details in Rook CephCluster CRD

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- HashiCorp Vault (KMS provider)
- IBM Key Protect (KMS provider)
- Azure Key Vault (KMS provider)
- KMIP (Key Management Interoperability Protocol)
- Kubernetes (container orchestration)
- OSD-level encryption (dm-crypt / LUKS)

## Sources Consulted
- Rook official KMS documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/key-management-system/
- Rook CephCluster CRD API specification (KeyManagementServiceSpec)
- Rook source code: `pkg/operator/ceph/cluster/osd/spec.go` (OSD init container KMS environment variable handling)
- Rook operator deployment manifest (`operator.yaml`) for label verification

## Issues Found

1. **VAULT_BACKEND_KEY field does not exist** — Replaced fabricated `VAULT_BACKEND_KEY: luksKey` with the correct field `VAULT_SECRET_ENGINE: kv`. This field specifies the Vault secret engine type (`kv` or `transit`).

2. **VAULT_TLS_SERVER_NAME field does not exist for Vault** — Removed `VAULT_TLS_SERVER_NAME: vault.example.com`. This field (`TLS_SERVER_NAME`) belongs to the KMIP provider, not Vault. Vault TLS is configured via `VAULT_CACERT`, `VAULT_CLIENT_CERT`, and `VAULT_CLIENT_KEY`.

3. **IBM Key Protect field names incorrect** — Changed `IBM_KP_BASE_URL` to `IBM_BASE_URL` and `IBM_KP_TOKEN_URL` to `IBM_TOKEN_URL` to match the actual Rook field names.

4. **IBM_KP_REGION field does not exist** — Removed `IBM_KP_REGION: us-south`. The region is implicit in the `IBM_BASE_URL` value.

5. **Azure Key Vault authentication model completely wrong** — The blog showed client-secret-based auth with fabricated fields (`AZURE_VAULT_KEY_NAME`, `AZURE_CLIENT_SECRET`) and incorrect values (all set to `azure-credentials`). Rook uses certificate-based authentication. Fixed to use `AZURE_CERT_SECRET_NAME` for the certificate secret, and corrected `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to show they take actual ID values, not secret references.

6. **secrets-metadata is not a valid OSD-level KMS provider** — The `secrets-metadata` provider only exists in the CSI/PVC-level encryption context (via the `csi-kms-connection-details` ConfigMap), not in the CephCluster CRD's `security.kms` section. Replaced the entire section with a KMIP configuration example, which is an actual supported OSD-level KMS provider.

7. **jsonpath used wrong status field** — Changed `.status.state` to `.status.phase`. While `.status.state` exists, `.status.phase` is the standard field used in official documentation (with values like `Ready`, `Progressing`, etc.).

8. **KMS connectivity test command was wrong** — The `ceph config-key get dm-crypt/osd/0/luks/key` command does not test KMS connectivity. It queries the Ceph monitor's internal key-value store, not the external KMS. Additionally, the key path format uses OSD UUIDs, not numeric IDs. Replaced with a command to check operator logs for KMS-related errors.

9. **Summary incorrectly stated "Ceph MGR consumes env vars"** — KMS connection details are passed as environment variables to the OSD encryption init container (not the Ceph MGR). The init container runs `rook key-management get` to fetch the Key Encryption Key before the OSD starts. Corrected the summary accordingly.

## Review Notes
- The `tokenSecretName` for IBM Key Protect must contain a key called `IBM_KP_SERVICE_API_KEY` — this detail is not mentioned in the post but would be helpful for readers.
- For Azure Key Vault, the secret referenced by `AZURE_CERT_SECRET_NAME` must contain a PEM-encoded certificate and private key.
- The Vault `VAULT_SECRET_ENGINE` field accepts `kv` or `transit` — the post now shows `kv` but readers should be aware of the `transit` option for use cases requiring server-side encryption.
- The post originally had 9 significant technical errors across 11 verified claims. All have been corrected.
