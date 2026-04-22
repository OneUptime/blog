# How to Configure S3-Compatible Storage with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, S3, Object Storage, MinIO, Ceph RGW, AWS S3, Dual-Stack

Description: Configure S3-compatible object storage endpoints over IPv6, including endpoint URL formatting, AWS CLI and SDK configuration for IPv6, and common S3-compatible server setups.

## Introduction

S3-compatible object storage - including AWS S3 itself, MinIO, Ceph RADOS Gateway, and others - can serve API requests over IPv6. The primary considerations are endpoint URL formatting (bracket notation for IPv6 addresses), SDK configuration for IPv6 endpoints, and ensuring that storage servers listen on IPv6 interfaces.

## AWS CLI with IPv6 Endpoint

```bash
# AWS S3 now supports IPv6 through dual-stack endpoints

# Use the dual-stack endpoint URL format

# Configure AWS CLI to use dual-stack endpoint
aws configure set default.s3.use_dualstack_endpoint true

# Or specify the endpoint URL explicitly
aws s3 ls \
    --endpoint-url https://s3.dualstack.us-east-1.amazonaws.com \
    s3://mybucket

# List buckets through the dual-stack endpoint
aws s3api list-buckets \
    --endpoint-url https://s3.dualstack.us-east-1.amazonaws.com
```

## boto3 with IPv6 / Dual-Stack

```python
#!/usr/bin/env python3
# s3_ipv6_client.py

import boto3
from botocore.config import Config

# AWS S3 dual-stack endpoint (IPv6 is used when selected by the client/network)
s3_aws = boto3.client(
    's3',
    region_name='us-east-1',
    config=Config(
        s3={'use_dualstack_endpoint': True},
    )
)

# Self-hosted S3-compatible storage over IPv6 (MinIO, Ceph RGW, etc.)
s3_minio = boto3.client(
    's3',
    endpoint_url='http://[2001:db8::10]:9000',
    aws_access_key_id='accesskey',
    aws_secret_access_key='secretkey',
    config=Config(
        signature_version='s3v4',
        s3={'addressing_style': 'path'},
    ),
    region_name='us-east-1',
)

def upload_file(client, bucket: str, key: str, local_path: str) -> None:
    """Upload file to S3-compatible storage over IPv6."""
    client.upload_file(local_path, bucket, key)
    print(f"Uploaded {local_path} to s3://{bucket}/{key}")

def list_buckets(client) -> list:
    response = client.list_buckets()
    return [b['Name'] for b in response.get('Buckets', [])]

# Usage
buckets = list_buckets(s3_minio)
print(f"Buckets: {buckets}")
```

## Ceph RADOS Gateway (RGW) S3 over IPv6

```ini
# /etc/ceph/ceph.conf - RGW section
[client.rgw.rgw1]
host = ceph-rgw1
# Bind to all IPv6 interfaces
rgw_frontends = beast endpoint=[::]:7480

# For TLS
# rgw_frontends = beast ssl_endpoint=[::]:7443 ssl_certificate=... ssl_private_key=...
```

```bash
# Configure S3 credentials for Ceph RGW
radosgw-admin user create --uid=testuser --display-name="Test User"

# Access Ceph RGW S3 over IPv6
aws s3 ls \
    --endpoint-url http://[2001:db8::10]:7480

# Or with mc (MinIO client)
mc alias set ceph-rgw http://[2001:db8::10]:7480 accesskey secretkey
mc ls ceph-rgw
```

## MinIO with TLS over IPv6

```bash
# Generate TLS certificate for IPv6 SAN
openssl req -x509 -noenc -days 365 -newkey rsa:2048 \
    -keyout /etc/minio/certs/private.key \
    -out /etc/minio/certs/public.crt \
    -subj "/CN=minio" \
    -addext "subjectAltName=IP:2001:db8::10,DNS:minio.example.com"

# Start MinIO with TLS
MINIO_ROOT_USER=admin \
MINIO_ROOT_PASSWORD=password \
MINIO_SERVER_URL=https://[2001:db8::10]:9000 \
minio server /data \
    --address "[2001:db8::10]:9000" \
    --certs-dir /etc/minio/certs
```

## rclone with IPv6 S3 Endpoint

```ini
# ~/.config/rclone/rclone.conf

[minio-ipv6]
type = s3
provider = Minio
endpoint = http://[2001:db8::10]:9000
access_key_id = minioadmin
secret_access_key = minioadmin
force_path_style = true

[aws-dualstack]
type = s3
provider = AWS
region = us-east-1
# Use dual-stack endpoint for IPv6
use_dual_stack = true
```

```bash
# Test rclone with IPv6 S3
rclone lsd minio-ipv6:
rclone copy /local/data minio-ipv6:mybucket/data
```

## S3 Presigned URLs with IPv6

```python
#!/usr/bin/env python3
# presigned_ipv6.py

import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://[2001:db8::10]:9000',
    aws_access_key_id='accesskey',
    aws_secret_access_key='secretkey',
)

# Generate a presigned URL for download
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'mybucket', 'Key': 'myfile.txt'},
    ExpiresIn=3600
)
# URL will contain [2001:db8::10]:9000 in the endpoint
print(f"Presigned URL: {url}")
```

## Verify S3 IPv6 Connectivity

```bash
# Test basic S3 API over IPv6
curl -6 http://[2001:db8::10]:9000/minio/health/live

# List buckets via S3 API
curl -6 "http://[2001:db8::10]:9000/" \
    -H "Authorization: AWS4-HMAC-SHA256 ..."

# Check S3 server is listening on IPv6
ss -tlnp | grep 9000

# Trace network path to S3 endpoint
traceroute6 2001:db8::10
```

## Conclusion

S3-compatible storage over IPv6 requires the server to listen on `[::]:port` or specific IPv6 addresses, and clients to use bracket notation for IPv6 endpoint URLs (e.g., `http://[2001:db8::10]:9000`). AWS SDK clients support dual-stack endpoints via `use_dualstack_endpoint: True`; actual IPv4 or IPv6 selection depends on the client and network stack. Self-hosted solutions like MinIO and Ceph RGW bind to IPv6 via their respective configuration options. TLS certificates for IPv6 endpoints must include the IPv6 address as a Subject Alternative Name (SAN) IP entry. The S3 API protocol and authentication mechanisms work identically over IPv6 as over IPv4.
