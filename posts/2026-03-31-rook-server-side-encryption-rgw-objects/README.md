# How to Set Up Server-Side Encryption for RGW Objects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Encryption, S3, Object Storage, Security

Description: Learn how to configure server-side encryption (SSE) for Ceph RADOS Gateway objects, supporting SSE-C and SSE-KMS modes compatible with S3 applications.

---

Ceph RADOS Gateway (RGW) supports S3-compatible server-side encryption (SSE) for objects stored in buckets. This allows clients to upload data that is encrypted before being written to Ceph's storage backend, protecting object content at rest.

## SSE Modes Supported by RGW

RGW supports two server-side encryption modes:

- **SSE-C (Customer-Provided Keys)** - The client provides the encryption key in the request header. RGW encrypts the data with this key and does not store it.
- **SSE-KMS (Key Management Service)** - RGW fetches the encryption key from an external KMS (such as HashiCorp Vault) using a key ID specified in the request.

## Configuring SSE-KMS with HashiCorp Vault

First, enable KMS configuration in the Rook CephObjectStore:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-rgw
        VAULT_SECRET_PATH: secret/data/rgw-encryption
      tokenSecretName: rook-vault-token
```

Enable SSE in the RGW configuration via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store]
    rgw_crypt_require_ssl = false
    rgw_crypt_s3_kms_backend = vault
```

## Using SSE-C with the AWS CLI

Test SSE-C by providing an encryption key with each request:

```bash
# Generate a 256-bit key
KEY=$(openssl rand -base64 32)
KEY_MD5=$(echo -n "$KEY" | base64 --decode | openssl dgst -md5 -binary | base64)

# Upload with SSE-C
aws s3api put-object \
  --bucket mybucket \
  --key myobject.txt \
  --body myfile.txt \
  --sse-customer-algorithm AES256 \
  --sse-customer-key "$KEY" \
  --sse-customer-key-md5 "$KEY_MD5" \
  --endpoint-url http://rgw-endpoint:80
```

## Using SSE-KMS with the AWS CLI

With KMS integration configured, specify the key ID in the request:

```bash
# Upload with SSE-KMS
aws s3api put-object \
  --bucket mybucket \
  --key myobject.txt \
  --body myfile.txt \
  --server-side-encryption aws:kms \
  --ssekms-key-id "my-vault-key-id" \
  --endpoint-url http://rgw-endpoint:80

# Verify encryption metadata
aws s3api head-object \
  --bucket mybucket \
  --key myobject.txt \
  --endpoint-url http://rgw-endpoint:80
```

## Enforcing Encryption via Bucket Policy

Require all uploads to be encrypted by attaching a bucket policy:

```bash
aws s3api put-bucket-policy \
  --bucket mybucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mybucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }]
  }' \
  --endpoint-url http://rgw-endpoint:80
```

## Monitoring Encryption Status

Check RGW logs for encryption-related activity:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-rgw | grep -i "crypt\|kms\|sse"
```

## Summary

Ceph RGW supports S3-compatible SSE in both SSE-C and SSE-KMS modes. SSE-C allows clients to provide their own keys per request, while SSE-KMS integrates with an external key manager like HashiCorp Vault. In Rook, KMS integration is configured in the CephObjectStore spec and optional bucket policies can enforce that all uploads use encryption.
