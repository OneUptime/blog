# How to Configure STS (Security Token Service) for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, STS, Security, Authentication, IAM, Object Storage

Description: Configure the Security Token Service (STS) in Ceph RGW to enable temporary credential issuance for federated identities and role-based access.

---

Ceph RGW implements a subset of the AWS Security Token Service (STS) API, allowing applications to obtain temporary credentials via AssumeRole, AssumeRoleWithWebIdentity, and GetSessionToken calls.

## Enabling STS in RGW

STS support requires RGW to have the `sts` capability enabled. Check it is built in:

```bash
radosgw-admin --version
# Ensure version is Pacific (16.x) or later for full STS support
```

Configure RGW to enable STS:

```bash
ceph config set client.rgw rgw_sts_key "your-32-char-secret-key-here!!!!"
ceph config set client.rgw rgw_s3_auth_use_sts true
```

## Creating an IAM Role for STS

Before issuing tokens, create a role with a trust policy:

```bash
radosgw-admin role create \
  --role-name S3AccessRole \
  --path "/" \
  --assume-role-policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam:::user/myuser"},
        "Action": "sts:AssumeRole"
      }
    ]
  }'
```

Attach a permissions policy to the role:

```bash
radosgw-admin role-policy put \
  --role-name S3AccessRole \
  --policy-name S3ReadPolicy \
  --policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:ListBucket"],
        "Resource": "*"
      }
    ]
  }'
```

## Calling AssumeRole with AWS CLI

```bash
aws sts assume-role \
  --role-arn "arn:aws:iam:::role/S3AccessRole" \
  --role-session-name "my-session" \
  --endpoint-url http://your-rgw-host:7480
```

The response provides temporary `AccessKeyId`, `SecretAccessKey`, and `SessionToken`:

```json
{
  "Credentials": {
    "AccessKeyId": "ASIA...",
    "SecretAccessKey": "...",
    "SessionToken": "...",
    "Expiration": "2026-03-31T12:00:00Z"
  }
}
```

## Using Temporary Credentials

```bash
export AWS_ACCESS_KEY_ID=ASIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

aws s3 ls s3://mybucket --endpoint-url http://your-rgw-host:7480
```

## GetSessionToken for MFA

Use `GetSessionToken` to get short-lived credentials for a user with MFA:

```bash
aws sts get-session-token \
  --serial-number 1234567890 \
  --token-code 123456 \
  --endpoint-url http://your-rgw-host:7480
```

## Summary

Ceph RGW's STS implementation allows issuing temporary credentials via the familiar AWS STS API. Create roles with trust and permission policies, then call AssumeRole or AssumeRoleWithWebIdentity to get short-lived tokens. This enables zero-standing-privilege patterns where applications never hold long-lived credentials.
