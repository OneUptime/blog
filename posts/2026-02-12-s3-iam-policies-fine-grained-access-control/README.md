# How to Use S3 with IAM Policies for Fine-Grained Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, IAM, Security

Description: A comprehensive guide to implementing fine-grained access control for S3 buckets using IAM policies, including prefix-based restrictions, tag conditions, and MFA requirements.

---

S3 bucket access goes way beyond just "allow" or "deny." With IAM policies, you can control who accesses what at an incredibly granular level - down to specific prefixes, file types, time windows, and even requiring MFA for sensitive operations. Let's dig into how to set this up properly.

## Understanding S3 Policy Evaluation

Before writing policies, it's worth understanding how AWS evaluates them. When a request hits S3, AWS checks multiple policies in a specific order:

1. Is there an explicit deny? If yes, request denied.
2. Is there an explicit allow? If yes, check for any applicable SCPs (Service Control Policies).
3. If neither, implicit deny.

This matters because a deny in any policy trumps an allow anywhere else. Keep this in mind as we build out our policies.

## Prefix-Based Access Control

One of the most common patterns is restricting users to specific "folders" (prefixes) within a bucket. Say you've got a shared bucket and each team should only see their own data.

This policy restricts a user to only the `engineering/` prefix.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListingBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::company-data",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "engineering/*",
            "engineering"
          ]
        }
      }
    },
    {
      "Sid": "AllowObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::company-data/engineering/*"
    }
  ]
}
```

Notice the two separate statements. The `ListBucket` action applies to the bucket ARN (without `/*`), while object-level actions apply to the object ARN. This trips up a lot of people.

## Dynamic Policies with Variables

You can use policy variables to create a single policy that works for all users. The `${aws:username}` variable is replaced with the IAM user's name at evaluation time.

This gives each user their own "home directory" in S3.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUserPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::user-data",
      "Condition": {
        "StringLike": {
          "s3:prefix": "${aws:username}/*"
        }
      }
    },
    {
      "Sid": "AllowUserObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::user-data/${aws:username}/*"
    }
  ]
}
```

This is much better than creating individual policies per user. When a new user joins, they automatically get access to their own prefix without any policy changes.

## Tag-Based Access Control (ABAC)

Attribute-Based Access Control using tags is powerful for dynamic environments. You can tag both S3 objects and IAM principals, then write policies that match them.

This policy only allows access when the user's department tag matches the object's department tag.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TagBasedAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectTagging"
      ],
      "Resource": "arn:aws:s3:::tagged-data/*",
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/department": "${aws:PrincipalTag/department}"
        }
      }
    }
  ]
}
```

With ABAC, you don't need to update policies when team members change. Just update the user's tags and everything adjusts automatically.

## Restricting by IP Address

For compliance scenarios, you might need to restrict S3 access to specific IP ranges - like your office network or VPN.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideNetwork",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::sensitive-bucket",
        "arn:aws:s3:::sensitive-bucket/*"
      ],
      "Condition": {
        "NotIpAddress": {
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

A note on using deny policies: they're more secure than allow-based restrictions because they work regardless of what other policies exist. Even if someone accidentally attaches a broad allow policy, the deny still blocks access from outside your network.

## Requiring MFA for Sensitive Operations

For buckets containing sensitive data, you can require multi-factor authentication for destructive operations while allowing reads without MFA.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadWithoutMFA",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sensitive-bucket",
        "arn:aws:s3:::sensitive-bucket/*"
      ]
    },
    {
      "Sid": "RequireMFAForWrites",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sensitive-bucket/*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```

## Time-Based Access Control

Sometimes you need to grant temporary access. Instead of remembering to revoke it, build the expiration right into the policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TemporaryAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::project-data/*",
      "Condition": {
        "DateLessThan": {
          "aws:CurrentTime": "2026-03-31T23:59:59Z"
        },
        "DateGreaterThan": {
          "aws:CurrentTime": "2026-02-01T00:00:00Z"
        }
      }
    }
  ]
}
```

This approach is great for contractor access or temporary projects. The access automatically expires without any cleanup work.

## Restricting Object Size

You can prevent users from uploading excessively large files. This is useful for controlling storage costs and preventing abuse.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LimitUploadSize",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::upload-bucket/*",
      "Condition": {
        "NumericGreaterThan": {
          "s3:content-length-range": "104857600"
        }
      }
    }
  ]
}
```

This denies uploads larger than 100MB (104857600 bytes).

## Enforcing Encryption

A common compliance requirement is ensuring all objects are encrypted at rest. This policy denies uploads that don't specify server-side encryption.

```json
{
  "Version": "2012-10-17",
  "Statement": [
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
    },
    {
      "Sid": "DenyMissingEncryptionHeader",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::secure-bucket/*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    }
  ]
}
```

You need both conditions - one catches requests with the wrong encryption type, the other catches requests missing the header entirely.

## VPC Endpoint Restrictions

If your data should only be accessed from within your VPC (not over the internet), use a VPC endpoint condition.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAccessOutsideVPC",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::internal-data",
        "arn:aws:s3:::internal-data/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-abc123def"
        }
      }
    }
  ]
}
```

This ensures nobody can access the bucket from outside your VPC, even if they have valid credentials.

## Debugging Policies

When policies don't work as expected, use the IAM Policy Simulator to test them. You can also enable CloudTrail logging and check for `AccessDenied` events.

```bash
# Simulate a policy evaluation
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/testuser \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::my-bucket/test-file.txt
```

The simulator tells you exactly which policy statement resulted in the allow or deny, which saves a ton of debugging time.

## Wrapping Up

Fine-grained S3 access control is about layering the right conditions. Start with the principle of least privilege, add conditions for your security requirements, and use deny policies for hard guardrails. For more on S3 security practices, check out our guide on [S3 bucket ownership controls](https://oneuptime.com/blog/post/2026-02-12-s3-bucket-ownership-controls/view). And remember to monitor your policies with a tool like [OneUptime](https://oneuptime.com) to catch misconfigurations before they become security incidents.
