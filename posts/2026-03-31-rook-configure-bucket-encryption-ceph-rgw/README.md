# How to Configure Bucket Encryption in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Encryption, Security, Object Storage

Description: Learn how to enable server-side encryption for Ceph RGW buckets using SSE-S3 and SSE-KMS modes to protect data at rest.

---

## Encryption Modes in Ceph RGW

Ceph RGW supports two server-side encryption modes:

- **SSE-S3** - Ceph automatically manages encryption keys in Vault
- **SSE-KMS** - keys are stored in an external KMS (e.g., HashiCorp Vault)

Both modes encrypt objects transparently during write and decrypt on read.

## Enabling SSE-S3 (RGW-Managed Keys)

SSE-S3 requires configuring a Vault backend. Ceph automatically creates and manages the encryption keys in Vault, making key management invisible to the user.

Add the following to your RGW configuration:

```ini
[client.rgw.myzone]
rgw_crypt_sse_s3_backend = vault
rgw_crypt_sse_s3_vault_addr = https://vault.example.com:8200
rgw_crypt_sse_s3_vault_auth = token
rgw_crypt_sse_s3_vault_token_file = /etc/ceph/vault.token
rgw_crypt_sse_s3_vault_secret_engine = transit
rgw_crypt_require_ssl = false
```

Restart RGW after config changes:

```bash
systemctl restart ceph-radosgw@rgw.myzone
```

Apply default encryption to a bucket:

```bash
aws s3api put-bucket-encryption \
  --bucket my-secure-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --endpoint-url http://rgw.example.com:7480
```

## Enabling SSE-KMS with HashiCorp Vault

For production use, integrate with Vault to manage keys:

Configure RGW to use Vault:

```ini
[client.rgw.myzone]
rgw_crypt_s3_kms_backend = vault
rgw_crypt_vault_addr = https://vault.example.com:8200
rgw_crypt_vault_auth = token
rgw_crypt_vault_token_file = /etc/ceph/vault.token
rgw_crypt_vault_prefix = /v1/secret/data/rgw
```

Create a Vault token with the appropriate policy and write it to the token file:

```bash
echo "s.yourVaultToken" > /etc/ceph/vault.token
chmod 600 /etc/ceph/vault.token
```

Upload an object with SSE-KMS:

```bash
aws s3 cp myfile.txt s3://my-secure-bucket/ \
  --sse aws:kms \
  --sse-kms-key-id mykey1 \
  --endpoint-url http://rgw.example.com:7480
```

## Verifying Encryption

Check object metadata to confirm encryption was applied:

```bash
aws s3api head-object \
  --bucket my-secure-bucket \
  --key myfile.txt \
  --endpoint-url http://rgw.example.com:7480
```

Look for `ServerSideEncryption` in the response.

## Summary

Ceph RGW supports SSE-S3 with Vault-managed keys (automatic key lifecycle) and SSE-KMS backed by HashiCorp Vault (user-managed keys). Configure the appropriate Vault backend in the RGW config, apply default encryption policies to buckets via the S3 API, and verify encryption via object HEAD requests. Use SSE-KMS for workloads requiring explicit control over key management.
