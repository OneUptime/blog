# How to Configure EC2 Instance Metadata with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, EC2, Instance Metadata, IMDSv2, AWS, Security, Infrastructure as Code

Description: Learn how to configure EC2 Instance Metadata Service with OpenTofu - enforcing IMDSv2, disabling metadata for sensitive workloads, and using metadata in user data scripts securely.

## Introduction

The EC2 Instance Metadata Service (IMDS) provides running instances with configuration data including IAM credentials, region, placement, and tags. IMDSv2 adds a session-oriented request flow that mitigates SSRF attacks. With OpenTofu, you can require IMDSv2 in launch templates and set account-level defaults.

## Enforce IMDSv2 in Launch Template

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"     # IMDSv2 - session token required
    http_put_response_hop_limit = 1              # Use 2 if containers on the instance need IMDS access
    instance_metadata_tags      = "enabled"      # Expose instance tags via IMDS
  }
}
```

## Account-Level IMDSv2 Default

```hcl
# Set IMDSv2 as the default for new instances in the account/region

resource "aws_ec2_instance_metadata_defaults" "require_imdsv2" {
  http_tokens                 = "required"
  http_put_response_hop_limit = 2  # Allow containers on EC2 (hop limit 2)
  instance_metadata_tags      = "enabled"
}
```

## IMDSv2 in User Data Scripts

```bash
#!/bin/bash
# IMDSv2 - step 1: get session token (TTL up to 21600 seconds = 6 hours)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Step 2: use token for all metadata requests
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region)

INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)

PRIVATE_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/local-ipv4)

# Get IAM role credentials
ROLE_NAME=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/)

CREDS=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/${ROLE_NAME}")

# Get instance tags (requires instance_metadata_tags = "enabled")
ENV=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/tags/instance/Environment")

echo "Region: $REGION, Instance: $INSTANCE_ID, Environment: $ENV"
```

## Disable Metadata for High-Security Workloads

```hcl
resource "aws_launch_template" "secure" {
  name          = "${var.environment}-secure-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  metadata_options {
    http_endpoint = "disabled"  # Completely disable IMDS
    # http_tokens and hop_limit ignored when endpoint is disabled
  }
}
```

## Instance Tags via IMDS (OpenTofu Configuration)

```hcl
# Enable tag access via IMDS so instances can self-identify
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  metadata_options {
    http_endpoint          = "enabled"
    http_tokens            = "required"
    instance_metadata_tags = "enabled"
  }

  tags = {
    Name        = "${var.environment}-app"
    Environment = var.environment
    Role        = "web"
    ClusterId   = var.cluster_id
  }
}
```

## SCP to Require IMDSv2 on New Instance Launches

```hcl
# Organization-level policy requiring IMDSv2 and capping hop limit on RunInstances
resource "aws_organizations_policy" "require_imdsv2" {
  name        = "RequireIMDSv2"
  description = "Require IMDSv2 on all new EC2 instances"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RequireImdsV2"
        Effect = "Deny"
        Action = ["ec2:RunInstances"]
        Resource = ["arn:aws:ec2:*:*:instance/*"]
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      },
      {
        Sid    = "MaxImdsHopLimit"
        Effect = "Deny"
        Action = ["ec2:RunInstances"]
        Resource = ["arn:aws:ec2:*:*:instance/*"]
        Condition = {
          NumericGreaterThan = {
            "ec2:MetadataHttpPutResponseHopLimit" = 1
          }
        }
      }
    ]
  })
}
```

## CloudWatch Metric for IMDSv1 Usage Detection

```hcl
resource "aws_cloudwatch_metric_alarm" "imdsv1_usage" {
  alarm_name          = "${var.environment}-imdsv1-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "MetadataNoToken"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Detected IMDSv1 (no token) requests - migrate to IMDSv2"

  alarm_actions = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.app.id
  }
}
```

## Conclusion

IMDSv2 protects against SSRF attacks by requiring a session token for all metadata requests. Require it at the launch template level with `http_tokens = "required"` and set account-level defaults with `aws_ec2_instance_metadata_defaults`. Use an SCP to require IMDSv2 on new instance launches across your organization. Set `http_put_response_hop_limit = 1` when only the instance needs IMDS access, and `2` when containerized workloads on the instance need IMDS access. Monitor `MetadataNoToken` CloudWatch metrics to detect any remaining IMDSv1 callers.
