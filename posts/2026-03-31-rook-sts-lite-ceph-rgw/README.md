# How to Use STS Lite with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, STS, Authentication, Security, Object Storage, Federation

Description: Learn how to use STS Lite in Ceph RGW to allow existing RGW users to obtain temporary session tokens without creating IAM roles.

---

STS Lite is a simplified STS mode in Ceph RGW that allows regular RGW users to call `GetSessionToken` to obtain temporary credentials. Unlike full STS, it does not require IAM role setup, making it simpler for use cases where you just need short-lived credentials for existing users.

## STS Lite vs Full STS

| Feature | STS Lite | Full STS |
|---------|---------|---------|
| GetSessionToken | Yes | Yes |
| AssumeRole | No | Yes |
| AssumeRoleWithWebIdentity | No | Yes |
| Requires IAM roles | No | Yes |
| Use case | Simple session tokens | Full federation |

## Enabling STS Lite

STS Lite is enabled alongside the standard STS configuration:

```bash
ceph config set client.rgw rgw_sts_key "your-32-char-secret-key-here!!"
ceph config set client.rgw rgw_s3_auth_use_sts true
```

No additional flags are needed for STS Lite - `GetSessionToken` works for any RGW user.

## Calling GetSessionToken

Use an existing RGW user's access and secret keys to obtain a session token:

```bash
aws sts get-session-token \
  --duration-seconds 3600 \
  --endpoint-url http://your-rgw-host:7480
```

This returns temporary credentials valid for the specified duration (default 3600 seconds, max 43200 seconds):

```json
{
  "Credentials": {
    "AccessKeyId": "ASIA1234567890EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/...",
    "SessionToken": "AQoXnyc...",
    "Expiration": "2026-03-31T13:00:00Z"
  }
}
```

## Using Session Tokens in Applications

In Python with boto3:

```python
import boto3

sts_client = boto3.client(
    'sts',
    endpoint_url='http://your-rgw-host:7480',
    aws_access_key_id='user-access-key',
    aws_secret_access_key='user-secret-key',
    region_name='default'
)

response = sts_client.get_session_token(DurationSeconds=3600)
creds = response['Credentials']

s3_client = boto3.client(
    's3',
    endpoint_url='http://your-rgw-host:7480',
    aws_access_key_id=creds['AccessKeyId'],
    aws_secret_access_key=creds['SecretAccessKey'],
    aws_session_token=creds['SessionToken']
)

# Use the temporary credentials
s3_client.list_buckets()
```

## STS Lite with MFA

If the user has MFA configured, include the serial and OTP:

```bash
aws sts get-session-token \
  --serial-number "arn:aws:iam:::mfa/myuser" \
  --token-code 123456 \
  --duration-seconds 900 \
  --endpoint-url http://your-rgw-host:7480
```

## Token Expiration Handling

Always handle expired token errors in your application:

```python
from botocore.exceptions import ClientError

try:
    s3_client.list_objects_v2(Bucket='mybucket')
except ClientError as e:
    if e.response['Error']['Code'] == 'ExpiredToken':
        # Re-obtain session token
        pass
```

## Summary

STS Lite provides a lightweight path to temporary credentials in Ceph RGW for existing users, without the overhead of configuring IAM roles. It is ideal for short-lived automation scripts, CI/CD pipelines, and any scenario where you want to limit credential exposure time without a full federation setup.
