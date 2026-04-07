# How to Configure Server-Side Encryption KMS Backend in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Encryption, KMS, Security

Description: Configure Ceph RGW to use an external KMS backend for server-side encryption (SSE-S3 and SSE-KMS), protecting object data at rest.

---

Ceph RGW supports server-side encryption (SSE) for objects stored in RADOS. The KMS backend manages encryption keys, supporting Vault, Barbican, or KMIP-compatible key management systems.

## SSE Modes Supported

- **SSE-S3** - RGW manages encryption keys (stored in KMS)
- **SSE-KMS** - Client specifies the KMS key ID per request
- **SSE-C** - Client provides the key per request (no KMS required)

## Configuring the KMS Backend

```bash
# Set the KMS backend (vault, barbican, or kmip)
ceph config set client.rgw rgw_crypt_s3_kms_backend vault
```

## Vault KMS Configuration

```bash
# Vault server address
ceph config set client.rgw rgw_crypt_vault_addr https://vault.example.com:8200

# Vault authentication token file
ceph config set client.rgw rgw_crypt_vault_token_file /var/lib/ceph/vault-token

# Vault auth method (token or agent)
ceph config set client.rgw rgw_crypt_vault_auth token

# Vault secret engine (transit or kv)
ceph config set client.rgw rgw_crypt_vault_secret_engine transit

# Path prefix for encryption keys
ceph config set client.rgw rgw_crypt_vault_prefix /v1/transit/keys
```

## Uploading with SSE-KMS

```bash
# Upload with server-side encryption using KMS
aws s3 cp secret-data.txt s3://my-bucket/secret-data.txt \
  --sse aws:kms \
  --sse-kms-key-id my-vault-key-id \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# Upload with SSE-S3 (RGW manages keys)
aws s3 cp data.txt s3://my-bucket/data.txt \
  --sse AES256 \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Applying in Rook

Store the Vault token as a Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rgw-vault-token
  namespace: rook-ceph
stringData:
  token: "hvs.VAULT_TOKEN_HERE"
```

Config override:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_crypt_s3_kms_backend = vault
    rgw_crypt_vault_addr = https://vault.example.com:8200
    rgw_crypt_vault_auth = token
    rgw_crypt_vault_token_file = /var/lib/ceph/vault-token
    rgw_crypt_vault_secret_engine = transit
    rgw_crypt_vault_prefix = /v1/transit/keys
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Verifying Encryption

```bash
# Check that an object is encrypted
aws s3api head-object \
  --bucket my-bucket \
  --key secret-data.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# Response should include:
# "ServerSideEncryption": "aws:kms"
# "SSEKMSKeyId": "my-vault-key-id"
```

## Summary

Ceph RGW supports SSE-KMS using Vault, Barbican, or KMIP backends configured via `rgw_crypt_s3_kms_backend`. Set the appropriate backend parameters and store credentials as Kubernetes Secrets for Rook deployments. Verify encryption is applied by checking the `ServerSideEncryption` field in object HEAD responses.
