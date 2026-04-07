# How to Set Up Server-Side Encryption with Customer Keys (SSE-C) for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, SSE-C, Encryption, Object Storage, Security

Description: Learn how to configure SSE-C customer-provided key encryption for Ceph RADOS Gateway, upload objects with your own keys, and manage key rotation for encrypted objects.

---

## What is SSE-C?

SSE-C (Server-Side Encryption with Customer-Provided Keys) allows you to provide your own encryption key with each request. Ceph RGW uses the provided key to encrypt the object, then discards the key. You must provide the same key to decrypt the object later.

## How SSE-C Works

1. Client generates an AES-256 key
2. Client sends the key in the request header
3. RGW encrypts the object with the key
4. RGW stores an HMAC of the key (not the key itself) for validation
5. RGW discards the key
6. On download, client provides the same key; RGW validates via HMAC

## Prerequisites

- Ceph RGW with SSL/TLS enabled (SSE-C requires HTTPS)
- Client library that supports SSE-C headers

## Uploading an Object with SSE-C

Generate an AES-256 key:

```bash
KEY=$(openssl rand -base64 32)
KEY_MD5=$(echo -n "$KEY" | base64 -d | md5sum | awk '{print $1}' | xxd -r -p | base64)
```

Upload with AWS CLI:

```bash
aws s3 cp myfile.txt s3://mybucket/myfile.txt \
  --sse-c AES256 \
  --sse-c-key "$KEY" \
  --endpoint-url https://rgw.example.com
```

## Downloading with SSE-C

You must provide the same key used to encrypt:

```bash
aws s3 cp s3://mybucket/myfile.txt myfile-decrypted.txt \
  --sse-c AES256 \
  --sse-c-key "$KEY" \
  --endpoint-url https://rgw.example.com
```

If you provide the wrong key:

```text
An error occurred (AccessDenied): The provided key does not match the key used to encrypt the object.
```

## Using SSE-C with Python boto3

```python
import boto3
import os
import base64

s3 = boto3.client(
    's3',
    endpoint_url='https://rgw.example.com',
    aws_access_key_id='my-access-key',
    aws_secret_access_key='my-secret-key'
)

# Generate a 32-byte key
key_bytes = os.urandom(32)
key_b64 = base64.b64encode(key_bytes).decode()

# Upload with SSE-C
s3.put_object(
    Bucket='mybucket',
    Key='myfile.txt',
    Body=b'Hello, World!',
    SSECustomerAlgorithm='AES256',
    SSECustomerKey=key_bytes
)

# Download with SSE-C
response = s3.get_object(
    Bucket='mybucket',
    Key='myfile.txt',
    SSECustomerAlgorithm='AES256',
    SSECustomerKey=key_bytes
)
data = response['Body'].read()
```

## Key Rotation with SSE-C

To rotate keys, use the `copy-object` API with the old key as source and new key as destination:

```bash
aws s3api copy-object \
  --bucket mybucket \
  --copy-source mybucket/myfile.txt \
  --key myfile.txt \
  --sse-customer-algorithm AES256 \
  --sse-customer-key "$NEW_KEY" \
  --copy-source-sse-customer-algorithm AES256 \
  --copy-source-sse-customer-key "$OLD_KEY" \
  --endpoint-url https://rgw.example.com
```

## Summary

SSE-C gives you full control over encryption keys, since Ceph RGW never stores them. Always use HTTPS when transmitting keys. Manage keys with a dedicated secrets manager or KMS, and implement key rotation using the S3 copy-object API. Because key loss means permanent data loss, SSE-C is best suited for scenarios where your key management infrastructure is more trusted than the Ceph cluster's key storage.
