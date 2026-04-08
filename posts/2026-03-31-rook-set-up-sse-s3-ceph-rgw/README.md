# How to Set Up Server-Side Encryption (SSE-S3) for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, SSE-S3, Encryption, Object Storage

Description: Learn how to enable SSE-S3 server-side encryption for Ceph RADOS Gateway, configure the encryption backend, and upload objects with automatic server-side encryption.

---

## What is SSE-S3?

SSE-S3 (Server-Side Encryption with S3-Managed Keys) is an AWS S3-compatible encryption model where the object storage service manages encryption keys transparently. When enabled, all objects are encrypted at rest using AES-256, and clients don't need to manage any keys.

## Prerequisites

- Ceph 14.2+ (Nautilus)
- A running Ceph RGW instance
- A HashiCorp Vault instance for key management

## Configuring SSE-S3 on Ceph RGW

### Step 1: Set the RGW Encryption Backend

SSE-S3 in Ceph RGW requires HashiCorp Vault as the key management backend:

```bash
ceph config set client.rgw rgw_crypt_sse_s3_backend vault
ceph config set client.rgw rgw_crypt_sse_s3_vault_addr https://vault.example.com:8200
ceph config set client.rgw rgw_crypt_sse_s3_vault_secret_engine transit
ceph config set client.rgw rgw_crypt_sse_s3_vault_auth token
ceph config set client.rgw rgw_crypt_sse_s3_vault_token_file /etc/ceph/vault.token
```

### Step 2: Disable SSL Requirement (Testing Only)

For testing environments without TLS, you can disable the SSL requirement:

```bash
ceph config set client.rgw rgw_crypt_require_ssl false
```

### Step 3: Restart RGW

```bash
ceph orch restart rgw.default
```

Or in Rook:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Using SSE-S3 with the AWS CLI

Upload an object with SSE-S3 encryption:

```bash
aws s3 cp myfile.txt s3://mybucket/myfile.txt \
  --sse AES256 \
  --endpoint-url https://rgw.example.com
```

Verify the object is encrypted:

```bash
aws s3api head-object \
  --bucket mybucket \
  --key myfile.txt \
  --endpoint-url https://rgw.example.com
```

The response should include:
```json
{
  "ServerSideEncryption": "AES256"
}
```

## Enforcing SSE-S3 via Bucket Policy

Require all objects to use SSE-S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mybucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket mybucket \
  --policy file://policy.json \
  --endpoint-url https://rgw.example.com
```

## Configuring via Rook CephObjectStore

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    securePort: 443
  security:
    s3:
      enabled: true
      kmsEnabled: false
```

## Summary

SSE-S3 in Ceph RGW encrypts objects at rest using AES-256 with server-managed keys. Configure the encryption backend using `ceph config set`, restart RGW, then use the `--sse AES256` flag with the AWS CLI to encrypt objects. Enforce encryption using bucket policies to ensure no unencrypted data is stored, and use a KMS backend instead of the built-in key manager for production deployments.
