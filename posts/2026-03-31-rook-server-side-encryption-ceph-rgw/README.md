# How to Set Up Server-Side Encryption for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Security, Object Storage, Kubernetes

Description: Learn how to configure server-side encryption (SSE) for Ceph RADOS Gateway using SSE-S3 and SSE-KMS modes to protect data at rest.

---

Server-side encryption (SSE) in Ceph RGW ensures that objects are encrypted before being stored on disk. Ceph supports two main SSE modes: SSE-S3 (managed by RGW itself) and SSE-KMS (delegated to an external key management service like HashiCorp Vault).

## Prerequisites

Before enabling SSE, ensure your Ceph cluster is running and RGW is configured. You also need `radosgw-admin` access and optionally a Vault instance for KMS-based encryption.

## Enabling SSE-S3

SSE-S3 uses RGW to manage encryption keys. Enable it by configuring the SSE-S3 backend. For testing environments, you can use the built-in testing backend:

```bash
ceph config set client.rgw rgw_crypt_sse_s3_backend testing
ceph config set client.rgw rgw_crypt_require_ssl false
```

For production, use Vault as the SSE-S3 backend and enable SSL:

```bash
ceph config set client.rgw rgw_crypt_sse_s3_backend vault
ceph config set client.rgw rgw_crypt_sse_s3_vault_addr https://vault.example.com:8200
ceph config set client.rgw rgw_crypt_sse_s3_vault_secret_engine transit
ceph config set client.rgw rgw_crypt_require_ssl true
```

Restart RGW after applying config changes:

```bash
sudo systemctl restart ceph-radosgw@rgw.$(hostname -s)
```

Upload an object with SSE-S3:

```bash
aws s3 cp myfile.txt s3://mybucket/myfile.txt \
  --sse AES256 \
  --endpoint-url http://your-rgw-host:7480
```

## Enabling SSE-KMS with HashiCorp Vault

For stronger key management, integrate with Vault:

```bash
ceph config set client.rgw rgw_crypt_s3_kms_backend vault
ceph config set client.rgw rgw_crypt_vault_addr http://vault.example.com:8200
ceph config set client.rgw rgw_crypt_vault_token_file /etc/ceph/vault.token
ceph config set client.rgw rgw_crypt_vault_secret_engine kv
ceph config set client.rgw rgw_crypt_vault_prefix /v1/secret/data
```

Upload with SSE-KMS specifying a key ID:

```bash
aws s3 cp myfile.txt s3://mybucket/myfile.txt \
  --sse aws:kms \
  --sse-kms-key-id my-vault-key \
  --endpoint-url http://your-rgw-host:7480
```

## Rook/Kubernetes Configuration

When running RGW via Rook, configure encryption in the CephObjectStore spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    instances: 1
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: http://vault.default.svc:8200
        VAULT_BACKEND_PATH: secret
      tokenSecretName: vault-kms-token
```

Create the token secret:

```bash
kubectl create secret generic vault-kms-token \
  --from-literal=token=your-vault-token \
  -n rook-ceph
```

## Verifying Encryption

Check that an object is stored encrypted by inspecting its metadata:

```bash
aws s3api head-object \
  --bucket mybucket \
  --key myfile.txt \
  --endpoint-url http://your-rgw-host:7480
```

The response should include `ServerSideEncryption: AES256` or `aws:kms` confirming encryption is active.

## Summary

Ceph RGW supports SSE-S3 for built-in key management and SSE-KMS for integration with external KMS providers like Vault. When deployed via Rook, encryption is configured declaratively in the CephObjectStore resource. Always enforce SSL to prevent key leakage over the wire.
