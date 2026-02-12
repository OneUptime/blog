# How to Use CloudFront Origin Access Control (OAC) for S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, S3, Security, OAC

Description: Learn how to configure CloudFront Origin Access Control to securely serve S3 content without making your bucket public, replacing the older OAI approach.

---

If you're serving content from S3 through CloudFront, you should never make your S3 bucket public. Origin Access Control (OAC) lets CloudFront access your private S3 bucket on behalf of users, so the bucket stays locked down and all traffic flows through CloudFront. This is the modern replacement for the older Origin Access Identity (OAI) approach, and it supports features OAI couldn't handle.

## OAC vs OAI - What Changed

Origin Access Identity (OAI) was the original way to restrict S3 access to CloudFront. It worked fine for basic use cases but had limitations:

- Didn't support SSE-KMS encrypted objects
- Didn't support S3 Object Lambda
- Didn't support S3 buckets in different AWS accounts as well
- Used a legacy authentication mechanism

OAC fixes all of these. It uses AWS Signature Version 4 (SigV4) for authentication, which is the standard authentication method for AWS services. If you're starting fresh, always use OAC. If you have existing OAI setups, plan to migrate them.

## Step 1: Create the Origin Access Control

```bash
# Create an Origin Access Control for S3
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "my-s3-oac",
    "Description": "OAC for S3 static assets bucket",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }'
```

The key settings here:

- **SigningProtocol**: Always `sigv4` - this is the only option currently
- **SigningBehavior**: Use `always` to sign all requests. Other options are `never` (don't sign) and `no-override` (only sign if the viewer request doesn't include an `Authorization` header)
- **OriginAccessControlOriginType**: Set to `s3` for S3 origins

Note the OAC ID from the output - you'll need it next.

## Step 2: Configure the CloudFront Distribution

Create or update your distribution to use the OAC with your S3 origin. The important thing here is using the S3 bucket's regional domain name, not the website endpoint:

```json
{
  "CallerReference": "oac-dist-001",
  "Comment": "Distribution with OAC for S3",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-oac-origin",
        "DomainName": "my-assets-bucket.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "E2QWRUHEXAMPLE"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-oac-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD"],
    "CachedMethods": ["GET", "HEAD"],
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
```

Two things to notice:

1. `S3OriginConfig.OriginAccessIdentity` is set to an empty string - we're not using OAI
2. `OriginAccessControlId` is set to the OAC ID from Step 1

```bash
# Create the distribution with OAC
aws cloudfront create-distribution \
  --distribution-config file://oac-distribution.json
```

If updating an existing distribution:

```bash
# Get current config
aws cloudfront get-distribution-config --id E1234567890 > config.json

# Edit the origin to add OriginAccessControlId and clear OriginAccessIdentity
# Then update
aws cloudfront update-distribution \
  --id E1234567890 \
  --distribution-config file://updated-config.json \
  --if-match CURRENT_ETAG
```

## Step 3: Update the S3 Bucket Policy

The S3 bucket needs a policy that allows the CloudFront distribution to access it. This is different from OAI - instead of granting access to an OAI principal, you grant access to the CloudFront service with a condition on the distribution ARN.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-assets-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890"
        }
      }
    }
  ]
}
```

Apply the policy:

```bash
# Apply the bucket policy allowing CloudFront OAC access
aws s3api put-bucket-policy \
  --bucket my-assets-bucket \
  --policy file://bucket-policy.json
```

The condition `AWS:SourceArn` ensures only your specific CloudFront distribution can access the bucket. Even if someone creates another distribution with the same OAC, they can't access your bucket because the distribution ARN won't match.

## Step 4: Block Direct S3 Access

Make sure public access is blocked on the bucket:

```bash
# Block all public access to the bucket
aws s3api put-public-access-block \
  --bucket my-assets-bucket \
  --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
```

This ensures the only way to access the content is through CloudFront.

## Step 5: Test the Setup

```bash
# Test through CloudFront - should work
curl -I https://d1234abcdef.cloudfront.net/index.html

# Test direct S3 access - should fail with 403
curl -I https://my-assets-bucket.s3.us-east-1.amazonaws.com/index.html
```

## Using OAC with SSE-KMS Encrypted Objects

One of OAC's biggest advantages over OAI is SSE-KMS support. If your S3 objects are encrypted with a KMS key, add the KMS decrypt permission to the bucket policy and the KMS key policy.

Update the bucket policy to also allow CloudFront to use the KMS key:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-encrypted-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890"
        }
      }
    }
  ]
}
```

And add to the KMS key policy:

```json
{
  "Sid": "AllowCloudFrontServicePrincipalSSEKMS",
  "Effect": "Allow",
  "Principal": {
    "Service": "cloudfront.amazonaws.com"
  },
  "Action": [
    "kms:Decrypt",
    "kms:Encrypt",
    "kms:GenerateDataKey*"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890"
    }
  }
}
```

```bash
# Update the KMS key policy
aws kms put-key-policy \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abc-123 \
  --policy-name default \
  --policy file://kms-key-policy.json
```

## Cross-Account S3 Access with OAC

OAC works well for cross-account setups where the S3 bucket is in a different AWS account than the CloudFront distribution. The bucket policy just needs to reference the distribution's ARN:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountCloudFront",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cross-account-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::111111111111:distribution/EXXXXXXXXX"
        }
      }
    }
  ]
}
```

The account ID `111111111111` in the ARN is the CloudFront distribution's account, while the bucket lives in a different account. This works because the `AWS:SourceArn` condition specifically identifies the distribution.

## Migrating from OAI to OAC

If you have existing distributions using OAI, migrate by:

1. Create an OAC
2. Update the distribution to use OAC and clear the OAI reference
3. Update the S3 bucket policy to use the CloudFront service principal instead of the OAI principal
4. Test thoroughly
5. Delete the old OAI

You can keep both the OAI and OAC bucket policy statements during migration for a smooth transition:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOAI-Legacy",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E1234567890"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Sid": "AllowOAC-New",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890"
        }
      }
    }
  ]
}
```

Remove the OAI statement once you've confirmed OAC is working.

## Summary

CloudFront Origin Access Control is the right way to secure S3 origins behind CloudFront. It supports SSE-KMS encryption, cross-account access, and uses standard SigV4 authentication. The setup involves creating an OAC, attaching it to your distribution's S3 origin, and configuring the bucket policy with the CloudFront service principal and distribution ARN condition. Always block public access on the bucket and test that direct S3 access is denied while CloudFront access works correctly.
