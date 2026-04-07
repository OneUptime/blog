# How to Configure Temporary Credentials with STS Lite in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, STS, Security

Description: Learn how to configure and use STS Lite in Ceph RGW to issue temporary S3 credentials for applications that need short-lived access without full IAM role infrastructure.

---

## Overview

STS Lite in Ceph RGW provides a simplified mechanism for issuing temporary credentials without the full IAM role setup required by `AssumeRole`. It is designed for cases where you want to grant time-limited S3 access to existing RGW users using their primary credentials. The session token is a self-contained encrypted blob (encrypted with `rgw_sts_key`) that embeds the temporary credentials and expiration.

## Step 1 - Enable STS Lite in RGW

```bash
# Enable STS authentication
ceph config set client.rgw.my-store rgw_s3_auth_use_sts true

# Set the STS encryption key (must be exactly 32 characters for AES-256)
ceph config set client.rgw.my-store rgw_sts_key "YourSTS32CharEncryptionKeyHere!!"

# Verify the configuration
ceph config get client.rgw.my-store rgw_s3_auth_use_sts
ceph config get client.rgw.my-store rgw_sts_key

# Restart RGW to apply changes
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-my-store-a
```

## Step 2 - Create a User for STS Lite Operations

```bash
# Create a user that will use STS Lite
radosgw-admin user create \
  --uid=sts-user \
  --display-name="STS Lite User" \
  --email=sts@example.com

# Export credentials
STS_ACCESS=$(radosgw-admin user info --uid=sts-user | jq -r '.keys[0].access_key')
STS_SECRET=$(radosgw-admin user info --uid=sts-user | jq -r '.keys[0].secret_key')
echo "Access: ${STS_ACCESS}"
echo "Secret: ${STS_SECRET}"
```

## Step 3 - Get a Temporary Session Token

Use `GetSessionToken` to obtain time-limited credentials:

```bash
# Get a session token using the existing user credentials
aws --endpoint-url http://rgw.example.com:7480 \
  --region us-east-1 \
  sts get-session-token \
  --duration-seconds 3600

# Sample response:
# {
#   "Credentials": {
#     "AccessKeyId": "temp-access-key",
#     "SecretAccessKey": "temp-secret-key",
#     "SessionToken": "temp-session-token",
#     "Expiration": "2026-03-31T13:00:00Z"
#   }
# }
```

## Step 4 - Use Temporary Credentials in an Application

```python
import boto3
from datetime import datetime

def get_temp_credentials(rgw_endpoint, access_key, secret_key, duration=3600):
    """Get temporary S3 credentials via STS Lite."""
    sts_client = boto3.client(
        "sts",
        endpoint_url=rgw_endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="us-east-1"
    )
    response = sts_client.get_session_token(DurationSeconds=duration)
    return response["Credentials"]

def create_s3_client_with_temp_creds(rgw_endpoint, temp_creds):
    """Create an S3 client using temporary credentials."""
    return boto3.client(
        "s3",
        endpoint_url=rgw_endpoint,
        aws_access_key_id=temp_creds["AccessKeyId"],
        aws_secret_access_key=temp_creds["SecretAccessKey"],
        aws_session_token=temp_creds["SessionToken"]
    )

# Usage
rgw_url = "http://rgw.example.com:7480"
creds = get_temp_credentials(rgw_url, "user-access-key", "user-secret-key")
s3 = create_s3_client_with_temp_creds(rgw_url, creds)

# List buckets with temporary credentials
response = s3.list_buckets()
for bucket in response["Buckets"]:
    print(f"Bucket: {bucket['Name']}, Created: {bucket['CreationDate']}")

# Check expiration
expiry = creds["Expiration"]
print(f"Credentials expire at: {expiry}")
```

## Step 5 - Implement Automatic Credential Refresh

```python
import boto3
from datetime import datetime, timezone, timedelta
import threading

class RefreshingS3Client:
    """S3 client that automatically refreshes temporary credentials."""

    def __init__(self, rgw_endpoint, access_key, secret_key, refresh_buffer_seconds=300):
        self.rgw_endpoint = rgw_endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.refresh_buffer = timedelta(seconds=refresh_buffer_seconds)
        self._lock = threading.Lock()
        self._refresh_credentials()

    def _refresh_credentials(self):
        sts = boto3.client("sts",
            endpoint_url=self.rgw_endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name="us-east-1")
        resp = sts.get_session_token(DurationSeconds=3600)
        self._creds = resp["Credentials"]

    def get_client(self):
        with self._lock:
            expiry = self._creds["Expiration"]
            if isinstance(expiry, str):
                from dateutil import parser
                expiry = parser.parse(expiry)
            if datetime.now(timezone.utc) >= expiry - self.refresh_buffer:
                self._refresh_credentials()
        return boto3.client("s3",
            endpoint_url=self.rgw_endpoint,
            aws_access_key_id=self._creds["AccessKeyId"],
            aws_secret_access_key=self._creds["SecretAccessKey"],
            aws_session_token=self._creds["SessionToken"])
```

## Step 6 - Monitor Active Sessions

```bash
# Check RGW logs for STS operations
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100 \
  | grep -i "get_session_token\|sts"

# Verify STS configuration is active
ceph config get client.rgw.my-store rgw_s3_auth_use_sts
```

## Summary

STS Lite in Ceph RGW provides a lightweight path to temporary credentials using `GetSessionToken` against existing user accounts. It requires only the STS encryption key and the `rgw_s3_auth_use_sts` flag, with no IAM role setup needed. Implementing automatic credential refresh in application clients prevents authentication failures near expiry and is a best practice for production workloads.
