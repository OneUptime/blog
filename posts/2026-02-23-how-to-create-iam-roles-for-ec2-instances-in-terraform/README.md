# How to Create IAM Roles for EC2 Instances in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, EC2, Infrastructure as Code, Security

Description: Learn how to create IAM roles for EC2 instances in Terraform with instance profiles, custom policies, and secure access to AWS services.

---

EC2 instances frequently need to access AWS services like S3, DynamoDB, CloudWatch, and Systems Manager. The secure way to grant this access is through IAM roles attached via instance profiles, rather than embedding access keys on the instance. Terraform makes it easy to create the role, attach policies, create the instance profile, and link it all to your EC2 instances in a single, reviewable configuration.

This guide covers creating IAM roles for EC2 instances in Terraform, from simple setups to production-ready configurations with custom policies, environment-specific permissions, and security best practices.

## How EC2 Instance Roles Work

When you attach an IAM role to an EC2 instance through an instance profile, the instance can request temporary credentials from the Instance Metadata Service (IMDS). The AWS SDK and CLI automatically use these credentials. The credentials are rotated automatically and never need to be stored on disk.

The flow is:
1. You create an IAM role with a trust policy for the EC2 service.
2. You create an instance profile and associate the role with it.
3. You launch the EC2 instance with the instance profile.
4. Applications on the instance use the temporary credentials via IMDS.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with EC2 and IAM permissions
- AWS CLI configured with valid credentials

## Basic EC2 Role Setup

Here is the complete pattern for creating an EC2 role with an instance profile.

```hcl
# Trust policy - allow EC2 service to assume the role
data "aws_iam_policy_document" "ec2_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the IAM role
resource "aws_iam_role" "ec2_role" {
  name               = "ec2-application-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Create the instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-application-profile"
  role = aws_iam_role.ec2_role.name
}

# Attach a managed policy
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Launch the EC2 instance with the instance profile
resource "aws_instance" "app" {
  ami                  = "ami-0c55b159cbfafe1f0"
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name = "app-server"
  }
}
```

## Web Server Role with S3 and CloudWatch

A typical web server needs access to S3 for static assets, CloudWatch for metrics and logs, and potentially Secrets Manager for database credentials.

```hcl
resource "aws_iam_role" "web_server" {
  name               = "web-server-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_instance_profile" "web_server" {
  name = "web-server-profile"
  role = aws_iam_role.web_server.name
}

# Custom policy for the web server
resource "aws_iam_policy" "web_server_policy" {
  name        = "web-server-policy"
  description = "Permissions for the web server EC2 instances"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read static assets from S3
        Sid    = "S3StaticAssets"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::my-app-assets",
          "arn:aws:s3:::my-app-assets/*",
        ]
      },
      {
        # Write application logs to CloudWatch
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "arn:aws:logs:*:*:log-group:/app/web-server/*"
      },
      {
        # Push custom metrics
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "MyApp/WebServer"
          }
        }
      },
      {
        # Read database credentials from Secrets Manager
        Sid    = "SecretsManager"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:*:secret:app/web-server/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "web_server" {
  role       = aws_iam_role.web_server.name
  policy_arn = aws_iam_policy.web_server_policy.arn
}
```

## Adding SSM Session Manager Access

AWS Systems Manager Session Manager provides secure shell access to EC2 instances without opening SSH ports. The instance role needs SSM permissions.

```hcl
# SSM managed policy for Session Manager
resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.web_server.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

This managed policy allows the instance to communicate with the SSM service, enabling features like Session Manager, Run Command, and Patch Manager.

## Role for Auto Scaling Group Instances

When using Auto Scaling Groups, all instances in the group share the same instance profile.

```hcl
resource "aws_iam_role" "asg_role" {
  name               = "asg-instance-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_instance_profile" "asg_profile" {
  name = "asg-instance-profile"
  role = aws_iam_role.asg_role.name
}

# Attach necessary policies
resource "aws_iam_role_policy_attachment" "asg_ssm" {
  role       = aws_iam_role.asg_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "asg_cloudwatch" {
  role       = aws_iam_role.asg_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Launch template with the instance profile
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  iam_instance_profile {
    name = aws_iam_instance_profile.asg_profile.name
  }

  # Enforce IMDSv2 for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Require IMDSv2
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "asg-instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  desired_capacity    = 2
  max_size            = 4
  min_size            = 1
  vpc_zone_identifier = ["subnet-abc123", "subnet-def456"]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Environment-Specific Roles

Different environments often need different permission levels.

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "env_config" {
  description = "Per-environment configuration"
  type = map(object({
    s3_write_access = bool
    full_ssm_access = bool
    extra_policies  = list(string)
  }))
  default = {
    dev = {
      s3_write_access = true
      full_ssm_access = true
      extra_policies  = []
    }
    staging = {
      s3_write_access = true
      full_ssm_access = false
      extra_policies  = []
    }
    prod = {
      s3_write_access = false
      full_ssm_access = false
      extra_policies  = ["arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"]
    }
  }
}

resource "aws_iam_role" "env_ec2_role" {
  name               = "ec2-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_instance_profile" "env_profile" {
  name = "ec2-profile-${var.environment}"
  role = aws_iam_role.env_ec2_role.name
}

# S3 policy varies by environment
resource "aws_iam_policy" "env_s3_policy" {
  name = "ec2-s3-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = concat(
          ["s3:GetObject", "s3:ListBucket"],
          var.env_config[var.environment].s3_write_access ? ["s3:PutObject", "s3:DeleteObject"] : []
        )
        Resource = [
          "arn:aws:s3:::app-${var.environment}-*",
          "arn:aws:s3:::app-${var.environment}-*/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "env_s3" {
  role       = aws_iam_role.env_ec2_role.name
  policy_arn = aws_iam_policy.env_s3_policy.arn
}

# SSM access
resource "aws_iam_role_policy_attachment" "env_ssm" {
  role       = aws_iam_role.env_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Additional policies per environment
resource "aws_iam_role_policy_attachment" "env_extra" {
  for_each = toset(var.env_config[var.environment].extra_policies)

  role       = aws_iam_role.env_ec2_role.name
  policy_arn = each.value
}
```

## Enforcing IMDSv2

Instance Metadata Service version 2 (IMDSv2) is more secure than v1 because it requires a session token. Always enforce IMDSv2 in your launch templates.

```hcl
resource "aws_launch_template" "secure" {
  name_prefix   = "secure-"
  image_id      = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  # Enforce IMDSv2 to prevent SSRF attacks
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }
}
```

## Best Practices

1. **Never use access keys on EC2.** Always use IAM roles with instance profiles.
2. **Enforce IMDSv2.** It prevents SSRF attacks from extracting instance credentials.
3. **One role per application type.** Do not share roles between different application types.
4. **Include SSM access.** This lets you manage instances without SSH.
5. **Use permission boundaries** in production to limit the maximum permissions a role can have.
6. **Tag your roles and profiles** for easy identification and cost allocation.

For related topics, see [How to Create IAM Instance Profiles in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-instance-profiles-in-terraform/view) and [How to Create IAM Permission Boundaries in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-permission-boundaries-in-terraform/view).

## Conclusion

IAM roles for EC2 instances are a fundamental security control in AWS. They eliminate the need for static credentials, provide automatic credential rotation, and integrate seamlessly with the AWS SDK and CLI. Terraform makes it straightforward to create roles, attach policies, build instance profiles, and reference them in your EC2 configurations. By following the principle of least privilege and enforcing IMDSv2, you can ensure your EC2 instances have exactly the access they need and nothing more.
