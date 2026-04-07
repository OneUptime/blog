# How to Use Session Tags with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, IAM, Session, Object Storage, Authorization

Description: Learn how to use session tags with Ceph RGW STS to pass attributes that can be used in IAM policy conditions for fine-grained access control.

---

Session tags are key-value pairs that can be passed when assuming an IAM role via STS. These tags become available as condition variables in IAM policies, enabling attribute-based access control (ABAC) without creating separate roles for each user or group.

## What Are Session Tags

In Ceph RGW, session tags are currently supported via `AssumeRoleWithWebIdentity`. When using an OIDC provider, session tags are passed as claims inside the JWT token under the `https://aws.amazon.com/tags` namespace. These tags are then accessible in policy conditions via the `aws:PrincipalTag` prefix.

## Setting Up a Role with Tag-Based Policies

Create a role and attach a trust policy that validates session tags:

```bash
radosgw-admin role create \
  --role-name TaggedAccessRole \
  --path "/" \
  --assume-role-policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Federated": "arn:aws:iam:::oidc-provider/your-idp.example.com"},
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {"aws:RequestTag/department": "engineering"}
        }
      }
    ]
  }'
```

Attach a policy that restricts access based on the `department` session tag:

```bash
radosgw-admin role-policy put \
  --role-name TaggedAccessRole \
  --policy-name DepartmentBucketPolicy \
  --policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": "arn:aws:s3:::engineering-bucket/*",
        "Condition": {
          "StringEquals": {"aws:PrincipalTag/department": "engineering"}
        }
      }
    ]
  }'
```

## Passing Session Tags via OIDC JWT

Session tags in Ceph RGW are passed as claims in the JWT token from your OIDC provider. The token must include a `https://aws.amazon.com/tags` claim with a `principal_tags` structure:

```json
{
  "sub": "alice",
  "iss": "https://your-idp.example.com",
  "aud": "your-client-id",
  "https://aws.amazon.com/tags": {
    "principal_tags": {
      "department": ["engineering"],
      "team": ["backend"]
    }
  }
}
```

## Using AssumeRoleWithWebIdentity in Python with boto3

```python
import boto3

sts = boto3.client(
    'sts',
    endpoint_url='http://your-rgw-host:7480'
)

response = sts.assume_role_with_web_identity(
    RoleArn='arn:aws:iam:::role/TaggedAccessRole',
    RoleSessionName='alice-session',
    WebIdentityToken='<your-jwt-token-with-tags-claim>'
)

creds = response['Credentials']
print(f"Access Key: {creds['AccessKeyId']}")
```

## Validating Tags with Trust Policy Conditions

You can use `aws:RequestTag` and `aws:TagKeys` in the role's trust policy to control which tags are required or allowed:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Federated": "arn:aws:iam:::oidc-provider/your-idp.example.com"},
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {"aws:RequestTag/department": "engineering"},
        "ForAllValues:StringEquals": {"aws:TagKeys": ["department", "team"]}
      }
    }
  ]
}
```

The `aws:RequestTag` condition validates the value of a specific tag in the request, while `aws:TagKeys` validates which tag keys are present.

## Summary

Session tags in Ceph RGW enable attribute-based access control by embedding key-value pairs as claims in OIDC JWT tokens used with `AssumeRoleWithWebIdentity`. Policy conditions then use `aws:PrincipalTag` to restrict access based on those tags, and trust policies use `aws:RequestTag` and `aws:TagKeys` to validate incoming tags, reducing the number of roles needed and enabling a more scalable permission model.
