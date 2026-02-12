# How to Set Up IAM Policies for S3 Bucket Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, S3, Security

Description: Learn how to create IAM policies for S3 bucket access, covering read-only, write, prefix-based, cross-account, and conditional access patterns.

---

S3 is probably the most commonly accessed AWS service, and getting its IAM policies right is critical. Too permissive and you risk data leaks. Too restrictive and your applications break. The challenge with S3 is that it has two levels of resources - the bucket itself and the objects inside it - and they require different permissions.

This guide covers the most common S3 IAM policy patterns, from basic read/write to advanced prefix-based and conditional access.

## Understanding S3 Resource ARNs

S3 has two distinct resource types, and this trips up a lot of people:

- **Bucket**: `arn:aws:s3:::my-bucket` - Used for bucket-level operations (ListBucket, GetBucketLocation)
- **Objects**: `arn:aws:s3:::my-bucket/*` - Used for object-level operations (GetObject, PutObject)

If you only specify the bucket ARN, object operations won't work. If you only specify the objects wildcard, bucket-level operations won't work. You almost always need both.

## Read-Only Access to a Specific Bucket

The most common pattern - allow a user or role to read objects from a bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-data-bucket"
    },
    {
      "Sid": "AllowGetObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::my-data-bucket/*"
    }
  ]
}
```

Why two statements? `ListBucket` operates on the bucket resource, while `GetObject` operates on object resources. Mixing them in one statement with both ARNs doesn't work the way you'd expect.

## Read-Write Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBucketOperations",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket"
    },
    {
      "Sid": "AllowObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket/*"
    }
  ]
}
```

## Prefix-Based Access (Folder Restrictions)

Restrict users to a specific "folder" (prefix) within a bucket. This is common for multi-tenant applications where each customer or team gets their own prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucketInPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::shared-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "team-alpha/*",
            "team-alpha"
          ]
        }
      }
    },
    {
      "Sid": "AllowObjectAccessInPrefix",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::shared-bucket/team-alpha/*"
    }
  ]
}
```

The `s3:prefix` condition on `ListBucket` ensures users can only list objects in their prefix. Without it, they could see the names of other teams' files even if they can't read them.

### Dynamic Prefix Based on Username

You can use IAM policy variables for per-user prefixes:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUserOwnPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::user-uploads",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["${aws:username}/*"]
        }
      }
    },
    {
      "Sid": "AllowUserOwnObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::user-uploads/${aws:username}/*"
    }
  ]
}
```

Each user can only access objects under their own username prefix.

## Upload-Only (Write Without Read)

For ingestion pipelines where you want to receive data but not allow reading it back:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUploadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::data-ingestion-bucket/*"
    }
  ]
}
```

This is great for log shipping, data collection, and file drop-offs.

## Enforcing Encryption

Require that all uploaded objects are encrypted:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowObjectUpload",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::secure-bucket/*"
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::secure-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

This allows uploads but only if they include KMS encryption. Unencrypted uploads are denied.

## Cross-Account S3 Access

For sharing a bucket with another account, you can use either identity-based policies (with role assumption) or a bucket policy (resource-based). The bucket policy approach is simpler:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountRead",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::987654321098:role/DataPipelineRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::shared-data-bucket",
        "arn:aws:s3:::shared-data-bucket/*"
      ]
    }
  ]
}
```

For the identity-based approach, see our guide on [cross-account IAM roles](https://oneuptime.com/blog/post/set-up-cross-account-iam-roles-shared-services/view). For a deeper comparison, check [resource-based vs identity-based policies](https://oneuptime.com/blog/post/resource-based-policies-vs-identity-based-policies/view).

## IP-Based Restrictions

Restrict S3 access to specific IP addresses or CIDR ranges:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowFromOfficeOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::internal-docs",
        "arn:aws:s3:::internal-docs/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24",
            "198.51.100.0/24"
          ]
        }
      }
    }
  ]
}
```

## VPC Endpoint Restriction

Lock down a bucket so it can only be accessed through a VPC endpoint:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAccessOutsideVPC",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::private-bucket",
        "arn:aws:s3:::private-bucket/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-abc123def456"
        }
      }
    }
  ]
}
```

This is a bucket policy (resource-based) that denies all access unless it comes through the specified VPC endpoint.

## Testing Policies with the Policy Simulator

Before deploying, test your policies:

```bash
# Simulate whether a role can access a specific S3 object
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/AppRole \
  --action-names s3:GetObject s3:PutObject s3:ListBucket \
  --resource-arns \
    arn:aws:s3:::my-bucket \
    arn:aws:s3:::my-bucket/test.txt
```

## Common Mistakes

**Mixing bucket and object ARNs in one statement**: This is the number one S3 policy mistake. `ListBucket` needs the bucket ARN; `GetObject` needs the object ARN with `/*`.

**Forgetting `s3:ListBucket`**: Without it, your application gets `Access Denied` when trying to list files, even though it can read individual files.

**Using `s3:*` in production**: This grants every S3 action including `DeleteBucket`, `PutBucketPolicy`, and `PutBucketPublicAccessBlock`. Be explicit about what you need.

**Not considering `s3:GetBucketLocation`**: Some SDKs call this automatically. If it's not allowed, you get unexpected errors.

S3 access policies require attention to the bucket/object resource distinction and careful scoping of actions. Start with the minimum permissions, test thoroughly, and expand only when needed. Your data security depends on getting this right.
