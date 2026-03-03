# How to Fix Error AccessControlListNotSupported for S3 in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Troubleshooting, Infrastructure as Code

Description: Fix the AccessControlListNotSupported error when creating or managing S3 buckets with Terraform, caused by the S3 Object Ownership changes introduced by AWS.

---

If you recently tried to create or modify an S3 bucket with Terraform and ran into the `AccessControlListNotSupported` error, you are not alone. This error became extremely common after AWS changed the default behavior for S3 bucket ownership in April 2023. Buckets created after that date have ACLs disabled by default, and any Terraform configuration that tries to set an ACL will fail.

Let us look at why this happens and how to fix it properly.

## What the Error Looks Like

When running `terraform apply`, you see:

```text
Error: error creating S3 Bucket (my-bucket) ACL: AccessControlListNotSupported:
The bucket does not allow ACLs
    status code: 400, request id: ABC123XYZ
```

Or sometimes:

```text
Error: error putting S3 Bucket ACL: AccessControlListNotSupported:
The bucket does not allow ACLs
```

## Why This Happens

AWS introduced the "S3 Object Ownership" feature to simplify access management. For buckets created on or after April 2023, the default ownership setting is `BucketOwnerEnforced`, which disables ACLs entirely. This means any attempt to set an ACL - whether `private`, `public-read`, or anything else - will be rejected.

The problem shows up in Terraform configurations that look like this:

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket-name"
  acl    = "private"  # This line causes the error
}
```

Or in older configurations that use a separate ACL resource:

```hcl
resource "aws_s3_bucket_acl" "my_bucket_acl" {
  bucket = aws_s3_bucket.my_bucket.id
  acl    = "private"
}
```

## Fix 1: Remove the ACL Configuration

If you are fine with the bucket owner having full control (which is the case for most setups), simply remove the ACL-related configuration:

```hcl
# Before - this breaks
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket-name"
  acl    = "private"
}

# After - this works
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket-name"
}
```

With `BucketOwnerEnforced` ownership, the bucket owner automatically has full control over all objects. The `private` ACL is effectively the default behavior, so removing it does not change anything in practice.

If you had a separate `aws_s3_bucket_acl` resource, remove it entirely:

```hcl
# Remove this entire block
# resource "aws_s3_bucket_acl" "my_bucket_acl" {
#   bucket = aws_s3_bucket.my_bucket.id
#   acl    = "private"
# }
```

## Fix 2: Explicitly Enable ACLs with Object Ownership

If you genuinely need ACLs (for example, to grant access to other AWS accounts or for certain legacy integrations), you need to set the bucket ownership to `BucketOwnerPreferred` or `ObjectWriter`:

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket-name"
}

# Enable ACLs by changing the ownership setting
resource "aws_s3_bucket_ownership_controls" "my_bucket_ownership" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# Now you can set ACLs
resource "aws_s3_bucket_acl" "my_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.my_bucket_ownership]

  bucket = aws_s3_bucket.my_bucket.id
  acl    = "private"
}
```

The `depends_on` is important here. The ownership controls must be applied before the ACL, otherwise you will get the same error because the ACL resource will try to apply before ACLs are enabled.

## Fix 3: For Public Buckets

If you were using `acl = "public-read"` to make a bucket publicly accessible, the modern approach uses bucket policies instead of ACLs:

```hcl
resource "aws_s3_bucket" "public_bucket" {
  bucket = "my-public-bucket"
}

# Disable the block public access settings
resource "aws_s3_bucket_public_access_block" "public_bucket_access" {
  bucket = aws_s3_bucket.public_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Use a bucket policy for public access instead of ACLs
resource "aws_s3_bucket_policy" "public_bucket_policy" {
  bucket = aws_s3_bucket.public_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.public_bucket.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.public_bucket_access]
}
```

This is the recommended approach by AWS. Bucket policies provide more granular control than ACLs and are easier to audit.

## Fix 4: For CloudFront Origin Access

If you were using ACLs to grant CloudFront access to your S3 bucket, switch to Origin Access Control (OAC) instead of Origin Access Identity (OAI):

```hcl
resource "aws_s3_bucket" "static_site" {
  bucket = "my-static-site"
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "my-oac"
  description                       = "OAC for static site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.static_site.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }
  # ... rest of distribution config
}

# Grant CloudFront access via bucket policy
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.static_site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
```

## Migrating Existing Configurations

If you have existing Terraform configurations that use ACLs and you want to update them, here is the process:

**Step 1:** Remove the `acl` argument from `aws_s3_bucket` resources.

**Step 2:** Remove any `aws_s3_bucket_acl` resources, or add the `aws_s3_bucket_ownership_controls` resource with a `depends_on`.

**Step 3:** Run `terraform plan` to see the proposed changes.

**Step 4:** If Terraform shows the bucket being recreated (which you do not want), use `lifecycle` to prevent it:

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket-name"

  lifecycle {
    ignore_changes = [acl]
  }
}
```

**Step 5:** For existing buckets that already have ACLs, you may need to import the state:

```bash
# Remove the ACL resource from state if it exists
terraform state rm aws_s3_bucket_acl.my_bucket_acl
```

## When Do You Actually Need ACLs?

In most modern AWS setups, you do not need ACLs at all. Bucket policies and IAM policies can handle virtually every access control scenario. You might still need ACLs if:

- You are granting access to S3 server access logging
- You have a legacy integration that specifically requires ACLs
- You are working with cross-account access patterns that predate bucket policies

For everything else, bucket policies are the way to go.

## Monitoring Bucket Access

After fixing the ACL configuration, it is a good idea to monitor your S3 buckets for unexpected access patterns. Tools like [OneUptime](https://oneuptime.com) can help you set up alerts for unusual S3 access patterns or configuration changes.

## Conclusion

The `AccessControlListNotSupported` error is a direct result of AWS modernizing S3's default security posture. The fix is usually simple: remove the ACL configuration and use bucket policies instead. If you genuinely need ACLs, explicitly enable them using `aws_s3_bucket_ownership_controls`. Either way, the change is a good one, as bucket policies are more flexible and easier to manage than ACLs.
