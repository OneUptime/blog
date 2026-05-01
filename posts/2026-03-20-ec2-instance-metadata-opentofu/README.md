# How to Configure EC2 Instance Metadata Options with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, IMDSv2, Security, Instance Metadata, Infrastructure as Code

Description: Learn how to enforce IMDSv2 (Instance Metadata Service version 2) and configure metadata options on EC2 instances using OpenTofu to improve instance security.

## Introduction

EC2 Instance Metadata Service (IMDS) provides instances with configuration data including IAM credentials, user data, and network information. IMDSv2 adds session-oriented requests to help protect against SSRF attacks accessing metadata. This guide covers enforcing IMDSv2 with OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with permissions to manage EC2 and AWS Config
- AWS Config enabled with a configuration recorder if you use Step 4

## Step 1: Launch an Instance with IMDSv2 Enforced

```hcl
resource "aws_instance" "secure" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = var.subnet_id

  # Enforce IMDSv2 - prevents unauthenticated metadata access
  metadata_options {
    # "enabled" means the endpoint is available
    http_endpoint = "enabled"

    # "required" enforces IMDSv2 session tokens (recommended)
    # "optional" allows both IMDSv1 and IMDSv2
    http_tokens = "required"

    # Maximum number of network hops for the IMDSv2 token response
    # Use 1 for most workloads; use 2 when containers need IMDS access
    http_put_response_hop_limit = 1

    # Allow instance tags to be accessed via metadata endpoint
    instance_metadata_tags = "enabled"
  }

  tags = {
    Name = "secure-instance"
  }
}
```

## Step 2: Disable Metadata Completely

```hcl
# Disable the metadata endpoint entirely for high-security workloads

resource "aws_instance" "no_metadata" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = var.subnet_id

  metadata_options {
    http_endpoint = "disabled"  # Completely disables IMDS
  }

  tags = { Name = "no-metadata-instance" }
}
```

## Step 3: Configure Metadata in a Launch Template

```hcl
# Apply metadata settings via launch template for ASG consistency
resource "aws_launch_template" "secure" {
  name          = "secure-launch-template"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2  # Allow containers one extra hop
    instance_metadata_tags      = "enabled"
  }
}
```

## Step 4: Check IMDSv2 Compliance via AWS Config Rule

```hcl
# AWS Config rule to detect non-compliant instances
# AWS Config must already be enabled with a configuration recorder
resource "aws_config_config_rule" "imdsv2" {
  name        = "ec2-imdsv2-check"
  description = "Checks that EC2 instances require IMDSv2"

  source {
    owner             = "AWS"
    source_identifier = "EC2_IMDSV2_CHECK"
  }

  scope {
    compliance_resource_types = ["AWS::EC2::Instance"]
  }

  tags = { Name = "imdsv2-config-rule" }
}
```

## Step 5: Validate IMDSv2 from Inside an Instance

```bash
# IMDSv2 requires a session token - the following commands
# show how to access metadata with IMDSv2

# Step 1: Get a session token (valid for up to 6 hours)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 3600")

# Step 2: Use the token to query metadata
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id

# Get the attached IAM role name
ROLE_NAME=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/)

# Get IAM credentials for that role
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Enforcing IMDSv2 is a security best practice recommended by AWS. It helps protect against SSRF-based access to IAM credentials through the metadata endpoint. Set `http_put_response_hop_limit = 1` for most workloads and `2` only when containers need metadata access. Always combine IMDSv2 enforcement with least-privilege IAM policies for defense in depth.
