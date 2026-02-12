# How to Create an S3 Bucket from the AWS Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Storage

Description: A beginner-friendly walkthrough of creating an Amazon S3 bucket from the AWS Management Console with best practices for security and configuration.

---

Amazon S3 is where most AWS journeys start. Whether you're storing application files, hosting a static website, keeping backups, or building a data lake, S3 is the backbone. Creating a bucket is straightforward, but there are several settings that trip people up - especially around security. Let's walk through the process step by step using the AWS Console, and I'll point out the settings that actually matter.

## Before You Start

Make sure you have:
- An AWS account
- IAM permissions to create S3 buckets (the `s3:CreateBucket` permission at minimum)
- A clear idea of what you'll store in this bucket and who needs access

## Step 1: Navigate to S3

Log into the AWS Management Console and navigate to S3. You can either search for "S3" in the top search bar or find it under the Storage category in the Services menu.

You'll land on the S3 dashboard showing all your existing buckets. Click the orange "Create bucket" button.

## Step 2: Choose a Bucket Name

The bucket name is globally unique across all AWS accounts worldwide. That means if someone already has a bucket named `my-app-data`, you can't use that name.

Some rules for bucket names:
- Must be 3-63 characters long
- Can only contain lowercase letters, numbers, hyphens, and dots
- Must start and end with a letter or number
- Can't be formatted as an IP address (like 192.168.1.1)
- Must be unique across all AWS accounts globally

Good naming conventions include using your organization name or account ID as a prefix:

```
mycompany-app-data-production
mycompany-logs-us-east-1
123456789012-terraform-state
```

Avoid putting sensitive information in bucket names since they appear in URLs and logs.

## Step 3: Select a Region

Choose the AWS Region where your bucket will be created. Pick the region closest to your users or the one where your other AWS resources live. Data stored in a region stays in that region unless you explicitly replicate it somewhere else.

Common considerations:
- **Latency**: Pick the region closest to your users
- **Cost**: Pricing varies slightly between regions
- **Compliance**: Some regulations require data to stay in specific geographic locations
- **Other services**: Co-locate with your EC2 instances, Lambda functions, etc.

## Step 4: Object Ownership

You'll see an "Object Ownership" section. The recommended setting is **ACLs disabled (recommended)**. This means the bucket owner (your account) owns all objects, regardless of who uploaded them.

The alternative - ACLs enabled - is a legacy approach that AWS actively discourages. Unless you have a very specific reason to use ACLs (like cross-account uploads with bucket owner not being the object owner), keep ACLs disabled. We cover this in more detail in our [guide on S3 ACLs](https://oneuptime.com/blog/post/configure-s3-bucket-acls/view).

## Step 5: Block Public Access Settings

This is the most important security setting. By default, all four "Block Public Access" options are checked, and you should leave them that way unless you're intentionally hosting a public website or public dataset.

The four settings are:
1. **Block all public access** - Master switch
2. **Block public access to buckets and objects granted through new ACLs**
3. **Block public access to buckets and objects granted through any ACLs**
4. **Block public access to buckets and objects granted through new public bucket or access point policies**
5. **Block public and cross-account access to buckets and objects through any public bucket or access point policies**

Keep all of these ON. If you need to serve files publicly later, use CloudFront with an Origin Access Control instead of making your bucket public. For more on this topic, check our dedicated guide on [blocking public access on S3 buckets](https://oneuptime.com/blog/post/block-public-access-on-s3-buckets/view).

## Step 6: Bucket Versioning

Versioning keeps every version of every object ever stored in the bucket. When you overwrite or delete an object, the previous version is preserved. This is incredibly useful for:
- Accidental deletion recovery
- Tracking changes over time
- Compliance requirements

Enable versioning if this bucket stores anything important. You can always enable it later, but you can never undo it (you can only suspend it). We have a detailed walkthrough of [enabling S3 bucket versioning](https://oneuptime.com/blog/post/enable-s3-bucket-versioning/view) if you want to dive deeper.

For this walkthrough, I'd recommend enabling it for production buckets and leaving it disabled for temporary or cache buckets.

## Step 7: Tags

Tags are key-value pairs that help you organize and track costs. Add tags like:
- `Environment`: production, staging, development
- `Project`: your project name
- `Team`: the team that owns this bucket
- `CostCenter`: for billing allocation

Tags don't affect functionality but they're invaluable for cost management and organization as your AWS usage grows.

## Step 8: Default Encryption

S3 now encrypts all objects by default using SSE-S3 (Amazon S3-managed keys). You don't need to change this unless you have specific encryption requirements.

Your encryption options are:
- **SSE-S3** - Amazon manages the keys. Free, no configuration needed.
- **SSE-KMS** - Uses AWS Key Management Service. Gives you key management, rotation, and audit trail via CloudTrail. Costs extra for KMS API calls.
- **DSSE-KMS** - Dual-layer server-side encryption. For compliance that requires two layers of encryption.

For most use cases, SSE-S3 is perfectly fine. Use SSE-KMS if you need audit trails of key usage or need to manage key policies.

## Step 9: Advanced Settings

There are a couple more settings worth mentioning:

**Bucket Key**: If using SSE-KMS, enable the bucket key to reduce KMS request costs by up to 99%. It creates a bucket-level key that's used for a time period instead of calling KMS for every object.

**Object Lock**: Enables WORM (Write Once Read Many) protection. Once enabled, it can't be disabled. Use this for compliance requirements like SEC Rule 17a-4 or CFTC Rule 1.31. Unless you have a specific regulatory requirement, skip this.

## Step 10: Create the Bucket

Review your settings and click "Create bucket." That's it - your bucket is ready to use.

## Quick Verification with the CLI

After creating the bucket in the console, verify it exists using the CLI:

```bash
# List your buckets
aws s3 ls

# Check the bucket's configuration
aws s3api get-bucket-versioning --bucket mycompany-app-data-production

# Check encryption settings
aws s3api get-bucket-encryption --bucket mycompany-app-data-production

# Check public access block
aws s3api get-public-access-block --bucket mycompany-app-data-production
```

## Creating the Same Bucket via CLI

For reference, here's the equivalent CLI command to create the same bucket with the settings we configured:

```bash
# Create the bucket
aws s3api create-bucket \
    --bucket mycompany-app-data-production \
    --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket mycompany-app-data-production \
    --versioning-configuration Status=Enabled

# Block all public access
aws s3api put-public-access-block \
    --bucket mycompany-app-data-production \
    --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Add tags
aws s3api put-bucket-tagging \
    --bucket mycompany-app-data-production \
    --tagging 'TagSet=[{Key=Environment,Value=production},{Key=Team,Value=backend}]'
```

## What to Do Next

Now that your bucket exists, here are typical next steps:

1. **Set up a bucket policy** for fine-grained access control - see our [S3 bucket policies guide](https://oneuptime.com/blog/post/set-up-s3-bucket-policies-access-control/view)
2. **Configure lifecycle rules** to automatically transition old objects to cheaper storage classes or delete them
3. **Enable access logging** to track who's accessing your bucket
4. **Set up event notifications** to trigger Lambda functions or SQS queues when objects are created or deleted
5. **Upload your first files** using the [AWS CLI](https://oneuptime.com/blog/post/upload-files-to-s3-using-aws-cli/view) or the console

## Common Mistakes to Avoid

A few things to watch out for:

- **Don't make buckets public** unless you absolutely need to. Use CloudFront instead.
- **Don't skip versioning** on production buckets. You'll regret it the first time someone accidentally deletes something.
- **Don't use dots in bucket names** if you plan to use HTTPS with virtual-hosted-style URLs. Dots cause SSL certificate issues.
- **Don't forget lifecycle policies**. Without them, your bucket will grow forever and so will your bill.

Creating an S3 bucket takes about 30 seconds, but getting the configuration right takes a bit more thought. The defaults are secure, so when in doubt, leave things as they are. You can always adjust settings later as your needs evolve.
