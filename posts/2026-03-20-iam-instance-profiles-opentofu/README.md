# How to Create IAM Instance Profiles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Instance Profile, EC2, Infrastructure as Code, Access Control

Description: Learn how to create IAM instance profiles using OpenTofu to grant EC2 instances fine-grained AWS API access without storing credentials on the instance.

## Introduction

IAM instance profiles are the mechanism by which EC2 instances assume an IAM role. The instance profile is a container for the role that is associated with an EC2 instance. Credentials from the assumed role are available via the EC2 instance metadata service without storing any static credentials.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM and EC2 permissions

## Step 1: Create an IAM Role for EC2

```hcl
# IAM role for an application server

resource "aws_iam_role" "app_server" {
  name        = "${var.app_name}-server-role"
  description = "Role for ${var.app_name} application servers"
  path        = "/ec2/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = {
    Name        = "${var.app_name}-server-role"
    Application = var.app_name
  }
}
```

## Step 2: Attach Policies to the Role

```hcl
# SSM for session manager access (replaces SSH)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app_server.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent for metrics and logs
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.app_server.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Application-specific permissions
resource "aws_iam_role_policy" "app_permissions" {
  name = "${var.app_name}-app-policy"
  role = aws_iam_role.app_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3AppBucket"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}",
          "arn:aws:s3:::${var.app_bucket}/*"
        ]
      },
      {
        Sid    = "AllowSQSQueue"
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
        Resource = var.app_queue_arn
      },
      {
        Sid    = "AllowSecretsManager"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.app_name}/*"
      }
    ]
  })
}
```

## Step 3: Create the Instance Profile

```hcl
# Instance profile is a container for the IAM role
# EC2 instances are assigned the profile, not the role directly
resource "aws_iam_instance_profile" "app_server" {
  name = "${var.app_name}-instance-profile"
  role = aws_iam_role.app_server.name
  path = "/ec2/"

  tags = {
    Name        = "${var.app_name}-instance-profile"
    Application = var.app_name
  }
}
```

## Step 4: Assign Instance Profile to EC2 Instances

```hcl
resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  # Assign the instance profile - grants the role's permissions
  iam_instance_profile = aws_iam_instance_profile.app_server.name

  metadata_options {
    http_tokens                 = "required"  # Enforce IMDSv2
    http_put_response_hop_limit = 1
  }

  tags = {
    Name = "${var.app_name}-server-${count.index + 1}"
  }
}
```

## Step 5: Use Instance Profile in a Launch Template

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.app_name}-launch-template"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.app_server.name
  }

  metadata_options {
    http_tokens = "required"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify the instance can access AWS APIs (from the instance)
aws sts get-caller-identity
aws s3 ls s3://my-app-bucket
```

## Conclusion

IAM instance profiles are the secure, recommended way to grant EC2 instances AWS permissions. Credentials are automatically rotated by the metadata service and never stored on disk. Always enforce IMDSv2 to add defense in depth against SSRF and related proxy/firewall issues that could expose instance credentials through the metadata endpoint. Use specific resource ARNs and conditions in policies rather than wildcards to maintain least-privilege access.
