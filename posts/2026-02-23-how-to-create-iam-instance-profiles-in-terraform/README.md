# How to Create IAM Instance Profiles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, EC2, Infrastructure as Code, Security

Description: Learn how to create IAM instance profiles in Terraform to grant EC2 instances secure access to AWS services without static credentials.

---

When EC2 instances need to interact with AWS services like S3, DynamoDB, or Secrets Manager, they need credentials. The best practice is to use IAM instance profiles rather than embedding access keys in the instance. An instance profile is a container for an IAM role that you can attach to an EC2 instance at launch. Terraform makes it straightforward to create and manage instance profiles as part of your infrastructure.

This guide covers everything about creating IAM instance profiles in Terraform, from basic setups to advanced patterns with multiple roles and environments.

## What Is an IAM Instance Profile?

An IAM instance profile acts as a bridge between an EC2 instance and an IAM role. When you launch an EC2 instance with an instance profile, the instance can retrieve temporary security credentials from the instance metadata service. Applications running on the instance use these credentials to make AWS API calls.

The relationship works like this: An IAM role defines the permissions. An instance profile wraps the role. The EC2 instance uses the instance profile to assume the role and get temporary credentials. These credentials are rotated automatically by AWS.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with permissions to create IAM roles, instance profiles, and EC2 instances
- AWS CLI configured with valid credentials

## Creating a Basic Instance Profile

A basic instance profile requires three components: the IAM role, the instance profile, and the policy attachments.

```hcl
# Step 1: Create the trust policy for EC2
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

# Step 2: Create the IAM role
resource "aws_iam_role" "ec2_role" {
  name               = "ec2-application-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Step 3: Attach policies to the role
resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Step 4: Create the instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-application-profile"
  role = aws_iam_role.ec2_role.name

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Attaching the Instance Profile to an EC2 Instance

Once the instance profile is created, reference it in your EC2 instance resource.

```hcl
# Launch an EC2 instance with the instance profile
resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "t3.micro"

  # Attach the instance profile
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name = "app-server"
  }
}
```

With a launch template, the syntax is slightly different.

```hcl
# Using a launch template
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Instance profile in a launch template uses iam_instance_profile block
  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
    # Alternatively, use arn instead of name:
    # arn = aws_iam_instance_profile.ec2_profile.arn
  }
}
```

## Instance Profile with Custom Policies

Most real applications need custom policies tailored to their specific AWS resource access patterns.

```hcl
# Define a custom policy for the application
resource "aws_iam_policy" "app_policy" {
  name        = "app-server-policy"
  description = "Policy for the application server EC2 instances"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow reading from a specific S3 bucket
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::my-app-config",
          "arn:aws:s3:::my-app-config/*",
        ]
      },
      {
        # Allow writing application logs to CloudWatch
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "arn:aws:logs:*:*:log-group:/app/*"
      },
      {
        # Allow reading secrets from Secrets Manager
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:*:secret:app/*"
      },
      {
        # Allow publishing to an SNS topic
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish",
        ]
        Resource = "arn:aws:sns:us-east-1:*:app-notifications"
      }
    ]
  })
}

# Create the role, attach the policy, and create the instance profile
resource "aws_iam_role" "app_role" {
  name               = "app-server-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_role_policy_attachment" "app_custom" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.app_policy.arn
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "app-server-profile"
  role = aws_iam_role.app_role.name
}
```

## Creating Instance Profiles for Multiple Environments

Use variables and loops to create instance profiles for different environments.

```hcl
variable "environments" {
  description = "List of environments to create instance profiles for"
  type        = list(string)
  default     = ["dev", "staging", "prod"]
}

variable "environment_policies" {
  description = "Map of environments to their additional policy ARNs"
  type        = map(list(string))
  default = {
    dev = [
      "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    ]
    staging = [
      "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    ]
    prod = [
      "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    ]
  }
}

# Create a role for each environment
resource "aws_iam_role" "env_roles" {
  for_each = toset(var.environments)

  name               = "ec2-role-${each.value}"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json

  tags = {
    Environment = each.value
  }
}

# Create instance profiles for each environment
resource "aws_iam_instance_profile" "env_profiles" {
  for_each = toset(var.environments)

  name = "ec2-profile-${each.value}"
  role = aws_iam_role.env_roles[each.value].name

  tags = {
    Environment = each.value
  }
}

# Attach environment-specific policies
locals {
  env_policy_attachments = flatten([
    for env in var.environments : [
      for policy_arn in var.environment_policies[env] : {
        env        = env
        policy_arn = policy_arn
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "env_policies" {
  for_each = {
    for item in local.env_policy_attachments :
    "${item.env}-${item.policy_arn}" => item
  }

  role       = aws_iam_role.env_roles[each.value.env].name
  policy_arn = each.value.policy_arn
}
```

## Using a Module for Instance Profiles

Encapsulating the instance profile pattern in a module makes it reusable.

```hcl
# modules/ec2-instance-profile/main.tf
variable "name" {
  type = string
}

variable "managed_policy_arns" {
  type    = list(string)
  default = []
}

variable "custom_policy_json" {
  type    = string
  default = ""
}

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

resource "aws_iam_role" "this" {
  name               = "${var.name}-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_instance_profile" "this" {
  name = "${var.name}-profile"
  role = aws_iam_role.this.name
}

resource "aws_iam_role_policy_attachment" "managed" {
  for_each   = toset(var.managed_policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = each.value
}

resource "aws_iam_role_policy" "custom" {
  count  = var.custom_policy_json != "" ? 1 : 0
  name   = "${var.name}-custom-policy"
  role   = aws_iam_role.this.id
  policy = var.custom_policy_json
}

output "instance_profile_name" {
  value = aws_iam_instance_profile.this.name
}

output "instance_profile_arn" {
  value = aws_iam_instance_profile.this.arn
}

output "role_arn" {
  value = aws_iam_role.this.arn
}
```

## Important Considerations

There are several things to keep in mind when working with instance profiles:

1. **One role per instance profile.** An instance profile can contain only one IAM role. If you need different permission sets, create separate instance profiles.

2. **Propagation delay.** After creating an instance profile, there can be a brief delay before it is available for use. If you immediately reference it in an EC2 instance, the launch might fail. Add a `depends_on` if needed.

3. **Changing the role.** If you change the role in an instance profile, running instances will not pick up the change until they are stopped and restarted, or until the temporary credentials expire.

4. **Session duration.** The default maximum session duration for EC2 instance roles is one hour. AWS automatically refreshes the credentials before they expire.

For more on EC2 IAM roles, see [How to Create IAM Roles for EC2 Instances in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ec2-instances-in-terraform/view).

## Conclusion

IAM instance profiles are the proper way to grant EC2 instances access to AWS services. They eliminate the need for static credentials, automatically rotate security tokens, and integrate cleanly with Terraform. By using variables, loops, and modules, you can manage instance profiles at scale across multiple environments. Always follow the principle of least privilege when defining the policies attached to your instance profile roles.
