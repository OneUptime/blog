# How to Fix S3 '403 Access Denied' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, IAM, Security, Troubleshooting

Description: Diagnose and fix S3 403 Access Denied errors caused by IAM policies, bucket policies, ACLs, encryption settings, and VPC endpoints.

---

The S3 `403 Access Denied` error is one of the most common and frustrating AWS issues to debug. The error itself tells you almost nothing about why access was denied, and there are at least half a dozen different things that can cause it.

Let's go through each possible cause systematically so you can track down and fix the issue.

## The Layers of S3 Access Control

S3 access is determined by multiple overlapping systems. A request needs to pass through all of them:

1. **IAM policies** - Attached to the user, group, or role making the request
2. **Bucket policy** - Attached to the S3 bucket itself
3. **ACLs** - Legacy access control lists on buckets and objects
4. **S3 Block Public Access** - Account-level and bucket-level settings
5. **VPC endpoint policy** - If accessing S3 through a VPC endpoint
6. **KMS key policy** - If the objects are encrypted with a KMS key
7. **Object ownership** - Who uploaded the object matters

If any of these say "deny" or fail to say "allow" when required, you get a 403.

## Step 1: Check IAM Permissions

Start with the basics. Does the IAM principal (user, role, or service) have the necessary S3 permissions?

```bash
# Check what S3 permissions a user has
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/myuser \
  --action-names s3:GetObject s3:PutObject s3:ListBucket \
  --resource-arns arn:aws:s3:::my-bucket arn:aws:s3:::my-bucket/* \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}'
```

Common IAM policy mistakes:

A policy granting access to bucket contents must include `/*` at the end. A policy granting bucket listing must NOT have `/*`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-bucket"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

Notice how `ListBucket` uses `arn:aws:s3:::my-bucket` (no slash) while `GetObject` and `PutObject` use `arn:aws:s3:::my-bucket/*` (with slash-star). Getting this wrong is probably the single most common cause of S3 403 errors.

## Step 2: Check the Bucket Policy

The bucket itself might have a policy that explicitly denies access or that doesn't include your IAM principal.

```bash
# Get the bucket policy
aws s3api get-bucket-policy --bucket my-bucket --output text | python3 -m json.tool
```

Watch out for explicit deny statements. An explicit deny always wins over any allow:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalAccount": "123456789012"
        }
      }
    }
  ]
}
```

This policy denies all access from outside account `123456789012`. Even if your IAM policy grants access, a deny in the bucket policy will block you.

## Step 3: Check S3 Block Public Access

AWS has both account-level and bucket-level Block Public Access settings. These can override bucket policies and ACLs.

```bash
# Check account-level settings
aws s3control get-public-access-block --account-id 123456789012

# Check bucket-level settings
aws s3api get-public-access-block --bucket my-bucket
```

If `BlockPublicPolicy` is enabled and your bucket policy grants public access, the policy will be blocked. If you're trying to make objects public and getting 403s, this is likely the culprit.

## Step 4: Check Object Ownership and ACLs

This is a sneaky one. If someone from a different AWS account uploaded an object to your bucket, they own that object by default - not you. You won't be able to read it even though it's in your bucket.

```bash
# Check the ownership setting on the bucket
aws s3api get-bucket-ownership-controls --bucket my-bucket

# Check ACL on a specific object
aws s3api get-object-acl --bucket my-bucket --key my-file.txt
```

The fix is to enforce bucket owner ownership:

```bash
# Set bucket owner enforced (recommended, disables ACLs entirely)
aws s3api put-bucket-ownership-controls --bucket my-bucket \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

With `BucketOwnerEnforced`, the bucket owner automatically owns all objects regardless of who uploaded them. ACLs are disabled entirely, which simplifies access management.

## Step 5: Check KMS Encryption

If objects are encrypted with AWS KMS, you need permissions on the KMS key to read or write them.

```bash
# Check the bucket's default encryption
aws s3api get-bucket-encryption --bucket my-bucket

# Check a specific object's encryption
aws s3api head-object --bucket my-bucket --key my-file.txt \
  --query '{Encryption:ServerSideEncryption,KMSKeyId:SSEKMSKeyId}'
```

If the object uses a customer-managed KMS key, make sure your IAM principal has `kms:Decrypt` (for reading) and `kms:GenerateDataKey` (for writing) permissions on that key.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd-1234-efgh-5678"
    }
  ]
}
```

## Step 6: Check VPC Endpoint Policies

If you're accessing S3 from within a VPC through a VPC endpoint, the endpoint itself can have a policy that restricts access.

```bash
# List VPC endpoints for S3
aws ec2 describe-vpc-endpoints \
  --filters Name=service-name,Values=com.amazonaws.us-east-1.s3 \
  --query 'VpcEndpoints[*].{Id:VpcEndpointId,Policy:PolicyDocument}'
```

A restrictive endpoint policy might only allow access to specific buckets:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::allowed-bucket",
        "arn:aws:s3:::allowed-bucket/*"
      ]
    }
  ]
}
```

If your bucket isn't in the endpoint policy's resource list, requests through that endpoint will be denied.

## Step 7: Enable CloudTrail for S3 Data Events

When all else fails, CloudTrail can show you exactly what's happening with your S3 requests.

```bash
# Enable S3 data event logging (if not already enabled)
aws cloudtrail put-event-selectors \
  --trail-name my-trail \
  --event-selectors '[{"ReadWriteType":"All","IncludeManagementEvents":true,"DataResources":[{"Type":"AWS::S3::Object","Values":["arn:aws:s3:::my-bucket/"]}]}]'
```

Then check CloudTrail logs for the denied requests. The `errorCode` and `errorMessage` fields will give you more specific information than the generic 403.

## Quick Debugging Checklist

When you hit a 403, run through this checklist:

1. Is the IAM policy correct? (Check resource ARN format)
2. Is there a bucket policy? Does it have an explicit deny?
3. Is Block Public Access enabled? (If trying public access)
4. Is the object encrypted with KMS? Do you have key permissions?
5. Was the object uploaded by a different account?
6. Are you going through a VPC endpoint with a restrictive policy?
7. Is your request using the correct region?

Setting up proper monitoring for your S3 access patterns can catch permission issues early. A tool like [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can help you track 403 errors across your infrastructure and alert you when they spike.

Most 403 errors come down to IAM resource ARN formatting or bucket policy conflicts. Start there and work your way through the list.
