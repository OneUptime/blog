# How to Integrate Ceph RGW with OpenStack Barbican

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Barbican, Encryption, OpenStack

Description: Learn how to integrate Ceph RGW with OpenStack Barbican for server-side encryption key management, enabling secure object storage with centralized key control.

---

## Overview

OpenStack Barbican is a key management service that securely stores encryption keys, certificates, and secrets. Integrating Ceph RGW with Barbican enables Server-Side Encryption (SSE) where encryption keys are managed externally in Barbican rather than derived from a static secret. This provides key rotation, access auditing, and centralized key governance.

## Architecture

```text
Client --> RGW (SSE request) --> Barbican (key retrieval) --> Object encrypted in RADOS
```

When a client uploads an object with SSE, RGW requests the encryption key from Barbican using a key ID provided by the client. The object is encrypted before being stored in RADOS.

## Prerequisites

- OpenStack Barbican deployed and accessible
- Ceph RGW with Keystone integration (Barbican uses Keystone tokens)
- `rgw_crypt_s3_kms_backend = barbican` support in your Ceph version

## Configuring RGW for Barbican

```bash
# Enable SSE and configure Barbican as the KMS backend
ceph config set client.rgw rgw_crypt_require_ssl false  # Only for testing
ceph config set client.rgw rgw_crypt_s3_kms_backend barbican
ceph config set client.rgw rgw_barbican_url "http://barbican-host:9311"

# Configure Keystone credentials for Barbican access
ceph config set client.rgw rgw_keystone_url "http://keystone-host:5000"
ceph config set client.rgw rgw_keystone_barbican_user rgw-service
ceph config set client.rgw rgw_keystone_barbican_password rgw-password
ceph config set client.rgw rgw_keystone_barbican_domain Default
ceph config set client.rgw rgw_keystone_barbican_project service
```

## Creating a Secret in Barbican

Create an AES-256 encryption key in Barbican:

```bash
# Get a Keystone token
TOKEN=$(openstack token issue -f value -c id)

# Generate a symmetric key in Barbican
openstack secret order create key \
  --name rgw-encryption-key \
  --algorithm AES \
  --bit-length 256 \
  --mode CBC

# Retrieve the secret reference from the completed order
# openstack secret order get <order-href>
# The Secret href contains the UUID used as the key ID
# e.g.: http://barbican-host:9311/v1/secrets/SOME-UUID
```

## Uploading Encrypted Objects

Use the SSE-KMS API with the Barbican secret ID:

```bash
# Upload with SSE-KMS using the Barbican key ID
aws --endpoint-url http://rgw-host:80 s3 cp \
  sensitive.dat s3://mybucket/sensitive.dat \
  --sse aws:kms \
  --sse-kms-key-id "BARBICAN-SECRET-UUID"
```

With boto3:

```python
import boto3

s3 = boto3.client('s3', endpoint_url='http://rgw-host:80',
    aws_access_key_id='KEY', aws_secret_access_key='SECRET')

s3.put_object(
    Bucket='mybucket',
    Key='sensitive.dat',
    Body=open('sensitive.dat', 'rb'),
    ServerSideEncryption='aws:kms',
    SSEKMSKeyId='BARBICAN-SECRET-UUID'
)
```

## Verifying Encryption

```bash
# Head object to verify SSE is active
aws --endpoint-url http://rgw-host:80 s3api head-object \
  --bucket mybucket \
  --key sensitive.dat

# Output should include:
# "ServerSideEncryption": "aws:kms"
# "SSEKMSKeyId": "BARBICAN-SECRET-UUID"
```

## Key Rotation

Rotate the encryption key in Barbican and re-upload objects:

```bash
# Create a new key in Barbican
openstack secret order create key \
  --name rgw-encryption-key-v2 \
  --algorithm AES \
  --bit-length 256 \
  --mode CBC

# Re-encrypt existing objects with the new key
aws --endpoint-url http://rgw-host:80 s3 cp \
  s3://mybucket/sensitive.dat s3://mybucket/sensitive.dat \
  --sse aws:kms \
  --sse-kms-key-id "NEW-BARBICAN-SECRET-UUID"
```

## Summary

Integrating Ceph RGW with OpenStack Barbican provides enterprise-grade key management for server-side encryption. Configure RGW with the Barbican URL and Keystone credentials, create encryption keys in Barbican, and upload objects using the SSE-KMS API. This architecture supports key rotation, access auditing, and separation of encryption key management from storage operations.
