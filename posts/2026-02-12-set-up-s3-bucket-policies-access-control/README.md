# How to Set Up S3 Bucket Policies for Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Security, IAM

Description: Learn how to write and apply S3 bucket policies for fine-grained access control, including common patterns for cross-account access, IP restrictions, and VPC endpoints.

---

S3 bucket policies are JSON documents that define who can do what with your bucket and its objects. They're one of the primary access control mechanisms for S3, alongside IAM policies and (the now-discouraged) ACLs. If you need to grant access to other AWS accounts, restrict access by IP address, or enforce encryption requirements, bucket policies are the tool for the job.

Let's go through how bucket policies work and walk through the most common patterns you'll actually use in production.

## How Bucket Policies Work

A bucket policy is attached directly to a bucket. It evaluates every request made to that bucket and either allows or denies the request based on the rules you define.

Every policy has the same structure:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "HumanReadableIdentifier",
            "Effect": "Allow or Deny",
            "Principal": "Who this applies to",
            "Action": "What they can do",
            "Resource": "Which objects/bucket",
            "Condition": "Under what circumstances"
        }
    ]
}
```

The key fields:
- **Effect** - Either `Allow` or `Deny`. Deny always wins over Allow.
- **Principal** - The AWS account, IAM user, role, or service this applies to. Use `"*"` for everyone.
- **Action** - S3 API actions like `s3:GetObject`, `s3:PutObject`, etc.
- **Resource** - The bucket ARN and/or object ARN pattern.
- **Condition** - Optional conditions like IP range, VPC, encryption type, etc.

## Applying a Bucket Policy

Apply a bucket policy using the CLI:

```bash
# Create the policy file
cat > bucket-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowReadFromSpecificAccount",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::123456789012:root"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::my-bucket/*"
        }
    ]
}
EOF

# Apply the policy
aws s3api put-bucket-policy \
    --bucket my-bucket \
    --policy file://bucket-policy.json

# Verify the policy
aws s3api get-bucket-policy \
    --bucket my-bucket \
    --query Policy --output text | python3 -m json.tool
```

## Common Pattern: Cross-Account Access

The most frequent use of bucket policies is granting another AWS account access to your bucket.

Allow another account to read objects:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "CrossAccountRead",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::111222333444:root"
            },
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
            ]
        }
    ]
}
```

Notice we include both the bucket ARN (for `ListBucket`) and the object ARN with `/*` (for `GetObject`). This is a common mistake - `ListBucket` is a bucket-level action, while `GetObject` is an object-level action.

## Common Pattern: Restrict Access by IP Address

Lock down access to specific IP ranges - useful for allowing access only from your office or VPN.

Restrict bucket access to specific IP addresses:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyAccessExceptFromOffice",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
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

This denies all access except from the specified IP ranges. We use a Deny with `NotIpAddress` instead of Allow with `IpAddress` because Deny is more secure - it can't be overridden by other Allow policies.

## Common Pattern: Restrict Access to a VPC Endpoint

If your EC2 instances access S3 through a VPC endpoint, you can restrict the bucket to only allow access through that endpoint.

Restrict access to a specific VPC endpoint:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AccessOnlyFromVPCEndpoint",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
            ],
            "Condition": {
                "StringNotEquals": {
                    "aws:sourceVpce": "vpce-1a2b3c4d"
                }
            }
        }
    ]
}
```

## Common Pattern: Enforce Encryption

Require that all objects uploaded to the bucket use encryption.

Deny uploads that don't use server-side encryption:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyUnencryptedUploads",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::my-bucket/*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-server-side-encryption": "aws:kms"
                }
            }
        },
        {
            "Sid": "DenyNoEncryptionHeader",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::my-bucket/*",
            "Condition": {
                "Null": {
                    "s3:x-amz-server-side-encryption": "true"
                }
            }
        }
    ]
}
```

This two-statement policy first denies uploads that use anything other than KMS encryption, then denies uploads that don't include an encryption header at all.

## Common Pattern: Enforce TLS

Require HTTPS for all requests to the bucket.

Deny non-TLS requests:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EnforceTLS",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
```

## Common Pattern: Grant CloudFront Access

Allow a CloudFront distribution to read objects from your bucket using Origin Access Control (OAC).

Allow CloudFront OAC to access the bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::my-bucket/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
                }
            }
        }
    ]
}
```

## Combining Multiple Statements

In practice, your bucket policies will have multiple statements.

A production bucket policy with multiple access controls:

```bash
cat > production-policy.json << 'POLICY'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EnforceTLS",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": ["arn:aws:s3:::prod-bucket", "arn:aws:s3:::prod-bucket/*"],
            "Condition": {
                "Bool": { "aws:SecureTransport": "false" }
            }
        },
        {
            "Sid": "AllowDataTeamRead",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::123456789012:role/DataTeamRole"
            },
            "Action": ["s3:GetObject", "s3:ListBucket"],
            "Resource": ["arn:aws:s3:::prod-bucket", "arn:aws:s3:::prod-bucket/analytics/*"]
        },
        {
            "Sid": "AllowCloudFront",
            "Effect": "Allow",
            "Principal": { "Service": "cloudfront.amazonaws.com" },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::prod-bucket/public/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
                }
            }
        }
    ]
}
POLICY

aws s3api put-bucket-policy --bucket prod-bucket --policy file://production-policy.json
```

## Testing Your Bucket Policy

Before relying on a policy in production, test it.

Test access with the IAM policy simulator or direct commands:

```bash
# Test if a specific IAM user/role can access the bucket
aws s3 ls s3://my-bucket/ --profile test-user

# Test with a specific role
aws sts assume-role \
    --role-arn arn:aws:iam::123456789012:role/TestRole \
    --role-session-name test-session

# Use the temporary credentials to test access
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_SESSION_TOKEN=... \
    aws s3 ls s3://my-bucket/
```

## Debugging Bucket Policies

When access isn't working as expected:

1. **Check IAM policies** - The requester needs both IAM permission AND bucket policy permission (unless you're using explicit Deny).
2. **Check public access block** - If [public access is blocked](https://oneuptime.com/blog/post/2026-02-12-block-public-access-on-s3-buckets/view), bucket policies granting public access won't work.
3. **Enable S3 access logging** or check CloudTrail for denied requests.
4. **Use the IAM Policy Simulator** to test specific actions.

```bash
# Check current bucket policy
aws s3api get-bucket-policy --bucket my-bucket --output text | python3 -m json.tool

# Delete a bucket policy entirely
aws s3api delete-bucket-policy --bucket my-bucket
```

Bucket policies are the foundation of S3 access control. Start simple, test thoroughly, and add complexity only as needed. And always prefer Deny statements for security constraints - they provide an explicit safety net that can't be accidentally overridden by other permissions.
