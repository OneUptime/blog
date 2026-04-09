# How to Configure KMS for Object Store Encryption in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, KMS, Encryption, Security

Description: Learn how to configure KMS-based server-side encryption for Rook object store, encrypting S3 objects at rest using Vault or other KMS providers.

---

## Server-Side Encryption for Object Storage

Ceph RGW supports server-side encryption (SSE) for S3 objects. When SSE is enabled, object data is encrypted before being written to RADOS and decrypted on read. RGW supports two SSE modes:

- **SSE-KMS**: RGW fetches encryption keys from an external Key Management Service (KMS) like HashiCorp Vault
- **SSE-S3**: RGW manages its own master key using the KMS for key derivation

Using an external KMS ensures keys are never stored on the Ceph cluster, providing separation of duties for compliance requirements.

## Setting Up HashiCorp Vault for RGW SSE-KMS

On your Vault cluster, enable the transit secrets engine and create an encryption key:

```bash
vault secrets enable transit
vault write -f transit/keys/rgw-s3-key type=aes256-gcm96
```

Create a Vault policy for RGW:

```hcl
path "transit/keys/rgw-s3-key" {
  capabilities = ["read"]
}
path "transit/datakey/plaintext/rgw-s3-key" {
  capabilities = ["create", "update"]
}
path "transit/decrypt/rgw-s3-key" {
  capabilities = ["create", "update"]
}
```

```bash
vault policy write rgw-policy rgw-policy.hcl
vault token create -policy=rgw-policy -period=24h
```

## Creating the KMS Secret in Rook

Store the Vault token as a Kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vault-kms-secret
  namespace: rook-ceph
type: Opaque
stringData:
  token: "s.yourVaultToken"
```

## Configuring RGW for KMS via rgwConfig

Apply KMS settings in the `CephObjectStore` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
    rgwConfig:
      rgw_crypt_s3_kms_backend: "vault"
      rgw_crypt_vault_addr: "https://vault.example.com:8200"
      rgw_crypt_vault_auth: "token"
      rgw_crypt_vault_token_file: "/etc/ceph/vault-token"
      rgw_crypt_vault_secret_engine: "transit"
      rgw_crypt_vault_prefix: "/v1/transit"
```

Mount the Vault token into the RGW pods using the `rgwConfigFromSecret` feature:

```yaml
gateway:
  rgwConfigFromSecret:
    rgw_crypt_vault_token_file:
      name: vault-kms-secret
      key: token
```

## Uploading Encrypted Objects

Request SSE-KMS encryption when uploading:

```bash
aws s3 cp myfile.txt s3://my-bucket/myfile.txt \
  --sse aws:kms \
  --sse-kms-key-id rgw-s3-key \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

For SSE-S3 (using the default managed key):

```bash
aws s3 cp myfile.txt s3://my-bucket/myfile.txt \
  --sse AES256 \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Verifying Encryption

Check that the uploaded object is marked as encrypted:

```bash
aws s3api head-object \
  --bucket my-bucket \
  --key myfile.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

The response includes `ServerSideEncryption: aws:kms` and `SSEKMSKeyId` for KMS-encrypted objects.

## Summary

KMS-based encryption for Rook object store is configured by enabling the transit secrets engine in Vault, creating an encryption key, and setting `rgw_crypt_*` options in the `CephObjectStore` `rgwConfig` or via `rgwConfigFromSecret`. Clients request encryption at upload time using the `--sse aws:kms` flag. This provides compliance-grade encryption where keys are managed outside the Ceph cluster, enforcing separation of duties between storage administrators and security teams.
