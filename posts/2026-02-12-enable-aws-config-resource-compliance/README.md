# How to Enable AWS Config for Resource Compliance Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Config, Compliance, Security, Governance

Description: Learn how to enable and configure AWS Config to continuously monitor and record your AWS resource configurations for compliance and security auditing.

---

You can't secure what you can't see. And in AWS, resources change constantly - someone spins up an EC2 instance, modifies a security group, or changes an S3 bucket policy. Without continuous monitoring, you've got no idea whether your environment matches your security policies at any given moment.

AWS Config solves this by continuously recording the configuration of your AWS resources and evaluating them against rules you define. Think of it as a configuration changelog combined with a compliance engine. Every time a resource changes, Config records the new state and checks it against your rules. If something's out of compliance, you know immediately.

## What AWS Config Tracks

Config records configuration changes for supported AWS resources. This includes things like:

- EC2 instances, security groups, VPCs, and subnets
- S3 buckets and their policies
- IAM users, roles, policies, and groups
- RDS instances and clusters
- Lambda functions
- CloudFormation stacks
- And hundreds more resource types

For each resource, Config maintains a configuration history - a timeline of every change that's happened to it. You can look at any resource and see exactly how it was configured last Tuesday at 3 PM.

## Enabling AWS Config

You can enable Config through the console, CLI, or Terraform. Here's the CLI approach.

### Step 1: Create the S3 Bucket

Config needs an S3 bucket to store configuration snapshots and history files.

```bash
# Create the bucket
aws s3 mb s3://my-config-bucket-111111111111

# Apply the required bucket policy
aws s3api put-bucket-policy \
  --bucket my-config-bucket-111111111111 \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AWSConfigBucketPermissionsCheck",
        "Effect": "Allow",
        "Principal": {"Service": "config.amazonaws.com"},
        "Action": "s3:GetBucketAcl",
        "Resource": "arn:aws:s3:::my-config-bucket-111111111111",
        "Condition": {
          "StringEquals": {"AWS:SourceAccount": "111111111111"}
        }
      },
      {
        "Sid": "AWSConfigBucketDelivery",
        "Effect": "Allow",
        "Principal": {"Service": "config.amazonaws.com"},
        "Action": "s3:PutObject",
        "Resource": "arn:aws:s3:::my-config-bucket-111111111111/AWSLogs/111111111111/Config/*",
        "Condition": {
          "StringEquals": {
            "s3:x-amz-acl": "bucket-owner-full-control",
            "AWS:SourceAccount": "111111111111"
          }
        }
      }
    ]
  }'
```

### Step 2: Create the IAM Role

Config needs a role to read your resource configurations and write to S3.

```bash
# Create the Config service role
aws iam create-role \
  --role-name AWSConfigRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "config.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the AWS managed policy for Config
aws iam attach-role-policy \
  --role-name AWSConfigRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWS_ConfigRole
```

### Step 3: Set Up the Configuration Recorder

The configuration recorder is what actually tracks your resources. You can record all resource types or select specific ones.

```bash
# Record all supported resource types (recommended for new setups)
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::111111111111:role/AWSConfigRole \
  --recording-group allSupported=true,includeGlobalResourceTypes=true
```

If you want to be selective about which resources to track (to save costs), you can specify resource types.

```bash
# Record only specific resource types
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::111111111111:role/AWSConfigRole \
  --recording-group '{
    "allSupported": false,
    "includeGlobalResourceTypes": false,
    "resourceTypes": [
      "AWS::EC2::SecurityGroup",
      "AWS::EC2::Instance",
      "AWS::S3::Bucket",
      "AWS::IAM::User",
      "AWS::IAM::Role",
      "AWS::IAM::Policy",
      "AWS::RDS::DBInstance"
    ]
  }'
```

### Step 4: Set Up the Delivery Channel

The delivery channel tells Config where to send configuration snapshots.

```bash
# Configure the delivery channel
aws configservice put-delivery-channel \
  --delivery-channel '{
    "name": "default",
    "s3BucketName": "my-config-bucket-111111111111",
    "configSnapshotDeliveryProperties": {
      "deliveryFrequency": "Six_Hours"
    }
  }'
```

### Step 5: Start Recording

```bash
# Start the configuration recorder
aws configservice start-configuration-recorder \
  --configuration-recorder-name default

# Verify it's running
aws configservice describe-configuration-recorder-status
```

## Terraform Configuration

Here's the full Terraform setup for enabling AWS Config.

```hcl
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.config.id

  snapshot_delivery_properties {
    delivery_frequency = "Six_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# IAM Role
resource "aws_iam_role" "config" {
  name = "AWSConfigRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# S3 Bucket
resource "aws_s3_bucket" "config" {
  bucket = "my-config-bucket-111111111111"
}
```

## Querying Resource Configurations

Once Config is running, you can query current and historical configurations.

```bash
# List all discovered resources of a type
aws configservice list-discovered-resources \
  --resource-type AWS::EC2::SecurityGroup

# Get the current configuration of a specific resource
aws configservice get-resource-config-history \
  --resource-type AWS::EC2::SecurityGroup \
  --resource-id sg-0123456789abcdef0 \
  --limit 5

# Run an advanced query using Config's SQL-like syntax
aws configservice select-resource-config \
  --expression "SELECT resourceId, resourceType, configuration WHERE resourceType = 'AWS::S3::Bucket'"
```

The advanced query feature is powerful. You can write SQL-like queries across all your tracked resources.

```bash
# Find all public S3 buckets
aws configservice select-resource-config \
  --expression "SELECT resourceId, resourceName, configuration.publicAccessBlockConfiguration WHERE resourceType = 'AWS::S3::Bucket'"

# Find all EC2 instances without required tags
aws configservice select-resource-config \
  --expression "SELECT resourceId, tags WHERE resourceType = 'AWS::EC2::Instance' AND tags.tag('Environment') IS NULL"
```

## Adding Config Rules

Config by itself just records changes. To actually check compliance, you need rules. AWS provides over 300 managed rules, or you can write custom ones.

Here's a quick example of adding a managed rule that checks if S3 buckets have versioning enabled.

```bash
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-versioning-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_VERSIONING_ENABLED"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::S3::Bucket"]
    }
  }'
```

For more on rules, check out [creating custom AWS Config rules](https://oneuptime.com/blog/post/2026-02-12-create-custom-aws-config-rules/view) and [using managed rules for security best practices](https://oneuptime.com/blog/post/2026-02-12-aws-config-managed-rules-security/view).

## Cost Considerations

AWS Config charges per configuration item recorded. A configuration item is created every time a resource changes. The pricing is:

- $0.003 per configuration item recorded
- Additional charges for Config rules evaluations
- S3 storage costs for snapshots and history

For a typical mid-size account, expect $20-50/month. Larger accounts with frequent changes can see higher costs. If budget is tight, record only the resource types that matter most for your compliance requirements rather than all supported types.

## What to Do Next

With Config enabled, you'll want to add rules to actually enforce your compliance requirements. Start with the [managed rules for security best practices](https://oneuptime.com/blog/post/2026-02-12-aws-config-managed-rules-security/view), then look at [conformance packs](https://oneuptime.com/blog/post/2026-02-12-aws-config-conformance-packs/view) for applying groups of rules at once. For multi-account environments, [Config aggregators](https://oneuptime.com/blog/post/2026-02-12-aws-config-aggregators-multi-account/view) give you a single-pane view across all accounts.
