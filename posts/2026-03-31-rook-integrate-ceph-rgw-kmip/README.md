# How to Integrate Ceph RGW with KMIP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, KMIP, Encryption, Key Management

Description: Learn how to integrate Ceph RGW with a KMIP-compliant key management server for enterprise-grade server-side encryption key management.

---

## Overview

The Key Management Interoperability Protocol (KMIP) is an industry standard for communication between key management systems and encryption clients. Ceph RGW supports KMIP as a backend for SSE-KMS, allowing you to use any KMIP-compliant KMS - including Thales, Fortanix, or HashiCorp Vault with KMIP plugin - for encryption key management.

## KMIP Overview

KMIP provides a standardized API for:
- Creating and managing cryptographic keys
- Requesting managed objects for encryption
- Rotating and revoking keys
- Auditing key usage

## Prerequisites

- A KMIP-compliant KMS server (e.g., Thales CipherTrust, PyKMIP for testing)
- TLS client certificates for RGW to authenticate to the KMS
- Ceph RGW version supporting KMIP backend (Ceph 17+)

## Setting Up PyKMIP for Testing

```bash
# Install PyKMIP server for testing
pip install pykmip

# Generate CA and server certificates
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 3650

openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365

# Start PyKMIP server
pykmip-server -f kmip.conf
```

## Generating Client Certificates for RGW

```bash
# Generate client certificate for RGW
openssl genrsa -out rgw-client.key 2048
openssl req -new -key rgw-client.key -out rgw-client.csr \
  -subj "/CN=ceph-rgw/O=ceph"
openssl x509 -req -in rgw-client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out rgw-client.crt -days 365

# Copy to RGW host
cp rgw-client.key /etc/ceph/kmip-client.key
cp rgw-client.crt /etc/ceph/kmip-client.crt
cp ca.crt /etc/ceph/kmip-ca.crt
```

## Creating an Encryption Key in KMIP

```python
from kmip.pie.client import ProxyKmipClient
from kmip import enums

client = ProxyKmipClient(
    hostname='kmip-host',
    port=5696,
    certfile='rgw-client.crt',
    keyfile='rgw-client.key',
    ca_certs='ca.crt'
)

with client:
    # Create a managed symmetric key
    key_id = client.create(
        enums.CryptographicAlgorithm.AES,
        256,
        name='rgw-s3-key'
    )
    print(f"Created key with ID: {key_id}")
```

## Configuring RGW for KMIP

```bash
# Configure KMIP backend
ceph config set client.rgw rgw_crypt_s3_kms_backend kmip

# KMIP server connection
ceph config set client.rgw rgw_crypt_kmip_addr "kmip-host:5696"

# TLS client certificates
ceph config set client.rgw rgw_crypt_kmip_client_cert /etc/ceph/kmip-client.crt
ceph config set client.rgw rgw_crypt_kmip_client_key /etc/ceph/kmip-client.key
ceph config set client.rgw rgw_crypt_kmip_ca_path /etc/ceph/kmip-ca.crt

# Restart RGW to apply config
systemctl restart ceph-radosgw@rgw.default
```

## Uploading Encrypted Objects

```bash
# Upload using the KMIP key ID
aws --endpoint-url http://rgw-host:80 s3 cp \
  confidential.pdf s3://mybucket/confidential.pdf \
  --sse aws:kms \
  --sse-kms-key-id "KMIP-KEY-UUID"
```

## Verifying KMIP Integration

```bash
# Check RGW logs for KMIP connections
grep "kmip" /var/log/ceph/ceph-client.rgw.*.log

# Verify objects show SSE-KMS headers
aws --endpoint-url http://rgw-host:80 s3api head-object \
  --bucket mybucket \
  --key confidential.pdf | grep -i sse
```

## Summary

KMIP integration in Ceph RGW enables enterprise key management through a vendor-neutral standard protocol. Configure RGW with the KMIP server address and mutual TLS certificates, create keys in the KMS, and reference key IDs in S3 SSE-KMS upload requests. KMIP provides hardware security module (HSM) integration, key rotation, and detailed audit trails as required by compliance frameworks such as PCI-DSS and HIPAA.
