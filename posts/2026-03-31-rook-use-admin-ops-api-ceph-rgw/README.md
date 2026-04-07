# How to Use the Admin Ops API with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Admin API, REST, Object Storage

Description: Learn how to use the Ceph RGW Admin Ops REST API to programmatically manage users, buckets, and quotas without the radosgw-admin CLI.

---

## Overview

The Ceph RGW Admin Ops API is a REST API that exposes administrative operations over HTTP. It mirrors the functionality of `radosgw-admin` but is accessible programmatically, making it suitable for automation, dashboards, and integrations. The API requires a system-level user for authentication.

## Enabling the Admin API

The Admin Ops API is available at the `/admin` path on the RGW endpoint. Ensure the admin URL is accessible:

```bash
# Test admin API access
curl -v "http://rgw-host:80/admin/info" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINKEY:ADMINSECRET"
```

## Creating a System User for Admin API

```bash
# Create a system user
radosgw-admin user create \
  --uid=rgw-admin \
  --display-name="RGW Admin User" \
  --system \
  --access-key=ADMINACCESSKEY \
  --secret=ADMINSECRETKEY
```

## User Management via Admin API

```bash
# Get user info
curl -X GET "http://rgw-host:80/admin/user?uid=alice" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"

# Create a user
curl -X PUT "http://rgw-host:80/admin/user?uid=bob&display-name=Bob+Smith" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"

# Delete a user
curl -X DELETE "http://rgw-host:80/admin/user?uid=bob&purge-data=true" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"
```

## Bucket Operations via Admin API

```bash
# Get bucket info
curl -X GET "http://rgw-host:80/admin/bucket?bucket=mybucket" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"

# Link bucket to user
curl -X PUT "http://rgw-host:80/admin/bucket?bucket=mybucket&uid=alice" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"

# Get bucket usage stats
curl -X GET "http://rgw-host:80/admin/bucket?bucket=mybucket&stats=true" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"
```

## Quota Management

```bash
# Set user quota
curl -X PUT \
  "http://rgw-host:80/admin/user?quota&uid=alice&quota-type=user" \
  -d '{"max_size_kb": 10485760, "max_objects": 100000, "enabled": true}' \
  -H "Content-Type: application/json" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "ADMINACCESSKEY:ADMINSECRETKEY"
```

## Using Python with the Admin API

```python
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

def admin_api_request(method, path, params=None):
    url = f"http://rgw-host:80/admin/{path}"
    credentials = Credentials('ADMINACCESSKEY', 'ADMINSECRETKEY')

    request = AWSRequest(method=method, url=url, params=params)
    SigV4Auth(credentials, 's3', 'us-east-1').add_auth(request)

    response = requests.request(
        method,
        url,
        headers=dict(request.headers),
        params=params
    )
    return response.json()

# Get user info
user = admin_api_request('GET', 'user', {'uid': 'alice'})
print(user)
```

## Summary

The Ceph RGW Admin Ops REST API enables programmatic access to all administrative operations. It requires a system user for authentication and uses the same AWS Signature V4 signing as the S3 API. Use it to build automation workflows, monitoring dashboards, or integrate RGW management into existing infrastructure platforms. Python scripts using SigV4 authentication provide a clean way to interact with the API without the CLI.
